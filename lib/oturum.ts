import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import type { Rol } from '@prisma/client'
import { db } from './db'

const COOKIE = 'oturum'
const SURE_MS = 12 * 60 * 60 * 1000 // 12 saat

function anahtar(): string {
  const a = process.env.OTURUM_ANAHTARI
  if (!a || a.length < 32) {
    throw new Error('OTURUM_ANAHTARI tanımlı değil ya da 32 karakterden kısa.')
  }
  return a
}

function imzala(govde: string): string {
  return createHmac('sha256', anahtar()).update(govde).digest('base64url')
}

function jetonUret(kullaniciId: number): string {
  const govde = Buffer.from(
    JSON.stringify({ k: kullaniciId, s: Date.now() + SURE_MS }),
  ).toString('base64url')
  return `${govde}.${imzala(govde)}`
}

function jetonCoz(jeton: string): number | null {
  const [govde, imza] = jeton.split('.')
  if (!govde || !imza) return null
  const beklenen = Buffer.from(imzala(govde))
  const gelen = Buffer.from(imza)
  if (beklenen.length !== gelen.length || !timingSafeEqual(beklenen, gelen)) return null
  try {
    const { k, s } = JSON.parse(Buffer.from(govde, 'base64url').toString())
    if (typeof k !== 'number' || typeof s !== 'number' || s < Date.now()) return null
    return k
  } catch {
    return null
  }
}

export async function oturumAc(kullaniciId: number) {
  const kutu = await cookies()
  kutu.set(COOKIE, jetonUret(kullaniciId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SURE_MS / 1000,
  })
}

export async function oturumKapat() {
  const kutu = await cookies()
  kutu.delete(COOKIE)
}

/** Oturumdaki kullanıcı; yoksa null. İstek başına bir kez sorgulanır. */
export const oturumKullanici = cache(async () => {
  const jeton = (await cookies()).get(COOKIE)?.value
  if (!jeton) return null
  const id = jetonCoz(jeton)
  if (!id) return null
  const k = await db.kullanici.findUnique({
    where: { id },
    select: { id: true, ad: true, eposta: true, rol: true, aktif: true },
  })
  return k?.aktif ? k : null
})

/** Oturum yoksa /giris'e yollar. Rol verilirse yetkisizde /yetkisiz'e yollar. */
export async function gerekliKullanici(roller?: Rol[]) {
  const k = await oturumKullanici()
  if (!k) redirect('/giris')
  if (roller && !roller.includes(k.rol) && k.rol !== 'YONETICI') redirect('/yetkisiz')
  return k
}

export async function istekBilgisi() {
  const h = await headers()
  return {
    ip:
      h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      h.get('x-real-ip') ??
      null,
    tarayici: h.get('user-agent'),
  }
}
