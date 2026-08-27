import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Baslik } from '@/components/Baslik'
import { DurumRozeti, Rozet } from '@/components/Rozet'
import { SilFormu } from '@/components/SilFormu'
import { para, sayi, tarih, zaman } from '@/lib/bicim'
import { db } from '@/lib/db'
import { gerekliKullanici } from '@/lib/oturum'
import { yetkili, GIRIS_YAPABILIR } from '@/lib/yetki'
import { irsaliyeSil } from '../eylemler'

export default async function IrsaliyeDetay({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const kullanici = await gerekliKullanici()
  const { id } = await params

  const irsaliye = await db.irsaliye.findUnique({
    where: { id: Number(id) },
    include: {
      firma: true,
      belge: true,
      giren: { select: { ad: true } },
      kalemler: { orderBy: { sira: 'asc' } },
      eslesmeler: {
        include: { fatura: { include: { firma: { select: { ad: true } } } } },
      },
    },
  })

  if (!irsaliye) notFound()

  const toplam = irsaliye.kalemler.reduce((t, k) => t + Number(k.toplam ?? 0), 0)
  const kilitli = irsaliye.eslesmeler.some((e) =>
    ['IMZALANDI', 'MERKEZ_ONAYLI', 'GONDERILDI'].includes(e.fatura.durum),
  )
  const duzenleyebilir = yetkili(kullanici.rol, GIRIS_YAPABILIR) && !kilitli

  return (
    <>
      <Baslik
        baslik={`İrsaliye ${irsaliye.no ?? '(no yok)'}`}
        aciklama={`${irsaliye.firma.ad} · ${tarih(irsaliye.tarih)}`}
      >
        {irsaliye.belge ? (
          <a
            className="dugme-ikincil"
            href={`/belge/${irsaliye.belge.id}`}
            target="_blank"
            rel="noreferrer"
          >
            Belgeyi aç
          </a>
        ) : null}
        {duzenleyebilir ? (
          <Link href={`/irsaliye/${irsaliye.id}/duzenle`} className="dugme-ikincil">
            Düzenle
          </Link>
        ) : null}
      </Baslik>

      <div className="grid gap-4 p-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <section className="kart overflow-x-auto">
            <div className="border-b border-cizgi px-4 py-3 text-sm font-medium">
              Kalemler
            </div>
            <table className="tablo">
              <thead>
                <tr>
                  <th>Malzeme</th>
                  <th className="w-32">Tür</th>
                  <th className="w-28 text-right">Miktar</th>
                  <th className="w-20">Birim</th>
                  <th className="w-28 text-right">Birim fiyat</th>
                  <th className="w-28 text-right">Tutar</th>
                </tr>
              </thead>
              <tbody>
                {irsaliye.kalemler.map((k) => (
                  <tr key={k.id}>
                    <td className="font-medium">{k.malzeme}</td>
                    <td className="text-soluk">{k.tur ?? '—'}</td>
                    <td className="text-right tabular-nums">{sayi(k.miktar)}</td>
                    <td className="text-soluk">{k.birim}</td>
                    <td className="text-right tabular-nums">
                      {k.birimFiyat ? para(k.birimFiyat) : '—'}
                    </td>
                    <td className="text-right tabular-nums">
                      {k.toplam ? para(k.toplam) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} className="text-right font-medium">
                    Toplam
                  </td>
                  <td className="text-right font-semibold tabular-nums">
                    {toplam ? para(toplam) : '—'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </section>
        </div>

        <div className="flex flex-col gap-4">
          <section className="kart p-4">
            <h2 className="mb-3 text-sm font-semibold">Bilgiler</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-soluk">Firma</dt>
              <dd>{irsaliye.firma.ad}</dd>
              <dt className="text-soluk">Tarih</dt>
              <dd className="tabular-nums">{tarih(irsaliye.tarih)}</dd>
              <dt className="text-soluk">Cari</dt>
              <dd>{irsaliye.cari ?? '—'}</dd>
              <dt className="text-soluk">Açıklama</dt>
              <dd>{irsaliye.aciklama ?? '—'}</dd>
              <dt className="text-soluk">Giren</dt>
              <dd>{irsaliye.giren?.ad ?? '—'}</dd>
              <dt className="text-soluk">Kayıt</dt>
              <dd className="tabular-nums">{zaman(irsaliye.olusturmaT)}</dd>
            </dl>
          </section>

          <section className="kart p-4">
            <h2 className="mb-3 text-sm font-semibold">Bağlı faturalar</h2>
            {irsaliye.eslesmeler.length === 0 ? (
              <p className="text-sm text-soluk">
                Henüz faturayla eşleşmedi.{' '}
                <Link href="/eslestir" className="text-vurgu underline">
                  Eşleştirme ekranı
                </Link>
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {irsaliye.eslesmeler.map((e) => (
                  <li key={e.id} className="text-sm">
                    <Link
                      href={`/fatura/${e.fatura.id}`}
                      className="font-medium text-vurgu hover:underline"
                    >
                      {e.fatura.no}
                    </Link>
                    <span className="ml-2 text-soluk">
                      {para(e.fatura.tutar)}
                    </span>
                    <div className="mt-1">
                      <DurumRozeti durum={e.fatura.durum} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {kilitli ? (
            <p className="rounded-md bg-gonderildi-zemin px-3 py-2 text-xs text-gonderildi">
              Bu irsaliye imzalanmış bir faturaya bağlı; değiştirilemez ya da
              silinemez.
            </p>
          ) : null}

          {duzenleyebilir && irsaliye.eslesmeler.length === 0 ? (
            <SilFormu
              eylem={irsaliyeSil.bind(null, irsaliye.id)}
              onay={`${irsaliye.no ?? 'Bu'} numaralı irsaliye silinecek. Emin misiniz?`}
              etiket="İrsaliyeyi sil"
            />
          ) : null}
        </div>
      </div>
    </>
  )
}
