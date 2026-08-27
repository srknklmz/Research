import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'İrsaliye – Fatura Sistemi',
  description: 'Şantiye irsaliye/fatura eşleştirme, imza ve müşavire gönderim akışı',
}

export default function KokDuzen({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  )
}
