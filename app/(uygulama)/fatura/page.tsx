import type { FaturaDurum, Prisma } from '@prisma/client'
import Link from 'next/link'
import { Baslik } from '@/components/Baslik'
import { DurumRozeti, Rozet } from '@/components/Rozet'
import { para, tarih } from '@/lib/bicim'
import { db } from '@/lib/db'
import { FATURA_DURUM_ADI } from '@/lib/durum'
import { gerekliKullanici } from '@/lib/oturum'
import { firmalar } from '@/lib/secenek'

const SAYFA_BOYU = 50

type Arama = {
  q?: string
  firma?: string
  durum?: string
  baslangic?: string
  bitis?: string
  sayfa?: string
}

function kosul(a: Arama): Prisma.FaturaWhereInput {
  const k: Prisma.FaturaWhereInput = {}
  if (a.q?.trim()) {
    k.OR = [
      { no: { contains: a.q.trim(), mode: 'insensitive' } },
      { aciklama: { contains: a.q.trim(), mode: 'insensitive' } },
    ]
  }
  if (a.firma) k.firmaId = Number(a.firma)
  if (a.durum) k.durum = a.durum as FaturaDurum
  if (a.baslangic || a.bitis) {
    k.tarih = {
      ...(a.baslangic ? { gte: new Date(`${a.baslangic}T00:00:00Z`) } : {}),
      ...(a.bitis ? { lte: new Date(`${a.bitis}T00:00:00Z`) } : {}),
    }
  }
  return k
}

export default async function FaturaListesi({
  searchParams,
}: {
  searchParams: Promise<Arama>
}) {
  await gerekliKullanici()
  const a = await searchParams
  const sayfa = Math.max(1, Number(a.sayfa ?? 1))
  const k = kosul(a)

  const [kayitlar, toplam, ozet, firmaListesi] = await Promise.all([
    db.fatura.findMany({
      where: k,
      orderBy: [{ tarih: 'desc' }, { id: 'desc' }],
      skip: (sayfa - 1) * SAYFA_BOYU,
      take: SAYFA_BOYU,
      include: {
        firma: { select: { ad: true } },
        _count: { select: { eslesmeler: true } },
      },
    }),
    db.fatura.count({ where: k }),
    db.fatura.aggregate({ where: k, _sum: { tutar: true } }),
    firmalar(),
  ])

  const sonSayfa = Math.max(1, Math.ceil(toplam / SAYFA_BOYU))
  const bag = (s: number) => {
    const p = new URLSearchParams(
      Object.entries(a).filter(([, v]) => v) as [string, string][],
    )
    p.set('sayfa', String(s))
    return `/fatura?${p}`
  }

  return (
    <>
      <Baslik
        baslik="Faturalar"
        aciklama={`${toplam} kayıt · ${para(ozet._sum.tutar ?? 0)}`}
      >
        <Link href="/fatura/yeni" className="dugme-birincil">
          Yeni fatura
        </Link>
      </Baslik>

      <div className="p-6">
        <form className="kart mb-4 flex flex-wrap items-end gap-3 p-4">
          <div className="min-w-[200px] flex-1">
            <label className="etiket" htmlFor="q">
              Ara
            </label>
            <input
              id="q"
              name="q"
              className="alan"
              defaultValue={a.q ?? ''}
              placeholder="Fatura no, açıklama"
            />
          </div>
          <div className="w-52">
            <label className="etiket" htmlFor="firma">
              Firma
            </label>
            <select id="firma" name="firma" className="alan" defaultValue={a.firma ?? ''}>
              <option value="">Hepsi</option>
              {firmaListesi.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.ad}
                </option>
              ))}
            </select>
          </div>
          <div className="w-44">
            <label className="etiket" htmlFor="durum">
              Durum
            </label>
            <select id="durum" name="durum" className="alan" defaultValue={a.durum ?? ''}>
              <option value="">Hepsi</option>
              {Object.entries(FATURA_DURUM_ADI).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="w-40">
            <label className="etiket" htmlFor="baslangic">
              Başlangıç
            </label>
            <input
              id="baslangic"
              name="baslangic"
              type="date"
              className="alan"
              defaultValue={a.baslangic ?? ''}
            />
          </div>
          <div className="w-40">
            <label className="etiket" htmlFor="bitis">
              Bitiş
            </label>
            <input
              id="bitis"
              name="bitis"
              type="date"
              className="alan"
              defaultValue={a.bitis ?? ''}
            />
          </div>
          <button className="dugme-ikincil" type="submit">
            Filtrele
          </button>
          <Link href="/fatura" className="text-sm text-soluk underline">
            Temizle
          </Link>
        </form>

        <div className="kart overflow-x-auto">
          <table className="tablo">
            <thead>
              <tr>
                <th className="w-32">Fatura no</th>
                <th className="w-28">Tarih</th>
                <th>Firma</th>
                <th className="w-36">Kategori</th>
                <th className="w-32 text-right">Tutar</th>
                <th className="w-24">İrsaliye</th>
                <th className="w-40">Durum</th>
              </tr>
            </thead>
            <tbody>
              {kayitlar.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-soluk">
                    Kayıt bulunamadı.
                  </td>
                </tr>
              ) : (
                kayitlar.map((f) => (
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
                    <td className="text-soluk">{f.kategori ?? '—'}</td>
                    <td className="text-right tabular-nums">{para(f.tutar)}</td>
                    <td>
                      {f.irsaliyesiz ? (
                        <Rozet>yok</Rozet>
                      ) : f._count.eslesmeler > 0 ? (
                        <Rozet renk="mavi">{f._count.eslesmeler}</Rozet>
                      ) : (
                        <Rozet renk="sari">—</Rozet>
                      )}
                    </td>
                    <td>
                      <DurumRozeti durum={f.durum} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {sonSayfa > 1 ? (
          <nav className="mt-4 flex items-center justify-between text-sm">
            <span className="text-soluk">
              Sayfa {sayfa} / {sonSayfa}
            </span>
            <div className="flex gap-2">
              {sayfa > 1 ? (
                <Link href={bag(sayfa - 1)} className="dugme-ikincil">
                  Önceki
                </Link>
              ) : null}
              {sayfa < sonSayfa ? (
                <Link href={bag(sayfa + 1)} className="dugme-ikincil">
                  Sonraki
                </Link>
              ) : null}
            </div>
          </nav>
        ) : null}
      </div>
    </>
  )
}
