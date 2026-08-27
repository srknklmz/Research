import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PrismaClient, type Rol } from '@prisma/client'
import { parolaOzetle } from '../lib/parola'

const db = new PrismaClient()
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

const VARSAYILAN_PAROLA = process.env.TOHUM_PAROLA ?? 'degistir123'

const KULLANICILAR: { ad: string; eposta: string; rol: Rol }[] = [
  { ad: 'Yönetici', eposta: 'yonetici@sirket.com', rol: 'YONETICI' },
  { ad: 'Şantiye Kaydı', eposta: 'santiye@sirket.com', rol: 'SANTIYE' },
  { ad: 'İdari Müdür', eposta: 'idari@sirket.com', rol: 'IDARI_MUDUR' },
  { ad: 'Merkez Muhasebe', eposta: 'merkez@sirket.com', rol: 'MERKEZ' },
]

async function secenekler() {
  const listeler: Record<string, string[]> = tohum('irsaliye-listeler.json')
  const gruplar: [string, string[]][] = [
    ['BIRIM', listeler['BİRİM']],
    ['CARI', listeler['CARİ']],
    ['IRSALIYE_KATEGORI', listeler['KATEGORİ']],
    ['TUR', listeler['TÜR']],
    ['MALZEME', listeler['MALZEME']],
    ['FATURA_KATEGORI', FATURA_KATEGORI],
    ['ODEME', ODEME],
  ]
  let n = 0
  for (const [grup, degerler] of gruplar) {
    for (const [sira, deger] of degerler.entries()) {
      await db.secenek.upsert({
        where: { grup_deger: { grup, deger } },
        update: { sira },
        create: { grup, deger, sira },
      })
      n++
    }
  }
  return n
}

async function firmalar() {
  const adlar: string[] = tohum('firmalar.json')
  for (const ad of adlar) {
    await db.firma.upsert({ where: { ad }, update: {}, create: { ad } })
  }
  return adlar.length
}

async function kullanicilar() {
  for (const k of KULLANICILAR) {
    await db.kullanici.upsert({
      where: { eposta: k.eposta },
      update: { ad: k.ad, rol: k.rol },
      create: { ...k, parolaHash: parolaOzetle(VARSAYILAN_PAROLA) },
    })
  }
  return KULLANICILAR.length
}

async function ayarlar() {
  const varsayilan = {
    sirket_adi: 'Şirket Adı',
    santiye_adi: 'Şantiye',
    musavir_adi: '',
  }
  for (const [anahtar, deger] of Object.entries(varsayilan)) {
    await db.ayar.upsert({ where: { anahtar }, update: {}, create: { anahtar, deger } })
  }
}

async function main() {
  console.log('secenek :', await secenekler())
  console.log('firma   :', await firmalar())
  console.log('kullanici:', await kullanicilar(), `(parola: ${VARSAYILAN_PAROLA})`)
  await ayarlar()
  console.log('ayar    : tamam')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
