import { useState, type FormEvent } from 'react'
import { api, type Santiye } from './api'
import { AdAlani, Hata, Modal, useAd, useIslem } from './ortak'
import { gunFarki } from './tarih'

interface Props {
  santiyeler: Santiye[]
  varsayilanSantiye: number | null
  merkez: boolean
  bugun: string
  kapat: () => void
  yenile: () => Promise<void>
}

export function YeniKalem({ santiyeler, varsayilanSantiye, merkez, bugun, kapat, yenile }: Props) {
  const [ad, setAd] = useAd()
  const [santiye, setSantiye] = useState<number | null>(varsayilanSantiye)
  const [isim, setIsim] = useState('')
  const [konum, setKonum] = useState('')
  const [hedef, setHedef] = useState('')
  const [devamEt, setDevamEt] = useState(false)
  const [eklenen, setEklenen] = useState<string[]>([])
  const { bekliyor, hata, calistir } = useIslem()

  async function gonder(e: FormEvent) {
    e.preventDefault()
    const ok = await calistir(() =>
      api.ekle({ santiye: merkez ? santiye : null, ad: isim, konum, hedef, yapan: ad }),
    )
    if (!ok) return
    await yenile()
    if (devamEt) {
      // Aynı şantiye ve konuma arka arkaya imalat girilebilsin.
      setEklenen((l) => [...l, isim])
      setIsim('')
    } else {
      kapat()
    }
  }

  return (
    <Modal baslik="Yeni imalat" kapat={kapat}>
      <form className="form" onSubmit={gonder}>
        {merkez && santiyeler.length > 1 && (
          <label className="alan">
            <span>Şantiye</span>
            <select
              value={santiye ?? ''}
              onChange={(e) => setSantiye(e.target.value ? Number(e.target.value) : null)}
              required
            >
              <option value="">Seçin</option>
              {santiyeler.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.ad}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="alan">
          <span>İmalat</span>
          <input
            value={isim}
            onChange={(e) => setIsim(e.target.value)}
            placeholder="Örn. İç sıva, çatı izolasyonu"
            required
            maxLength={200}
            autoFocus
          />
        </label>
        <label className="alan">
          <span>Konum (isteğe bağlı)</span>
          <input
            value={konum}
            onChange={(e) => setKonum(e.target.value)}
            placeholder="Örn. A blok 3. kat"
            maxLength={200}
          />
        </label>
        <label className="alan">
          <span>Hedef bitiş tarihi</span>
          <input type="date" value={hedef} onChange={(e) => setHedef(e.target.value)} required />
          {hedef && gunFarki(bugun, hedef) < 0 && (
            <small className="r-kirmizi-yazi">Bu tarih geçmişte; imalat gecikmiş görünecek.</small>
          )}
        </label>
        <AdAlani ad={ad} setAd={setAd} />
        <label className="kutu">
          <input type="checkbox" checked={devamEt} onChange={(e) => setDevamEt(e.target.checked)} />
          Kaydettikten sonra yenisini gir
        </label>
        {eklenen.length > 0 && <p className="r-yesil-yazi kucuk">Eklendi: {eklenen.join(', ')}</p>}
        <Hata mesaj={hata} />
        <div className="eylemler">
          <button className="ana-dugme" disabled={bekliyor}>
            {bekliyor ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
          <button type="button" onClick={kapat}>
            {eklenen.length ? 'Kapat' : 'Vazgeç'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
