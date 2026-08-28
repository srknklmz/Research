import { randomUUID } from 'node:crypto'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { supabaseAdresi } from './yapilandirma'

export type DepoTuru = 'yerel' | 'supabase'

/**
 * Hangi depolama sürücüsü kullanılıyor. DEPO açıkça verilmemişse, Supabase
 * adresi ve servis anahtarı varsa Supabase seçilir — böylece tek bir ayar
 * daha elle girilmek zorunda kalmaz.
 */
export function depoTuru(): DepoTuru {
  const acik = process.env.DEPO?.trim()
  if (acik) return acik === 'supabase' ? 'supabase' : 'yerel'

  const hazir = Boolean(supabaseAdresi() && process.env.SUPABASE_SERVIS_ANAHTARI)
  return hazir ? 'supabase' : 'yerel'
}

export function yerelDizin(): string {
  return process.env.YUKLEME_DIZINI ?? './yuklemeler'
}

function kova(): string {
  return process.env.SUPABASE_KOVA ?? 'belgeler'
}

let istemci: SupabaseClient | null = null

function supabase(): SupabaseClient {
  if (istemci) return istemci

  const url = supabaseAdresi()
  const anahtar = process.env.SUPABASE_SERVIS_ANAHTARI
  if (!url || !anahtar) {
    throw new Error(
      'Supabase deposu seçili ama proje adresi ya da SUPABASE_SERVIS_ANAHTARI yok.',
    )
  }

  istemci = createClient(url, anahtar, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return istemci
}

/** Dosyayı depoya yazar. Yol her zaman `2026/08/xxx.pdf` biçiminde göreli. */
export async function depoyaYaz(yol: string, veri: Buffer, mimeTur: string) {
  if (depoTuru() === 'supabase') {
    const { error } = await supabase()
      .storage.from(kova())
      .upload(yol, veri, { contentType: mimeTur, upsert: false })
    if (error) throw new Error(`Supabase'e yüklenemedi: ${error.message}`)
    return
  }

  const tamYol = join(yerelDizin(), yol)
  await mkdir(dirname(tamYol), { recursive: true })
  await writeFile(tamYol, veri)
}

/**
 * Supabase'de kısa ömürlü imzalı bağlantı üretir; yerel depoda null döner
 * (dosya uygulama üzerinden sunulur).
 */
export async function imzaliBaglanti(
  yol: string,
  saniye = 120,
): Promise<string | null> {
  if (depoTuru() !== 'supabase') return null

  const { data, error } = await supabase()
    .storage.from(kova())
    .createSignedUrl(yol, saniye)
  if (error || !data) {
    throw new Error(`İmzalı bağlantı alınamadı: ${error?.message ?? 'bilinmiyor'}`)
  }
  return data.signedUrl
}

/** Dosyayı okur. Supabase'de imzalı bağlantı tercih edilir; bu yedek yoldur. */
export async function depodanOku(yol: string): Promise<Buffer> {
  if (depoTuru() === 'supabase') {
    const { data, error } = await supabase().storage.from(kova()).download(yol)
    if (error || !data) {
      throw new Error(`Dosya indirilemedi: ${error?.message ?? 'bulunamadı'}`)
    }
    return Buffer.from(await data.arrayBuffer())
  }
  return readFile(join(yerelDizin(), yol))
}

export async function depodanSil(yol: string) {
  if (depoTuru() === 'supabase') {
    await supabase().storage.from(kova()).remove([yol])
    return
  }
  await unlink(join(yerelDizin(), yol)).catch(() => {})
}

/** Yeni bir belge için `2026/08/<uuid>.pdf` biçiminde yol üretir. */
export function yeniBelgeYolu(): string {
  const bugun = new Date()
  return [
    String(bugun.getFullYear()),
    String(bugun.getMonth() + 1).padStart(2, '0'),
    `${randomUUID()}.pdf`,
  ].join('/')
}

export type YuklemeSlotu = { yol: string; imzaliUrl: string }

/**
 * Tarayıcının dosyayı doğrudan Supabase'e yükleyebilmesi için imzalı bir
 * yükleme adresi açar (2 saat geçerli). Vercel'de istek gövdesi 4,5 MB ile
 * sınırlı olduğundan büyük PDF'ler sunucuya uğramadan yüklenir.
 * Yerel depoda null döner; orada dosya form ile sunucuya gelir.
 */
export async function yuklemeSlotuAc(): Promise<YuklemeSlotu | null> {
  if (depoTuru() !== 'supabase') return null

  const yol = yeniBelgeYolu()
  const { data, error } = await supabase()
    .storage.from(kova())
    .createSignedUploadUrl(yol)

  if (error || !data) {
    throw new Error(
      `Yükleme adresi alınamadı: ${error?.message ?? 'bilinmiyor'}`,
    )
  }
  return { yol, imzaliUrl: data.signedUrl }
}

/** Depoda dosya var mı? Doğrudan yükleme sonrası doğrulama için. */
export async function depodaVarMi(yol: string): Promise<boolean> {
  if (depoTuru() !== 'supabase') {
    try {
      await readFile(join(yerelDizin(), yol))
      return true
    } catch {
      return false
    }
  }
  const dizin = yol.split('/').slice(0, -1).join('/')
  const ad = yol.split('/').pop()!
  const { data } = await supabase()
    .storage.from(kova())
    .list(dizin, { search: ad, limit: 1 })
  return Boolean(data?.some((d) => d.name === ad))
}
