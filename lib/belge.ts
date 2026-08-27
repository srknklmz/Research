import { createHash, randomUUID } from 'node:crypto'
import { db } from './db'
import { depoyaYaz } from './depo'

const AZAMI_BOYUT = 20 * 1024 * 1024 // 20 MB

/**
 * Yalnızca PDF kabul edilir. Uzantıya ya da tarayıcının bildirdiği türe
 * güvenilmez; dosyanın ilk baytları okunur.
 */
function pdfMi(veri: Buffer): boolean {
  return veri.subarray(0, 5).toString('latin1') === '%PDF-'
}

/** Yüklenen dosyayı depoya yazar ve Belge kaydını döndürür. */
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

  // Aynı dosya daha önce yüklendiyse yeniden yazma.
  const mevcut = await db.belge.findFirst({ where: { sha256 } })
  if (mevcut) return mevcut

  const bugun = new Date()
  const yol = [
    String(bugun.getFullYear()),
    String(bugun.getMonth() + 1).padStart(2, '0'),
    `${randomUUID()}.pdf`,
  ].join('/')

  await depoyaYaz(yol, veri, 'application/pdf')

  return db.belge.create({
    data: {
      ad: dosya.name,
      yol,
      mimeTur: 'application/pdf',
      boyut: dosya.size,
      sha256,
      yukleyenId,
    },
  })
}

/** FormData'daki dosya alanı doluysa kaydeder, boşsa null döner. */
export async function istegeBagliBelge(
  veri: FormData,
  alan: string,
  yukleyenId?: number,
): Promise<number | null> {
  const dosya = veri.get(alan)
  if (!(dosya instanceof File) || dosya.size === 0) return null
  const belge = await belgeKaydet(dosya, yukleyenId)
  return belge.id
}
