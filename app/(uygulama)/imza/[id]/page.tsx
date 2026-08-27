import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Baslik } from '@/components/Baslik'
import { OnayGecmisi, PaketIrsaliyeleri } from '@/components/Paket'
import { para, tarih } from '@/lib/bicim'
import { gerekliKullanici } from '@/lib/oturum'
import { paketGetir, paketToplami } from '@/lib/paket'
import { IMZALAYABILIR } from '@/lib/yetki'
import { ImzaFormu } from '../ImzaFormu'
import { imzala, reddet } from '../eylemler'

export default async function ImzaEkrani({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const kullanici = await gerekliKullanici(IMZALAYABILIR)
  const { id } = await params
  const paket = await paketGetir(Number(id))
  if (!paket) notFound()
  if (paket.durum !== 'ESLESTI') redirect(`/fatura/${paket.id}`)

  const toplam = paketToplami(paket)
  const kdvli = toplam * 1.2
  const faturaTutar = Number(paket.tutar)
  const fark = faturaTutar - kdvli
  const hamFark = faturaTutar - toplam
  const enYakin = Math.abs(fark) < Math.abs(hamFark) ? fark : hamFark
  const uyum = toplam > 0 && Math.abs(enYakin) < 0.02

  return (
    <>
      <Baslik
        baslik={`Fatura ${paket.no} · kontrol`}
        aciklama={`${paket.firma.ad} · ${tarih(paket.tarih)}`}
      >
        {paket.belge ? (
          <a
            className="dugme-ikincil"
            href={`/belge/${paket.belge.id}`}
            target="_blank"
            rel="noreferrer"
          >
            Fatura belgesi
          </a>
        ) : null}
        <a
          href={`/cikti/fatura/${paket.id}`}
          className="dugme-ikincil"
          target="_blank"
          rel="noreferrer"
        >
          Çıktı
        </a>
      </Baslik>

      <div className="grid gap-4 p-6 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <section className="kart p-4">
            <h2 className="mb-3 text-sm font-semibold">Tutar karşılaştırması</h2>
            <dl className="grid grid-cols-[1fr_auto] gap-y-2 text-sm">
              <dt className="text-soluk">Fatura tutarı (KDV dahil)</dt>
              <dd className="text-right font-semibold tabular-nums">
                {para(faturaTutar)}
              </dd>
              <dt className="text-soluk">İrsaliye kalem toplamı</dt>
              <dd className="text-right tabular-nums">{para(toplam)}</dd>
              <dt className="text-soluk">İrsaliye toplamı + %20 KDV</dt>
              <dd className="text-right tabular-nums">{para(kdvli)}</dd>
            </dl>
            <div className="mt-3 flex items-baseline justify-between border-t border-cizgi pt-3">
              <span className="text-sm text-soluk">Fark</span>
              <span
                className={`font-semibold tabular-nums ${
                  uyum ? 'text-onayli' : 'text-bekliyor'
                }`}
              >
                {para(enYakin)}
              </span>
            </div>
            {!uyum && toplam > 0 ? (
              <p className="mt-2 text-xs text-bekliyor">
                Tutarlar birebir tutmuyor. İskonto, navlun ya da eksik irsaliye
                olabilir — imzalamadan önce kontrol edin.
              </p>
            ) : null}
            {toplam === 0 && !paket.irsaliyesiz ? (
              <p className="mt-2 text-xs text-soluk">
                İrsaliyelerde birim fiyat girilmemiş; tutar karşılaştırması
                yapılamıyor.
              </p>
            ) : null}
          </section>

          <PaketIrsaliyeleri paket={paket} />
          <OnayGecmisi paket={paket} />
        </div>

        <div className="flex flex-col gap-4">
          <section className="kart p-4">
            <h2 className="mb-3 text-sm font-semibold">Fatura</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-soluk">No</dt>
              <dd className="font-medium">{paket.no}</dd>
              <dt className="text-soluk">Firma</dt>
              <dd>{paket.firma.ad}</dd>
              <dt className="text-soluk">Tarih</dt>
              <dd className="tabular-nums">{tarih(paket.tarih)}</dd>
              <dt className="text-soluk">Tutar</dt>
              <dd className="font-semibold tabular-nums">{para(paket.tutar)}</dd>
              <dt className="text-soluk">Açıklama</dt>
              <dd>{paket.aciklama ?? '—'}</dd>
            </dl>
            <Link
              href={`/fatura/${paket.id}`}
              className="mt-3 inline-block text-xs text-vurgu underline"
            >
              Fatura kaydına git
            </Link>
          </section>

          <ImzaFormu
            imzalaEylem={imzala.bind(null, paket.id)}
            reddetEylem={reddet.bind(null, paket.id)}
            kullaniciAdi={kullanici.ad}
          />
        </div>
      </div>
    </>
  )
}
