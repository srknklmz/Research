import { useMemo, useState } from 'react'
import type { Veri } from './api'
import { Degisiklikler } from './Degisiklikler'
import { Detay } from './Detay'
import { Hesap } from './Hesap'
import { Imalatlar, type DurumFiltre } from './Imalatlar'
import { Ikon } from './ortak'
import { istanbulGunu, tarihYaz } from './tarih'
import { YeniKalem } from './YeniKalem'

interface Props {
  veri: Veri
  baglantiHatasi: string | null
  yenile: () => Promise<void>
  cikis: () => void
}

type Gorunum = 'imalat' | 'degisiklik' | 'hesap'

export function Ana({ veri, baglantiHatasi, yenile, cikis }: Props) {
  const { hesap, bugun, santiyeler, kalemler, degisiklikler } = veri
  const [gorunum, setGorunum] = useState<Gorunum>('imalat')
  const [santiye, setSantiye] = useState<number | null>(null)
  const [durumFiltre, setDurumFiltre] = useState<DurumFiltre>('tumu')
  const [seciliId, setSeciliId] = useState<number | null>(null)
  const [yeniAcik, setYeniAcik] = useState(false)
  const [yenileniyor, setYenileniyor] = useState(false)

  const santiyeAdi = useMemo(() => new Map(santiyeler.map((s) => [s.id, s.ad])), [santiyeler])
  const secili = kalemler.find((k) => k.id === seciliId) ?? null
  const bugunkuDegisiklik = degisiklikler.filter(
    (d) => istanbulGunu(d.zaman) === bugun && (santiye === null || d.santiye_id === santiye),
  ).length

  async function elleYenile() {
    setYenileniyor(true)
    await yenile()
    setYenileniyor(false)
  }

  const menu: { id: Gorunum; ad: string; ikon: 'liste' | 'saat' | 'kisi'; rozet?: number }[] = [
    { id: 'imalat', ad: 'İmalatlar', ikon: 'liste' },
    { id: 'degisiklik', ad: 'Değişiklikler', ikon: 'saat', rozet: bugunkuDegisiklik },
    { id: 'hesap', ad: 'Hesap', ikon: 'kisi' },
  ]

  return (
    <div className={`sayfa gorunum-${gorunum}`}>
      <header className="ust">
        <div className="ust-baslik">
          <h1>{hesap.ad}</h1>
          <p className="soluk">İmalat Takip · {tarihYaz(bugun, bugun)}</p>
        </div>
        <button
          className={`simge-dugme ${yenileniyor ? 'donuyor' : ''}`}
          onClick={elleYenile}
          aria-label="Yenile"
        >
          <Ikon ad="yenile" />
        </button>
      </header>

      <nav className="menu" aria-label="Bölümler">
        {menu.map((m) => (
          <button
            key={m.id}
            className={gorunum === m.id ? 'secili' : ''}
            aria-current={gorunum === m.id ? 'page' : undefined}
            onClick={() => {
              setGorunum(m.id)
              window.scrollTo({ top: 0 })
            }}
          >
            <span className="menu-ikon">
              <Ikon ad={m.ikon} />
              {!!m.rozet && <span className="menu-rozet">{m.rozet}</span>}
            </span>
            <span>{m.ad}</span>
          </button>
        ))}
      </nav>

      {baglantiHatasi && <p className="hata">Güncellenemedi: {baglantiHatasi}</p>}

      <main className="icerik">
        {gorunum === 'imalat' && (
          <Imalatlar
            veri={veri}
            santiye={santiye}
            setSantiye={setSantiye}
            durumFiltre={durumFiltre}
            setDurumFiltre={setDurumFiltre}
            santiyeAdi={santiyeAdi}
            ac={setSeciliId}
          />
        )}
        {gorunum === 'degisiklik' && (
          <Degisiklikler
            veri={veri}
            santiye={santiye}
            setSantiye={setSantiye}
            santiyeAdi={santiyeAdi}
            ac={setSeciliId}
          />
        )}
        {gorunum === 'hesap' && <Hesap veri={veri} yenile={yenile} cikis={cikis} />}
      </main>

      {gorunum === 'imalat' && (
        <button className="fab" onClick={() => setYeniAcik(true)} aria-label="Yeni imalat">
          <Ikon ad="arti" />
          <span>Yeni imalat</span>
        </button>
      )}

      {secili && (
        <Detay
          k={secili}
          bugun={bugun}
          merkez={hesap.merkez}
          santiye={santiyeAdi.get(secili.santiye_id) ?? ''}
          kapat={() => setSeciliId(null)}
          yenile={yenile}
        />
      )}
      {yeniAcik && (
        <YeniKalem
          santiyeler={santiyeler}
          varsayilanSantiye={santiye ?? (santiyeler.length === 1 ? santiyeler[0].id : null)}
          merkez={hesap.merkez}
          bugun={bugun}
          kapat={() => setYeniAcik(false)}
          yenile={yenile}
        />
      )}
    </div>
  )
}
