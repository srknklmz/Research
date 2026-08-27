import { cache } from 'react'
import { db } from './db'

export type Ayarlar = Record<string, string>

export const ayarlar = cache(async (): Promise<Ayarlar> => {
  const kayitlar = await db.ayar.findMany()
  return Object.fromEntries(kayitlar.map((a) => [a.anahtar, a.deger]))
})

export async function ayarYaz(anahtar: string, deger: string) {
  await db.ayar.upsert({
    where: { anahtar },
    update: { deger },
    create: { anahtar, deger },
  })
}
