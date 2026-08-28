/**
 * Supabase SQL Editor'e yapıştırılabilecek tek dosyalık kurulum betiği üretir:
 * şema (Prisma'dan) + tohum verisi. Şema değişince yeniden çalıştırın:
 *   npm run db:sql
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parolaOzetle } from '../lib/parola'

const tohum = (ad: string) =>
  JSON.parse(readFileSync(join(__dirname, 'tohum', ad), 'utf8'))

const FATURA_KATEGORI = [
  'YEMEK', 'NALBUR VE HIRDAVAT', 'YAPI MALZEMESİ', 'TESİSAT MALZEMESİ',
  'MARKET', 'KIRTASİYE', 'ARAÇ', 'KONAKLAMA', 'NAKLİYE', 'KİRALAMA', 'İŞÇİLİK',
]
const ODEME = [
  'YENİ GİRİLDİ', 'BEKLEMEDE', 'ÖDEME LİSTESİNDE', 'KISMİ ÖDENDİ',
  'ÖDEME YAPILDI', 'K.K. İLE ÖDEME YAPILDI', 'CARİ', 'FATURA İPTAL',
]
const KULLANICILAR = [
  ['Yönetici', 'yonetici@sirket.com', 'YONETICI'],
  ['Şantiye Kaydı', 'santiye@sirket.com', 'SANTIYE'],
  ['İdari Müdür', 'idari@sirket.com', 'IDARI_MUDUR'],
  ['Merkez Muhasebe', 'merkez@sirket.com', 'MERKEZ'],
] as const

const PAROLA = process.env.TOHUM_PAROLA ?? 'degistir123'

const q = (d: string) => `'${d.replace(/'/g, "''")}'`

/** Tek sütunlu uzun listeler: unnest ile derli toplu yazılır. */
function listeEkle(
  tablo: string,
  sutun: string,
  degerler: string[],
  cakisma: string,
  sabitler: [string, string][] = [],
  siraSutunu?: string,
) {
  const onEk = sabitler.map(([, d]) => d).join(', ')
  const sutunlar = [...sabitler.map(([s]) => `"${s}"`), `"${sutun}"`]
  if (siraSutunu) sutunlar.push(`"${siraSutunu}"`)

  const govde: string[] = []
  for (let i = 0; i < degerler.length; i += 12) {
    govde.push('  ' + degerler.slice(i, i + 12).map(q).join(', '))
  }

  return (
    `INSERT INTO "${tablo}" (${sutunlar.join(', ')})\n` +
    `SELECT ${onEk ? onEk + ', ' : ''}d${siraSutunu ? ', i - 1' : ''} FROM unnest(ARRAY[\n` +
    govde.join(',\n') +
    `\n]) ${siraSutunu ? 'WITH ORDINALITY AS t(d, i)' : 'AS t(d)'}\n` +
    `ON CONFLICT (${cakisma}) DO NOTHING;`
  )
}

/** Az sayıda, çok sütunlu kayıtlar. */
function ekle(tablo: string, sutunlar: string[], satirlar: string[][], cakisma: string) {
  return (
    `INSERT INTO "${tablo}" (${sutunlar.map((s) => `"${s}"`).join(', ')}) VALUES\n` +
    satirlar.map((s) => `  (${s.join(', ')})`).join(',\n') +
    `\nON CONFLICT (${cakisma}) DO NOTHING;`
  )
}

function sema(): string {
  return execFileSync(
    'npx',
    ['prisma', 'migrate', 'diff', '--from-empty', '--to-schema-datamodel',
     join(__dirname, 'schema.prisma'), '--script'],
    { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
  ).trim()
}

function tohumVerisi(): string {
  const listeler: Record<string, string[]> = tohum('irsaliye-listeler.json')
  const firmalar: string[] = tohum('firmalar.json')

  const gruplar: [string, string[]][] = [
    ['BIRIM', listeler['BİRİM']],
    ['CARI', listeler['CARİ']],
    ['IRSALIYE_KATEGORI', listeler['KATEGORİ']],
    ['TUR', listeler['TÜR']],
    ['MALZEME', listeler['MALZEME']],
    ['FATURA_KATEGORI', FATURA_KATEGORI],
    ['ODEME', ODEME],
  ]

  const toplamSecenek = gruplar.reduce((t, [, d]) => t + d.length, 0)

  return [
    `-- ${firmalar.length} firma`,
    listeEkle('Firma', 'ad', firmalar, '"ad"'),
    '',
    `-- ${toplamSecenek} açılır liste değeri`,
    ...gruplar.map(([grup, degerler]) =>
      `-- ${grup} (${degerler.length})\n` +
      listeEkle('Secenek', 'deger', degerler, '"grup", "deger"', [['grup', q(grup)]], 'sira'),
    ),
    '',
    `-- Kullanıcılar (parola: ${PAROLA})`,
    ekle(
      'Kullanici',
      ['ad', 'eposta', 'parolaHash', 'rol'],
      KULLANICILAR.map(([ad, eposta, rol]) => [
        q(ad), q(eposta), q(parolaOzetle(PAROLA)), `'${rol}'`,
      ]),
      '"eposta"',
    ),
    '',
    '-- Ayarlar',
    ekle(
      'Ayar',
      ['anahtar', 'deger'],
      [
        [q('sirket_adi'), q('Şirket Adı')],
        [q('santiye_adi'), q('Şantiye')],
        [q('musavir_adi'), q('')],
      ],
      '"anahtar"',
    ),
  ].join('\n')
}

const cikti = `-- İrsaliye – Fatura Sistemi · tek dosyalık kurulum
--
-- Bu dosyayı Supabase panelinde SQL Editor'e yapıştırıp çalıştırın.
--
-- BOŞ bir veritabanında BİR KEZ çalıştırılmak üzere üretilmiştir. İkinci kez
-- çalıştırırsanız şema kısmı "already exists" hatası verip durur; veri
-- değişmez, zararı olmaz. Tohum kayıtları ayrıca ON CONFLICT DO NOTHING ile
-- korunur.
--
-- Üreten: npm run db:sql  (prisma/sql-uret.ts)
-- Şema değiştiğinde bu dosyayı yeniden üretin.

${sema()}

-- ============================================================
--  TOHUM VERİSİ
-- ============================================================

${tohumVerisi()}
`

const hedef = join(__dirname, 'kurulum.sql')
writeFileSync(hedef, cikti)
console.log(`yazıldı: ${hedef} (${cikti.split('\n').length} satır)`)
