import { createHmac } from 'node:crypto'

/**
 * Elle girilmesi gereken ayarı en aza indirmek için, belirtilmeyen değerleri
 * DATABASE_URL'den türetiriz. Supabase bağlantı adresi proje kodunu zaten
 * içerir; ondan hem proje adresi hem de oturum anahtarı çıkarılabilir.
 */

/** Supabase proje kodu (ör. kgitbzjzsltgomslnyod). */
export function projeKodu(): string | null {
  const url = process.env.DATABASE_URL
  if (!url) return null

  // Havuz adresi: postgresql://postgres.<kod>:parola@...pooler.supabase.com
  const havuz = /:\/\/postgres\.([a-z0-9]{16,})[:@]/i.exec(url)
  if (havuz) return havuz[1]

  // Doğrudan adres: postgresql://postgres:parola@db.<kod>.supabase.co
  const dogrudan = /@db\.([a-z0-9]{16,})\.supabase\.co/i.exec(url)
  if (dogrudan) return dogrudan[1]

  return null
}

/** SUPABASE_URL verilmemişse bağlantı adresinden türetir. */
export function supabaseAdresi(): string | null {
  const acik = process.env.SUPABASE_URL?.trim()
  if (acik) return acik.replace(/\/$/, '')

  const kod = projeKodu()
  return kod ? `https://${kod}.supabase.co` : null
}

export function supabaseAdresiTuretildi(): boolean {
  return !process.env.SUPABASE_URL?.trim() && Boolean(projeKodu())
}

/**
 * OTURUM_ANAHTARI verilmemişse DATABASE_URL'den türetilir. Bağlantı adresi
 * zaten en gizli değerimiz; ona erişen kişi veritabanının tamamına erişiyor
 * demektir, dolayısıyla ondan anahtar türetmek güvenlik seviyesini
 * düşürmez. Yine de açıkça vermek tercih edilir: adres değişirse herkesin
 * oturumu düşer.
 */
export function oturumAnahtari(): string | null {
  const acik = process.env.OTURUM_ANAHTARI
  if (acik && acik.length >= 32) return acik

  const temel = process.env.DATABASE_URL
  if (!temel) return null

  return createHmac('sha256', temel).update('oturum-anahtari-v1').digest('hex')
}

export function oturumAnahtariTuretildi(): boolean {
  const acik = process.env.OTURUM_ANAHTARI
  return !(acik && acik.length >= 32) && Boolean(process.env.DATABASE_URL)
}
