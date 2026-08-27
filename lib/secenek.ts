import { cache } from 'react'
import { db } from './db'

export type SecenekGrubu =
  | 'BIRIM'
  | 'CARI'
  | 'IRSALIYE_KATEGORI'
  | 'FATURA_KATEGORI'
  | 'TUR'
  | 'MALZEME'
  | 'ODEME'

/** Bir grubun aktif seçeneklerini sıralı döndürür. İstek başına önbelleklenir. */
export const secenekler = cache(async (grup: SecenekGrubu): Promise<string[]> => {
  const kayitlar = await db.secenek.findMany({
    where: { grup, aktif: true },
    orderBy: [{ sira: 'asc' }, { deger: 'asc' }],
    select: { deger: true },
  })
  return kayitlar.map((k) => k.deger)
})

/** Serbest girilen yeni bir değeri listeye ekler (varsa dokunmaz). */
export async function secenekEkle(grup: SecenekGrubu, deger: string) {
  const temiz = deger.trim()
  if (!temiz) return
  await db.secenek.upsert({
    where: { grup_deger: { grup, deger: temiz } },
    update: {},
    create: { grup, deger: temiz, sira: 9999 },
  })
}

export const firmalar = cache(async () =>
  db.firma.findMany({
    where: { aktif: true },
    orderBy: { ad: 'asc' },
    select: { id: true, ad: true },
  }),
)

/** Firma adından kayıt bulur, yoksa oluşturur. İçe aktarmada kullanılır. */
export async function firmaBulVeyaOlustur(ad: string): Promise<number> {
  const temiz = ad.trim()
  if (!temiz) throw new Error('Firma adı boş olamaz.')
  const firma = await db.firma.upsert({
    where: { ad: temiz },
    update: {},
    create: { ad: temiz },
  })
  return firma.id
}
