import { useEffect, useState, type FormEvent } from 'react'
import { api, type Santiye, type Veri } from './api'
import { Hata, useAd, useIslem } from './ortak'

interface Props {
  veri: Veri
  yenile: () => Promise<void>
  cikis: () => void
}

export function Hesap({ veri, yenile, cikis }: Props) {
  const { hesap, santiyeler } = veri
  const [ad, setAd] = useAd()

  return (
    <>
      <section className="kart bolum">
        <h2>Bu cihaz</h2>
        <label className="alan">
          <span>Adınız</span>
          <input
            value={ad}
            onChange={(e) => setAd(e.target.value)}
            placeholder="Örn. Ali Yılmaz"
            autoComplete="name"
            enterKeyHint="done"
          />
          <small className="soluk">
            Tarih değiştirdiğinizde ya da imalat eklediğinizde kaydı yapan olarak bu ad görünür.
          </small>
        </label>
        <p className="soluk kucuk">
          Giriş: <strong>{hesap.ad}</strong>
        </p>
        <button className="tehlike" onClick={cikis}>
          Çıkış yap
        </button>
      </section>

      <AnaEkranaEkle />

      {hesap.merkez && (
        <>
          <section className="kart bolum">
            <h2>Şantiye adları</h2>
            {santiyeler.map((s) => (
              <SantiyeAdi key={s.id} s={s} yenile={yenile} />
            ))}
          </section>
          <section className="kart bolum">
            <h2>Şifreler</h2>
            <p className="soluk kucuk">
              Şifre değişince o hesapla açık olan cihazlardan çıkış yapılır; yeni şifreyi ilgili
              şantiyeye iletin.
            </p>
            <SifreFormu santiyeler={santiyeler} />
          </section>
        </>
      )}
    </>
  )
}

interface KurulumOlayi extends Event {
  prompt: () => Promise<void>
}

/** Telefonda ana ekrana ekleme: Android'de düğme, iPhone'da tarif. */
function AnaEkranaEkle() {
  const [olay, setOlay] = useState<KurulumOlayi | null>(null)
  const kurulu =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as { standalone?: boolean }).standalone === true
  const iphone = /iPhone|iPad|iPod/.test(navigator.userAgent)

  useEffect(() => {
    const dinle = (e: Event) => {
      e.preventDefault()
      setOlay(e as KurulumOlayi)
    }
    window.addEventListener('beforeinstallprompt', dinle)
    return () => window.removeEventListener('beforeinstallprompt', dinle)
  }, [])

  if (kurulu) return null
  return (
    <section className="kart bolum">
      <h2>Telefona uygulama olarak ekle</h2>
      {olay ? (
        <button
          className="ana-dugme"
          onClick={async () => {
            await olay.prompt()
            setOlay(null)
          }}
        >
          Ana ekrana ekle
        </button>
      ) : iphone ? (
        <p className="kucuk">
          Safari'de alttaki <strong>Paylaş</strong> düğmesine, ardından{' '}
          <strong>Ana Ekrana Ekle</strong>'ye dokunun.
        </p>
      ) : (
        <p className="kucuk">
          Chrome'da sağ üstteki <strong>⋮</strong> menüsünden <strong>Ana ekrana ekle</strong> ya
          da <strong>Uygulamayı yükle</strong>'yi seçin.
        </p>
      )}
      <p className="soluk kucuk">Böylece uygulama kendi simgesiyle, tam ekran açılır.</p>
    </section>
  )
}

function SantiyeAdi({ s, yenile }: { s: Santiye; yenile: () => Promise<void> }) {
  const [ad, setAd] = useState(s.ad)
  const [tamam, setTamam] = useState(false)
  const { bekliyor, hata, calistir } = useIslem()

  async function gonder(e: FormEvent) {
    e.preventDefault()
    setTamam(false)
    if (await calistir(() => api.santiyeAd(s.id, ad))) {
      await yenile()
      setTamam(true)
    }
  }

  return (
    <form className="satir-form" onSubmit={gonder}>
      <input value={ad} onChange={(e) => setAd(e.target.value)} required maxLength={60} />
      <button disabled={bekliyor || ad.trim() === s.ad}>Kaydet</button>
      {tamam && <span className="r-yesil-yazi kucuk">Kaydedildi</span>}
      <Hata mesaj={hata} />
    </form>
  )
}

function SifreFormu({ santiyeler }: { santiyeler: Santiye[] }) {
  const [kod, setKod] = useState('s1')
  const [sifre, setSifre] = useState('')
  const [tamam, setTamam] = useState<string | null>(null)
  const { bekliyor, hata, calistir } = useIslem()
  const hesaplar = [
    ...santiyeler.map((s) => ({ kod: `s${s.id}`, ad: s.ad })),
    { kod: 'merkez', ad: 'Merkez' },
  ]

  async function gonder(e: FormEvent) {
    e.preventDefault()
    setTamam(null)
    if (await calistir(() => api.sifre(kod, sifre))) {
      setTamam(hesaplar.find((h) => h.kod === kod)?.ad ?? kod)
      setSifre('')
    }
  }

  return (
    <form className="form" onSubmit={gonder}>
      <label className="alan">
        <span>Hesap</span>
        <select value={kod} onChange={(e) => setKod(e.target.value)}>
          {hesaplar.map((h) => (
            <option key={h.kod} value={h.kod}>
              {h.ad}
            </option>
          ))}
        </select>
      </label>
      <label className="alan">
        <span>Yeni şifre</span>
        <input
          type="text"
          value={sifre}
          onChange={(e) => setSifre(e.target.value)}
          minLength={6}
          required
          autoComplete="new-password"
        />
      </label>
      <Hata mesaj={hata} />
      {tamam && <p className="r-yesil-yazi">{tamam} şifresi değişti.</p>}
      <button className="ana-dugme" disabled={bekliyor}>
        Şifreyi değiştir
      </button>
    </form>
  )
}
