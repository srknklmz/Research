import { useMemo, useState } from 'react'
import type { Kalem, Veri } from './api'
import { Ayarlar } from './Ayarlar'
import { Detay } from './Detay'
import { YeniKalem } from './YeniKalem'
import {
  degisiklikYaz,
  durum,
  gunFarki,
  gunYaz,
  istanbulGunu,
  kalanYaz,
  kayma,
  sonuc,
  tarihYaz,
  zamanYaz,
  type Sonuc,
} from './tarih'

interface Props {
  veri: Veri
  baglantiHatasi: string | null
  yenile: () => Promise<void>
  cikis: () => void
}

const DONEMLER = [
  { gun: 1, ad: 'Bugün ve dün' },
  { gun: 7, ad: '7 gün' },
  { gun: 14, ad: '14 gün' },
]

function ara(k: Kalem, sorgu: string) {
  if (!sorgu) return true
  const s = sorgu.toLocaleLowerCase('tr')
  return (
    k.ad.toLocaleLowerCase('tr').includes(s) ||
    (k.konum ?? '').toLocaleLowerCase('tr').includes(s)
  )
}

export function Ana({ veri, baglantiHatasi, yenile, cikis }: Props) {
  const { hesap, bugun, santiyeler, kalemler, degisiklikler } = veri
  const [filtre, setFiltre] = useState<number | null>(null)
  const [sekme, setSekme] = useState<'devam' | 'bitti'>('devam')
  const [sorgu, setSorgu] = useState('')
  const [donem, setDonem] = useState(1)
  const [seciliId, setSeciliId] = useState<number | null>(null)
  const [yeniAcik, setYeniAcik] = useState(false)
  const [ayarAcik, setAyarAcik] = useState(false)

  const santiyeAdi = useMemo(() => new Map(santiyeler.map((s) => [s.id, s.ad])), [santiyeler])
  const cokluSantiye = santiyeler.length > 1
  const secili = kalemler.find((k) => k.id === seciliId) ?? null

  const ozet = useMemo(
    () =>
      santiyeler.map((s) => {
        const devam = kalemler.filter((k) => k.santiye_id === s.id && k.durum === 'devam')
        return {
          santiye: s,
          devam: devam.length,
          gecikti: devam.filter((k) => durum(k, bugun) === 'gecikti').length,
          yakin: devam.filter((k) => durum(k, bugun) === 'yakin').length,
          kaymis: devam.filter((k) => kayma(k) > 0).length,
        }
      }),
    [santiyeler, kalemler, bugun],
  )

  const liste = useMemo(() => {
    const l = kalemler.filter(
      (k) => k.durum === sekme && (filtre === null || k.santiye_id === filtre) && ara(k, sorgu),
    )
    if (sekme === 'bitti') l.sort((a, b) => (b.bitis ?? '').localeCompare(a.bitis ?? ''))
    return l
  }, [kalemler, sekme, filtre, sorgu])

  const sayilar = useMemo(() => {
    const f = kalemler.filter((k) => filtre === null || k.santiye_id === filtre)
    return {
      devam: f.filter((k) => k.durum === 'devam').length,
      bitti: f.filter((k) => k.durum === 'bitti').length,
    }
  }, [kalemler, filtre])

  const sonuclar = useMemo(() => {
    const r: Record<Sonuc, number> = { ilk_hedefte: 0, revize_hedefte: 0, gec: 0 }
    for (const k of liste) if (k.durum === 'bitti') r[sonuc(k)]++
    return r
  }, [liste])

  const sonDegisiklikler = degisiklikler.filter(
    (d) =>
      (filtre === null || d.santiye_id === filtre) &&
      gunFarki(istanbulGunu(d.zaman), bugun) <= donem,
  )

  return (
    <div className="sayfa">
      <header className="ust">
        <div>
          <h1>İmalat Takip</h1>
          <p className="soluk">
            {hesap.ad} · {tarihYaz(bugun, bugun)}
          </p>
        </div>
        <nav className="ust-dugmeler">
          <button onClick={yenile} title="Yenile" aria-label="Yenile">
            ↻
          </button>
          {hesap.merkez && <button onClick={() => setAyarAcik(true)}>Ayarlar</button>}
          <button onClick={cikis}>Çıkış</button>
        </nav>
      </header>

      {baglantiHatasi && <p className="hata">Güncellenemedi: {baglantiHatasi}</p>}

      <section className="ozetler" aria-label="Şantiye özeti">
        {cokluSantiye && (
          <button
            className={`ozet ${filtre === null ? 'secili' : ''}`}
            onClick={() => setFiltre(null)}
          >
            <span className="ozet-ad">Tümü</span>
            <OzetSayilar
              devam={ozet.reduce((t, o) => t + o.devam, 0)}
              gecikti={ozet.reduce((t, o) => t + o.gecikti, 0)}
              yakin={ozet.reduce((t, o) => t + o.yakin, 0)}
              kaymis={ozet.reduce((t, o) => t + o.kaymis, 0)}
            />
          </button>
        )}
        {ozet.map((o) => (
          <button
            key={o.santiye.id}
            className={`ozet ${filtre === o.santiye.id || !cokluSantiye ? 'secili' : ''}`}
            onClick={() => cokluSantiye && setFiltre(filtre === o.santiye.id ? null : o.santiye.id)}
          >
            <span className="ozet-ad">{o.santiye.ad}</span>
            <OzetSayilar {...o} />
          </button>
        ))}
      </section>

      <section className="kart">
        <div className="bolum-baslik">
          <h2>Son değişiklikler</h2>
          <div className="parcali" role="group" aria-label="Dönem">
            {DONEMLER.map((d) => (
              <button
                key={d.gun}
                className={donem === d.gun ? 'secili' : ''}
                onClick={() => setDonem(d.gun)}
              >
                {d.ad}
              </button>
            ))}
          </div>
        </div>
        {sonDegisiklikler.length === 0 ? (
          <p className="soluk bos">Bu dönemde değişiklik yok.</p>
        ) : (
          <ul className="degisiklikler">
            {sonDegisiklikler.map((d) => (
              <li key={d.id}>
                <button className="degisiklik" onClick={() => setSeciliId(d.kalem_id)}>
                  <span className={`nokta tur-${d.tur}`} aria-hidden />
                  <span className="degisiklik-govde">
                    <span className="degisiklik-ust">
                      <strong>{d.kalem_ad}</strong>
                      {cokluSantiye && filtre === null && (
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
        )}
      </section>

      <section className="kart">
        <div className="bolum-baslik">
          <div className="parcali" role="tablist">
            <button
              role="tab"
              aria-selected={sekme === 'devam'}
              className={sekme === 'devam' ? 'secili' : ''}
              onClick={() => setSekme('devam')}
            >
              Devam eden ({sayilar.devam})
            </button>
            <button
              role="tab"
              aria-selected={sekme === 'bitti'}
              className={sekme === 'bitti' ? 'secili' : ''}
              onClick={() => setSekme('bitti')}
            >
              Biten ({sayilar.bitti})
            </button>
          </div>
          <button className="ana-dugme" onClick={() => setYeniAcik(true)}>
            + Yeni imalat
          </button>
        </div>

        <input
          className="arama"
          type="search"
          placeholder="İmalat ya da konum ara"
          value={sorgu}
          onChange={(e) => setSorgu(e.target.value)}
        />

        {sekme === 'bitti' && liste.length > 0 && (
          <p className="hedef-tutma">
            <span className="rozet r-yesil">{sonuclar.ilk_hedefte} ilk hedefte</span>
            <span className="rozet r-sari">{sonuclar.revize_hedefte} revize hedefte</span>
            <span className="rozet r-kirmizi">{sonuclar.gec} geç</span>
          </p>
        )}

        {liste.length === 0 ? (
          <p className="soluk bos">
            {sorgu
              ? 'Aramaya uyan imalat yok.'
              : sekme === 'devam'
                ? 'Devam eden imalat yok. “+ Yeni imalat” ile ekleyin.'
                : 'Henüz biten imalat yok.'}
          </p>
        ) : (
          <ul className="liste">
            {liste.map((k) => (
              <li key={k.id}>
                <Satir
                  k={k}
                  bugun={bugun}
                  santiye={cokluSantiye && filtre === null ? santiyeAdi.get(k.santiye_id) : undefined}
                  ac={() => setSeciliId(k.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

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
          varsayilanSantiye={filtre ?? (santiyeler.length === 1 ? santiyeler[0].id : null)}
          merkez={hesap.merkez}
          bugun={bugun}
          kapat={() => setYeniAcik(false)}
          yenile={yenile}
        />
      )}
      {ayarAcik && (
        <Ayarlar santiyeler={santiyeler} kapat={() => setAyarAcik(false)} yenile={yenile} />
      )}
    </div>
  )
}

function OzetSayilar(o: { devam: number; gecikti: number; yakin: number; kaymis: number }) {
  return (
    <span className="ozet-sayilar">
      <span>
        <b>{o.devam}</b> devam
      </span>
      <span className={o.gecikti ? 'r-kirmizi-yazi' : 'soluk'}>
        <b>{o.gecikti}</b> gecikmiş
      </span>
      <span className={o.yakin ? 'r-sari-yazi' : 'soluk'}>
        <b>{o.yakin}</b> bu hafta
      </span>
      <span className="soluk">
        <b>{o.kaymis}</b> ertelenmiş
      </span>
    </span>
  )
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
    const gec = gunFarki(k.hedef, k.bitis!)
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
            {s === 'gec' ? `${gec} gün geç` : SONUC_YAZI[s][0]}
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
            {k.erteleme > 0 && ` · ${k.erteleme} kez değişti`}
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

const ROZET = { gecikti: 'r-kirmizi', yakin: 'r-sari', yolunda: 'r-yesil', bitti: '' }
