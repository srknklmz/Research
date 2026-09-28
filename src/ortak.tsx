import { useEffect, useRef, useState, type ReactNode } from 'react'

const AD = 'imalat_ad'

/** İşlemi yapan kişinin adı; bu cihazda hatırlanır. */
export function useAd(): [string, (ad: string) => void] {
  const [ad, setAd] = useState(() => localStorage.getItem(AD) ?? '')
  return [
    ad,
    (yeni: string) => {
      setAd(yeni)
      localStorage.setItem(AD, yeni.trim())
    },
  ]
}

export function AdAlani({ ad, setAd }: { ad: string; setAd: (a: string) => void }) {
  return (
    <label className="alan">
      <span>Adınız</span>
      <input
        value={ad}
        onChange={(e) => setAd(e.target.value)}
        placeholder="Kaydı kimin yaptığı görünsün"
        autoComplete="name"
        required
        minLength={2}
      />
    </label>
  )
}

export function Modal({
  baslik,
  kapat,
  children,
}: {
  baslik: string
  kapat: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current!
    d.showModal()
    return () => d.close()
  }, [])
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={(e) => {
        e.preventDefault()
        kapat()
      }}
      onClick={(e) => {
        if (e.target === ref.current) kapat()
      }}
    >
      <div className="modal-ic">
        <header className="modal-baslik">
          <h2>{baslik}</h2>
          <button type="button" className="kapat" onClick={kapat} aria-label="Kapat">
            ×
          </button>
        </header>
        {children}
      </div>
    </dialog>
  )
}

/** Form gönderirken bekleme ve hata durumunu yönetir. */
export function useIslem() {
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState<string | null>(null)
  async function calistir(is: () => Promise<unknown>): Promise<boolean> {
    setBekliyor(true)
    setHata(null)
    try {
      await is()
      return true
    } catch (e) {
      setHata(e instanceof Error ? e.message : String(e))
      return false
    } finally {
      setBekliyor(false)
    }
  }
  return { bekliyor, hata, calistir }
}

export function Hata({ mesaj }: { mesaj: string | null }) {
  return mesaj ? (
    <p className="hata" role="alert">
      {mesaj}
    </p>
  ) : null
}
