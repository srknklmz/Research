import { Baslik } from '@/components/Baslik'
import { girdiTarihi } from '@/lib/bicim'
import { dogrudanYuklenir } from '@/lib/belge'
import { gerekliKullanici } from '@/lib/oturum'
import { firmalar, secenekler } from '@/lib/secenek'
import { GIRIS_YAPABILIR } from '@/lib/yetki'
import { IrsaliyeFormu } from '../IrsaliyeFormu'
import { irsaliyeOlustur } from '../eylemler'

export default async function YeniIrsaliye() {
  await gerekliKullanici(GIRIS_YAPABILIR)

  const [liste, birim, tur, malzeme, kategori, cari] = await Promise.all([
    firmalar(),
    secenekler('BIRIM'),
    secenekler('TUR'),
    secenekler('MALZEME'),
    secenekler('IRSALIYE_KATEGORI'),
    secenekler('CARI'),
  ])

  return (
    <>
      <Baslik
        baslik="Yeni irsaliye"
        aciklama="Şantiyeye gelen malzemenin irsaliyesini kaydedin"
      />
      <div className="p-6">
        <IrsaliyeFormu
          dogrudan={dogrudanYuklenir()}
          eylem={irsaliyeOlustur}
          etiket="İrsaliyeyi kaydet"
          firmalar={liste}
          listeler={{ birim, tur, malzeme, kategori, cari }}
          baslangic={{
            no: '',
            tarih: girdiTarihi(new Date()),
            firmaId: '',
            cari: '',
            aciklama: '',
            kalemler: [],
          }}
        />
      </div>
    </>
  )
}
