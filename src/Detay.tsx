import { Fragment, useEffect, useState, type FormEvent } from 'react'
import { api, type Degisiklik, type Kalem } from './api'
import { AdAlani, Cipler, Hata, Modal, useAd, useIslem } from './ortak'
import {
  ayEkle,
  degisiklikYaz,
  durum,
  gunEkle,
  gunFarki,
  gunYaz,
  kalanYaz,
  kayma,
  sonuc,
  tarihYaz,
  zamanYaz,
} from './tarih'

type Mod = 'bak' | 'tarih' | 'bitir' | 'duzenle' | 'sil' | 'geri_ac'

interface Props {
  k: Kalem
  bugun: string
  merkez: boolean
  santiye: string
  kapat: () => void
  yenile: () => Promise<void>
}

const HAZIR_NEDENLER = [
  'Malzeme gecikti',
  'Hava koşulları',
  'Ekip / taşeron eksik',
  'Önceki iş gecikti',
  'Proje değişikliği',
  'Onay bekleniyor',
]

export function Detay({ k, bugun, merkez, santiye, kapat, yenile }: Props) {
  const [mod, setMod] = useState<Mod>('bak')
  const [gecmis, setGecmis] = useState<Degisiklik[] | null>(null)
  const [gecmisHata, setGecmisHata] = useState<string | null>(null)
  const islem = useIslem()

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

  async function kaydet(is: () => Promise<unknown>) {
    if (await islem.calistir(is)) {
      await yenile()
      setMod('bak')
    }
  }

  const kay = kayma(k)
  const d = durum(k, bugun)
  const silinebilir = merkez || k.erteleme === 0
  const vazgec = (
    <button type="button" onClick={() => setMod('bak')} disabled={islem.bekliyor}>
      Vazgeç
    </button>
  )
  const gonderDugmesi = (form: string, yazi: string, sinif = 'ana-dugme') => (
    <button type="submit" form={form} className={sinif} disabled={islem.bekliyor}>
      {islem.bekliyor ? 'Kaydediliyor…' : yazi}
    </button>
  )

  // Her mod kendi düğmelerini yeni DOM düğümleriyle çizer (key=mod). Aksi halde
  // React "Bitti" düğmesini yerinde "Bitti olarak kaydet" gönder düğmesine
  // çevirir ve aynı tıklama formu hemen gönderir.
  const altlar = {
    bak:
      k.durum === 'devam' ? (
        <>
          <button type="button" className="ana-dugme" onClick={() => setMod('tarih')}>
            {k.hedef ? 'Tarihi değiştir' : 'Hedef tarih ver'}
          </button>
          <button type="button" className="yesil-dugme" onClick={() => setMod('bitir')}>
            Bitti
          </button>
        </>
      ) : (
        <button type="button" className="ana-dugme" onClick={() => setMod('geri_ac')}>
          Yeniden aç
        </button>
      ),
    tarih: (
      <>
        {vazgec}
        {gonderDugmesi('f-tarih', k.hedef ? 'Yeni tarihi kaydet' : 'Tarihi kaydet')}
      </>
    ),
    bitir: (
      <>
        {vazgec}
        {gonderDugmesi('f-bitir', 'Bitti olarak kaydet', 'yesil-dugme')}
      </>
    ),
    duzenle: (
      <>
        {vazgec}
        {gonderDugmesi('f-duzenle', 'Kaydet')}
      </>
    ),
    geri_ac: (
      <>
        {vazgec}
        {gonderDugmesi('f-geri-ac', 'Yeniden aç')}
      </>
    ),
    sil: (
      <>
        {vazgec}
        <button
          type="button"
          className="tehlike dolu"
          disabled={islem.bekliyor}
          onClick={async () => {
            if (await islem.calistir(() => api.sil(k.id))) {
              kapat()
              await yenile()
            }
          }}
        >
          {islem.bekliyor ? 'Siliniyor…' : 'Evet, sil'}
        </button>
      </>
    ),
  }
  const alt = <Fragment key={mod}>{altlar[mod]}</Fragment>

  return (
    <Modal baslik={k.ad} kapat={kapat} alt={alt}>
      <div className={`durum-serit d-${d}`}>
        {k.durum === 'devam' && k.hedef ? (
          <>
            <strong>{kalanYaz(k.hedef, bugun)}</strong>
            <span>Hedef {tarihYaz(k.hedef, bugun)}</span>
          </>
        ) : k.durum === 'devam' ? (
          <>
            <strong>Hedef tarih yok</strong>
            <span>Tarih verilince takibe girer</span>
          </>
        ) : (
          <>
            <strong>
              {
                {
                  ilk_hedefte: 'İlk hedefte bitti',
                  revize_hedefte: 'Revize hedefte bitti',
                  gec: `${gunFarki(k.hedef!, k.bitis!)} gün geç bitti`,
                  hedefsiz: 'Bitti',
                }[sonuc(k)]
              }
            </strong>
            <span>Bitiş {tarihYaz(k.bitis!, bugun)}</span>
          </>
        )}
      </div>

      <dl className="bilgi">
        <div>
          <dt>Şantiye</dt>
          <dd>{santiye}</dd>
        </div>
        <div>
          <dt>Konum</dt>
          <dd>{k.konum ?? '—'}</dd>
        </div>
        <div>
          <dt>İlk hedef</dt>
          <dd>{k.ilk_hedef ? tarihYaz(k.ilk_hedef, bugun) : '—'}</dd>
        </div>
        <div>
          <dt>Güncel hedef</dt>
          <dd>
            {k.hedef ? tarihYaz(k.hedef, bugun) : '—'}
            {kay !== 0 && <span className="kayma"> ({gunYaz(kay)})</span>}
          </dd>
        </div>
      </dl>

      {mod === 'tarih' && <TarihFormu k={k} bugun={bugun} kaydet={kaydet} />}
      {mod === 'bitir' && <BitirFormu k={k} bugun={bugun} kaydet={kaydet} />}
      {mod === 'duzenle' && <DuzenleFormu k={k} kaydet={kaydet} />}
      {mod === 'geri_ac' && <GeriAcFormu k={k} kaydet={kaydet} />}
      {mod === 'sil' && (
        <p className="form">
          <span>
            <strong>{k.ad}</strong> ve bütün geçmişi kalıcı olarak silinecek. Yanlış girilmiş
            kayıtlar içindir; biten imalatı silmek yerine “Bitti” olarak işaretleyin.
          </span>
        </p>
      )}
      <Hata mesaj={islem.hata} />

      {mod === 'bak' && (
        <div className="ikincil-eylemler">
          <button type="button" className="baglanti" onClick={() => setMod('duzenle')}>
            Düzenle
          </button>
          {silinebilir && (
            <button type="button" className="baglanti tehlike" onClick={() => setMod('sil')}>
              Sil
            </button>
          )}
        </div>
      )}

      <h3 className="alt-baslik">
        Geçmiş{k.erteleme > 0 && <span className="soluk"> · tarih {k.erteleme} kez değişti</span>}
      </h3>
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
                {g.neden && (g.tur === 'tarih' || g.tur === 'olusturma') && (
                  <div className="neden">“{g.neden}”</div>
                )}
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
  kaydet: (is: () => Promise<unknown>) => Promise<void>
}

function TarihFormu({ k, bugun, kaydet }: FormProps & { bugun: string }) {
  const [ad] = useAd()
  const [yeni, setYeni] = useState(k.hedef ?? '')
  const [neden, setNeden] = useState('')
  // Tarihsiz imalata ilk tarih verilirken neden sorulmaz; bu tarih ilk hedef olur.
  const ilkTarih = !k.hedef
  const fark = yeni && k.hedef ? gunFarki(k.hedef, yeni) : 0
  const hizli = k.hedef
    ? [
        { deger: gunEkle(k.hedef, 3), ad: '+3 gün' },
        { deger: gunEkle(k.hedef, 7), ad: '+1 hafta' },
        { deger: gunEkle(k.hedef, 14), ad: '+2 hafta' },
        { deger: ayEkle(k.hedef, 1), ad: '+1 ay' },
      ]
    : [
        { deger: gunEkle(bugun, 7), ad: '1 hafta' },
        { deger: gunEkle(bugun, 14), ad: '2 hafta' },
        { deger: ayEkle(bugun, 1), ad: '1 ay' },
        { deger: ayEkle(bugun, 2), ad: '2 ay' },
      ]

  function gonder(e: FormEvent) {
    e.preventDefault()
    kaydet(() => api.tarih(k.id, yeni, ilkTarih ? '' : neden, ad))
  }

  return (
    <form id="f-tarih" className="form" onSubmit={gonder}>
      <div className="alan">
        <span>{ilkTarih ? 'Hedef bitiş tarihi' : 'Yeni hedef tarih'}</span>
        <Cipler etiket="Hızlı seçim" secenekler={hizli} deger={yeni} sec={setYeni} />
        <input
          type="date"
          value={yeni}
          onChange={(e) => setYeni(e.target.value)}
          required
          aria-label="Yeni hedef tarih"
        />
        {fark !== 0 && (
          <small className={fark > 0 ? 'r-kirmizi-yazi' : 'r-yesil-yazi'}>
            {tarihYaz(k.hedef!, bugun)} → {tarihYaz(yeni, bugun)} ({gunYaz(fark)})
            {gunFarki(bugun, yeni) < 0 && ' · geçmiş bir tarih'}
          </small>
        )}
        {ilkTarih && yeni && (
          <small className={gunFarki(bugun, yeni) < 0 ? 'r-kirmizi-yazi' : 'soluk'}>
            {gunFarki(bugun, yeni) < 0
              ? 'Bu tarih geçmişte; imalat gecikmiş görünecek.'
              : `${tarihYaz(yeni, bugun)} · ${gunFarki(bugun, yeni)} gün sonra · ilk hedef olarak kaydedilir`}
          </small>
        )}
      </div>
      {!ilkTarih && (
        <div className="alan">
          <span>Neden değişiyor?</span>
          <Cipler
            etiket="Hazır nedenler"
            secenekler={HAZIR_NEDENLER.map((n) => ({ deger: n, ad: n }))}
            deger={neden}
            sec={setNeden}
          />
          <textarea
            value={neden}
            onChange={(e) => setNeden(e.target.value)}
            placeholder="Seçin ya da kısaca yazın"
            required
            minLength={3}
            rows={2}
            aria-label="Neden değişiyor?"
          />
        </div>
      )}
      <AdAlani />
    </form>
  )
}

function BitirFormu({ k, bugun, kaydet }: FormProps & { bugun: string }) {
  const [ad] = useAd()
  const [tarih, setTarih] = useState(bugun)
  const hizli = [
    { deger: bugun, ad: 'Bugün' },
    { deger: gunEkle(bugun, -1), ad: 'Dün' },
  ]

  function gonder(e: FormEvent) {
    e.preventDefault()
    kaydet(() => api.bitir(k.id, tarih, ad))
  }

  return (
    <form id="f-bitir" className="form" onSubmit={gonder}>
      <div className="alan">
        <span>Ne zaman bitti?</span>
        <Cipler etiket="Hızlı seçim" secenekler={hizli} deger={tarih} sec={setTarih} />
        <input
          type="date"
          value={tarih}
          max={bugun}
          onChange={(e) => setTarih(e.target.value)}
          required
          aria-label="Bitiş tarihi"
        />
      </div>
      <AdAlani />
    </form>
  )
}

function GeriAcFormu({ k, kaydet }: FormProps) {
  const [ad] = useAd()
  return (
    <form
      id="f-geri-ac"
      className="form"
      onSubmit={(e) => {
        e.preventDefault()
        kaydet(() => api.geriAc(k.id, ad))
      }}
    >
      <p>İmalat yeniden “devam ediyor” olacak.</p>
      <AdAlani />
    </form>
  )
}

function DuzenleFormu({ k, kaydet }: FormProps) {
  const [ad] = useAd()
  const [isim, setIsim] = useState(k.ad)
  const [konum, setKonum] = useState(k.konum ?? '')
  const [hedef, setHedef] = useState(k.hedef ?? '')
  const tarihDuzeltilebilir = k.erteleme === 0 && k.durum === 'devam'

  function gonder(e: FormEvent) {
    e.preventDefault()
    kaydet(() => api.duzenle(k.id, isim, konum, (tarihDuzeltilebilir && hedef) || null, ad))
  }

  return (
    <form id="f-duzenle" className="form" onSubmit={gonder}>
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
          <span>{k.hedef ? 'Hedef tarih (yanlış girildiyse)' : 'Hedef tarih (isteğe bağlı)'}</span>
          <input
            type="date"
            value={hedef}
            onChange={(e) => setHedef(e.target.value)}
            required={!!k.hedef}
          />
          <small className="soluk">Henüz ertelenmediği için ilk hedef de birlikte düzeltilir.</small>
        </label>
      ) : (
        k.durum === 'devam' && (
          <p className="soluk kucuk">
            Tarih bu imalatta daha önce değişti; yeni tarih için “Tarihi değiştir”i kullanın.
          </p>
        )
      )}
      <AdAlani />
    </form>
  )
}
