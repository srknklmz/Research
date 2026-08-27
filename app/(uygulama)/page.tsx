import Link from 'next/link'
import { Baslik } from '@/components/Baslik'
import { DurumRozeti } from '@/components/Rozet'
import { para, tarih, zaman } from '@/lib/bicim'
import { db } from '@/lib/db'
import { gerekliKullanici } from '@/lib/oturum'

const ADIMLAR = [
  {
    durum: 'YENI' as const,
    ad: 'Eşleştirme bekliyor',
    aciklama: 'Faturaya irsaliye bağlanacak',
    yol: '/eslestir',
  },
  {
    durum: 'ESLESTI' as const,
    ad: 'İmza bekliyor',
    aciklama: 'İdari müdür kontrol edecek',
    yol: '/imza',
  },
  {
    durum: 'IMZALANDI' as const,
    ad: 'Merkez onayı bekliyor',
    aciklama: 'Merkez kontrol edip onaylayacak',
    yol: '/merkez',
  },
  {
    durum: 'MERKEZ_ONAYLI' as const,
    ad: 'Gönderime hazır',
    aciklama: 'Müşavire iletilecek',
    yol: '/merkez/gonderim',
  },
]

export default async function Pano() {
  await gerekliKullanici()

  const [sayimlar, bekleyenIrsaliye, sonHareketler, buAy] = await Promise.all([
    db.fatura.groupBy({ by: ['durum'], _count: true, _sum: { tutar: true } }),
    db.irsaliye.count({ where: { eslesmeler: { none: {} } } }),
    db.islem.findMany({
      take: 8,
      orderBy: { tarih: 'desc' },
      include: { kullanici: { select: { ad: true } } },
    }),
    db.fatura.aggregate({
      _sum: { tutar: true },
      _count: true,
      where: {
        tarih: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    }),
  ])

  const sayi = (d: string) => sayimlar.find((s) => s.durum === d)?._count ?? 0
  const toplam = (d: string) => sayimlar.find((s) => s.durum === d)?._sum.tutar ?? 0

  return (
    <>
      <Baslik
        baslik="Pano"
        aciklama="Evrakın akıştaki yeri: eşleştirme → imza → merkez onayı → müşavir"
      />

      <div className="p-6">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ADIMLAR.map((a, i) => (
            <Link key={a.durum} href={a.yol} className="kart group p-4 transition-colors hover:border-vurgu">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-medium tracking-wide text-soluk uppercase">
                  {i + 1}. {a.ad}
                </span>
              </div>
              <div className="mt-2 text-3xl font-semibold tabular-nums">
                {sayi(a.durum)}
              </div>
              <div className="mt-1 text-xs text-soluk">{a.aciklama}</div>
              <div className="mt-3 border-t border-cizgi pt-2 text-xs text-soluk">
                {para(toplam(a.durum))}
              </div>
            </Link>
          ))}
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="kart p-4">
            <div className="text-xs font-medium tracking-wide text-soluk uppercase">
              Eşleşmemiş irsaliye
            </div>
            <div className="mt-2 text-2xl font-semibold tabular-nums">
              {bekleyenIrsaliye}
            </div>
            <p className="mt-1 text-xs text-soluk">
              Faturası henüz gelmemiş ya da bağlanmamış irsaliyeler
            </p>
          </div>

          <div className="kart p-4">
            <div className="text-xs font-medium tracking-wide text-soluk uppercase">
              Bu ay girilen fatura
            </div>
            <div className="mt-2 text-2xl font-semibold tabular-nums">
              {buAy._count}
            </div>
            <p className="mt-1 text-xs text-soluk">
              Toplam {para(buAy._sum.tutar ?? 0)}
            </p>
          </div>

          <div className="kart p-4">
            <div className="text-xs font-medium tracking-wide text-soluk uppercase">
              Müşavire gönderilen
            </div>
            <div className="mt-2 text-2xl font-semibold tabular-nums">
              {sayi('GONDERILDI')}
            </div>
            <p className="mt-1 text-xs text-soluk">
              {para(toplam('GONDERILDI'))}
            </p>
          </div>
        </section>

        <section className="mt-4 kart">
          <div className="border-b border-cizgi px-4 py-3 text-sm font-medium">
            Son hareketler
          </div>
          {sonHareketler.length === 0 ? (
            <p className="px-4 py-6 text-sm text-soluk">
              Henüz hareket yok.
            </p>
          ) : (
            <ul className="divide-y divide-cizgi">
              {sonHareketler.map((h) => (
                <li key={h.id} className="flex items-baseline gap-3 px-4 py-2.5 text-sm">
                  <span className="w-36 shrink-0 text-xs text-soluk tabular-nums">
                    {zaman(h.tarih)}
                  </span>
                  <span className="w-32 shrink-0 truncate text-xs text-soluk">
                    {h.kullanici?.ad ?? '—'}
                  </span>
                  <span className="min-w-0 flex-1">
                    {h.tur} · {h.nesne}
                    {h.nesneId ? ` #${h.nesneId}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}
