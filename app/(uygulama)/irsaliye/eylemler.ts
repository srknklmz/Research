'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { istegeBagliBelge } from '@/lib/belge'
import { db } from '@/lib/db'
import { gunlukle } from '@/lib/gunluk'
import { gerekliKullanici } from '@/lib/oturum'
import { secenekEkle } from '@/lib/secenek'
import { GIRIS_YAPABILIR } from '@/lib/yetki'

const kalemSemasi = z.object({
  kategori: z.string().trim().optional().nullable(),
  tur: z.string().trim().optional().nullable(),
  malzeme: z.string().trim().min(1, 'Malzeme boş olamaz'),
  miktar: z.coerce.number().positive('Miktar sıfırdan büyük olmalı'),
  birim: z.string().trim().min(1, 'Birim seçin'),
  birimFiyat: z.coerce.number().min(0).optional().nullable(),
})

const irsaliyeSemasi = z.object({
  no: z.string().trim().max(60).optional().nullable(),
  tarih: z.string().min(1, 'Tarih gerekli'),
  firmaId: z.coerce.number().int().positive('Firma seçin'),
  cari: z.string().trim().optional().nullable(),
  aciklama: z.string().trim().max(1000).optional().nullable(),
  kalemler: z.array(kalemSemasi).min(1, 'En az bir kalem girin'),
})

function formuOku(veri: FormData) {
  const ham = {
    no: (veri.get('no') as string)?.trim() || null,
    tarih: veri.get('tarih') as string,
    firmaId: veri.get('firmaId'),
    cari: (veri.get('cari') as string)?.trim() || null,
    aciklama: (veri.get('aciklama') as string)?.trim() || null,
    kalemler: JSON.parse((veri.get('kalemler') as string) || '[]'),
  }
  return irsaliyeSemasi.safeParse(ham)
}

function kalemleriHazirla(kalemler: z.infer<typeof kalemSemasi>[]) {
  return kalemler.map((k, sira) => ({
    sira,
    kategori: k.kategori || null,
    tur: k.tur || null,
    malzeme: k.malzeme,
    miktar: k.miktar,
    birim: k.birim,
    birimFiyat: k.birimFiyat ?? null,
    toplam: k.birimFiyat != null ? Number((k.miktar * k.birimFiyat).toFixed(2)) : null,
  }))
}

/** Serbest girilen malzeme/tür/birim değerlerini listelere ekler. */
async function listeleriGuncelle(kalemler: z.infer<typeof kalemSemasi>[], cari?: string | null) {
  const isler: Promise<unknown>[] = []
  for (const k of kalemler) {
    if (k.malzeme) isler.push(secenekEkle('MALZEME', k.malzeme))
    if (k.tur) isler.push(secenekEkle('TUR', k.tur))
    if (k.birim) isler.push(secenekEkle('BIRIM', k.birim))
    if (k.kategori) isler.push(secenekEkle('IRSALIYE_KATEGORI', k.kategori))
  }
  if (cari) isler.push(secenekEkle('CARI', cari))
  await Promise.all(isler)
}

export async function irsaliyeOlustur(_onceki: string | null | undefined, veri: FormData) {
  const kullanici = await gerekliKullanici(GIRIS_YAPABILIR)
  const sonuc = formuOku(veri)
  if (!sonuc.success) return sonuc.error.issues[0].message

  const g = sonuc.data

  if (g.no) {
    const cakisma = await db.irsaliye.findFirst({
      where: { firmaId: g.firmaId, no: g.no },
      include: { firma: true },
    })
    if (cakisma) {
      return `Bu irsaliye zaten kayıtlı: ${cakisma.firma.ad} – ${g.no} (#${cakisma.id})`
    }
  }

  let belgeId: number | null = null
  try {
    belgeId = await istegeBagliBelge(veri, 'belge', kullanici.id)
  } catch (e) {
    return e instanceof Error ? e.message : 'Belge yüklenemedi.'
  }

  const irsaliye = await db.irsaliye.create({
    data: {
      no: g.no,
      tarih: new Date(`${g.tarih}T00:00:00Z`),
      firmaId: g.firmaId,
      cari: g.cari,
      aciklama: g.aciklama,
      belgeId,
      girenId: kullanici.id,
      kalemler: { create: kalemleriHazirla(g.kalemler) },
    },
  })

  await listeleriGuncelle(g.kalemler, g.cari)
  await gunlukle(kullanici.id, 'OLUSTUR', 'Irsaliye', irsaliye.id, { no: g.no })

  revalidatePath('/irsaliye')
  redirect(`/irsaliye/${irsaliye.id}`)
}

export async function irsaliyeGuncelle(
  id: number,
  _onceki: string | null | undefined,
  veri: FormData,
) {
  const kullanici = await gerekliKullanici(GIRIS_YAPABILIR)
  const sonuc = formuOku(veri)
  if (!sonuc.success) return sonuc.error.issues[0].message

  const g = sonuc.data

  // İmzalanmış bir faturaya bağlı irsaliye değiştirilemez.
  const kilitli = await db.eslesme.findFirst({
    where: {
      irsaliyeId: id,
      fatura: { durum: { in: ['IMZALANDI', 'MERKEZ_ONAYLI', 'GONDERILDI'] } },
    },
    include: { fatura: true },
  })
  if (kilitli) {
    return `Bu irsaliye ${kilitli.fatura.no} numaralı faturayla imzalanmış; değiştirilemez.`
  }

  if (g.no) {
    const cakisma = await db.irsaliye.findFirst({
      where: { firmaId: g.firmaId, no: g.no, NOT: { id } },
    })
    if (cakisma) return `Bu irsaliye numarası aynı firmada zaten var (#${cakisma.id}).`
  }

  let belgeId: number | null = null
  try {
    belgeId = await istegeBagliBelge(veri, 'belge', kullanici.id)
  } catch (e) {
    return e instanceof Error ? e.message : 'Belge yüklenemedi.'
  }

  await db.$transaction([
    db.irsaliyeKalem.deleteMany({ where: { irsaliyeId: id } }),
    db.irsaliye.update({
      where: { id },
      data: {
        no: g.no,
        tarih: new Date(`${g.tarih}T00:00:00Z`),
        firmaId: g.firmaId,
        cari: g.cari,
        aciklama: g.aciklama,
        ...(belgeId ? { belgeId } : {}),
        kalemler: { create: kalemleriHazirla(g.kalemler) },
      },
    }),
  ])

  await listeleriGuncelle(g.kalemler, g.cari)
  await gunlukle(kullanici.id, 'GUNCELLE', 'Irsaliye', id)

  revalidatePath('/irsaliye')
  revalidatePath(`/irsaliye/${id}`)
  redirect(`/irsaliye/${id}`)
}

export async function irsaliyeSil(id: number) {
  const kullanici = await gerekliKullanici(GIRIS_YAPABILIR)

  const bagli = await db.eslesme.count({ where: { irsaliyeId: id } })
  if (bagli > 0) {
    throw new Error('Faturayla eşleşmiş irsaliye silinemez. Önce eşleşmeyi kaldırın.')
  }

  await db.irsaliye.delete({ where: { id } })
  await gunlukle(kullanici.id, 'SIL', 'Irsaliye', id)

  revalidatePath('/irsaliye')
  redirect('/irsaliye')
}
