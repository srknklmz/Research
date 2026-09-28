import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'

const AD = 'imalat_ad'
const adDinleyiciler = new Set<() => void>()

function adOku() {
  try {
    return localStorage.getItem(AD) ?? ''
  } catch {
    return ''
  }
}

/** İşlemi yapan kişinin adı; bu cihazda hatırlanır ve her ekranda aynıdır. */
export function useAd(): [string, (ad: string) => void] {
  const ad = useSyncExternalStore(
    (f) => {
      adDinleyiciler.add(f)
      return () => adDinleyiciler.delete(f)
    },
    adOku,
  )
  return [
    ad,
    (yeni: string) => {
      try {
        localStorage.setItem(AD, yeni)
      } catch {
        /* özel sekmede kaydedilemezse bu oturumluk kalır */
      }
      adDinleyiciler.forEach((f) => f())
    },
  ]
}

/**
 * Formlardaki "Adınız" alanı. Ad daha önce girildiyse yalnızca
 * "Kaydeden: Ali · değiştir" satırı görünür.
 */
export function AdAlani() {
  const [ad, setAd] = useAd()
  const [duzenle, setDuzenle] = useState(() => ad.trim().length < 2)

  if (!duzenle) {
    return (
      <p className="kaydeden">
        Kaydeden: <strong>{ad}</strong>{' '}
        <button type="button" className="baglanti" onClick={() => setDuzenle(true)}>
          değiştir
        </button>
      </p>
    )
  }
  return (
    <label className="alan">
      <span>Adınız</span>
      <input
        value={ad}
        onChange={(e) => setAd(e.target.value)}
        placeholder="Kaydı kimin yaptığı görünsün"
        autoComplete="name"
        enterKeyHint="done"
        required
        minLength={2}
      />
    </label>
  )
}

/** Telefonda tam ekran, geniş ekranda ortada açılan pencere. */
export function Modal({
  baslik,
  kapat,
  children,
  alt,
}: {
  baslik: string
  kapat: () => void
  children: ReactNode
  /** Altta sabit duran düğmeler. */
  alt?: ReactNode
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
      <header className="modal-baslik">
        <button type="button" className="geri" onClick={kapat} aria-label="Kapat">
          <Ikon ad="geri" />
        </button>
        <h2>{baslik}</h2>
      </header>
      <div className="modal-ic">{children}</div>
      {alt && <footer className="modal-alt">{alt}</footer>}
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

/** Tek dokunuşla değer seçtiren yatay düğme dizisi. */
export function Cipler<T extends string | number>({
  secenekler,
  deger,
  sec,
  etiket,
}: {
  secenekler: { deger: T; ad: string }[]
  deger?: T | null
  sec: (d: T) => void
  etiket: string
}) {
  return (
    <div className="cipler" role="group" aria-label={etiket}>
      {secenekler.map((s) => (
        <button
          type="button"
          key={String(s.deger)}
          className={`cip ${deger === s.deger ? 'secili' : ''}`}
          aria-pressed={deger === s.deger}
          onClick={() => sec(s.deger)}
        >
          {s.ad}
        </button>
      ))}
    </div>
  )
}

const YOLLAR = {
  liste: 'M4 6h16M4 12h16M4 18h10',
  saat: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  kisi: 'M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21a8 8 0 0 1 16 0',
  arti: 'M12 5v14M5 12h14',
  geri: 'M15 5l-7 7 7 7',
  yenile: 'M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6',
  ara: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-4-4',
}

export function Ikon({ ad }: { ad: keyof typeof YOLLAR }) {
  return (
    <svg
      className="ikon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={YOLLAR[ad]} />
    </svg>
  )
}
