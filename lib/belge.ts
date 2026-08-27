import { createHash } from 'node:crypto'
import { db } from './db'
import {
  depodanOku,
  depodanSil,
  depoTuru,
  depoyaYaz,
  yeniBelgeYolu,
} from './depo'

const AZAMI_BOYUT = 20 * 1024 * 1024 // 20 MB

/**
 * Yalnızca PDF kabul edilir. Uzantıya ya da tarayıcının bildirdiği türe
 * güvenilmez; dosyanın ilk baytları okunur.
 */
function pdfMi(veri: Buffer): boolean {
  return veri.subarray(0, 5).toString('latin1') === '%PDF-'
}

/** Aynı içerik daha önce yüklendiyse o kaydı döndürür. */
async function ayniBelge(sha256: string) {
  return db.belge.findFirst({ where: { sha256 } })
}

/** Form ile sunucuya gelen dosyayı depoya yazar ve Belge kaydını döndürür. */
export async function belgeKaydet(dosya: File, yukleyenId?: number) {
  if (dosya.size > AZAMI_BOYUT) {
    throw new Error('Dosya 20 MB sınırını aşıyor.')
  }

  const veri = Buffer.from(await dosya.arrayBuffer())
  if (!pdfMi(veri)) {
    throw new Error(
      `Yalnızca PDF yüklenebilir. "${dosya.name}" bir PDF dosyası değil.`,
    )
  }

  const sha256 = createHash('sha256').update(veri).digest('hex')
  const mevcut = await ayniBelge(sha256)
  if (mevcut) return mevcut

  const yol = yeniBelgeYolu()
  await depoyaYaz(yol, veri, 'application/pdf')

  return db.belge.create({
    data: {
      ad: dosya.name,
      yol,
      mimeTur: 'application/pdf',
      boyut: veri.length,
      sha256,
      yukleyenId,
    },
  })
}

/**
 * Tarayıcının doğrudan depoya yüklediği dosyayı kayda bağlar. Dosya bir kez
 * indirilip PDF olduğu ve boyutu doğrulanır; aynı içerik zaten varsa yeni
 * yüklenen nesne silinip mevcut kayıt kullanılır.
 */
export async function belgeyiYoldanKaydet(
  yol: string,
  ad: string,
  yukleyenId?: number,
) {
  // Yol uygulamanın ürettiği biçimde olmalı: 2026/08/<uuid>.pdf
  if (!/^\d{4}\/\d{2}\/[0-9a-f-]{36}\.pdf$/.test(yol)) {
    throw new Error('Geçersiz belge yolu.')
  }

  let veri: Buffer
  try {
    veri = await depodanOku(yol)
  } catch {
    throw new Error('Yüklenen dosya depoda bulunamadı. Yeniden deneyin.')
  }

  if (veri.length > AZAMI_BOYUT) {
    await depodanSil(yol)
    throw new Error('Dosya 20 MB sınırını aşıyor.')
  }
  if (!pdfMi(veri)) {
    await depodanSil(yol)
    throw new Error(`Yalnızca PDF yüklenebilir. "${ad}" bir PDF dosyası değil.`)
  }

  const sha256 = createHash('sha256').update(veri).digest('hex')
  const mevcut = await ayniBelge(sha256)
  if (mevcut) {
    await depodanSil(yol)
    return mevcut
  }

  return db.belge.create({
    data: {
      ad,
      yol,
      mimeTur: 'application/pdf',
      boyut: veri.length,
      sha256,
      yukleyenId,
    },
  })
}

/**
 * Formdaki belge alanını işler. İki yol destekler: dosyanın sunucuya
 * gelmesi (yerel depo) ya da tarayıcının doğrudan depoya yüklemesi
 * (`belgeYolu` alanı, Supabase). Belge yoksa null döner.
 */
export async function istegeBagliBelge(
  veri: FormData,
  alan: string,
  yukleyenId?: number,
): Promise<number | null> {
  const yol = (veri.get(`${alan}Yolu`) as string)?.trim()
  if (yol) {
    const ad = (veri.get(`${alan}Adi`) as string)?.trim() || 'belge.pdf'
    const belge = await belgeyiYoldanKaydet(yol, ad, yukleyenId)
    return belge.id
  }

  const dosya = veri.get(alan)
  if (!(dosya instanceof File) || dosya.size === 0) return null
  const belge = await belgeKaydet(dosya, yukleyenId)
  return belge.id
}

/** Tarayıcı doğrudan yükleme yapabilir mi? Formlara bu bilgi geçilir. */
export function dogrudanYuklenir(): boolean {
  return depoTuru() === 'supabase'
}
