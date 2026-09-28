// Tarihler veritabanından "YYYY-MM-DD" olarak gelir. Saat dilimi kaymasın
// diye hepsi UTC gece yarısı olarak işlenir; "bugün" de sunucudan
// (Europe/Istanbul) gelir.

import type { Degisiklik, Kalem } from './api'

const GUN = 86_400_000

function utc(tarih: string): number {
  const [y, a, g] = tarih.split('-').map(Number)
  return Date.UTC(y, a - 1, g)
}

/** b - a, gün olarak. */
export function gunFarki(a: string, b: string): number {
  return Math.round((utc(b) - utc(a)) / GUN)
}

export function gunEkle(tarih: string, gun: number): string {
  return new Date(utc(tarih) + gun * GUN).toISOString().slice(0, 10)
}

const kisa = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const uzun = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

/** Bu yıl içindeyse "8 Eki", değilse "8 Eki 2027". */
export function tarihYaz(tarih: string, bugun: string): string {
  const d = new Date(utc(tarih))
  return tarih.slice(0, 4) === bugun.slice(0, 4) ? kisa.format(d) : uzun.format(d)
}

export type Durum = 'gecikti' | 'yakin' | 'yolunda' | 'bitti'

/** Bu kadar gün (dahil) içinde bitmesi gereken imalat "yakın" sayılır. */
export const YAKIN_GUN = 7

export function durum(k: Pick<Kalem, 'durum' | 'hedef'>, bugun: string): Durum {
  if (k.durum === 'bitti') return 'bitti'
  const kalan = gunFarki(bugun, k.hedef)
  if (kalan < 0) return 'gecikti'
  if (kalan <= YAKIN_GUN) return 'yakin'
  return 'yolunda'
}

export function kalanYaz(hedef: string, bugun: string): string {
  const n = gunFarki(bugun, hedef)
  if (n < 0) return `${-n} gün gecikti`
  if (n === 0) return 'Bugün'
  if (n === 1) return 'Yarın'
  return `${n} gün kaldı`
}

/** İlk hedefe göre kaç gün kaydı (+ geç, − erken). */
export function kayma(k: Pick<Kalem, 'ilk_hedef' | 'hedef'>): number {
  return gunFarki(k.ilk_hedef, k.hedef)
}

export type Sonuc = 'ilk_hedefte' | 'revize_hedefte' | 'gec'

/** Biten imalat hedefini tuttu mu? */
export function sonuc(k: Pick<Kalem, 'ilk_hedef' | 'hedef' | 'bitis'>): Sonuc {
  const bitis = k.bitis!
  if (gunFarki(bitis, k.ilk_hedef) >= 0) return 'ilk_hedefte'
  if (gunFarki(bitis, k.hedef) >= 0) return 'revize_hedefte'
  return 'gec'
}

export function gunYaz(n: number): string {
  return `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n)} gün`
}

const saat = new Intl.DateTimeFormat('tr-TR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Istanbul',
})
const gunTr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' })

/** Bir zaman damgasının İstanbul'daki günü, "YYYY-MM-DD". */
export function istanbulGunu(zaman: string): string {
  return gunTr.format(new Date(zaman))
}

/** Değişiklik zamanı: "bugün 14:05", "dün 09:12", "3 gün önce". */
export function zamanYaz(zaman: string, bugun: string): string {
  const d = new Date(zaman)
  const fark = gunFarki(istanbulGunu(zaman), bugun)
  if (fark <= 0) return `bugün ${saat.format(d)}`
  if (fark === 1) return `dün ${saat.format(d)}`
  return `${fark} gün önce`
}

/** Geçmişteki bir kaydın tek satırlık özeti. */
export function degisiklikYaz(
  d: Pick<Degisiklik, 'tur' | 'eski_hedef' | 'yeni_hedef'>,
  bugun: string,
): string {
  const t = (x: string | null) => (x ? tarihYaz(x, bugun) : '')
  switch (d.tur) {
    case 'olusturma':
      return `Yeni imalat · hedef ${t(d.yeni_hedef)}`
    case 'tarih': {
      const fark = gunFarki(d.eski_hedef!, d.yeni_hedef!)
      return `Hedef ${t(d.eski_hedef)} → ${t(d.yeni_hedef)} (${gunYaz(fark)})`
    }
    case 'bitti':
      return `Bitti · ${t(d.yeni_hedef)} (hedef ${t(d.eski_hedef)})`
    case 'geri_acildi':
      return 'Yeniden açıldı'
    case 'duzenleme':
      return d.yeni_hedef
        ? `Bilgiler düzeltildi · hedef ${t(d.eski_hedef)} → ${t(d.yeni_hedef)}`
        : 'Bilgiler düzeltildi'
  }
}

/** Takvim ayı ekler; ayın son gününü aşarsa ayın son gününe oturur (31 Oca + 1 ay = 28 Şub). */
export function ayEkle(tarih: string, ay: number): string {
  const [y, a, g] = tarih.split('-').map(Number)
  const son = new Date(Date.UTC(y, a - 1 + ay + 1, 0)).getUTCDate()
  return new Date(Date.UTC(y, a - 1 + ay, Math.min(g, son))).toISOString().slice(0, 10)
}
