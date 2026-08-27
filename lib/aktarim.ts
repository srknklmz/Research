import ExcelJS from 'exceljs'

export type Satir = Record<string, string>

/** Tırnaklı alanları ve gömülü satır sonlarını işleyen CSV çözümleyici. */
export function csvCoz(metin: string): string[][] {
  const temiz = metin.replace(/^﻿/, '')
  const ilkSatir = temiz.split('\n')[0] ?? ''
  const ayirici =
    (ilkSatir.match(/;/g)?.length ?? 0) > (ilkSatir.match(/,/g)?.length ?? 0)
      ? ';'
      : ','

  const satirlar: string[][] = []
  let alan = ''
  let satir: string[] = []
  let tirnakta = false

  for (let i = 0; i < temiz.length; i++) {
    const k = temiz[i]
    if (tirnakta) {
      if (k === '"') {
        if (temiz[i + 1] === '"') {
          alan += '"'
          i++
        } else {
          tirnakta = false
        }
      } else {
        alan += k
      }
    } else if (k === '"') {
      tirnakta = true
    } else if (k === ayirici) {
      satir.push(alan)
      alan = ''
    } else if (k === '\n') {
      satir.push(alan)
      satirlar.push(satir)
      satir = []
      alan = ''
    } else if (k !== '\r') {
      alan += k
    }
  }
  if (alan !== '' || satir.length) {
    satir.push(alan)
    satirlar.push(satir)
  }

  return satirlar.filter((s) => s.some((h) => h.trim() !== ''))
}

async function xlsxCoz(veri: Buffer): Promise<string[][]> {
  const kitap = new ExcelJS.Workbook()
  await kitap.xlsx.load(veri as unknown as ArrayBuffer)
  const sayfa = kitap.worksheets[0]
  if (!sayfa) return []

  const satirlar: string[][] = []
  sayfa.eachRow((satir) => {
    const hucreler: string[] = []
    const n = sayfa.columnCount
    for (let i = 1; i <= n; i++) {
      const d = satir.getCell(i).value
      if (d === null || d === undefined) hucreler.push('')
      else if (d instanceof Date) hucreler.push(d.toISOString().slice(0, 10))
      else if (typeof d === 'object' && 'text' in d) hucreler.push(String(d.text))
      else if (typeof d === 'object' && 'result' in d)
        hucreler.push(String(d.result ?? ''))
      else hucreler.push(String(d))
    }
    if (hucreler.some((h) => h.trim() !== '')) satirlar.push(hucreler)
  })
  return satirlar
}

/** Başlığı sadeleştirir: büyük harf, boşluk/nokta/iki nokta atılır. */
export function basligiSadelestir(b: string): string {
  return b
    .trim()
    .toLocaleUpperCase('tr')
    .replace(/[.:]/g, '')
    .replace(/\s+/g, ' ')
}

/** Dosyayı başlık satırına göre nesne dizisine çevirir. */
export async function dosyayiCoz(dosya: File): Promise<Satir[]> {
  const veri = Buffer.from(await dosya.arrayBuffer())
  const ad = dosya.name.toLocaleLowerCase('tr')

  const tablo =
    ad.endsWith('.xlsx') || ad.endsWith('.xlsm')
      ? await xlsxCoz(veri)
      : csvCoz(veri.toString('utf8'))

  if (tablo.length < 2) return []

  const basliklar = tablo[0].map(basligiSadelestir)
  return tablo.slice(1).map((s) => {
    const nesne: Satir = {}
    basliklar.forEach((b, i) => {
      if (b) nesne[b] = (s[i] ?? '').trim()
    })
    return nesne
  })
}

/** Bir satırdan, verilen adlardan ilk dolu olanı okur. */
export function alan(satir: Satir, ...adlar: string[]): string {
  for (const a of adlar) {
    const d = satir[basligiSadelestir(a)]
    if (d) return d
  }
  return ''
}

/** GG.AA.YYYY, GG/AA/YYYY ve YYYY-AA-GG biçimlerini kabul eder. */
export function tarihCoz(metin: string): string | null {
  const m = metin.trim()
  if (!m) return null

  let e = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(m)
  if (e) return `${e[1]}-${e[2].padStart(2, '0')}-${e[3].padStart(2, '0')}`

  e = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/.exec(m)
  if (e) return `${e[3]}-${e[2].padStart(2, '0')}-${e[1].padStart(2, '0')}`

  return null
}

/** "1.234,56", "1234.56" ve "1 234,56" biçimlerini sayıya çevirir. */
export function sayiCoz(metin: string): number | null {
  let m = metin.trim().replace(/[₺\s]/g, '').replace(/TL$/i, '')
  if (!m) return null

  const sonVirgul = m.lastIndexOf(',')
  const sonNokta = m.lastIndexOf('.')

  if (sonVirgul > sonNokta) {
    // Türkçe biçim: nokta binlik, virgül ondalık. Örn 1.234,56
    m = m.replace(/\./g, '').replace(',', '.')
  } else if (sonNokta > -1) {
    // Yalnızca nokta var. Üçerli gruplama ise binlik ayracıdır (1.250 -> 1250),
    // değilse ondalık noktadır (28.50 -> 28,5).
    m = /^\d{1,3}(\.\d{3})+$/.test(m) ? m.replace(/\./g, '') : m
  }

  const d = Number(m)
  return Number.isFinite(d) ? d : null
}
