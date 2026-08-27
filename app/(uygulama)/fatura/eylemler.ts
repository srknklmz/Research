'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { faturaDurumTazele } from '@/lib/akis'
import { istegeBagliBelge } from '@/lib/belge'
import { db } from '@/lib/db'
import { gunlukle } from '@/lib/gunluk'
import { gerekliKullanici } from '@/lib/oturum'
import { secenekEkle } from '@/lib/secenek'
import { GIRIS_YAPABILIR } from '@/lib/yetki'

const KILITLI = ['IMZALANDI', 'MERKEZ_ONAYLI', 'GONDERILDI'] as const

const faturaSemasi = z.object({
  no: z.string().trim().min(1, 'Fatura no gerekli').max(60),
  tarih: z.string().min(1, 'Tarih gerekli'),
  firmaId: z.coerce.number().int().positive('Firma seçin'),
  tutar: z.coerce.number().min(0, 'Tutar negatif olamaz'),
  kategori: z.string().trim().optional().nullable(),
  odeme: z.string().trim().optional().nullable(),
  aciklama: z.string().trim().max(1000).optional().nullable(),
  irsaliyesiz: z.boolean(),
})

function formuOku(veri: FormData) {
  return faturaSemasi.safeParse({
    no: veri.get('no'),
    tarih: veri.get('tarih'),
    firmaId: veri.get('firmaId'),
    tutar: veri.get('tutar'),
    kategori: (veri.get('kategori') as string)?.trim() || null,
    odeme: (veri.get('odeme') as string)?.trim() || null,
    aciklama: (veri.get('aciklama') as string)?.trim() || null,
    irsaliyesiz: veri.get('irsaliyesiz') === 'on',
  })
}

export async function faturaOlustur(
  _onceki: string | null | undefined,
  veri: FormData,
) {
  const kullanici = await gerekliKullanici(GIRIS_YAPABILIR)
  const sonuc = formuOku(veri)
  if (!sonuc.success) return sonuc.error.issues[0].message
  const g = sonuc.data

  const cakisma = await db.fatura.findFirst({
    where: { firmaId: g.firmaId, no: g.no },
  })
  if (cakisma) return `Bu fatura zaten kayıtlı (#${cakisma.id}).`

  let belgeId: number | null = null
  try {
    belgeId = await istegeBagliBelge(veri, 'belge', kullanici.id)
  } catch (e) {
    return e instanceof Error ? e.message : 'Belge yüklenemedi.'
  }

  const fatura = await db.fatura.create({
    data: {
      no: g.no,
      tarih: new Date(`${g.tarih}T00:00:00Z`),
      firmaId: g.firmaId,
      tutar: g.tutar,
      kategori: g.kategori,
      odeme: g.odeme,
      aciklama: g.aciklama,
      irsaliyesiz: g.irsaliyesiz,
      durum: g.irsaliyesiz ? 'ESLESTI' : 'YENI',
      belgeId,
      girenId: kullanici.id,
    },
  })

  if (g.kategori) await secenekEkle('FATURA_KATEGORI', g.kategori)
  if (g.odeme) await secenekEkle('ODEME', g.odeme)
  await gunlukle(kullanici.id, 'OLUSTUR', 'Fatura', fatura.id, { no: g.no })

  revalidatePath('/fatura')
  redirect(`/fatura/${fatura.id}`)
}

export async function faturaGuncelle(
  id: number,
  _onceki: string | null | undefined,
  veri: FormData,
) {
  const kullanici = await gerekliKullanici(GIRIS_YAPABILIR)
  const sonuc = formuOku(veri)
  if (!sonuc.success) return sonuc.error.issues[0].message
  const g = sonuc.data

  const mevcut = await db.fatura.findUnique({ where: { id } })
  if (!mevcut) return 'Fatura bulunamadı.'
  if (KILITLI.includes(mevcut.durum as never)) {
    return 'İmzalanmış fatura değiştirilemez. Önce imzayı geri alın.'
  }

  const cakisma = await db.fatura.findFirst({
    where: { firmaId: g.firmaId, no: g.no, NOT: { id } },
  })
  if (cakisma) return `Bu fatura numarası aynı firmada zaten var (#${cakisma.id}).`

  let belgeId: number | null = null
  try {
    belgeId = await istegeBagliBelge(veri, 'belge', kullanici.id)
  } catch (e) {
    return e instanceof Error ? e.message : 'Belge yüklenemedi.'
  }

  await db.fatura.update({
    where: { id },
    data: {
      no: g.no,
      tarih: new Date(`${g.tarih}T00:00:00Z`),
      firmaId: g.firmaId,
      tutar: g.tutar,
      kategori: g.kategori,
      odeme: g.odeme,
      aciklama: g.aciklama,
      irsaliyesiz: g.irsaliyesiz,
      ...(belgeId ? { belgeId } : {}),
    },
  })

  await faturaDurumTazele(id)
  if (g.kategori) await secenekEkle('FATURA_KATEGORI', g.kategori)
  if (g.odeme) await secenekEkle('ODEME', g.odeme)
  await gunlukle(kullanici.id, 'GUNCELLE', 'Fatura', id)

  revalidatePath('/fatura')
  revalidatePath(`/fatura/${id}`)
  redirect(`/fatura/${id}`)
}

export async function faturaSil(id: number) {
  const kullanici = await gerekliKullanici(GIRIS_YAPABILIR)
  const fatura = await db.fatura.findUnique({ where: { id } })
  if (!fatura) return
  if (KILITLI.includes(fatura.durum as never)) {
    throw new Error('İmzalanmış fatura silinemez.')
  }

  await db.fatura.delete({ where: { id } })
  await gunlukle(kullanici.id, 'SIL', 'Fatura', id, { no: fatura.no })

  revalidatePath('/fatura')
  redirect('/fatura')
}
