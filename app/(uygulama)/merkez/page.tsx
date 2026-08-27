import Link from 'next/link'
import { Baslik } from '@/components/Baslik'
import { Rozet } from '@/components/Rozet'
import { para, tarih, zaman } from '@/lib/bicim'
import { db } from '@/lib/db'
import { gerekliKullanici } from '@/lib/oturum'
import { MERKEZ_ONAYLAR } from '@/lib/yetki'
import { GonderimFormu } from './GonderimFormu'
import { MerkezIslemleri } from './MerkezIslemleri'
import { gonderimOlustur, merkezOnayla, merkezReddet } from './eylemler'

export default async function MerkezPanosu() {
  await gerekliKullanici(MERKEZ_ONAYLAR)

  const [imzali, onayli, sonGonderimler, ayar] = await Promise.all([
    db.fatura.findMany({
      where: { durum: 'IMZALANDI' },
      orderBy: [{ tarih: 'asc' }],
      include: {
        firma: { select: { ad: true } },
        onaylar: { where: { tip: 'IMZA' }, orderBy: { tarih: 'desc' }, take: 1 },
        _count: { select: { eslesmeler: true } },
      },
    }),
    db.fatura.findMany({
      where: { durum: 'MERKEZ_ONAYLI' },
      orderBy: [{ tarih: 'asc' }],
      include: {
        firma: { select: { ad: true } },
        _count: { select: { eslesmeler: true } },
      },
    }),
    db.gonderim.findMany({
      orderBy: { tarih: 'desc' },
      take: 5,
      include: { _count: { select: { faturalar: true } } },
    }),
    db.ayar.findUnique({ where: { anahtar: 'musavir_adi' } }),
  ])

  return (
    <>
      <Baslik
        baslik="Merkez"
        aciklama={`${imzali.length} fatura onay bekliyor · ${onayli.length} fatura gönderime hazır`}
      >
        <Link href="/merkez/gonderim" className="dugme-ikincil">
          Gönderimler
        </Link>
      </Baslik>

      <div className="flex flex-col gap-6 p-6">
        <section>
          <h2 className="mb-2 text-sm font-semibold">
            İmzalı — merkez onayı bekliyor
          </h2>
          {imzali.length === 0 ? (
            <div className="kart p-6 text-center text-sm text-soluk">
              Onay bekleyen fatura yok.
            </div>
          ) : (
            <div className="kart overflow-x-auto">
              <table className="tablo">
                <thead>
                  <tr>
                    <th className="w-32">Fatura no</th>
                    <th className="w-28">Tarih</th>
                    <th>Firma</th>
                    <th className="w-28">İrsaliye</th>
                    <th className="w-32 text-right">Tutar</th>
                    <th className="w-56">İmza</th>
                    <th className="w-64"></th>
                  </tr>
                </thead>
                <tbody>
                  {imzali.map((f) => (
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
                      <td className="text-soluk">
                        {f.irsaliyesiz ? (
                          <Rozet>yok</Rozet>
                        ) : (
                          `${f._count.eslesmeler} adet`
                        )}
                      </td>
                      <td className="text-right tabular-nums">{para(f.tutar)}</td>
                      <td className="text-xs text-soluk">
                        {f.onaylar[0]
                          ? `${f.onaylar[0].kullaniciAd} · ${zaman(f.onaylar[0].tarih)}`
                          : '—'}
                      </td>
                      <td>
                        <MerkezIslemleri
                          faturaId={f.id}
                          onaylaEylem={merkezOnayla.bind(null, f.id)}
                          reddetEylem={merkezReddet.bind(null, f.id)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold">Müşavire gönderim</h2>
          {onayli.length === 0 ? (
            <div className="kart p-6 text-center text-sm text-soluk">
              Gönderime hazır fatura yok. Önce imzalı faturaları onaylayın.
            </div>
          ) : (
            <GonderimFormu
              eylem={gonderimOlustur}
              musavirVarsayilan={ayar?.deger ?? ''}
              faturalar={onayli.map((f) => ({
                id: f.id,
                no: f.no,
                tarih: f.tarih,
                firmaAdi: f.firma.ad,
                tutar: Number(f.tutar),
                irsaliyeSayisi: f._count.eslesmeler,
                irsaliyesiz: f.irsaliyesiz,
              }))}
            />
          )}
        </section>

        {sonGonderimler.length > 0 ? (
          <section>
            <h2 className="mb-2 text-sm font-semibold">Son gönderimler</h2>
            <div className="kart overflow-x-auto">
              <table className="tablo">
                <thead>
                  <tr>
                    <th className="w-28">No</th>
                    <th className="w-44">Tarih</th>
                    <th>Müşavir</th>
                    <th className="w-24 text-right">Fatura</th>
                  </tr>
                </thead>
                <tbody>
                  {sonGonderimler.map((g) => (
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
                      <td className="text-right tabular-nums">
                        {g._count.faturalar}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </div>
    </>
  )
}
