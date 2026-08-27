import { notFound } from 'next/navigation'
import { CiktiFoyu } from '@/components/CiktiFoyu'
import { YazdirDugmesi } from '@/components/YazdirDugmesi'
import { para, tarih, zaman } from '@/lib/bicim'
import { ayarlar } from '@/lib/ayar'
import { db } from '@/lib/db'
import { paketGetir } from '@/lib/paket'

export default async function GonderimCiktisi({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [gonderim, ayar] = await Promise.all([
    db.gonderim.findUnique({
      where: { id: Number(id) },
      include: {
        olusturan: { select: { ad: true } },
        faturalar: {
          orderBy: [{ tarih: 'asc' }],
          select: {
            id: true,
            no: true,
            tarih: true,
            tutar: true,
            kategori: true,
            firma: { select: { ad: true } },
          },
        },
      },
    }),
    ayarlar(),
  ])
  if (!gonderim) notFound()

  const paketler = (
    await Promise.all(gonderim.faturalar.map((f) => paketGetir(f.id)))
  ).filter((p): p is NonNullable<typeof p> => p !== null)

  const toplam = gonderim.faturalar.reduce((t, f) => t + Number(f.tutar), 0)
  const sirketAdi = ayar.sirket_adi ?? 'Şirket'
  const santiyeAdi = ayar.santiye_adi ?? ''

  return (
    <>
      <div className="yazdirma-gizle mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold">
            Gönderim {gonderim.no} · çıktı
          </h1>
          <p className="text-sm text-soluk">
            Kapak sayfası + {paketler.length} fatura föyü
          </p>
        </div>
        <YazdirDugmesi />
      </div>

      {/* Kapak */}
      <article className="kagit-sayfa mb-8 rounded-lg border border-cizgi bg-yuzey p-8">
        <header className="mb-6 flex items-start justify-between border-b-2 border-metin pb-3">
          <div>
            <div className="text-base font-bold tracking-tight">{sirketAdi}</div>
            <div className="text-sm text-soluk">{santiyeAdi}</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold tracking-wide uppercase">
              Müşavir Teslim Listesi
            </div>
            <div className="text-xs text-soluk">Gönderim {gonderim.no}</div>
          </div>
        </header>

        <dl className="mb-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
          <dt className="text-soluk">Tarih</dt>
          <dd className="tabular-nums">{zaman(gonderim.tarih)}</dd>
          <dt className="text-soluk">Müşavir</dt>
          <dd>{gonderim.musavir ?? '—'}</dd>
          <dt className="text-soluk">Gönderen</dt>
          <dd>{gonderim.olusturan?.ad ?? '—'}</dd>
          <dt className="text-soluk">Fatura adedi</dt>
          <dd className="tabular-nums">{gonderim.faturalar.length}</dd>
          {gonderim.not ? (
            <>
              <dt className="text-soluk">Not</dt>
              <dd>{gonderim.not}</dd>
            </>
          ) : null}
        </dl>

        <table className="tablo">
          <thead>
            <tr>
              <th className="w-8">#</th>
              <th className="w-32">Fatura no</th>
              <th className="w-24">Tarih</th>
              <th>Firma</th>
              <th className="w-32">Kategori</th>
              <th className="w-28 text-right">Tutar</th>
            </tr>
          </thead>
          <tbody>
            {gonderim.faturalar.map((f, i) => (
              <tr key={f.id}>
                <td className="text-soluk tabular-nums">{i + 1}</td>
                <td className="font-medium">{f.no}</td>
                <td className="tabular-nums">{tarih(f.tarih)}</td>
                <td>{f.firma.ad}</td>
                <td className="text-soluk">{f.kategori ?? '—'}</td>
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

        <section className="mt-10 grid grid-cols-2 gap-10 text-sm">
          <div>
            <div className="border-t border-metin pt-1 text-xs text-soluk">
              Teslim eden
            </div>
          </div>
          <div>
            <div className="border-t border-metin pt-1 text-xs text-soluk">
              Teslim alan (müşavir)
            </div>
          </div>
        </section>
      </article>

      {paketler.map((p) => (
        <CiktiFoyu
          key={p.id}
          paket={p}
          sirketAdi={sirketAdi}
          santiyeAdi={santiyeAdi}
        />
      ))}
    </>
  )
}
