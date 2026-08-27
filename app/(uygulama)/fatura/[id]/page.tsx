import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Baslik } from '@/components/Baslik'
import { OnayGecmisi, PaketIrsaliyeleri } from '@/components/Paket'
import { DurumRozeti, Rozet } from '@/components/Rozet'
import { SilFormu } from '@/components/SilFormu'
import { para, tarih, zaman } from '@/lib/bicim'
import { paketGetir } from '@/lib/paket'
import { gerekliKullanici } from '@/lib/oturum'
import { ESLESTIREBILIR, GIRIS_YAPABILIR, IMZALAYABILIR, MERKEZ_ONAYLAR, yetkili } from '@/lib/yetki'
import { imzayiGeriAl } from '../../imza/eylemler'
import { faturaSil } from '../eylemler'

const KILITLI = ['IMZALANDI', 'MERKEZ_ONAYLI', 'GONDERILDI']

export default async function FaturaDetay({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const kullanici = await gerekliKullanici()
  const { id } = await params
  const paket = await paketGetir(Number(id))
  if (!paket) notFound()

  const kilitli = KILITLI.includes(paket.durum)
  const duzenleyebilir = yetkili(kullanici.rol, GIRIS_YAPABILIR) && !kilitli
  const eslestirebilir = yetkili(kullanici.rol, ESLESTIREBILIR) && !kilitli && !paket.irsaliyesiz
  const imzalayabilir = yetkili(kullanici.rol, IMZALAYABILIR) && paket.durum === 'ESLESTI'
  const onaylayabilir = yetkili(kullanici.rol, MERKEZ_ONAYLAR) && paket.durum === 'IMZALANDI'
  const imzaGeriAlinabilir =
    yetkili(kullanici.rol, IMZALAYABILIR) && paket.durum === 'IMZALANDI'

  return (
    <>
      <Baslik
        baslik={`Fatura ${paket.no}`}
        aciklama={`${paket.firma.ad} · ${tarih(paket.tarih)} · ${para(paket.tutar)}`}
      >
        <a href={`/cikti/fatura/${paket.id}`} className="dugme-ikincil" target="_blank" rel="noreferrer">
          Çıktı
        </a>
        {paket.belge ? (
          <a className="dugme-ikincil" href={`/belge/${paket.belge.id}`} target="_blank" rel="noreferrer">
            Belgeyi aç
          </a>
        ) : null}
        {eslestirebilir ? (
          <Link href={`/eslestir/${paket.id}`} className="dugme-ikincil">
            İrsaliye eşleştir
          </Link>
        ) : null}
        {duzenleyebilir ? (
          <Link href={`/fatura/${paket.id}/duzenle`} className="dugme-ikincil">
            Düzenle
          </Link>
        ) : null}
        {imzalayabilir ? (
          <Link href={`/imza/${paket.id}`} className="dugme-birincil">
            İncele ve imzala
          </Link>
        ) : null}
        {onaylayabilir ? (
          <Link href="/merkez" className="dugme-birincil">
            Merkez onayı
          </Link>
        ) : null}
      </Baslik>

      <div className="grid gap-4 p-6 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <PaketIrsaliyeleri paket={paket} />
          <OnayGecmisi paket={paket} />
        </div>

        <div className="flex flex-col gap-4">
          <section className="kart p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Fatura</h2>
              <DurumRozeti durum={paket.durum} />
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-soluk">No</dt>
              <dd className="font-medium">{paket.no}</dd>
              <dt className="text-soluk">Tarih</dt>
              <dd className="tabular-nums">{tarih(paket.tarih)}</dd>
              <dt className="text-soluk">Firma</dt>
              <dd>{paket.firma.ad}</dd>
              <dt className="text-soluk">Tutar</dt>
              <dd className="font-semibold tabular-nums">{para(paket.tutar)}</dd>
              <dt className="text-soluk">Kategori</dt>
              <dd>{paket.kategori ?? '—'}</dd>
              <dt className="text-soluk">Ödeme</dt>
              <dd>{paket.odeme ?? '—'}</dd>
              <dt className="text-soluk">Açıklama</dt>
              <dd>{paket.aciklama ?? '—'}</dd>
              <dt className="text-soluk">İrsaliye</dt>
              <dd>
                {paket.irsaliyesiz ? (
                  <Rozet>irsaliyesiz</Rozet>
                ) : (
                  `${paket.eslesmeler.length} adet`
                )}
              </dd>
              <dt className="text-soluk">Giren</dt>
              <dd>{paket.giren?.ad ?? '—'}</dd>
              <dt className="text-soluk">Kayıt</dt>
              <dd className="tabular-nums">{zaman(paket.olusturmaT)}</dd>
            </dl>
          </section>

          {paket.gonderim ? (
            <section className="kart p-4">
              <h2 className="mb-2 text-sm font-semibold">Müşavire gönderim</h2>
              <p className="text-sm">
                <Link
                  href={`/merkez/gonderim/${paket.gonderim.id}`}
                  className="font-medium text-vurgu hover:underline"
                >
                  {paket.gonderim.no}
                </Link>
                <span className="ml-2 text-soluk tabular-nums">
                  {zaman(paket.gonderim.tarih)}
                </span>
              </p>
              {paket.gonderim.musavir ? (
                <p className="mt-1 text-sm text-soluk">{paket.gonderim.musavir}</p>
              ) : null}
            </section>
          ) : null}

          {paket.durum === 'REDDEDILDI' ? (
            <p className="rounded-md bg-red-zemin px-3 py-2 text-xs text-red">
              Bu fatura geri gönderildi. Eksik düzeltilip yeniden eşleştirilince
              tekrar imzaya düşer. Sebep için onay geçmişine bakın.
            </p>
          ) : null}

          {kilitli ? (
            <p className="rounded-md bg-gonderildi-zemin px-3 py-2 text-xs text-gonderildi">
              İmzalanmış fatura değiştirilemez. Düzeltme gerekiyorsa idari müdür
              imzayı geri almalı.
            </p>
          ) : null}

          {imzaGeriAlinabilir ? (
            <SilFormu
              eylem={imzayiGeriAl.bind(null, paket.id)}
              onay={`${paket.no} numaralı faturanın imzası geri alınacak ve fatura yeniden düzenlenebilir hale gelecek. Emin misiniz?`}
              etiket="İmzayı geri al"
            />
          ) : null}

          {duzenleyebilir ? (
            <SilFormu
              eylem={faturaSil.bind(null, paket.id)}
              onay={`${paket.no} numaralı fatura silinecek. Emin misiniz?`}
              etiket="Faturayı sil"
            />
          ) : null}
        </div>
      </div>
    </>
  )
}
