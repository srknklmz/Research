import Link from 'next/link'
import { Baslik } from '@/components/Baslik'
import { para, zaman } from '@/lib/bicim'
import { db } from '@/lib/db'
import { gerekliKullanici } from '@/lib/oturum'

export default async function GonderimListesi() {
  await gerekliKullanici()

  const gonderimler = await db.gonderim.findMany({
    orderBy: { tarih: 'desc' },
    include: {
      olusturan: { select: { ad: true } },
      faturalar: { select: { tutar: true } },
    },
  })

  return (
    <>
      <Baslik
        baslik="Müşavire gönderimler"
        aciklama={`${gonderimler.length} gönderim`}
      />

      <div className="p-6">
        <div className="kart overflow-x-auto">
          <table className="tablo">
            <thead>
              <tr>
                <th className="w-28">No</th>
                <th className="w-44">Tarih</th>
                <th>Müşavir</th>
                <th>Gönderen</th>
                <th className="w-24 text-right">Fatura</th>
                <th className="w-36 text-right">Tutar</th>
              </tr>
            </thead>
            <tbody>
              {gonderimler.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-soluk">
                    Henüz gönderim yapılmadı.
                  </td>
                </tr>
              ) : (
                gonderimler.map((g) => (
                  <tr key={g.id}>
                    <td>
                      <Link
                        href={`/merkez/gonderim/${g.id}`}
                        className="font-medium text-vurgu hover:underline"
                      >
                        {g.no}
                      </Link>
                    </td>
                    <td className="tabular-nums">{zaman(g.tarih)}</td>
                    <td>{g.musavir ?? '—'}</td>
                    <td className="text-soluk">{g.olusturan?.ad ?? '—'}</td>
                    <td className="text-right tabular-nums">
                      {g.faturalar.length}
                    </td>
                    <td className="text-right tabular-nums">
                      {para(
                        g.faturalar.reduce((t, f) => t + Number(f.tutar), 0),
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
