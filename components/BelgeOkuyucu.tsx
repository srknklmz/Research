'use client'

import { useRef, useState } from 'react'
import type { OkunanFatura, OkunanIrsaliye } from '@/lib/okuyucu'

export type { OkunanFatura, OkunanIrsaliye }

type Durum =
  | { tip: 'bos' }
  | { tip: 'okunuyor' }
  | { tip: 'tamam'; ad: string }
  | { tip: 'hata'; mesaj: string }

export function BelgeOkuyucu<T extends OkunanIrsaliye | OkunanFatura>({
  tur,
  onOkundu,
}: {
  tur: 'irsaliye' | 'fatura'
  onOkundu: (sonuc: T) => void
}) {
  const [durum, setDurum] = useState<Durum>({ tip: 'bos' })
  const girdi = useRef<HTMLInputElement>(null)

  async function oku(dosya: File) {
    setDurum({ tip: 'okunuyor' })
    const govde = new FormData()
    govde.set('dosya', dosya)
    govde.set('tur', tur)

    try {
      const yanit = await fetch('/api/oku', { method: 'POST', body: govde })
      const veri = await yanit.json()
      if (!yanit.ok) {
        setDurum({ tip: 'hata', mesaj: veri.hata ?? 'Belge okunamadı.' })
        return
      }
      onOkundu(veri.sonuc as T)
      setDurum({ tip: 'tamam', ad: dosya.name })
    } catch {
      setDurum({ tip: 'hata', mesaj: 'Sunucuya ulaşılamadı.' })
    }
  }

  return (
    <section className="rounded-lg border border-dashed border-cizgi bg-yuzey p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Belgeden otomatik doldur</h2>
          <p className="mt-0.5 text-xs text-soluk">
            {tur === 'irsaliye' ? 'İrsaliyenin' : 'Faturanın'} PDF'ini ya da
            fotoğrafını seçin; alanlar okunup forma yazılır. Kaydetmeden önce
            kontrol edin.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={girdi}
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            onChange={(e) => {
              const d = e.target.files?.[0]
              if (d) oku(d)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            className="dugme-ikincil"
            disabled={durum.tip === 'okunuyor'}
            onClick={() => girdi.current?.click()}
          >
            {durum.tip === 'okunuyor' ? 'Okunuyor…' : 'Belge seç'}
          </button>
        </div>
      </div>

      {durum.tip === 'tamam' ? (
        <p className="mt-3 rounded-md bg-onayli-zemin px-3 py-2 text-xs text-onayli">
          <strong>{durum.ad}</strong> okundu ve alanlara yazıldı. Lütfen
          kontrol edip düzeltin — okuma her zaman doğru olmayabilir.
        </p>
      ) : null}

      {durum.tip === 'hata' ? (
        <p className="mt-3 rounded-md bg-red-zemin px-3 py-2 text-xs text-red">
          {durum.mesaj}
        </p>
      ) : null}
    </section>
  )
}
