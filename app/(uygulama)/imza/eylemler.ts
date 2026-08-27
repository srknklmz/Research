'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { anlikGoruntu } from '@/lib/akis'
import { db } from '@/lib/db'
import { gunlukle } from '@/lib/gunluk'
import { gerekliKullanici, istekBilgisi } from '@/lib/oturum'
import { IMZALAYABILIR } from '@/lib/yetki'

/**
 * İdari müdürün imzası. İmza anındaki fatura + irsaliye görüntüsü ve onun
 * sha256 özeti kayda geçer; sonradan bir şey değişirse fark edilir.
 */
export async function imzala(
  faturaId: number,
  _onceki: string | null | undefined,
  veri: FormData,
) {
  const kullanici = await gerekliKullanici(IMZALAYABILIR)

  const fatura = await db.fatura.findUnique({ where: { id: faturaId } })
  if (!fatura) return 'Fatura bulunamadı.'
  if (fatura.durum !== 'ESLESTI') {
    return 'Bu fatura imzaya hazır değil. Önce irsaliyesi eşleştirilmeli.'
  }

  const { goruntu, ozet } = await anlikGoruntu(faturaId)
  const { ip, tarayici } = await istekBilgisi()
  const not = (veri.get('not') as string)?.trim() || null

  await db.$transaction([
    db.onay.create({
      data: {
        faturaId,
        tip: 'IMZA',
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
    db.fatura.update({ where: { id: faturaId }, data: { durum: 'IMZALANDI' } }),
  ])

  await gunlukle(kullanici.id, 'IMZALA', 'Fatura', faturaId, { ozet })

  revalidatePath('/imza')
  revalidatePath(`/fatura/${faturaId}`)
  redirect('/imza')
}

export async function reddet(
  faturaId: number,
  _onceki: string | null | undefined,
  veri: FormData,
) {
  const kullanici = await gerekliKullanici(IMZALAYABILIR)
  const not = (veri.get('not') as string)?.trim()
  if (!not) return 'Geri gönderme sebebini yazın.'

  const fatura = await db.fatura.findUnique({ where: { id: faturaId } })
  if (!fatura) return 'Fatura bulunamadı.'
  if (fatura.durum !== 'ESLESTI') return 'Bu fatura imza kuyruğunda değil.'

  const { goruntu, ozet } = await anlikGoruntu(faturaId)
  const { ip, tarayici } = await istekBilgisi()

  await db.$transaction([
    db.onay.create({
      data: {
        faturaId,
        tip: 'RED',
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

  await gunlukle(kullanici.id, 'RED', 'Fatura', faturaId, { not })

  revalidatePath('/imza')
  revalidatePath(`/fatura/${faturaId}`)
  redirect('/imza')
}

/** İmzayı geri alır. Merkez onayladıysa artık geri alınamaz. */
export async function imzayiGeriAl(faturaId: number) {
  const kullanici = await gerekliKullanici(IMZALAYABILIR)

  const fatura = await db.fatura.findUnique({ where: { id: faturaId } })
  if (!fatura) return
  if (fatura.durum !== 'IMZALANDI') {
    throw new Error(
      'Yalnızca merkez onayına girmemiş imzalar geri alınabilir.',
    )
  }

  await db.fatura.update({ where: { id: faturaId }, data: { durum: 'ESLESTI' } })
  await gunlukle(kullanici.id, 'IMZA_GERI_AL', 'Fatura', faturaId)

  revalidatePath('/imza')
  revalidatePath(`/fatura/${faturaId}`)
}
