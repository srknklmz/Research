'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Rozet } from '@/components/Rozet'
import { para, tarih } from '@/lib/bicim'
import type { FormEylemi } from '@/lib/eylem'
import type { Aday } from '@/lib/oneri'

function Gonder({ sayi }: { sayi: number }) {
  const { pending } = useFormStatus()
  return (
    <button className="dugme-birincil" type="submit" disabled={pending}>
      {pending
        ? 'Kaydediliyor…'
        : sayi === 0
          ? 'Eşleşmeyi temizle'
          : `${sayi} irsaliyeyi bağla`}
    </button>
  )
}

export function EslestirmePaneli({
  eylem,
  fatura,
  liste,
  secili,
}: {
  eylem: FormEylemi
  fatura: {
    id: number
    no: string
    tarih: Date | string
    tutar: number
    firmaAdi: string
    aciklama: string | null
  }
  liste: (Omit<Aday, 'tarih'> & { tarih: Date | string })[]
  secili: number[]
}) {
  const [hata, calistir] = useActionState(eylem, null)
  const [isaretli, setIsaretli] = useState<number[]>(secili)

  const toplam = liste
    .filter((a) => isaretli.includes(a.id))
    .reduce((t, a) => t + a.toplam, 0)

  const kdvli = toplam * 1.2
  const fark = fatura.tutar - toplam
  const kdvliFark = fatura.tutar - kdvli
  const yakin = Math.abs(kdvliFark) < 0.02 || Math.abs(fark) < 0.02

  function degistir(id: number) {
    setIsaretli((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }

  return (
    <form action={calistir} className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <aside className="flex flex-col gap-4">
        <section className="kart p-4">
          <h2 className="text-sm font-semibold">Fatura</h2>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-soluk">No</dt>
            <dd className="font-medium">{fatura.no}</dd>
            <dt className="text-soluk">Tarih</dt>
            <dd className="tabular-nums">{tarih(fatura.tarih)}</dd>
            <dt className="text-soluk">Firma</dt>
            <dd>{fatura.firmaAdi}</dd>
            <dt className="text-soluk">Tutar</dt>
            <dd className="font-semibold tabular-nums">{para(fatura.tutar)}</dd>
            <dt className="text-soluk">Açıklama</dt>
            <dd>{fatura.aciklama ?? '—'}</dd>
          </dl>
        </section>

        <section className="kart p-4">
          <h2 className="text-sm font-semibold">Seçilen irsaliyeler</h2>
          <dl className="mt-3 grid grid-cols-[1fr_auto] gap-y-2 text-sm">
            <dt className="text-soluk">Adet</dt>
            <dd className="text-right tabular-nums">{isaretli.length}</dd>
            <dt className="text-soluk">Toplam (KDV hariç)</dt>
            <dd className="text-right tabular-nums">{para(toplam)}</dd>
            <dt className="text-soluk">%20 KDV dahil</dt>
            <dd className="text-right tabular-nums">{para(kdvli)}</dd>
          </dl>

          <div className="mt-3 border-t border-cizgi pt-3">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-soluk">Faturayla fark</span>
              <span
                className={`font-semibold tabular-nums ${
                  yakin ? 'text-onayli' : 'text-metin'
                }`}
              >
                {para(Math.abs(kdvliFark) < Math.abs(fark) ? kdvliFark : fark)}
              </span>
            </div>
            <p className="mt-1.5 text-xs text-soluk">
              {isaretli.length === 0
                ? 'Henüz irsaliye seçilmedi.'
                : yakin
                  ? 'Tutarlar örtüşüyor.'
                  : 'Tutarlar tutmuyor — eksik irsaliye ya da iskonto/navlun farkı olabilir. Yine de bağlayabilirsiniz.'}
            </p>
          </div>
        </section>

        {hata ? (
          <p className="rounded-md bg-red-zemin px-3 py-2 text-sm text-red">{hata}</p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Gonder sayi={isaretli.length} />
          <Link href="/eslestir" className="dugme-ikincil">
            Vazgeç
          </Link>
        </div>
      </aside>

      <section className="kart">
        <div className="flex items-center justify-between border-b border-cizgi px-4 py-3">
          <h2 className="text-sm font-semibold">
            {fatura.firmaAdi} irsaliyeleri
          </h2>
          <span className="text-xs text-soluk">
            {liste.length} aday · olabilirliğe göre sıralı
          </span>
        </div>

        {liste.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-soluk">
            Bu firmaya ait, fatura tarihine yakın irsaliye bulunamadı.
            <br />
            İrsaliye girilmemiş olabilir ya da fatura irsaliyesiz olabilir.
          </p>
        ) : (
          <ul className="divide-y divide-cizgi">
            {liste.map((a) => {
              const acik = isaretli.includes(a.id)
              return (
                <li key={a.id}>
                  <label
                    className={`flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors ${
                      acik ? 'bg-vurgu-acik' : 'hover:bg-kagit'
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="irsaliye"
                      value={a.id}
                      checked={acik}
                      onChange={() => degistir(a.id)}
                      className="mt-1"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="font-medium">
                          {a.no ?? <span className="text-soluk">no yok</span>}
                        </span>
                        <span className="text-sm text-soluk tabular-nums">
                          {tarih(a.tarih)}
                        </span>
                        {a.cari ? (
                          <span className="text-xs text-soluk">{a.cari}</span>
                        ) : null}
                        {a.puan >= 60 ? (
                          <Rozet renk="yesil">güçlü aday</Rozet>
                        ) : a.puan >= 30 ? (
                          <Rozet renk="mavi">olabilir</Rozet>
                        ) : null}
                        {a.baskaFaturada ? (
                          <Rozet renk="sari">
                            {a.baskaFaturada.no} faturasında da var
                          </Rozet>
                        ) : null}
                      </div>

                      <p className="mt-1 truncate text-sm text-soluk">
                        {a.ilkKalemler || 'kalem yok'}
                      </p>

                      {a.gerekceler.length ? (
                        <p className="mt-1 text-xs text-soluk">
                          {a.gerekceler.join(' · ')}
                        </p>
                      ) : null}
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-sm font-medium tabular-nums">
                        {a.toplam ? para(a.toplam) : '—'}
                      </div>
                      <div className="text-xs text-soluk">
                        {a.kalemSayisi} kalem
                      </div>
                    </div>
                  </label>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </form>
  )
}
