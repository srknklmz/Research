import { Baslik } from '@/components/Baslik'
import { gerekliKullanici } from '@/lib/oturum'
import { GIRIS_YAPABILIR } from '@/lib/yetki'
import { AktarimFormu } from './AktarimFormu'
import { aktarimEylemi } from './eylemler'

export default async function IceAktar() {
  await gerekliKullanici(GIRIS_YAPABILIR)

  return (
    <>
      <Baslik
        baslik="İçe aktarma"
        aciklama="Notion ya da Excel'den dışa aktardığınız listeleri toplu yükleyin"
      />

      <div className="flex flex-col gap-4 p-6">
        <AktarimFormu eylem={aktarimEylemi} />

        <section className="kart p-4 text-sm">
          <h2 className="mb-2 text-sm font-semibold">Beklenen sütunlar</h2>

          <p className="mb-1 font-medium">İrsaliye</p>
          <p className="mb-3 text-soluk">
            <code>İRSALİYE NO</code>, <code>TARİH</code>,{' '}
            <code>FİRMA ADI</code>, <code>MALZEME</code>, <code>MİKTAR</code>,{' '}
            <code>BİRİM</code> zorunlu; <code>BİRİM FİYAT</code>,{' '}
            <code>KATEGORİ</code>, <code>TÜR</code>, <code>CARİ</code> isteğe
            bağlı. Aynı firma + irsaliye no + tarih taşıyan satırlar tek
            irsaliyenin kalemleri olarak birleştirilir — Notion dışa aktarımı
            doğrudan bu biçimdedir.
          </p>

          <p className="mb-1 font-medium">Fatura</p>
          <p className="mb-3 text-soluk">
            <code>FATURA NO</code>, <code>TARİH</code>, <code>FİRMA ADI</code>,{' '}
            <code>TUTAR</code> zorunlu; <code>KATEGORİ</code>,{' '}
            <code>AÇIKLAMA</code>, <code>ÖDEME</code> isteğe bağlı.
          </p>

          <p className="text-xs text-soluk">
            Tarihler <code>GG.AA.YYYY</code>, <code>GG/AA/YYYY</code> ya da{' '}
            <code>YYYY-AA-GG</code> olabilir. Sayılarda Türkçe biçim
            (<code>1.234,56</code>) desteklenir. Aynı firmada aynı numaralı
            kayıt varsa atlanır — aktarma tekrar çalıştırılabilir.
          </p>
        </section>
      </div>
    </>
  )
}
