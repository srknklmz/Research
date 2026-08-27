import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Baslik } from '@/components/Baslik'
import { db } from '@/lib/db'
import { adaylar } from '@/lib/oneri'
import { gerekliKullanici } from '@/lib/oturum'
import { ESLESTIREBILIR } from '@/lib/yetki'
import { EslestirmePaneli } from '../EslestirmePaneli'
import { eslesmeleriKaydet, irsaliyesizIsaretle } from '../eylemler'

export default async function EslestirmeEkrani({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await gerekliKullanici(ESLESTIREBILIR)
  const { id } = await params
  const faturaId = Number(id)

  const varMi = await db.fatura.findUnique({
    where: { id: faturaId },
    select: { id: true, durum: true, no: true, belgeId: true },
  })
  if (!varMi) notFound()

  const { fatura, liste, secili } = await adaylar(faturaId)

  return (
    <>
      <Baslik
        baslik={`Fatura ${fatura.no} · irsaliye eşleştirme`}
        aciklama="Faturanın kapsadığı irsaliyeleri işaretleyin"
      >
        {varMi.belgeId ? (
          <a
            className="dugme-ikincil"
            href={`/belge/${varMi.belgeId}`}
            target="_blank"
            rel="noreferrer"
          >
            Faturayı aç
          </a>
        ) : null}
        <form action={irsaliyesizIsaretle.bind(null, faturaId, true)}>
          <button className="dugme-ikincil" type="submit">
            İrsaliyesiz olarak işaretle
          </button>
        </form>
      </Baslik>

      <div className="p-6">
        <EslestirmePaneli
          eylem={eslesmeleriKaydet.bind(null, faturaId)}
          fatura={fatura}
          liste={liste}
          secili={secili}
        />

        <p className="mt-4 text-xs text-soluk">
          Aradığınız irsaliye listede yoksa önce{' '}
          <Link href="/irsaliye/yeni" className="text-vurgu underline">
            irsaliyeyi girin
          </Link>
          . Liste yalnızca <strong>{fatura.firmaAdi}</strong> firmasının fatura
          tarihine yakın irsaliyelerini gösterir.
        </p>
      </div>
    </>
  )
}
