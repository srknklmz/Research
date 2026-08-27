import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Baslik } from '@/components/Baslik'
import { Rozet } from '@/components/Rozet'
import { para, tarih, zaman } from '@/lib/bicim'
import { db } from '@/lib/db'
import { gerekliKullanici } from '@/lib/oturum'

export default async function GonderimDetay({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await gerekliKullanici()
  const { id } = await params

  const gonderim = await db.gonderim.findUnique({
    where: { id: Number(id) },
    include: {
      olusturan: { select: { ad: true } },
      faturalar: {
        orderBy: [{ tarih: 'asc' }],
        include: {
          firma: { select: { ad: true } },
          _count: { select: { eslesmeler: true } },
        },
      },
    },
  })
  if (!gonderim) notFound()

  const toplam = gonderim.faturalar.reduce((t, f) => t + Number(f.tutar), 0)

  return (
    <>
      <Baslik
        baslik={`Gönderim ${gonderim.no}`}
        aciklama={`${zaman(gonderim.tarih)} · ${gonderim.faturalar.length} fatura · ${para(toplam)}`}
      >
        <a
          href={`/cikti/gonderim/${gonderim.id}`}
          className="dugme-birincil"
          target="_blank"
          rel="noreferrer"
        >
          Çıktı al
        </a>
      </Baslik>

      <div className="grid gap-4 p-6 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <div className="kart overflow-x-auto">
            <table className="tablo">
              <thead>
                <tr>
                  <th className="w-32">Fatura no</th>
                  <th className="w-28">Tarih</th>
                  <th>Firma</th>
                  <th className="w-36">Kategori</th>
                  <th className="w-28">İrsaliye</th>
                  <th className="w-32 text-right">Tutar</th>
                </tr>
              </thead>
              <tbody>
                {gonderim.faturalar.map((f) => (
                  <tr key={f.id}>
                    <td>
                      <Link
                        href={`/fatura/${f.id}`}
                        className="font-medium text-vurgu hover:underline"
                      >
                        {f.no}
                      </Link>
                    </td>
                    <td className="tabular-nums">{tarih(f.tarih)}</td>
                    <td>{f.firma.ad}</td>
                    <td className="text-soluk">{f.kategori ?? '—'}</td>
                    <td className="text-soluk">
                      {f.irsaliyesiz ? (
                        <Rozet>yok</Rozet>
                      ) : (
                        `${f._count.eslesmeler} adet`
                      )}
                    </td>
                    <td className="text-right tabular-nums">{para(f.tutar)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} className="text-right font-medium">
                    Toplam
                  </td>
                  <td className="text-right font-semibold tabular-nums">
                    {para(toplam)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <section className="kart h-fit p-4">
          <h2 className="mb-3 text-sm font-semibold">Gönderim bilgisi</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-soluk">No</dt>
            <dd className="font-medium">{gonderim.no}</dd>
            <dt className="text-soluk">Tarih</dt>
            <dd className="tabular-nums">{zaman(gonderim.tarih)}</dd>
            <dt className="text-soluk">Müşavir</dt>
            <dd>{gonderim.musavir ?? '—'}</dd>
            <dt className="text-soluk">Gönderen</dt>
            <dd>{gonderim.olusturan?.ad ?? '—'}</dd>
            <dt className="text-soluk">Not</dt>
            <dd>{gonderim.not ?? '—'}</dd>
          </dl>
        </section>
      </div>
    </>
  )
}
