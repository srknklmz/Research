import { Baslik } from '@/components/Baslik'
import { girdiTarihi } from '@/lib/bicim'
import { gerekliKullanici } from '@/lib/oturum'
import { firmalar, secenekler } from '@/lib/secenek'
import { GIRIS_YAPABILIR } from '@/lib/yetki'
import { FaturaFormu } from '../FaturaFormu'
import { faturaOlustur } from '../eylemler'

export default async function YeniFatura() {
  await gerekliKullanici(GIRIS_YAPABILIR)
  const [liste, kategori, odeme] = await Promise.all([
    firmalar(),
    secenekler('FATURA_KATEGORI'),
    secenekler('ODEME'),
  ])

  return (
    <>
      <Baslik baslik="Yeni fatura" aciklama="Gelen faturayı kaydedin" />
      <div className="p-6">
        <FaturaFormu
          eylem={faturaOlustur}
          etiket="Faturayı kaydet"
          firmalar={liste}
          listeler={{ kategori, odeme }}
          baslangic={{
            no: '',
            tarih: girdiTarihi(new Date()),
            firmaId: '',
            tutar: '',
            kategori: '',
            odeme: '',
            aciklama: '',
            irsaliyesiz: false,
          }}
        />
      </div>
    </>
  )
}
