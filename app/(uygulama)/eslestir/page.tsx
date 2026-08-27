import Link from 'next/link'
import { Baslik } from '@/components/Baslik'
import { Rozet } from '@/components/Rozet'
import { para, tarih } from '@/lib/bicim'
import { db } from '@/lib/db'
import { gerekliKullanici } from '@/lib/oturum'
import { ESLESTIREBILIR } from '@/lib/yetki'

export default async function EslestirmeKuyrugu() {
  await gerekliKullanici(ESLESTIREBILIR)

  const [bekleyen, eslesmemisIrsaliye] = await Promise.all([
    db.fatura.findMany({
      where: { durum: 'YENI' },
      orderBy: [{ tarih: 'asc' }, { id: 'asc' }],
      include: { firma: { select: { ad: true } } },
    }),
    db.irsaliye.count({ where: { eslesmeler: { none: {} } } }),
  ])

  return (
    <>
      <Baslik
        baslik="Eşleştirme"
        aciklama={`${bekleyen.length} fatura irsaliye bekliyor · ${eslesmemisIrsaliye} irsaliye henüz bağlanmadı`}
      />

      <div className="p-6">
        {bekleyen.length === 0 ? (
          <div className="kart p-8 text-center">
            <p className="text-sm font-medium">Eşleştirme kuyruğu boş.</p>
            <p className="mt-1 text-sm text-soluk">
              Bekleyen fatura yok. Yeni fatura girildiğinde burada görünür.
            </p>
            <Link href="/fatura/yeni" className="dugme-ikincil mt-4">
              Yeni fatura gir
            </Link>
          </div>
        ) : (
          <div className="kart overflow-x-auto">
            <table className="tablo">
              <thead>
                <tr>
                  <th className="w-32">Fatura no</th>
                  <th className="w-28">Tarih</th>
                  <th>Firma</th>
                  <th>Açıklama</th>
                  <th className="w-32 text-right">Tutar</th>
                  <th className="w-32"></th>
                </tr>
              </thead>
              <tbody>
                {bekleyen.map((f) => (
                  <tr key={f.id}>
                    <td className="font-medium">{f.no}</td>
                    <td className="tabular-nums">{tarih(f.tarih)}</td>
                    <td>{f.firma.ad}</td>
                    <td className="text-soluk">{f.aciklama ?? '—'}</td>
                    <td className="text-right tabular-nums">{para(f.tutar)}</td>
                    <td className="text-right">
                      <Link href={`/eslestir/${f.id}`} className="dugme-birincil text-xs">
                        Eşleştir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-4 text-xs text-soluk">
          Malzeme teslimi olmayan faturalar (yemek, konaklama, kiralama…)
          eşleştirme ekranında <Rozet>irsaliyesiz</Rozet> işaretlenerek doğrudan
          imzaya gönderilebilir.
        </p>
      </div>
    </>
  )
}
