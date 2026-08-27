import { notFound } from 'next/navigation'
import { Baslik } from '@/components/Baslik'
import { girdiTarihi } from '@/lib/bicim'
import { db } from '@/lib/db'
import { gerekliKullanici } from '@/lib/oturum'
import { firmalar, secenekler } from '@/lib/secenek'
import { GIRIS_YAPABILIR } from '@/lib/yetki'
import { IrsaliyeFormu } from '../../IrsaliyeFormu'
import { irsaliyeGuncelle } from '../../eylemler'

export default async function IrsaliyeDuzenle({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await gerekliKullanici(GIRIS_YAPABILIR)
  const { id } = await params

  const [irsaliye, liste, birim, tur, malzeme, kategori, cari] = await Promise.all([
    db.irsaliye.findUnique({
      where: { id: Number(id) },
      include: { kalemler: { orderBy: { sira: 'asc' } } },
    }),
    firmalar(),
    secenekler('BIRIM'),
    secenekler('TUR'),
    secenekler('MALZEME'),
    secenekler('IRSALIYE_KATEGORI'),
    secenekler('CARI'),
  ])

  if (!irsaliye) notFound()

  return (
    <>
      <Baslik baslik={`İrsaliye ${irsaliye.no ?? '(no yok)'} düzenle`} />
      <div className="p-6">
        <IrsaliyeFormu
          eylem={irsaliyeGuncelle.bind(null, irsaliye.id)}
          etiket="Değişiklikleri kaydet"
          iptalYolu={`/irsaliye/${irsaliye.id}`}
          firmalar={liste}
          listeler={{ birim, tur, malzeme, kategori, cari }}
          baslangic={{
            no: irsaliye.no ?? '',
            tarih: girdiTarihi(irsaliye.tarih),
            firmaId: String(irsaliye.firmaId),
            cari: irsaliye.cari ?? '',
            aciklama: irsaliye.aciklama ?? '',
            belgeId: irsaliye.belgeId,
            kalemler: irsaliye.kalemler.map((k) => ({
              kategori: k.kategori ?? '',
              tur: k.tur ?? '',
              malzeme: k.malzeme,
              miktar: String(k.miktar),
              birim: k.birim,
              birimFiyat: k.birimFiyat ? String(k.birimFiyat) : '',
            })),
          }}
        />
      </div>
    </>
  )
}
