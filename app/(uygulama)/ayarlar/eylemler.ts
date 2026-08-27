'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { Rol } from '@prisma/client'
import { ayarYaz } from '@/lib/ayar'
import { db } from '@/lib/db'
import { gunlukle } from '@/lib/gunluk'
import { gerekliKullanici, oturumKullanici } from '@/lib/oturum'
import { parolaDogrula, parolaOzetle } from '@/lib/parola'

const ROLLER = ['SANTIYE', 'IDARI_MUDUR', 'MERKEZ', 'YONETICI'] as const

export async function ayarlariKaydet(
  _onceki: string | null | undefined,
  veri: FormData,
) {
  const kullanici = await gerekliKullanici(['YONETICI'])

  for (const anahtar of ['sirket_adi', 'santiye_adi', 'musavir_adi']) {
    await ayarYaz(anahtar, String(veri.get(anahtar) ?? '').trim())
  }

  await gunlukle(kullanici.id, 'AYAR', 'Ayar')
  revalidatePath('/ayarlar')
  return 'Ayarlar kaydedildi.'
}

const kullaniciSemasi = z.object({
  ad: z.string().trim().min(2, 'Ad en az 2 karakter olmalı'),
  eposta: z.string().trim().toLowerCase().email('Geçerli bir e-posta girin'),
  rol: z.enum(ROLLER),
  parola: z.string().min(8, 'Parola en az 8 karakter olmalı'),
})

export async function kullaniciEkle(
  _onceki: string | null | undefined,
  veri: FormData,
) {
  const yonetici = await gerekliKullanici(['YONETICI'])

  const sonuc = kullaniciSemasi.safeParse({
    ad: veri.get('ad'),
    eposta: veri.get('eposta'),
    rol: veri.get('rol'),
    parola: veri.get('parola'),
  })
  if (!sonuc.success) return sonuc.error.issues[0].message

  const g = sonuc.data
  if (await db.kullanici.findUnique({ where: { eposta: g.eposta } })) {
    return 'Bu e-posta zaten kayıtlı.'
  }

  const yeni = await db.kullanici.create({
    data: {
      ad: g.ad,
      eposta: g.eposta,
      rol: g.rol as Rol,
      parolaHash: parolaOzetle(g.parola),
    },
  })

  await gunlukle(yonetici.id, 'KULLANICI_EKLE', 'Kullanici', yeni.id, {
    eposta: g.eposta,
    rol: g.rol,
  })
  revalidatePath('/ayarlar')
  return `${g.ad} eklendi.`
}

export async function kullaniciDurumDegistir(id: number) {
  const yonetici = await gerekliKullanici(['YONETICI'])
  if (id === yonetici.id) throw new Error('Kendi hesabınızı kapatamazsınız.')

  const k = await db.kullanici.findUnique({ where: { id } })
  if (!k) return

  await db.kullanici.update({ where: { id }, data: { aktif: !k.aktif } })
  await gunlukle(yonetici.id, k.aktif ? 'KULLANICI_KAPAT' : 'KULLANICI_AC', 'Kullanici', id)
  revalidatePath('/ayarlar')
}

export async function parolamiDegistir(
  _onceki: string | null | undefined,
  veri: FormData,
) {
  const kullanici = await oturumKullanici()
  if (!kullanici) return 'Oturum bulunamadı.'

  const eski = String(veri.get('eski') ?? '')
  const yeni = String(veri.get('yeni') ?? '')
  const tekrar = String(veri.get('tekrar') ?? '')

  if (yeni.length < 8) return 'Yeni parola en az 8 karakter olmalı.'
  if (yeni !== tekrar) return 'Yeni parolalar birbirini tutmuyor.'

  const kayit = await db.kullanici.findUnique({ where: { id: kullanici.id } })
  if (!kayit || !parolaDogrula(eski, kayit.parolaHash)) {
    return 'Mevcut parola hatalı.'
  }

  await db.kullanici.update({
    where: { id: kullanici.id },
    data: { parolaHash: parolaOzetle(yeni) },
  })
  await gunlukle(kullanici.id, 'PAROLA_DEGISTIR', 'Kullanici', kullanici.id)

  return 'Parolanız değiştirildi.'
}

export async function parolaSifirla(
  id: number,
  _onceki: string | null | undefined,
  veri: FormData,
) {
  const yonetici = await gerekliKullanici(['YONETICI'])
  const yeni = String(veri.get('parola') ?? '')
  if (yeni.length < 8) return 'Parola en az 8 karakter olmalı.'

  await db.kullanici.update({
    where: { id },
    data: { parolaHash: parolaOzetle(yeni) },
  })
  await gunlukle(yonetici.id, 'PAROLA_SIFIRLA', 'Kullanici', id)
  revalidatePath('/ayarlar')
  return 'Parola sıfırlandı.'
}
