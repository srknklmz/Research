import Link from 'next/link'
import { Baslik } from '@/components/Baslik'
import { Rozet } from '@/components/Rozet'
import { para, tarih } from '@/lib/bicim'
import { db } from '@/lib/db'
import { gerekliKullanici } from '@/lib/oturum'
import { IMZALAYABILIR } from '@/lib/yetki'

export default async function ImzaKuyrugu() {
  await gerekliKullanici(IMZALAYABILIR)

  const bekleyen = await db.fatura.findMany({
    where: { durum: 'ESLESTI' },
    orderBy: [{ tarih: 'asc' }, { id: 'asc' }],
    include: {
      firma: { select: { ad: true } },
      eslesmeler: {
        include: { irsaliye: { include: { kalemler: { select: { toplam: true } } } } },
      },
    },
  })

  return (
    <>
      <Baslik
        baslik="İmza kuyruğu"
        aciklama={`${bekleyen.length} fatura kontrol ve imza bekliyor`}
      />

      <div className="p-6">
        {bekleyen.length === 0 ? (
          <div className="kart p-8 text-center">
            <p className="text-sm font-medium">Kuyruk boş.</p>
            <p className="mt-1 text-sm text-soluk">
              İmza bekleyen fatura yok. Şantiye eşleştirme yaptıkça burada
              görünür.
            </p>
          </div>
        ) : (
          <div className="kart overflow-x-auto">
            <table className="tablo">
              <thead>
                <tr>
                  <th className="w-32">Fatura no</th>
                  <th className="w-28">Tarih</th>
                  <th>Firma</th>
                  <th className="w-32 text-right">Fatura tutarı</th>
                  <th className="w-40">İrsaliye</th>
                  <th className="w-36 text-right">İrsaliye toplamı</th>
                  <th className="w-24"></th>
                </tr>
              </thead>
              <tbody>
                {bekleyen.map((f) => {
                  const toplam = f.eslesmeler.reduce(
                    (t, e) =>
                      t +
                      e.irsaliye.kalemler.reduce(
                        (k, s) => k + Number(s.toplam ?? 0),
                        0,
                      ),
                    0,
                  )
                  const kdvli = toplam * 1.2
                  const uyum =
                    toplam > 0 &&
                    (Math.abs(Number(f.tutar) - kdvli) < 0.02 ||
                      Math.abs(Number(f.tutar) - toplam) < 0.02)

                  return (
                    <tr key={f.id}>
                      <td className="font-medium">{f.no}</td>
                      <td className="tabular-nums">{tarih(f.tarih)}</td>
                      <td>{f.firma.ad}</td>
                      <td className="text-right tabular-nums">{para(f.tutar)}</td>
                      <td>
                        {f.irsaliyesiz ? (
                          <Rozet>irsaliyesiz</Rozet>
                        ) : (
                          <span>{f.eslesmeler.length} adet</span>
                        )}
                      </td>
                      <td className="text-right tabular-nums">
                        {toplam ? (
                          <span className={uyum ? 'text-onayli' : undefined}>
                            {para(toplam)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="text-right">
                        <Link href={`/imza/${f.id}`} className="dugme-birincil text-xs">
                          İncele
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
