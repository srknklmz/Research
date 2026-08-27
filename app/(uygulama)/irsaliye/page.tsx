import type { Prisma } from '@prisma/client'
import Link from 'next/link'
import { Baslik } from '@/components/Baslik'
import { Rozet } from '@/components/Rozet'
import { para, tarih } from '@/lib/bicim'
import { db } from '@/lib/db'
import { gerekliKullanici } from '@/lib/oturum'
import { firmalar } from '@/lib/secenek'

const SAYFA_BOYU = 50

type Arama = {
  q?: string
  firma?: string
  baslangic?: string
  bitis?: string
  eslesme?: string
  sayfa?: string
}

function kosul(a: Arama): Prisma.IrsaliyeWhereInput {
  const k: Prisma.IrsaliyeWhereInput = {}

  if (a.q?.trim()) {
    k.OR = [
      { no: { contains: a.q.trim(), mode: 'insensitive' } },
      { aciklama: { contains: a.q.trim(), mode: 'insensitive' } },
      { kalemler: { some: { malzeme: { contains: a.q.trim(), mode: 'insensitive' } } } },
    ]
  }
  if (a.firma) k.firmaId = Number(a.firma)
  if (a.baslangic || a.bitis) {
    k.tarih = {
      ...(a.baslangic ? { gte: new Date(`${a.baslangic}T00:00:00Z`) } : {}),
      ...(a.bitis ? { lte: new Date(`${a.bitis}T00:00:00Z`) } : {}),
    }
  }
  if (a.eslesme === 'eslesmemis') k.eslesmeler = { none: {} }
  if (a.eslesme === 'eslesmis') k.eslesmeler = { some: {} }

  return k
}

export default async function IrsaliyeListesi({
  searchParams,
}: {
  searchParams: Promise<Arama>
}) {
  await gerekliKullanici()
  const a = await searchParams
  const sayfa = Math.max(1, Number(a.sayfa ?? 1))
  const k = kosul(a)

  const [kayitlar, toplam, firmaListesi] = await Promise.all([
    db.irsaliye.findMany({
      where: k,
      orderBy: [{ tarih: 'desc' }, { id: 'desc' }],
      skip: (sayfa - 1) * SAYFA_BOYU,
      take: SAYFA_BOYU,
      include: {
        firma: { select: { ad: true } },
        kalemler: { select: { toplam: true, malzeme: true } },
        eslesmeler: { select: { fatura: { select: { id: true, no: true } } } },
      },
    }),
    db.irsaliye.count({ where: k }),
    firmalar(),
  ])

  const sonSayfa = Math.max(1, Math.ceil(toplam / SAYFA_BOYU))
  const bag = (s: number) => {
    const p = new URLSearchParams(
      Object.entries(a).filter(([, v]) => v) as [string, string][],
    )
    p.set('sayfa', String(s))
    return `/irsaliye?${p}`
  }

  return (
    <>
      <Baslik baslik="İrsaliyeler" aciklama={`${toplam} kayıt`}>
        <Link href="/irsaliye/yeni" className="dugme-birincil">
          Yeni irsaliye
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
              placeholder="İrsaliye no, malzeme, açıklama"
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
          <div className="w-40">
            <label className="etiket" htmlFor="eslesme">
              Eşleşme
            </label>
            <select
              id="eslesme"
              name="eslesme"
              className="alan"
              defaultValue={a.eslesme ?? ''}
            >
              <option value="">Hepsi</option>
              <option value="eslesmemis">Eşleşmemiş</option>
              <option value="eslesmis">Eşleşmiş</option>
            </select>
          </div>
          <button className="dugme-ikincil" type="submit">
            Filtrele
          </button>
          <Link href="/irsaliye" className="text-sm text-soluk underline">
            Temizle
          </Link>
        </form>

        <div className="kart overflow-x-auto">
          <table className="tablo">
            <thead>
              <tr>
                <th className="w-28">İrsaliye no</th>
                <th className="w-28">Tarih</th>
                <th>Firma</th>
                <th>Malzeme</th>
                <th className="w-32 text-right">Tutar</th>
                <th className="w-44">Fatura</th>
              </tr>
            </thead>
            <tbody>
              {kayitlar.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-soluk">
                    Kayıt bulunamadı.
                  </td>
                </tr>
              ) : (
                kayitlar.map((i) => {
                  const tutar = i.kalemler.reduce(
                    (t, k) => t + Number(k.toplam ?? 0),
                    0,
                  )
                  return (
                    <tr key={i.id}>
                      <td>
                        <Link
                          href={`/irsaliye/${i.id}`}
                          className="font-medium text-vurgu hover:underline"
                        >
                          {i.no ?? <span className="text-soluk">no yok</span>}
                        </Link>
                      </td>
                      <td className="tabular-nums">{tarih(i.tarih)}</td>
                      <td>{i.firma.ad}</td>
                      <td className="text-soluk">
                        {i.kalemler
                          .slice(0, 2)
                          .map((k) => k.malzeme)
                          .join(', ')}
                        {i.kalemler.length > 2
                          ? ` +${i.kalemler.length - 2}`
                          : ''}
                      </td>
                      <td className="text-right tabular-nums">
                        {tutar ? para(tutar) : '—'}
                      </td>
                      <td>
                        {i.eslesmeler.length === 0 ? (
                          <Rozet renk="sari">eşleşmemiş</Rozet>
                        ) : (
                          i.eslesmeler.map((e) => (
                            <Link
                              key={e.fatura.id}
                              href={`/fatura/${e.fatura.id}`}
                              className="mr-1 text-vurgu hover:underline"
                            >
                              {e.fatura.no}
                            </Link>
                          ))
                        )}
                      </td>
                    </tr>
                  )
                })
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
