export type Sorun = { satir: number; mesaj: string }

export type IrsaliyeTaslak = {
  anahtar: string
  no: string | null
  tarih: string
  firma: string
  cari: string | null
  kalemSayisi: number
  toplam: number
  durum: 'yeni' | 'zaten-var'
}

export type FaturaTaslak = {
  no: string
  tarih: string
  firma: string
  tutar: number
  kategori: string | null
  durum: 'yeni' | 'zaten-var'
}

export type AktarimSonucu =
  | { tip: 'bos' }
  | { tip: 'hata'; mesaj: string }
  | {
      tip: 'onizleme'
      tur: 'irsaliye' | 'fatura'
      irsaliyeler?: IrsaliyeTaslak[]
      faturalar?: FaturaTaslak[]
      sorunlar: Sorun[]
      yeniFirmalar: string[]
      okunanSatir: number
    }
  | { tip: 'tamam'; tur: 'irsaliye' | 'fatura'; eklenen: number; atlanan: number }
