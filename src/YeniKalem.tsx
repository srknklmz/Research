import { useState, type FormEvent } from 'react'
import { api, type Santiye } from './api'
import { AdAlani, Cipler, Hata, Modal, useAd, useIslem } from './ortak'
import { ayEkle, gunEkle, gunFarki, tarihYaz } from './tarih'

interface Props {
  santiyeler: Santiye[]
  varsayilanSantiye: number | null
  merkez: boolean
  bugun: string
  kapat: () => void
  yenile: () => Promise<void>
}

export function YeniKalem({ santiyeler, varsayilanSantiye, merkez, bugun, kapat, yenile }: Props) {
  const [ad] = useAd()
  const [santiye, setSantiye] = useState<number | null>(varsayilanSantiye)
  const [isim, setIsim] = useState('')
  const [konum, setKonum] = useState('')
  const [hedef, setHedef] = useState('')
  const [devamEt, setDevamEt] = useState(false)
  const [eklenen, setEklenen] = useState<string[]>([])
  const { bekliyor, hata, calistir } = useIslem()
  const santiyeSor = merkez && santiyeler.length > 1

  const hizli = [
    { deger: gunEkle(bugun, 7), ad: '1 hafta' },
    { deger: gunEkle(bugun, 14), ad: '2 hafta' },
    { deger: ayEkle(bugun, 1), ad: '1 ay' },
    { deger: ayEkle(bugun, 2), ad: '2 ay' },
    { deger: ayEkle(bugun, 3), ad: '3 ay' },
  ]

  async function gonder(e: FormEvent) {
    e.preventDefault()
    const ok = await calistir(async () => {
      if (santiyeSor && santiye === null) throw new Error('Önce şantiyeyi seçin.')
      await api.ekle({ santiye: merkez ? santiye : null, ad: isim, konum, hedef, yapan: ad })
    })
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
    <Modal
      baslik="Yeni imalat"
      kapat={kapat}
      alt={
        <>
          <button type="button" onClick={kapat}>
            {eklenen.length ? 'Kapat' : 'Vazgeç'}
          </button>
          <button type="submit" form="f-yeni" className="ana-dugme" disabled={bekliyor}>
            {bekliyor ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </>
      }
    >
      <form id="f-yeni" className="form" onSubmit={gonder}>
        {santiyeSor && (
          <div className="alan">
            <span>Şantiye</span>
            <Cipler
              etiket="Şantiye"
              secenekler={santiyeler.map((s) => ({ deger: s.id, ad: s.ad }))}
              deger={santiye}
              sec={setSantiye}
            />
          </div>
        )}
        <label className="alan">
          <span>İmalat</span>
          <input
            value={isim}
            onChange={(e) => setIsim(e.target.value)}
            placeholder="Örn. İç sıva, çatı izolasyonu"
            required
            maxLength={200}
            enterKeyHint="next"
          />
        </label>
        <label className="alan">
          <span>Konum (isteğe bağlı)</span>
          <input
            value={konum}
            onChange={(e) => setKonum(e.target.value)}
            placeholder="Örn. A blok 3. kat"
            maxLength={200}
            enterKeyHint="next"
          />
        </label>
        <div className="alan">
          <span>Hedef bitiş tarihi</span>
          <Cipler etiket="Hızlı seçim" secenekler={hizli} deger={hedef} sec={setHedef} />
          <input
            type="date"
            value={hedef}
            onChange={(e) => setHedef(e.target.value)}
            required
            aria-label="Hedef bitiş tarihi"
          />
          {hedef && (
            <small className={gunFarki(bugun, hedef) < 0 ? 'r-kirmizi-yazi' : 'soluk'}>
              {gunFarki(bugun, hedef) < 0
                ? 'Bu tarih geçmişte; imalat gecikmiş görünecek.'
                : `${tarihYaz(hedef, bugun)} · ${gunFarki(bugun, hedef)} gün sonra`}
            </small>
          )}
        </div>
        <AdAlani />
        <label className="kutu">
          <input type="checkbox" checked={devamEt} onChange={(e) => setDevamEt(e.target.checked)} />
          Kaydettikten sonra yenisini gir
        </label>
        {eklenen.length > 0 && <p className="r-yesil-yazi kucuk">Eklendi: {eklenen.join(', ')}</p>}
        <Hata mesaj={hata} />
      </form>
    </Modal>
  )
}
