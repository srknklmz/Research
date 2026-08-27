'use client'

import Link from 'next/link'
import { useActionState, useId, useMemo, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { para, sayiya } from '@/lib/bicim'
import type { FormEylemi } from '@/lib/eylem'

export type Kalem = {
  kategori: string
  tur: string
  malzeme: string
  miktar: string
  birim: string
  birimFiyat: string
}

export type IrsaliyeBaslangic = {
  no: string
  tarih: string
  firmaId: string
  cari: string
  aciklama: string
  kalemler: Kalem[]
  belgeId?: number | null
}

const BOS_KALEM: Kalem = {
  kategori: '',
  tur: '',
  malzeme: '',
  miktar: '',
  birim: '',
  birimFiyat: '',
}

function Gonder({ etiket }: { etiket: string }) {
  const { pending } = useFormStatus()
  return (
    <button className="dugme-birincil" type="submit" disabled={pending}>
      {pending ? 'Kaydediliyor…' : etiket}
    </button>
  )
}

export function IrsaliyeFormu({
  eylem,
  baslangic,
  firmalar,
  listeler,
  etiket = 'Kaydet',
  iptalYolu = '/irsaliye',
}: {
  eylem: FormEylemi
  baslangic: IrsaliyeBaslangic
  firmalar: { id: number; ad: string }[]
  listeler: {
    birim: string[]
    tur: string[]
    malzeme: string[]
    kategori: string[]
    cari: string[]
  }
  etiket?: string
  iptalYolu?: string
}) {
  const [hata, calistir] = useActionState(eylem, null)
  const [kalemler, setKalemler] = useState<Kalem[]>(
    baslangic.kalemler.length ? baslangic.kalemler : [BOS_KALEM],
  )
  const [baslik, setBaslik] = useState({
    no: baslangic.no,
    tarih: baslangic.tarih,
    firmaId: baslangic.firmaId,
    cari: baslangic.cari,
    aciklama: baslangic.aciklama,
  })
  const kimlik = useId()

  const toplam = useMemo(
    () =>
      kalemler.reduce(
        (t, k) => t + sayiya(k.miktar || 0) * sayiya(k.birimFiyat || 0),
        0,
      ),
    [kalemler],
  )

  function kalemDegistir(i: number, alan: keyof Kalem, deger: string) {
    setKalemler((k) => k.map((s, j) => (j === i ? { ...s, [alan]: deger } : s)))
  }


  return (
    <form action={calistir} className="flex flex-col gap-4">
      <input
        type="hidden"
        name="kalemler"
        value={JSON.stringify(
          kalemler
            .filter((k) => k.malzeme.trim())
            .map((k) => ({
              kategori: k.kategori || null,
              tur: k.tur || null,
              malzeme: k.malzeme,
              miktar: k.miktar,
              birim: k.birim,
              birimFiyat: k.birimFiyat === '' ? null : k.birimFiyat,
            })),
        )}
      />

      <section className="kart p-4">
        <h2 className="mb-3 text-sm font-semibold">İrsaliye bilgileri</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="etiket" htmlFor={`${kimlik}-no`}>
              İrsaliye no
            </label>
            <input
              id={`${kimlik}-no`}
              name="no"
              className="alan"
              value={baslik.no}
              onChange={(e) => setBaslik({ ...baslik, no: e.target.value })}
              placeholder="Yoksa boş bırakın"
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
              value={baslik.tarih}
              onChange={(e) => setBaslik({ ...baslik, tarih: e.target.value })}
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
              value={baslik.firmaId}
              onChange={(e) => setBaslik({ ...baslik, firmaId: e.target.value })}
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
            <label className="etiket" htmlFor={`${kimlik}-cari`}>
              Cari / taşeron
            </label>
            <input
              id={`${kimlik}-cari`}
              name="cari"
              className="alan"
              list={`${kimlik}-cari-liste`}
              value={baslik.cari}
              onChange={(e) => setBaslik({ ...baslik, cari: e.target.value })}
            />
            <datalist id={`${kimlik}-cari-liste`}>
              {listeler.cari.map((d) => (
                <option key={d} value={d} />
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
            value={baslik.aciklama}
            onChange={(e) => setBaslik({ ...baslik, aciklama: e.target.value })}
          />
        </div>
      </section>

      <section className="kart">
        <div className="flex items-center justify-between border-b border-cizgi px-4 py-3">
          <h2 className="text-sm font-semibold">Kalemler</h2>
          <button
            type="button"
            className="dugme-ikincil text-xs"
            onClick={() => setKalemler((k) => [...k, { ...BOS_KALEM }])}
          >
            + Satır ekle
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="tablo min-w-[900px]">
            <thead>
              <tr>
                <th className="w-8">#</th>
                <th className="min-w-[220px]">Malzeme</th>
                <th className="w-36">Tür</th>
                <th className="w-32">Kategori</th>
                <th className="w-24">Miktar</th>
                <th className="w-24">Birim</th>
                <th className="w-28">Birim fiyat</th>
                <th className="w-28 text-right">Tutar</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {kalemler.map((k, i) => (
                <tr key={i}>
                  <td className="text-xs text-soluk tabular-nums">{i + 1}</td>
                  <td>
                    <input
                      className="alan"
                      list={`${kimlik}-malzeme`}
                      value={k.malzeme}
                      onChange={(e) => kalemDegistir(i, 'malzeme', e.target.value)}
                      aria-label={`${i + 1}. satır malzeme`}
                    />
                  </td>
                  <td>
                    <input
                      className="alan"
                      list={`${kimlik}-tur`}
                      value={k.tur}
                      onChange={(e) => kalemDegistir(i, 'tur', e.target.value)}
                      aria-label={`${i + 1}. satır tür`}
                    />
                  </td>
                  <td>
                    <input
                      className="alan"
                      list={`${kimlik}-kategori`}
                      value={k.kategori}
                      onChange={(e) => kalemDegistir(i, 'kategori', e.target.value)}
                      aria-label={`${i + 1}. satır kategori`}
                    />
                  </td>
                  <td>
                    <input
                      className="alan text-right tabular-nums"
                      type="number"
                      step="0.001"
                      min="0"
                      value={k.miktar}
                      onChange={(e) => kalemDegistir(i, 'miktar', e.target.value)}
                      aria-label={`${i + 1}. satır miktar`}
                    />
                  </td>
                  <td>
                    <input
                      className="alan"
                      list={`${kimlik}-birim`}
                      value={k.birim}
                      onChange={(e) => kalemDegistir(i, 'birim', e.target.value)}
                      aria-label={`${i + 1}. satır birim`}
                    />
                  </td>
                  <td>
                    <input
                      className="alan text-right tabular-nums"
                      type="number"
                      step="0.01"
                      min="0"
                      value={k.birimFiyat}
                      onChange={(e) => kalemDegistir(i, 'birimFiyat', e.target.value)}
                      aria-label={`${i + 1}. satır birim fiyat`}
                    />
                  </td>
                  <td className="text-right text-sm tabular-nums">
                    {k.birimFiyat
                      ? para(sayiya(k.miktar || 0) * sayiya(k.birimFiyat))
                      : '—'}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="rounded px-2 py-1 text-soluk hover:bg-red-zemin hover:text-red"
                      onClick={() =>
                        setKalemler((s) =>
                          s.length === 1 ? [{ ...BOS_KALEM }] : s.filter((_, j) => j !== i),
                        )
                      }
                      aria-label={`${i + 1}. satırı sil`}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={7} className="text-right text-sm font-medium">
                  Toplam
                </td>
                <td className="text-right text-sm font-semibold tabular-nums">
                  {para(toplam)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <datalist id={`${kimlik}-malzeme`}>
          {listeler.malzeme.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>
        <datalist id={`${kimlik}-tur`}>
          {listeler.tur.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>
        <datalist id={`${kimlik}-kategori`}>
          {listeler.kategori.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>
        <datalist id={`${kimlik}-birim`}>
          {listeler.birim.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>
      </section>

      <section className="kart p-4">
        <label className="etiket" htmlFor={`${kimlik}-belge`}>
          İrsaliye belgesi (PDF)
        </label>
        <input
          id={`${kimlik}-belge`}
          name="belge"
          type="file"
          accept=".pdf,application/pdf"
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
