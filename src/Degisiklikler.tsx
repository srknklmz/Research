import { useMemo, useState } from 'react'
import type { SonDegisiklik, Veri } from './api'
import { SantiyeSecici } from './Imalatlar'
import { Cipler } from './ortak'
import { degisiklikYaz, gunFarki, istanbulGunu, tarihYaz, zamanYaz } from './tarih'

interface Props {
  veri: Veri
  santiye: number | null
  setSantiye: (s: number | null) => void
  santiyeAdi: Map<number, string>
  ac: (id: number) => void
}

const DONEMLER = [
  { deger: 1, ad: 'Bugün ve dün' },
  { deger: 7, ad: '7 gün' },
  { deger: 14, ad: '14 gün' },
]

const TURLER = [
  { deger: 'hepsi', ad: 'Hepsi' },
  { deger: 'tarih', ad: 'Tarih değişenler' },
  { deger: 'bitti', ad: 'Bitenler' },
  { deger: 'olusturma', ad: 'Yeni eklenenler' },
] as const

type TurFiltre = (typeof TURLER)[number]['deger']

export function Degisiklikler({ veri, santiye, setSantiye, santiyeAdi, ac }: Props) {
  const { bugun, santiyeler, degisiklikler } = veri
  const [donem, setDonem] = useState(1)
  const [tur, setTur] = useState<TurFiltre>('hepsi')
  const cokluSantiye = santiyeler.length > 1

  // Güne göre gruplanmış liste: [["2026-09-28", [...]], ...]
  const gruplar = useMemo(() => {
    const m = new Map<string, SonDegisiklik[]>()
    for (const d of degisiklikler) {
      if (santiye !== null && d.santiye_id !== santiye) continue
      if (tur !== 'hepsi' && d.tur !== tur) continue
      const gun = istanbulGunu(d.zaman)
      if (gunFarki(gun, bugun) > donem) continue
      if (!m.has(gun)) m.set(gun, [])
      m.get(gun)!.push(d)
    }
    return [...m]
  }, [degisiklikler, santiye, tur, donem, bugun])

  return (
    <>
      {cokluSantiye && (
        <SantiyeSecici santiyeler={santiyeler} santiye={santiye} setSantiye={setSantiye} />
      )}
      <Cipler etiket="Dönem" secenekler={DONEMLER} deger={donem} sec={setDonem} />
      <Cipler etiket="Tür" secenekler={[...TURLER]} deger={tur} sec={setTur} />

      {gruplar.length === 0 ? (
        <p className="soluk bos">Bu dönemde değişiklik yok.</p>
      ) : (
        gruplar.map(([gun, liste]) => (
          <section key={gun} className="gun-grubu">
            <h2 className="gun-baslik">{gunAdi(gun, bugun)}</h2>
            <ul className="degisiklikler kart">
              {liste.map((d) => (
                <li key={d.id}>
                  <button className="degisiklik" onClick={() => ac(d.kalem_id)}>
                    <span className={`nokta tur-${d.tur}`} aria-hidden />
                    <span className="degisiklik-govde">
                      <span className="degisiklik-ust">
                        <strong>{d.kalem_ad}</strong>
                        {cokluSantiye && santiye === null && (
                          <span className="etiket">{santiyeAdi.get(d.santiye_id)}</span>
                        )}
                      </span>
                      <span>{degisiklikYaz(d, bugun)}</span>
                      {d.neden && d.tur === 'tarih' && <span className="neden">“{d.neden}”</span>}
                      <span className="soluk kucuk">
                        {d.yapan_ad} · {zamanYaz(d.zaman, bugun)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </>
  )
}

function gunAdi(gun: string, bugun: string) {
  const fark = gunFarki(gun, bugun)
  if (fark === 0) return 'Bugün'
  if (fark === 1) return 'Dün'
  return tarihYaz(gun, bugun)
}
