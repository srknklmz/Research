'use server'

import { redirect } from 'next/navigation'
import { oturumKapat } from '@/lib/oturum'

export async function cikisYap() {
  await oturumKapat()
  redirect('/giris')
}
