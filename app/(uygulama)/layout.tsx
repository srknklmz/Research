import Link from 'next/link'
import { Gezinme, type GezinmeOgesi } from '@/components/Gezinme'
import { Ikon } from '@/components/Ikon'
import { db } from '@/lib/db'
import { gerekliKullanici } from '@/lib/oturum'
import { ROL_ADI, yetkili } from '@/lib/yetki'
import { cikisYap } from './eylemler'

export default async function UygulamaDuzeni({
  children,
}: {
  children: React.ReactNode
}) {
  const kullanici = await gerekliKullanici()

  const [yeni, eslesti, imzalandi, merkezOnayli] = await Promise.all([
    db.fatura.count({ where: { durum: 'YENI' } }),
    db.fatura.count({ where: { durum: 'ESLESTI' } }),
    db.fatura.count({ where: { durum: 'IMZALANDI' } }),
    db.fatura.count({ where: { durum: 'MERKEZ_ONAYLI' } }),
  ])

  const hepsi: (GezinmeOgesi & { roller?: string[] })[] = [
    { yol: '/', ad: 'Pano', ikon: 'pano' },
    { yol: '/irsaliye', ad: 'İrsaliyeler', ikon: 'irsaliye' },
    { yol: '/fatura', ad: 'Faturalar', ikon: 'fatura' },
    {
      yol: '/eslestir',
      ad: 'Eşleştirme',
      ikon: 'eslestir',
      sayac: yeni,
      roller: ['SANTIYE'],
    },
    {
      yol: '/imza',
      ad: 'İmza kuyruğu',
      ikon: 'imza',
      sayac: eslesti,
      roller: ['IDARI_MUDUR'],
    },
    {
      yol: '/merkez',
      ad: 'Merkez',
      ikon: 'merkez',
      sayac: imzalandi + merkezOnayli,
      roller: ['MERKEZ'],
    },
    { yol: '/aktar', ad: 'İçe aktarma', ikon: 'aktar', roller: ['SANTIYE'] },
    { yol: '/ayarlar', ad: 'Ayarlar', ikon: 'ayar' },
  ]

  const ogeler = hepsi.filter(
    (o) => !o.roller || yetkili(kullanici.rol, o.roller as never),
  )

  return (
    <div className="flex min-h-screen">
      <aside className="yazdirma-gizle flex w-60 shrink-0 flex-col border-r border-cizgi bg-yuzey">
        <div className="border-b border-cizgi px-4 py-4">
          <Link href="/" className="block">
            <div className="text-sm font-semibold tracking-tight">
              İrsaliye – Fatura
            </div>
            <div className="text-xs text-soluk">Şantiye evrak akışı</div>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <Gezinme ogeler={ogeler} />
        </div>

        <div className="border-t border-cizgi p-3">
          <div className="mb-2 px-1">
            <div className="truncate text-sm font-medium">{kullanici.ad}</div>
            <div className="text-xs text-soluk">
              {ROL_ADI[kullanici.rol]}
            </div>
          </div>
          <form action={cikisYap}>
            <button className="dugme-ikincil w-full text-xs" type="submit">
              <Ikon ad="cikis" className="h-3.5 w-3.5" />
              Çıkış
            </button>
          </form>
        </div>
      </aside>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  )
}
