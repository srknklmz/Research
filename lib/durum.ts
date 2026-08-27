import type { FaturaDurum, OnayTip } from '@prisma/client'

export const FATURA_DURUM_ADI: Record<FaturaDurum, string> = {
  YENI: 'Yeni',
  ESLESTI: 'Eşleşti',
  IMZALANDI: 'İmzalandı',
  REDDEDILDI: 'Reddedildi',
  MERKEZ_ONAYLI: 'Merkez onaylı',
  GONDERILDI: 'Müşavire gönderildi',
  IPTAL: 'İptal',
}

export const FATURA_DURUM_RENGI: Record<FaturaDurum, string> = {
  YENI: 'bg-bekliyor-zemin text-bekliyor',
  ESLESTI: 'bg-eslesti-zemin text-eslesti',
  IMZALANDI: 'bg-onayli-zemin text-onayli',
  REDDEDILDI: 'bg-red-zemin text-red',
  MERKEZ_ONAYLI: 'bg-onayli-zemin text-onayli',
  GONDERILDI: 'bg-gonderildi-zemin text-gonderildi',
  IPTAL: 'bg-gonderildi-zemin text-gonderildi',
}

export const ONAY_TIP_ADI: Record<OnayTip, string> = {
  IMZA: 'İdari müdür imzası',
  RED: 'İdari müdür reddi',
  MERKEZ_ONAY: 'Merkez onayı',
  MERKEZ_RED: 'Merkez reddi',
}

/** Akıştaki sıra: sonraki adıma geçebilmek için durum bu listede olmalı. */
export const IMZAYA_HAZIR: FaturaDurum[] = ['ESLESTI']
export const MERKEZE_HAZIR: FaturaDurum[] = ['IMZALANDI']
export const GONDERIME_HAZIR: FaturaDurum[] = ['MERKEZ_ONAYLI']
