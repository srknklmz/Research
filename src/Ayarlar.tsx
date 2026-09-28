import { useState, type FormEvent } from 'react'
import { api, type Santiye } from './api'
import { Hata, Modal, useIslem } from './ortak'

interface Props {
  santiyeler: Santiye[]
  kapat: () => void
  yenile: () => Promise<void>
}

export function Ayarlar({ santiyeler, kapat, yenile }: Props) {
  return (
    <Modal baslik="Ayarlar" kapat={kapat}>
      <h3 className="alt-baslik">Şantiye adları</h3>
      {santiyeler.map((s) => (
        <SantiyeAdi key={s.id} s={s} yenile={yenile} />
      ))}
      <h3 className="alt-baslik">Şifreler</h3>
      <p className="soluk kucuk">
        Şifre değişince o hesapla açık olan cihazlardan çıkış yapılır; yeni şifreyi ilgili
        şantiyeye iletin.
      </p>
      <SifreFormu santiyeler={santiyeler} />
    </Modal>
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
      <div className="eylemler">
        <button className="ana-dugme" disabled={bekliyor}>
          Şifreyi değiştir
        </button>
      </div>
    </form>
  )
}
