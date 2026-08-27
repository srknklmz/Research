import { notFound } from 'next/navigation'
import { Baslik } from '@/components/Baslik'
import { girdiTarihi } from '@/lib/bicim'
import { db } from '@/lib/db'
import { dogrudanYuklenir } from '@/lib/belge'
import { gerekliKullanici } from '@/lib/oturum'
import { firmalar, secenekler } from '@/lib/secenek'
import { GIRIS_YAPABILIR } from '@/lib/yetki'
import { FaturaFormu } from '../../FaturaFormu'
import { faturaGuncelle } from '../../eylemler'

export default async function FaturaDuzenle({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await gerekliKullanici(GIRIS_YAPABILIR)
  const { id } = await params

  const [fatura, liste, kategori, odeme] = await Promise.all([
    db.fatura.findUnique({ where: { id: Number(id) } }),
    firmalar(),
    secenekler('FATURA_KATEGORI'),
    secenekler('ODEME'),
  ])
  if (!fatura) notFound()

  return (
    <>
      <Baslik baslik={`Fatura ${fatura.no} düzenle`} />
      <div className="p-6">
        <FaturaFormu
          dogrudan={dogrudanYuklenir()}
          eylem={faturaGuncelle.bind(null, fatura.id)}
          etiket="Değişiklikleri kaydet"
          iptalYolu={`/fatura/${fatura.id}`}
          firmalar={liste}
          listeler={{ kategori, odeme }}
          baslangic={{
            no: fatura.no,
            tarih: girdiTarihi(fatura.tarih),
            firmaId: String(fatura.firmaId),
            tutar: String(fatura.tutar),
            kategori: fatura.kategori ?? '',
            odeme: fatura.odeme ?? '',
            aciklama: fatura.aciklama ?? '',
            irsaliyesiz: fatura.irsaliyesiz,
            belgeId: fatura.belgeId,
          }}
        />
      </div>
    </>
  )
}
