'use server'

import { revalidatePath } from 'next/cache'
import { alan, dosyayiCoz, sayiCoz, tarihCoz, type Satir } from '@/lib/aktarim'
import { db } from '@/lib/db'
import { gunlukle } from '@/lib/gunluk'
import { gerekliKullanici } from '@/lib/oturum'
import { secenekEkle } from '@/lib/secenek'
import { GIRIS_YAPABILIR } from '@/lib/yetki'
import type {
  AktarimSonucu,
  FaturaTaslak,
  IrsaliyeTaslak,
  Sorun,
} from './tipler'

type IrsaliyeGrubu = {
  no: string | null
  tarih: string
  firma: string
  cari: string | null
  aciklama: string | null
  kalemler: {
    kategori: string | null
    tur: string | null
    malzeme: string
    miktar: number
    birim: string
    birimFiyat: number | null
  }[]
}

/** Satırları irsaliye başlıklarına göre gruplar (Notion dışa aktarımı satır bazlıdır). */
function irsaliyeleriGrupla(satirlar: Satir[]) {
  const sorunlar: Sorun[] = []
  const gruplar = new Map<string, IrsaliyeGrubu>()

  satirlar.forEach((s, i) => {
    const satirNo = i + 2 // başlık satırı 1
    const firma = alan(s, 'FİRMA ADI', 'FIRMA ADI', 'FİRMA', 'SATICI')
    const tarihHam = alan(s, 'TARİH', 'TARIH')
    const malzeme = alan(s, 'MALZEME', 'ÜRÜN', 'AÇIKLAMA')
    const miktarHam = alan(s, 'MİKTAR', 'MIKTAR')
    const birim = alan(s, 'BİRİM', 'BIRIM') || 'ADET'

    if (!firma) return void sorunlar.push({ satir: satirNo, mesaj: 'Firma adı boş' })
    const tarih = tarihCoz(tarihHam)
    if (!tarih)
      return void sorunlar.push({
        satir: satirNo,
        mesaj: `Tarih okunamadı: "${tarihHam}"`,
      })
    if (!malzeme)
      return void sorunlar.push({ satir: satirNo, mesaj: 'Malzeme boş' })

    const miktar = sayiCoz(miktarHam)
    if (miktar === null || miktar <= 0)
      return void sorunlar.push({
        satir: satirNo,
        mesaj: `Miktar okunamadı: "${miktarHam}"`,
      })

    const no = alan(s, 'İRSALİYE NO', 'IRSALIYE NO', 'İRSALİYE NO.', 'NO') || null
    const anahtar = `${firma}||${no ?? `SATIR${satirNo}`}||${tarih}`

    const mevcut = gruplar.get(anahtar) ?? {
      no,
      tarih,
      firma,
      cari: alan(s, 'CARİ', 'CARI', 'TAŞERON') || null,
      aciklama: alan(s, 'NOT') || null,
      kalemler: [],
    }

    const birimFiyat = sayiCoz(alan(s, 'BİRİM FİYAT', 'BIRIM FIYAT', 'FİYAT'))
    mevcut.kalemler.push({
      kategori: alan(s, 'KATEGORİ', 'KATEGORI') || null,
      tur: alan(s, 'TÜR', 'TUR') || null,
      malzeme,
      miktar,
      birim,
      birimFiyat,
    })
    gruplar.set(anahtar, mevcut)
  })

  return { gruplar, sorunlar }
}

function faturalariCoz(satirlar: Satir[]) {
  const sorunlar: Sorun[] = []
  const kayitlar: (FaturaTaslak & { aciklama: string | null; odeme: string | null })[] = []

  satirlar.forEach((s, i) => {
    const satirNo = i + 2
    const no = alan(s, 'FATURA NO', 'FATURA NO.', 'NO')
    const firma = alan(s, 'FİRMA ADI', 'FIRMA ADI', 'FİRMA')
    const tarihHam = alan(s, 'TARİH', 'TARIH')
    const tutarHam = alan(s, 'TUTAR', 'TOPLAM', 'GENEL TOPLAM')

    if (!no) return void sorunlar.push({ satir: satirNo, mesaj: 'Fatura no boş' })
    if (!firma) return void sorunlar.push({ satir: satirNo, mesaj: 'Firma adı boş' })

    const tarih = tarihCoz(tarihHam)
    if (!tarih)
      return void sorunlar.push({
        satir: satirNo,
        mesaj: `Tarih okunamadı: "${tarihHam}"`,
      })

    const tutar = sayiCoz(tutarHam)
    if (tutar === null)
      return void sorunlar.push({
        satir: satirNo,
        mesaj: `Tutar okunamadı: "${tutarHam}"`,
      })

    kayitlar.push({
      no,
      tarih,
      firma,
      tutar,
      kategori: alan(s, 'KATEGORİ', 'KATEGORI') || null,
      aciklama: alan(s, 'AÇIKLAMA', 'ACIKLAMA') || null,
      odeme: alan(s, 'ÖDEME', 'ODEME') || null,
      durum: 'yeni',
    })
  })

  return { kayitlar, sorunlar }
}

export async function aktarimEylemi(
  _onceki: AktarimSonucu | null,
  veri: FormData,
): Promise<AktarimSonucu> {
  const kullanici = await gerekliKullanici(GIRIS_YAPABILIR)

  const dosya = veri.get('dosya')
  const tur = veri.get('tur') === 'fatura' ? 'fatura' : 'irsaliye'
  const yaz = veri.get('islem') === 'aktar'

  if (!(dosya instanceof File) || dosya.size === 0) {
    return { tip: 'hata', mesaj: 'Dosya seçin (.csv, .xlsx).' }
  }

  let satirlar: Satir[]
  try {
    satirlar = await dosyayiCoz(dosya)
  } catch (e) {
    console.error('aktarım çözümleme:', e)
    return { tip: 'hata', mesaj: 'Dosya okunamadı. CSV ya da XLSX olmalı.' }
  }
  if (satirlar.length === 0) {
    return { tip: 'hata', mesaj: 'Dosyada veri satırı bulunamadı.' }
  }

  const mevcutFirmalar = new Map(
    (await db.firma.findMany({ select: { id: true, ad: true } })).map((f) => [
      f.ad.toLocaleUpperCase('tr'),
      f.id,
    ]),
  )

  if (tur === 'irsaliye') {
    const { gruplar, sorunlar } = irsaliyeleriGrupla(satirlar)
    const taslaklar: IrsaliyeTaslak[] = []
    const yeniFirmalar = new Set<string>()
    let eklenen = 0
    let atlanan = 0

    for (const [anahtar, g] of gruplar) {
      const firmaId = mevcutFirmalar.get(g.firma.toLocaleUpperCase('tr'))
      if (!firmaId) yeniFirmalar.add(g.firma)

      const toplam = g.kalemler.reduce(
        (t, k) => t + (k.birimFiyat != null ? k.miktar * k.birimFiyat : 0),
        0,
      )

      // Numarası olan irsaliye numarasıyla eşleşir. Numarasızlar için
      // firma + tarih + kalem parmak izi kullanılır ki aynı dosya iki kez
      // aktarıldığında kayıt çiftlenmesin.
      let zatenVar = false
      if (firmaId && g.no) {
        zatenVar = (await db.irsaliye.count({ where: { firmaId, no: g.no } })) > 0
      } else if (firmaId) {
        const benzerler = await db.irsaliye.findMany({
          where: {
            firmaId,
            no: null,
            tarih: new Date(`${g.tarih}T00:00:00Z`),
          },
          select: { kalemler: { select: { malzeme: true, miktar: true } } },
        })
        const izi = (k: { malzeme: string; miktar: unknown }[]) =>
          k
            .map((x) => `${x.malzeme}|${Number(x.miktar)}`)
            .sort()
            .join('~')
        const bizimIz = izi(g.kalemler)
        zatenVar = benzerler.some((b) => izi(b.kalemler) === bizimIz)
      }

      taslaklar.push({
        anahtar,
        no: g.no,
        tarih: g.tarih,
        firma: g.firma,
        cari: g.cari,
        kalemSayisi: g.kalemler.length,
        toplam,
        durum: zatenVar ? 'zaten-var' : 'yeni',
      })

      if (yaz) {
        if (zatenVar) {
          atlanan++
          continue
        }
        const firma = await db.firma.upsert({
          where: { ad: g.firma },
          update: {},
          create: { ad: g.firma },
        })
        mevcutFirmalar.set(g.firma.toLocaleUpperCase('tr'), firma.id)

        await db.irsaliye.create({
          data: {
            no: g.no,
            tarih: new Date(`${g.tarih}T00:00:00Z`),
            firmaId: firma.id,
            cari: g.cari,
            aciklama: g.aciklama,
            girenId: kullanici.id,
            kalemler: {
              create: g.kalemler.map((k, sira) => ({
                sira,
                kategori: k.kategori,
                tur: k.tur,
                malzeme: k.malzeme,
                miktar: k.miktar,
                birim: k.birim,
                birimFiyat: k.birimFiyat,
                toplam:
                  k.birimFiyat != null
                    ? Number((k.miktar * k.birimFiyat).toFixed(2))
                    : null,
              })),
            },
          },
        })
        for (const k of g.kalemler) {
          await secenekEkle('MALZEME', k.malzeme)
          if (k.birim) await secenekEkle('BIRIM', k.birim)
        }
        eklenen++
      }
    }

    if (yaz) {
      await gunlukle(kullanici.id, 'ICE_AKTAR', 'Irsaliye', undefined, {
        eklenen,
        atlanan,
      })
      revalidatePath('/irsaliye')
      return { tip: 'tamam', tur, eklenen, atlanan }
    }

    return {
      tip: 'onizleme',
      tur,
      irsaliyeler: taslaklar,
      sorunlar,
      yeniFirmalar: [...yeniFirmalar],
      okunanSatir: satirlar.length,
    }
  }

  // fatura
  const { kayitlar, sorunlar } = faturalariCoz(satirlar)
  const yeniFirmalar = new Set<string>()
  let eklenen = 0
  let atlanan = 0

  for (const f of kayitlar) {
    const firmaId = mevcutFirmalar.get(f.firma.toLocaleUpperCase('tr'))
    if (!firmaId) yeniFirmalar.add(f.firma)

    const zatenVar = firmaId
      ? (await db.fatura.count({ where: { firmaId, no: f.no } })) > 0
      : false
    f.durum = zatenVar ? 'zaten-var' : 'yeni'

    if (yaz) {
      if (zatenVar) {
        atlanan++
        continue
      }
      const firma = await db.firma.upsert({
        where: { ad: f.firma },
        update: {},
        create: { ad: f.firma },
      })
      mevcutFirmalar.set(f.firma.toLocaleUpperCase('tr'), firma.id)

      await db.fatura.create({
        data: {
          no: f.no,
          tarih: new Date(`${f.tarih}T00:00:00Z`),
          firmaId: firma.id,
          tutar: f.tutar,
          kategori: f.kategori,
          aciklama: f.aciklama,
          odeme: f.odeme,
          girenId: kullanici.id,
        },
      })
      if (f.kategori) await secenekEkle('FATURA_KATEGORI', f.kategori)
      eklenen++
    }
  }

  if (yaz) {
    await gunlukle(kullanici.id, 'ICE_AKTAR', 'Fatura', undefined, {
      eklenen,
      atlanan,
    })
    revalidatePath('/fatura')
    return { tip: 'tamam', tur, eklenen, atlanan }
  }

  return {
    tip: 'onizleme',
    tur,
    faturalar: kayitlar,
    sorunlar,
    yeniFirmalar: [...yeniFirmalar],
    okunanSatir: satirlar.length,
  }
}
