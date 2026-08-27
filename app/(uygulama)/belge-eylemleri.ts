'use server'

import { yuklemeSlotuAc, type YuklemeSlotu } from '@/lib/depo'
import { gerekliKullanici } from '@/lib/oturum'
import { GIRIS_YAPABILIR } from '@/lib/yetki'

/** Tarayıcının doğrudan depoya yükleyebilmesi için imzalı adres açar. */
export async function yuklemeSlotu(): Promise<YuklemeSlotu | null> {
  await gerekliKullanici(GIRIS_YAPABILIR)
  return yuklemeSlotuAc()
}
