import { useEffect, useState, type FormEvent } from 'react'
import { api, type Degisiklik, type Kalem } from './api'
import { AdAlani, Hata, Modal, useAd, useIslem } from './ortak'
import { degisiklikYaz, durum, gunFarki, gunYaz, kalanYaz, kayma, sonuc, tarihYaz, zamanYaz } from './tarih'

type Mod = 'bak' | 'tarih' | 'bitir' | 'duzenle' | 'sil'

interface Props {
  k: Kalem
  bugun: string
  merkez: boolean
  santiye: string
  kapat: () => void
  yenile: () => Promise<void>
}

export function Detay({ k, bugun, merkez, santiye, kapat, yenile }: Props) {
  const [mod, setMod] = useState<Mod>('bak')
  const [gecmis, setGecmis] = useState<Degisiklik[] | null>(null)
  const [gecmisHata, setGecmisHata] = useState<string | null>(null)

  // İmalat her güncellendiğinde (yeni veri geldiğinde) geçmişi tazele.
  const surum = `${k.hedef}|${k.durum}|${k.ad}|${k.konum}|${k.erteleme}`
  useEffect(() => {
    api
      .gecmis(k.id)
      .then((g) => {
        setGecmis(g)
        setGecmisHata(null)
      })
      .catch((e) => setGecmisHata(e.message))
  }, [k.id, surum])

  async function bitti() {
    await yenile()
    setMod('bak')
  }

  const kay = kayma(k)
  const d = durum(k, bugun)
  const silinebilir = merkez || k.erteleme === 0

  return (
    <Modal baslik={k.ad} kapat={kapat}>
      <dl className="bilgi">
        <div>
          <dt>Şantiye</dt>
          <dd>{santiye}</dd>
        </div>
        {k.konum && (
          <div>
            <dt>Konum</dt>
            <dd>{k.konum}</dd>
          </div>
        )}
        <div>
          <dt>İlk hedef</dt>
          <dd>{tarihYaz(k.ilk_hedef, bugun)}</dd>
        </div>
        <div>
          <dt>Güncel hedef</dt>
          <dd>
            {tarihYaz(k.hedef, bugun)}
            {kay !== 0 && <span className="kayma"> ({gunYaz(kay)})</span>}
          </dd>
        </div>
        {k.durum === 'devam' ? (
          <div>
            <dt>Durum</dt>
            <dd className={d === 'gecikti' ? 'r-kirmizi-yazi' : d === 'yakin' ? 'r-sari-yazi' : ''}>
              {kalanYaz(k.hedef, bugun)}
            </dd>
          </div>
        ) : (
          <div>
            <dt>Bitiş</dt>
            <dd>
              {tarihYaz(k.bitis!, bugun)} ·{' '}
              {{
                ilk_hedefte: 'ilk hedefte bitti',
                revize_hedefte: 'revize hedefte bitti',
                gec: `${gunFarki(k.hedef, k.bitis!)} gün geç bitti`,
              }[sonuc(k)]}
            </dd>
          </div>
        )}
        <div>
          <dt>Tarih değişikliği</dt>
          <dd>{k.erteleme === 0 ? 'Yok' : `${k.erteleme} kez`}</dd>
        </div>
      </dl>

      {mod === 'bak' && (
        <div className="eylemler">
          {k.durum === 'devam' ? (
            <>
              <button className="ana-dugme" onClick={() => setMod('tarih')}>
                Tarihi değiştir
              </button>
              <button className="yesil-dugme" onClick={() => setMod('bitir')}>
                Bitti
              </button>
            </>
          ) : (
            <GeriAc k={k} bitti={bitti} />
          )}
          <button onClick={() => setMod('duzenle')}>Düzenle</button>
          {silinebilir && (
            <button className="tehlike" onClick={() => setMod('sil')}>
              Sil
            </button>
          )}
        </div>
      )}
      {mod === 'tarih' && <TarihFormu k={k} bugun={bugun} vazgec={() => setMod('bak')} bitti={bitti} />}
      {mod === 'bitir' && <BitirFormu k={k} bugun={bugun} vazgec={() => setMod('bak')} bitti={bitti} />}
      {mod === 'duzenle' && <DuzenleFormu k={k} vazgec={() => setMod('bak')} bitti={bitti} />}
      {mod === 'sil' && (
        <SilOnayi
          k={k}
          vazgec={() => setMod('bak')}
          bitti={async () => {
            kapat()
            await yenile()
          }}
        />
      )}

      <h3 className="alt-baslik">Geçmiş</h3>
      <Hata mesaj={gecmisHata} />
      {gecmis === null ? (
        !gecmisHata && <p className="soluk">Yükleniyor…</p>
      ) : (
        <ol className="zaman-cizelgesi">
          {gecmis.map((g) => (
            <li key={g.id}>
              <span className={`nokta tur-${g.tur}`} aria-hidden />
              <div>
                <div>{degisiklikYaz(g, bugun)}</div>
                {g.neden && g.tur === 'tarih' && <div className="neden">“{g.neden}”</div>}
                <div className="soluk kucuk">
                  {g.yapan_ad} · {zamanYaz(g.zaman, bugun)} ·{' '}
                  {new Date(g.zaman).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' })}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Modal>
  )
}

interface FormProps {
  k: Kalem
  vazgec: () => void
  bitti: () => Promise<void>
}

function TarihFormu({ k, bugun, vazgec, bitti }: FormProps & { bugun: string }) {
  const [ad, setAd] = useAd()
  const [yeni, setYeni] = useState(k.hedef)
  const [neden, setNeden] = useState('')
  const { bekliyor, hata, calistir } = useIslem()
  const fark = yeni ? gunFarki(k.hedef, yeni) : 0

  async function gonder(e: FormEvent) {
    e.preventDefault()
    if (await calistir(() => api.tarih(k.id, yeni, neden, ad))) await bitti()
  }

  return (
    <form className="form" onSubmit={gonder}>
      <label className="alan">
        <span>Yeni hedef tarih</span>
        <input type="date" value={yeni} onChange={(e) => setYeni(e.target.value)} required />
        {fark !== 0 && (
          <small className={fark > 0 ? 'r-kirmizi-yazi' : 'r-yesil-yazi'}>
            Mevcut hedefe göre {gunYaz(fark)}
            {gunFarki(bugun, yeni) < 0 && ' · geçmiş bir tarih'}
          </small>
        )}
      </label>
      <label className="alan">
        <span>Neden değişiyor?</span>
        <textarea
          value={neden}
          onChange={(e) => setNeden(e.target.value)}
          placeholder="Örn. malzeme gecikti, yağmur, taşeron değişti"
          required
          minLength={3}
          rows={2}
        />
      </label>
      <AdAlani ad={ad} setAd={setAd} />
      <Hata mesaj={hata} />
      <div className="eylemler">
        <button className="ana-dugme" disabled={bekliyor}>
          {bekliyor ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
        <button type="button" onClick={vazgec}>
          Vazgeç
        </button>
      </div>
    </form>
  )
}

function BitirFormu({ k, bugun, vazgec, bitti }: FormProps & { bugun: string }) {
  const [ad, setAd] = useAd()
  const [tarih, setTarih] = useState(bugun)
  const { bekliyor, hata, calistir } = useIslem()

  async function gonder(e: FormEvent) {
    e.preventDefault()
    if (await calistir(() => api.bitir(k.id, tarih, ad))) await bitti()
  }

  return (
    <form className="form" onSubmit={gonder}>
      <label className="alan">
        <span>Bitiş tarihi</span>
        <input type="date" value={tarih} max={bugun} onChange={(e) => setTarih(e.target.value)} required />
      </label>
      <AdAlani ad={ad} setAd={setAd} />
      <Hata mesaj={hata} />
      <div className="eylemler">
        <button className="yesil-dugme" disabled={bekliyor}>
          {bekliyor ? 'Kaydediliyor…' : 'Bitti olarak kaydet'}
        </button>
        <button type="button" onClick={vazgec}>
          Vazgeç
        </button>
      </div>
    </form>
  )
}

function GeriAc({ k, bitti }: { k: Kalem; bitti: () => Promise<void> }) {
  const [ad, setAd] = useAd()
  const [acik, setAcik] = useState(false)
  const { bekliyor, hata, calistir } = useIslem()

  if (!acik) return <button onClick={() => setAcik(true)}>Yeniden aç</button>
  return (
    <form
      className="form tam"
      onSubmit={async (e) => {
        e.preventDefault()
        if (await calistir(() => api.geriAc(k.id, ad))) await bitti()
      }}
    >
      <p>İmalat yeniden “devam ediyor” olacak.</p>
      <AdAlani ad={ad} setAd={setAd} />
      <Hata mesaj={hata} />
      <div className="eylemler">
        <button className="ana-dugme" disabled={bekliyor}>
          Yeniden aç
        </button>
        <button type="button" onClick={() => setAcik(false)}>
          Vazgeç
        </button>
      </div>
    </form>
  )
}

function DuzenleFormu({ k, vazgec, bitti }: FormProps) {
  const [ad, setAd] = useAd()
  const [isim, setIsim] = useState(k.ad)
  const [konum, setKonum] = useState(k.konum ?? '')
  const [hedef, setHedef] = useState(k.hedef)
  const { bekliyor, hata, calistir } = useIslem()
  const tarihDuzeltilebilir = k.erteleme === 0 && k.durum === 'devam'

  async function gonder(e: FormEvent) {
    e.preventDefault()
    const ok = await calistir(() =>
      api.duzenle(k.id, isim, konum, tarihDuzeltilebilir ? hedef : null, ad),
    )
    if (ok) await bitti()
  }

  return (
    <form className="form" onSubmit={gonder}>
      <label className="alan">
        <span>İmalat</span>
        <input value={isim} onChange={(e) => setIsim(e.target.value)} required maxLength={200} />
      </label>
      <label className="alan">
        <span>Konum (blok, kat…)</span>
        <input value={konum} onChange={(e) => setKonum(e.target.value)} maxLength={200} />
      </label>
      {tarihDuzeltilebilir ? (
        <label className="alan">
          <span>Hedef tarih (yanlış girildiyse)</span>
          <input type="date" value={hedef} onChange={(e) => setHedef(e.target.value)} required />
          <small className="soluk">
            Henüz ertelenmediği için ilk hedef de birlikte düzeltilir.
          </small>
        </label>
      ) : (
        k.durum === 'devam' && (
          <p className="soluk kucuk">
            Tarih bu imalatta daha önce değişti; yeni tarih için “Tarihi değiştir”i kullanın.
          </p>
        )
      )}
      <AdAlani ad={ad} setAd={setAd} />
      <Hata mesaj={hata} />
      <div className="eylemler">
        <button className="ana-dugme" disabled={bekliyor}>
          {bekliyor ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
        <button type="button" onClick={vazgec}>
          Vazgeç
        </button>
      </div>
    </form>
  )
}

function SilOnayi({ k, vazgec, bitti }: FormProps) {
  const { bekliyor, hata, calistir } = useIslem()
  return (
    <div className="form">
      <p>
        <strong>{k.ad}</strong> ve bütün geçmişi kalıcı olarak silinecek. Yanlış girilmiş
        kayıtlar içindir; biten imalatı silmek yerine “Bitti” olarak işaretleyin.
      </p>
      <Hata mesaj={hata} />
      <div className="eylemler">
        <button
          className="tehlike dolu"
          disabled={bekliyor}
          onClick={async () => {
            if (await calistir(() => api.sil(k.id))) await bitti()
          }}
        >
          {bekliyor ? 'Siliniyor…' : 'Evet, sil'}
        </button>
        <button type="button" onClick={vazgec}>
          Vazgeç
        </button>
      </div>
    </div>
  )
}
