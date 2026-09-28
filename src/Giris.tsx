import { useEffect, useState, type FormEvent } from 'react'
import { api } from './api'
import { Hata, useIslem } from './ortak'

const SON_HESAP = 'imalat_son_hesap'

export function Giris({ girildi }: { girildi: () => void }) {
  const [hesaplar, setHesaplar] = useState<{ kod: string; ad: string }[] | null>(null)
  const [kod, setKod] = useState(() => localStorage.getItem(SON_HESAP) ?? '')
  const [sifre, setSifre] = useState('')
  const { bekliyor, hata, calistir } = useIslem()
  const [yukHata, setYukHata] = useState<string | null>(null)

  useEffect(() => {
    api
      .hesaplar()
      .then((h) => {
        setHesaplar(h)
        setKod((k) => (h.some((x) => x.kod === k) ? k : (h[0]?.kod ?? '')))
      })
      .catch((e) => setYukHata(e.message))
  }, [])

  async function gonder(e: FormEvent) {
    e.preventDefault()
    const ok = await calistir(() => api.giris(kod, sifre))
    if (ok) {
      localStorage.setItem(SON_HESAP, kod)
      girildi()
    }
  }

  return (
    <main className="giris">
      <form className="kart giris-kart" onSubmit={gonder}>
        <h1>İmalat Takip</h1>
        <p className="soluk">Şantiyenizi seçip şifreyle girin.</p>
        <Hata mesaj={yukHata} />
        {hesaplar && (
          <div className="secim" role="radiogroup" aria-label="Giriş">
            {hesaplar.map((h) => (
              <button
                type="button"
                key={h.kod}
                role="radio"
                aria-checked={kod === h.kod}
                className={kod === h.kod ? 'secili' : ''}
                onClick={() => setKod(h.kod)}
              >
                {h.ad}
              </button>
            ))}
          </div>
        )}
        <label className="alan">
          <span>Şifre</span>
          <input
            type="password"
            value={sifre}
            onChange={(e) => setSifre(e.target.value)}
            autoComplete="current-password"
            required
            autoFocus
          />
        </label>
        <Hata mesaj={hata} />
        <button className="ana-dugme" disabled={bekliyor || !kod}>
          {bekliyor ? 'Giriliyor…' : 'Giriş'}
        </button>
      </form>
    </main>
  )
}
