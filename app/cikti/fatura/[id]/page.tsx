import { notFound } from 'next/navigation'
import { CiktiFoyu } from '@/components/CiktiFoyu'
import { YazdirDugmesi } from '@/components/YazdirDugmesi'
import { ayarlar } from '@/lib/ayar'
import { paketGetir } from '@/lib/paket'

export default async function FaturaCiktisi({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [paket, ayar] = await Promise.all([paketGetir(Number(id)), ayarlar()])
  if (!paket) notFound()

  return (
    <>
      <div className="yazdirma-gizle mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold">Fatura {paket.no} · çıktı</h1>
          <p className="text-sm text-soluk">
            Yazdırıp imzalı nüshayla birlikte müşavire iletin.
          </p>
        </div>
        <YazdirDugmesi />
      </div>

      <CiktiFoyu
        paket={paket}
        sirketAdi={ayar.sirket_adi ?? 'Şirket'}
        santiyeAdi={ayar.santiye_adi ?? ''}
      />
    </>
  )
}
