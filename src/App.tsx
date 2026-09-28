import { useCallback, useEffect, useState } from 'react'
import { api, oturum, OturumHatasi, type Veri } from './api'
import { Ana } from './Ana'
import { Giris } from './Giris'

const YENILEME_MS = 60_000

export function App() {
  const [girili, setGirili] = useState(() => oturum.al() !== null)
  const [veri, setVeri] = useState<Veri | null>(null)
  const [hata, setHata] = useState<string | null>(null)

  const yenile = useCallback(async () => {
    try {
      setVeri(await api.veri())
      setHata(null)
    } catch (e) {
      if (e instanceof OturumHatasi) {
        oturum.sil()
        setVeri(null)
        setGirili(false)
      } else {
        setHata(e instanceof Error ? e.message : String(e))
      }
    }
  }, [])

  useEffect(() => {
    if (!girili) return
    yenile()
    const zamanlayici = setInterval(() => {
      if (document.visibilityState === 'visible') yenile()
    }, YENILEME_MS)
    const gorunur = () => {
      if (document.visibilityState === 'visible') yenile()
    }
    document.addEventListener('visibilitychange', gorunur)
    return () => {
      clearInterval(zamanlayici)
      document.removeEventListener('visibilitychange', gorunur)
    }
  }, [girili, yenile])

  if (!girili) return <Giris girildi={() => setGirili(true)} />

  if (!veri) {
    return (
      <main className="yukleniyor">
        {hata ? (
          <>
            <p className="hata">{hata}</p>
            <button onClick={yenile}>Tekrar dene</button>
          </>
        ) : (
          <p className="soluk">Yükleniyor…</p>
        )}
      </main>
    )
  }

  return (
    <Ana
      veri={veri}
      baglantiHatasi={hata}
      yenile={yenile}
      cikis={async () => {
        await api.cikis()
        setVeri(null)
        setGirili(false)
      }}
    />
  )
}
