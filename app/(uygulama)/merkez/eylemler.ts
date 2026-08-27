'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { anlikGoruntu, gonderimNoUret } from '@/lib/akis'
import { db } from '@/lib/db'
import { gunlukle } from '@/lib/gunluk'
import { gerekliKullanici, istekBilgisi } from '@/lib/oturum'
import { MERKEZ_ONAYLAR } from '@/lib/yetki'

export async function merkezOnayla(faturaId: number) {
  const kullanici = await gerekliKullanici(MERKEZ_ONAYLAR)

  const fatura = await db.fatura.findUnique({ where: { id: faturaId } })
  if (!fatura) return
  if (fatura.durum !== 'IMZALANDI') {
    throw new Error('Yalnızca idari müdürün imzaladığı faturalar onaylanabilir.')
  }

  const { goruntu, ozet } = await anlikGoruntu(faturaId)
  const { ip, tarayici } = await istekBilgisi()

  await db.$transaction([
    db.onay.create({
      data: {
        faturaId,
        tip: 'MERKEZ_ONAY',
        kullaniciId: kullanici.id,
        kullaniciAd: kullanici.ad,
        kullaniciEposta: kullanici.eposta,
        kullaniciRol: kullanici.rol,
        ip,
        tarayici,
        ozet,
        anlik: goruntu as never,
      },
    }),
    db.fatura.update({ where: { id: faturaId }, data: { durum: 'MERKEZ_ONAYLI' } }),
  ])

  await gunlukle(kullanici.id, 'MERKEZ_ONAY', 'Fatura', faturaId, { ozet })
  revalidatePath('/merkez')
  revalidatePath(`/fatura/${faturaId}`)
}

export async function merkezReddet(
  faturaId: number,
  _onceki: string | null | undefined,
  veri: FormData,
) {
  const kullanici = await gerekliKullanici(MERKEZ_ONAYLAR)
  const not = (veri.get('not') as string)?.trim()
  if (!not) return 'Geri gönderme sebebini yazın.'

  const fatura = await db.fatura.findUnique({ where: { id: faturaId } })
  if (!fatura) return 'Fatura bulunamadı.'
  if (!['IMZALANDI', 'MERKEZ_ONAYLI'].includes(fatura.durum)) {
    return 'Bu fatura merkez kuyruğunda değil.'
  }

  const { goruntu, ozet } = await anlikGoruntu(faturaId)
  const { ip, tarayici } = await istekBilgisi()

  await db.$transaction([
    db.onay.create({
      data: {
        faturaId,
        tip: 'MERKEZ_RED',
        kullaniciId: kullanici.id,
        kullaniciAd: kullanici.ad,
        kullaniciEposta: kullanici.eposta,
        kullaniciRol: kullanici.rol,
        ip,
        tarayici,
        ozet,
        anlik: goruntu as never,
        not,
      },
    }),
    db.fatura.update({ where: { id: faturaId }, data: { durum: 'REDDEDILDI' } }),
  ])

  await gunlukle(kullanici.id, 'MERKEZ_RED', 'Fatura', faturaId, { not })
  revalidatePath('/merkez')
  revalidatePath(`/fatura/${faturaId}`)
  redirect('/merkez')
}

/** Onaylanmış faturaları tek bir gönderim paketinde müşavire iletir. */
export async function gonderimOlustur(
  _onceki: string | null | undefined,
  veri: FormData,
) {
  const kullanici = await gerekliKullanici(MERKEZ_ONAYLAR)

  const secilen = veri
    .getAll('fatura')
    .map((d) => Number(d))
    .filter((n) => Number.isInteger(n) && n > 0)

  if (secilen.length === 0) return 'En az bir fatura seçin.'

  const uygun = await db.fatura.findMany({
    where: { id: { in: secilen }, durum: 'MERKEZ_ONAYLI' },
    select: { id: true },
  })
  if (uygun.length !== secilen.length) {
    return 'Seçilen faturalardan biri merkez onaylı değil. Sayfayı yenileyin.'
  }

  const veriler = {
    musavir: (veri.get('musavir') as string)?.trim() || null,
    not: (veri.get('not') as string)?.trim() || null,
    olusturanId: kullanici.id,
    faturalar: { connect: uygun.map((f) => ({ id: f.id })) },
  }

  // Gönderim numarası son kayda bakılarak üretiliyor; iki kişi aynı anda
  // gönderim oluşturursa numara çakışabilir. Çakışmada bir sonrakini dener.
  let gonderim
  for (let deneme = 0; ; deneme++) {
    try {
      gonderim = await db.gonderim.create({
        data: { no: await gonderimNoUret(), ...veriler },
      })
      break
    } catch (e) {
      const cakisma =
        typeof e === 'object' && e !== null && 'code' in e && e.code === 'P2002'
      if (!cakisma || deneme >= 4) throw e
    }
  }

  await db.fatura.updateMany({
    where: { id: { in: uygun.map((f) => f.id) } },
    data: { durum: 'GONDERILDI' },
  })

  await gunlukle(kullanici.id, 'GONDERIM', 'Gonderim', gonderim.id, {
    no: gonderim.no,
    adet: uygun.length,
  })

  revalidatePath('/merkez')
  redirect(`/merkez/gonderim/${gonderim.id}`)
}
