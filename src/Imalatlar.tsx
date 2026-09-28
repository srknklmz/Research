import { useMemo, useState } from 'react'
import type { Kalem, Santiye, Veri } from './api'
import { Ikon } from './ortak'
import {
  durum,
  gunFarki,
  gunYaz,
  kalanYaz,
  kayma,
  sonuc,
  tarihYaz,
  type Durum,
  type Sonuc,
} from './tarih'

export type DurumFiltre = 'tumu' | 'gecikti' | 'yakin' | 'bitti'

interface Props {
  veri: Veri
  santiye: number | null
  setSantiye: (s: number | null) => void
  durumFiltre: DurumFiltre
  setDurumFiltre: (d: DurumFiltre) => void
  santiyeAdi: Map<number, string>
  ac: (id: number) => void
}

function ara(k: Kalem, sorgu: string) {
  if (!sorgu) return true
  const s = sorgu.toLocaleLowerCase('tr')
  return (
    k.ad.toLocaleLowerCase('tr').includes(s) ||
    (k.konum ?? '').toLocaleLowerCase('tr').includes(s)
  )
}

export function Imalatlar({
  veri,
  santiye,
  setSantiye,
  durumFiltre,
  setDurumFiltre,
  santiyeAdi,
  ac,
}: Props) {
  const { bugun, santiyeler, kalemler } = veri
  const [sorgu, setSorgu] = useState('')
  const cokluSantiye = santiyeler.length > 1

  const kapsam = useMemo(
    () => kalemler.filter((k) => santiye === null || k.santiye_id === santiye),
    [kalemler, santiye],
  )

  const sayilar = useMemo(() => {
    const devam = kapsam.filter((k) => k.durum === 'devam')
    return {
      tumu: devam.length,
      gecikti: devam.filter((k) => durum(k, bugun) === 'gecikti').length,
      yakin: devam.filter((k) => durum(k, bugun) === 'yakin').length,
      bitti: kapsam.length - devam.length,
      kaymis: devam.filter((k) => kayma(k) > 0).length,
    }
  }, [kapsam, bugun])

  const liste = useMemo(() => {
    const l = kapsam.filter((k) => {
      if (!ara(k, sorgu)) return false
      const d = durum(k, bugun)
      if (durumFiltre === 'tumu') return d !== 'bitti'
      return d === durumFiltre
    })
    if (durumFiltre === 'bitti') l.sort((a, b) => (b.bitis ?? '').localeCompare(a.bitis ?? ''))
    return l
  }, [kapsam, sorgu, durumFiltre, bugun])

  const sonuclar = useMemo(() => {
    const r: Record<Sonuc, number> = { ilk_hedefte: 0, revize_hedefte: 0, gec: 0 }
    for (const k of liste) if (k.durum === 'bitti') r[sonuc(k)]++
    return r
  }, [liste])

  const kutular: { id: DurumFiltre; ad: string; renk: string }[] = [
    { id: 'tumu', ad: 'Devam eden', renk: '' },
    { id: 'gecikti', ad: 'Gecikmiş', renk: 'r-kirmizi-yazi' },
    { id: 'yakin', ad: 'Bu hafta', renk: 'r-sari-yazi' },
    { id: 'bitti', ad: 'Biten', renk: 'r-yesil-yazi' },
  ]

  return (
    <>
      {cokluSantiye && (
        <SantiyeSecici
          santiyeler={santiyeler}
          santiye={santiye}
          setSantiye={setSantiye}
          rozet={(id) =>
            kalemler.filter((k) => k.santiye_id === id && durum(k, bugun) === 'gecikti').length
          }
        />
      )}

      <div className="kutular" role="tablist" aria-label="Durum">
        {kutular.map((k) => (
          <button
            key={k.id}
            role="tab"
            aria-selected={durumFiltre === k.id}
            className={`kutu-dugme ${durumFiltre === k.id ? 'secili' : ''}`}
            onClick={() => setDurumFiltre(k.id)}
          >
            <b className={sayilar[k.id] ? k.renk : 'soluk'}>{sayilar[k.id]}</b>
            <span>{k.ad}</span>
          </button>
        ))}
      </div>

      <div className="arama-kutu">
        <Ikon ad="ara" />
        <input
          type="search"
          placeholder="İmalat ya da konum ara"
          value={sorgu}
          onChange={(e) => setSorgu(e.target.value)}
          enterKeyHint="search"
        />
      </div>

      {durumFiltre === 'tumu' && sayilar.kaymis > 0 && !sorgu && (
        <p className="soluk kucuk liste-not">
          {sayilar.tumu} imalattan {sayilar.kaymis} tanesinin hedefi ilk tarihten kaydı.
        </p>
      )}
      {durumFiltre === 'bitti' && liste.length > 0 && (
        <p className="hedef-tutma">
          <span className="rozet r-yesil">{sonuclar.ilk_hedefte} ilk hedefte</span>
          <span className="rozet r-sari">{sonuclar.revize_hedefte} revize hedefte</span>
          <span className="rozet r-kirmizi">{sonuclar.gec} geç</span>
        </p>
      )}

      {liste.length === 0 ? (
        <p className="soluk bos">{bosMesaj(durumFiltre, sorgu)}</p>
      ) : (
        <ul className="liste">
          {liste.map((k) => (
            <li key={k.id}>
              <Satir
                k={k}
                bugun={bugun}
                santiye={cokluSantiye && santiye === null ? santiyeAdi.get(k.santiye_id) : undefined}
                ac={() => ac(k.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function bosMesaj(f: DurumFiltre, sorgu: string) {
  if (sorgu) return 'Aramaya uyan imalat yok.'
  return {
    tumu: 'Devam eden imalat yok. Sağ alttaki “+” ile ekleyin.',
    gecikti: 'Gecikmiş imalat yok.',
    yakin: 'Bu hafta bitmesi gereken imalat yok.',
    bitti: 'Henüz biten imalat yok.',
  }[f]
}

export function SantiyeSecici({
  santiyeler,
  santiye,
  setSantiye,
  rozet,
}: {
  santiyeler: Santiye[]
  santiye: number | null
  setSantiye: (s: number | null) => void
  rozet?: (id: number) => number
}) {
  return (
    <div className="santiye-secici" role="group" aria-label="Şantiye">
      <button
        className={`cip ${santiye === null ? 'secili' : ''}`}
        aria-pressed={santiye === null}
        onClick={() => setSantiye(null)}
      >
        Tüm şantiyeler
      </button>
      {santiyeler.map((s) => {
        const n = rozet?.(s.id) ?? 0
        return (
          <button
            key={s.id}
            className={`cip ${santiye === s.id ? 'secili' : ''}`}
            aria-pressed={santiye === s.id}
            onClick={() => setSantiye(s.id)}
          >
            {s.ad}
            {n > 0 && (
              <span className="cip-rozet" title={`${n} gecikmiş`}>
                {n}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

const ROZET: Record<Durum, string> = {
  gecikti: 'r-kirmizi',
  yakin: 'r-sari',
  yolunda: 'r-yesil',
  bitti: '',
}

const SONUC_YAZI: Record<Sonuc, [string, string]> = {
  ilk_hedefte: ['İlk hedefte', 'r-yesil'],
  revize_hedefte: ['Revize hedefte', 'r-sari'],
  gec: ['Geç', 'r-kirmizi'],
}

function Satir({
  k,
  bugun,
  santiye,
  ac,
}: {
  k: Kalem
  bugun: string
  santiye?: string
  ac: () => void
}) {
  const d = durum(k, bugun)
  const kay = kayma(k)
  const alt = [santiye, k.konum].filter(Boolean).join(' · ')

  if (k.durum === 'bitti') {
    const s = sonuc(k)
    return (
      <button className="satir d-bitti" onClick={ac}>
        <span className="satir-sol">
          <span className="satir-ad">{k.ad}</span>
          {alt && <span className="satir-alt">{alt}</span>}
          <span className="satir-alt">
            İlk hedef {tarihYaz(k.ilk_hedef, bugun)}
            {kay !== 0 && ` · son hedef ${tarihYaz(k.hedef, bugun)}`}
          </span>
        </span>
        <span className="satir-sag">
          <span className="satir-tarih">{tarihYaz(k.bitis!, bugun)}</span>
          <span className={`rozet ${SONUC_YAZI[s][1]}`}>
            {s === 'gec' ? `${gunFarki(k.hedef, k.bitis!)} gün geç` : SONUC_YAZI[s][0]}
          </span>
        </span>
      </button>
    )
  }

  return (
    <button className={`satir d-${d}`} onClick={ac}>
      <span className="satir-sol">
        <span className="satir-ad">{k.ad}</span>
        {alt && <span className="satir-alt">{alt}</span>}
        {kay !== 0 && (
          <span className="satir-alt kayma">
            İlk hedef {tarihYaz(k.ilk_hedef, bugun)} · {gunYaz(kay)}
            {k.erteleme > 1 && ` · ${k.erteleme} kez`}
          </span>
        )}
      </span>
      <span className="satir-sag">
        <span className="satir-tarih">{tarihYaz(k.hedef, bugun)}</span>
        <span className={`rozet ${ROZET[d]}`}>{kalanYaz(k.hedef, bugun)}</span>
      </span>
    </button>
  )
}
