'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { faturaDurumTazele } from '@/lib/akis'
import { db } from '@/lib/db'
import { gunlukle } from '@/lib/gunluk'
import { gerekliKullanici } from '@/lib/oturum'
import { ESLESTIREBILIR } from '@/lib/yetki'

const KILITLI = ['IMZALANDI', 'MERKEZ_ONAYLI', 'GONDERILDI']

export async function eslesmeleriKaydet(
  faturaId: number,
  _onceki: string | null | undefined,
  veri: FormData,
) {
  const kullanici = await gerekliKullanici(ESLESTIREBILIR)

  const fatura = await db.fatura.findUnique({
    where: { id: faturaId },
    include: { eslesmeler: { select: { irsaliyeId: true } } },
  })
  if (!fatura) return 'Fatura bulunamadı.'
  if (KILITLI.includes(fatura.durum)) {
    return 'İmzalanmış faturanın eşleşmesi değiştirilemez. Önce imzayı geri alın.'
  }

  const istenen = veri
    .getAll('irsaliye')
    .map((d) => Number(d))
    .filter((n) => Number.isInteger(n) && n > 0)

  const mevcut = fatura.eslesmeler.map((e) => e.irsaliyeId)
  const eklenecek = istenen.filter((i) => !mevcut.includes(i))
  const silinecek = mevcut.filter((i) => !istenen.includes(i))

  // Seçilen irsaliyelerin gerçekten bu firmaya ait olduğunu doğrula.
  if (eklenecek.length) {
    const gecerli = await db.irsaliye.count({
      where: { id: { in: eklenecek }, firmaId: fatura.firmaId },
    })
    if (gecerli !== eklenecek.length) {
      return 'Seçilen irsaliyelerden biri bu faturanın firmasına ait değil.'
    }
  }

  await db.$transaction([
    ...(silinecek.length
      ? [db.eslesme.deleteMany({ where: { faturaId, irsaliyeId: { in: silinecek } } })]
      : []),
    ...eklenecek.map((irsaliyeId) =>
      db.eslesme.create({ data: { faturaId, irsaliyeId, kuranId: kullanici.id } }),
    ),
  ])

  await faturaDurumTazele(faturaId)
  await gunlukle(kullanici.id, 'ESLESTIR', 'Fatura', faturaId, {
    eklenen: eklenecek,
    kaldirilan: silinecek,
  })

  revalidatePath('/eslestir')
  revalidatePath(`/fatura/${faturaId}`)
  redirect(`/fatura/${faturaId}`)
}

export async function irsaliyesizIsaretle(faturaId: number, deger: boolean) {
  const kullanici = await gerekliKullanici(ESLESTIREBILIR)

  const fatura = await db.fatura.findUnique({ where: { id: faturaId } })
  if (!fatura) return
  if (KILITLI.includes(fatura.durum)) {
    throw new Error('İmzalanmış fatura değiştirilemez.')
  }

  await db.fatura.update({ where: { id: faturaId }, data: { irsaliyesiz: deger } })
  await faturaDurumTazele(faturaId)
  await gunlukle(kullanici.id, 'IRSALIYESIZ', 'Fatura', faturaId, { deger })

  revalidatePath('/eslestir')
  revalidatePath(`/fatura/${faturaId}`)
}
