import { createHash, randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { db } from './db'

const IZINLI = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
])
const AZAMI_BOYUT = 20 * 1024 * 1024 // 20 MB

export function yuklemeDizini(): string {
  return process.env.YUKLEME_DIZINI ?? './yuklemeler'
}

/** Yüklenen dosyayı diske yazar ve Belge kaydını döndürür. */
export async function belgeKaydet(dosya: File, yukleyenId?: number) {
  if (!IZINLI.has(dosya.type)) {
    throw new Error(`Desteklenmeyen dosya türü: ${dosya.type || 'bilinmiyor'}`)
  }
  if (dosya.size > AZAMI_BOYUT) {
    throw new Error('Dosya 20 MB sınırını aşıyor.')
  }

  const veri = Buffer.from(await dosya.arrayBuffer())
  const sha256 = createHash('sha256').update(veri).digest('hex')

  // Aynı dosya daha önce yüklendiyse yeniden yazma.
  const mevcut = await db.belge.findFirst({ where: { sha256 } })
  if (mevcut) return mevcut

  const bugun = new Date()
  const altDizin = join(
    String(bugun.getFullYear()),
    String(bugun.getMonth() + 1).padStart(2, '0'),
  )
  const dosyaAdi = `${randomUUID()}${extname(dosya.name) || ''}`
  const goreliYol = join(altDizin, dosyaAdi)

  await mkdir(join(yuklemeDizini(), altDizin), { recursive: true })
  await writeFile(join(yuklemeDizini(), goreliYol), veri)

  return db.belge.create({
    data: {
      ad: dosya.name,
      yol: goreliYol,
      mimeTur: dosya.type,
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
