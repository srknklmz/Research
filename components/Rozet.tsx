import type { FaturaDurum } from '@prisma/client'
import { FATURA_DURUM_ADI, FATURA_DURUM_RENGI } from '@/lib/durum'

export function DurumRozeti({ durum }: { durum: FaturaDurum }) {
  return (
    <span className={`rozet ${FATURA_DURUM_RENGI[durum]}`}>
      {FATURA_DURUM_ADI[durum]}
    </span>
  )
}

export function Rozet({
  children,
  renk = 'gri',
}: {
  children: React.ReactNode
  renk?: 'gri' | 'sari' | 'mavi' | 'yesil' | 'kirmizi'
}) {
  const renkler = {
    gri: 'bg-gonderildi-zemin text-gonderildi',
    sari: 'bg-bekliyor-zemin text-bekliyor',
    mavi: 'bg-eslesti-zemin text-eslesti',
    yesil: 'bg-onayli-zemin text-onayli',
    kirmizi: 'bg-red-zemin text-red',
  }
  return <span className={`rozet ${renkler[renk]}`}>{children}</span>
}
