import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type DepoTuru = 'yerel' | 'supabase'

/** Hangi depolama sürücüsü kullanılıyor. */
export function depoTuru(): DepoTuru {
  return process.env.DEPO === 'supabase' ? 'supabase' : 'yerel'
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

  const url = process.env.SUPABASE_URL
  const anahtar = process.env.SUPABASE_SERVIS_ANAHTARI
  if (!url || !anahtar) {
    throw new Error(
      'DEPO=supabase seçili ama SUPABASE_URL ya da SUPABASE_SERVIS_ANAHTARI tanımlı değil.',
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
