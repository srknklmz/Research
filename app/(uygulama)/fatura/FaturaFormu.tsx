'use client'

import Link from 'next/link'
import { useActionState, useId, useState } from 'react'
import { useFormStatus } from 'react-dom'
import type { FormEylemi } from '@/lib/eylem'

export type FaturaBaslangic = {
  no: string
  tarih: string
  firmaId: string
  tutar: string
  kategori: string
  odeme: string
  aciklama: string
  irsaliyesiz: boolean
  belgeId?: number | null
}

function Gonder({ etiket }: { etiket: string }) {
  const { pending } = useFormStatus()
  return (
    <button className="dugme-birincil" type="submit" disabled={pending}>
      {pending ? 'Kaydediliyor…' : etiket}
    </button>
  )
}

export function FaturaFormu({
  eylem,
  baslangic,
  firmalar,
  listeler,
  etiket = 'Kaydet',
  iptalYolu = '/fatura',
}: {
  eylem: FormEylemi
  baslangic: FaturaBaslangic
  firmalar: { id: number; ad: string }[]
  listeler: { kategori: string[]; odeme: string[] }
  etiket?: string
  iptalYolu?: string
}) {
  const [hata, calistir] = useActionState(eylem, null)
  const [d, setD] = useState(baslangic)
  const kimlik = useId()


  return (
    <form action={calistir} className="flex max-w-3xl flex-col gap-4">
      <section className="kart p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="etiket" htmlFor={`${kimlik}-no`}>
              Fatura no
            </label>
            <input
              id={`${kimlik}-no`}
              name="no"
              className="alan"
              value={d.no}
              onChange={(e) => setD({ ...d, no: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="etiket" htmlFor={`${kimlik}-tarih`}>
              Tarih
            </label>
            <input
              id={`${kimlik}-tarih`}
              name="tarih"
              type="date"
              className="alan"
              value={d.tarih}
              onChange={(e) => setD({ ...d, tarih: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="etiket" htmlFor={`${kimlik}-firma`}>
              Firma
            </label>
            <select
              id={`${kimlik}-firma`}
              name="firmaId"
              className="alan"
              value={d.firmaId}
              onChange={(e) => setD({ ...d, firmaId: e.target.value })}
              required
            >
              <option value="">Seçin…</option>
              {firmalar.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.ad}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="etiket" htmlFor={`${kimlik}-tutar`}>
              Tutar (KDV dahil)
            </label>
            <input
              id={`${kimlik}-tutar`}
              name="tutar"
              type="number"
              step="0.01"
              min="0"
              className="alan text-right tabular-nums"
              value={d.tutar}
              onChange={(e) => setD({ ...d, tutar: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="etiket" htmlFor={`${kimlik}-kategori`}>
              Kategori
            </label>
            <input
              id={`${kimlik}-kategori`}
              name="kategori"
              className="alan"
              list={`${kimlik}-kategori-liste`}
              value={d.kategori}
              onChange={(e) => setD({ ...d, kategori: e.target.value })}
            />
            <datalist id={`${kimlik}-kategori-liste`}>
              {listeler.kategori.map((k) => (
                <option key={k} value={k} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="etiket" htmlFor={`${kimlik}-odeme`}>
              Ödeme durumu
            </label>
            <input
              id={`${kimlik}-odeme`}
              name="odeme"
              className="alan"
              list={`${kimlik}-odeme-liste`}
              value={d.odeme}
              onChange={(e) => setD({ ...d, odeme: e.target.value })}
            />
            <datalist id={`${kimlik}-odeme-liste`}>
              {listeler.odeme.map((o) => (
                <option key={o} value={o} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="mt-3">
          <label className="etiket" htmlFor={`${kimlik}-aciklama`}>
            Açıklama
          </label>
          <input
            id={`${kimlik}-aciklama`}
            name="aciklama"
            className="alan"
            value={d.aciklama}
            onChange={(e) => setD({ ...d, aciklama: e.target.value })}
          />
        </div>

        <label className="mt-4 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="irsaliyesiz"
            className="mt-0.5"
            checked={d.irsaliyesiz}
            onChange={(e) => setD({ ...d, irsaliyesiz: e.target.checked })}
          />
          <span>
            <strong>Bu faturanın irsaliyesi yok.</strong>
            <span className="mt-0.5 block text-xs text-soluk">
              Yemek, konaklama, kiralama gibi malzeme teslimi olmayan
              faturalar için işaretleyin — eşleştirme adımı atlanır, doğrudan
              imzaya düşer.
            </span>
          </span>
        </label>
      </section>

      <section className="kart p-4">
        <label className="etiket" htmlFor={`${kimlik}-belge`}>
          Fatura belgesi (PDF ya da fotoğraf)
        </label>
        <input
          id={`${kimlik}-belge`}
          name="belge"
          type="file"
          accept="application/pdf,image/*"
          className="alan"
        />
        {baslangic.belgeId ? (
          <p className="mt-2 text-xs text-soluk">
            Yüklü belge var.{' '}
            <a
              className="text-vurgu underline"
              href={`/belge/${baslangic.belgeId}`}
              target="_blank"
              rel="noreferrer"
            >
              Görüntüle
            </a>{' '}
            — yeni dosya seçerseniz değiştirilir.
          </p>
        ) : null}
      </section>

      {hata ? (
        <p className="rounded-md bg-red-zemin px-3 py-2 text-sm text-red">{hata}</p>
      ) : null}

      <div className="flex items-center gap-2">
        <Gonder etiket={etiket} />
        <Link href={iptalYolu} className="dugme-ikincil">
          Vazgeç
        </Link>
      </div>
    </form>
  )
}
