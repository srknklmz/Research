const paraBicimi = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  minimumFractionDigits: 2,
})
const sayiBicimi = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 3 })
const tarihBicimi = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})
const zamanBicimi = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

type Sayisal = number | string | { toString(): string } | null | undefined

export function sayiya(d: Sayisal): number {
  if (d === null || d === undefined) return 0
  return typeof d === 'number' ? d : Number(d.toString())
}

export const para = (d: Sayisal) => paraBicimi.format(sayiya(d))
export const sayi = (d: Sayisal) => sayiBicimi.format(sayiya(d))
export const tarih = (d: Date | string | null | undefined) =>
  d ? tarihBicimi.format(new Date(d)) : '—'
export const zaman = (d: Date | string | null | undefined) =>
  d ? zamanBicimi.format(new Date(d)) : '—'

/** <input type="date"> için yyyy-MM-dd */
export function girdiTarihi(d: Date | string | null | undefined): string {
  if (!d) return ''
  const t = new Date(d)
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(
    t.getDate(),
  ).padStart(2, '0')}`
}

/** Tarayıcı yerel saatinden bağımsız, saf gün olarak tarih üretir. */
export function gunDegeri(metin: string): Date {
  const [y, a, g] = metin.split('-').map(Number)
  return new Date(Date.UTC(y, a - 1, g))
}
