'use client'

import { useId, useRef, useState } from 'react'
import type { YuklemeSlotu } from '@/lib/depo'

type Durum =
  | { tip: 'bos' }
  | { tip: 'yukleniyor'; ad: string }
  | { tip: 'tamam'; ad: string; boyut: number }
  | { tip: 'hata'; mesaj: string }

const AZAMI = 20 * 1024 * 1024

function boyutMetni(b: number): string {
  if (b >= 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`
  if (b >= 1024) return `${Math.round(b / 1024)} KB`
  return `${b} bayt`
}

/** Dosyanın gerçekten PDF olduğunu ilk baytlarından kontrol eder. */
async function pdfMi(dosya: File): Promise<boolean> {
  const bas = await dosya.slice(0, 5).arrayBuffer()
  return new TextDecoder('latin1').decode(bas) === '%PDF-'
}

/**
 * Belge yükleme alanı. Uzak depo kullanılıyorsa dosya tarayıcıdan doğrudan
 * depoya yüklenir (Vercel'in 4,5 MB istek sınırına takılmamak için) ve forma
 * yalnızca yol bilgisi girer. Yerel depoda dosya form ile sunucuya gider.
 */
export function BelgeAlani({
  etiket,
  dogrudan,
  slotAc,
  mevcutBelgeId,
}: {
  etiket: string
  dogrudan: boolean
  slotAc: () => Promise<YuklemeSlotu | null>
  mevcutBelgeId?: number | null
}) {
  const kimlik = useId()
  const [durum, setDurum] = useState<Durum>({ tip: 'bos' })
  const [yol, setYol] = useState('')
  const [ad, setAd] = useState('')
  const girdi = useRef<HTMLInputElement>(null)

  async function secildi(dosya: File) {
    if (dosya.size > AZAMI) {
      setDurum({ tip: 'hata', mesaj: 'Dosya 20 MB sınırını aşıyor.' })
      return
    }
    if (!(await pdfMi(dosya))) {
      setDurum({
        tip: 'hata',
        mesaj: `Yalnızca PDF yüklenebilir. "${dosya.name}" bir PDF değil.`,
      })
      return
    }

    setDurum({ tip: 'yukleniyor', ad: dosya.name })
    try {
      const slot = await slotAc()
      if (!slot) throw new Error('Yükleme adresi alınamadı.')

      const govde = new FormData()
      govde.append('cacheControl', '3600')
      govde.append('', dosya)

      const yanit = await fetch(slot.imzaliUrl, { method: 'PUT', body: govde })
      if (!yanit.ok) {
        throw new Error(`Depoya yüklenemedi (${yanit.status}).`)
      }

      setYol(slot.yol)
      setAd(dosya.name)
      setDurum({ tip: 'tamam', ad: dosya.name, boyut: dosya.size })
    } catch (e) {
      setYol('')
      setAd('')
      setDurum({
        tip: 'hata',
        mesaj: e instanceof Error ? e.message : 'Yükleme başarısız.',
      })
    }
  }

  const mevcutNotu = mevcutBelgeId ? (
    <p className="mt-2 text-xs text-soluk">
      Yüklü belge var.{' '}
      <a
        className="text-vurgu underline"
        href={`/belge/${mevcutBelgeId}`}
        target="_blank"
        rel="noreferrer"
      >
        Görüntüle
      </a>{' '}
      — yeni dosya seçerseniz değiştirilir.
    </p>
  ) : null

  // Yerel depo: dosya doğrudan formla gider.
  if (!dogrudan) {
    return (
      <section className="kart p-4">
        <label className="etiket" htmlFor={kimlik}>
          {etiket}
        </label>
        <input
          id={kimlik}
          name="belge"
          type="file"
          accept=".pdf,application/pdf"
          className="alan"
        />
        {mevcutNotu}
      </section>
    )
  }

  return (
    <section className="kart p-4">
      <span className="etiket">{etiket}</span>

      <input type="hidden" name="belgeYolu" value={yol} />
      <input type="hidden" name="belgeAdi" value={ad} />
      <input
        ref={girdi}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={(e) => {
          const d = e.target.files?.[0]
          if (d) secildi(d)
          e.target.value = ''
        }}
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="dugme-ikincil"
          disabled={durum.tip === 'yukleniyor'}
          onClick={() => girdi.current?.click()}
        >
          {durum.tip === 'yukleniyor' ? 'Yükleniyor…' : 'PDF seç'}
        </button>

        {durum.tip === 'tamam' ? (
          <span className="text-sm text-onayli">
            {durum.ad} yüklendi ({boyutMetni(durum.boyut)})
          </span>
        ) : null}
        {durum.tip === 'yukleniyor' ? (
          <span className="text-sm text-soluk">{durum.ad}</span>
        ) : null}
      </div>

      {durum.tip === 'hata' ? (
        <p className="mt-2 rounded-md bg-red-zemin px-3 py-2 text-xs text-red">
          {durum.mesaj}
        </p>
      ) : null}

      {durum.tip !== 'tamam' ? mevcutNotu : null}
    </section>
  )
}
