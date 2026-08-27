'use server'

import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { istekBilgisi, oturumAc } from '@/lib/oturum'
import { parolaDogrula } from '@/lib/parola'

export async function girisYap(_onceki: string | null | undefined, veri: FormData) {
  const eposta = String(veri.get('eposta') ?? '')
    .trim()
    .toLowerCase()
  const parola = String(veri.get('parola') ?? '')

  if (!eposta || !parola) return 'E-posta ve parola gerekli.'

  const kullanici = await db.kullanici.findUnique({ where: { eposta } })
  // Kullanıcı yoksa da parola doğrulaması yapılır ki yanıt süresi
  // hesabın var olup olmadığını ele vermesin.
  const gecerli = parolaDogrula(
    parola,
    kullanici?.parolaHash ?? 'a'.repeat(32) + ':' + 'b'.repeat(128),
  )

  if (!kullanici || !kullanici.aktif || !gecerli) {
    return 'E-posta ya da parola hatalı.'
  }

  const { ip } = await istekBilgisi()
  await db.islem.create({
    data: { kullaniciId: kullanici.id, tur: 'GIRIS', nesne: 'Kullanici', nesneId: kullanici.id, ip },
  })

  await oturumAc(kullanici.id)
  redirect('/')
}
