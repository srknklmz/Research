'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Rozet } from '@/components/Rozet'
import { para, tarih } from '@/lib/bicim'
import type { AktarimSonucu } from './tipler'

function Dugme({
  etiket,
  deger,
  sinif,
}: {
  etiket: string
  deger: string
  sinif: string
}) {
  const { pending } = useFormStatus()
  return (
    <button
      className={sinif}
      type="submit"
      name="islem"
      value={deger}
      disabled={pending}
    >
      {pending ? 'İşleniyor…' : etiket}
    </button>
  )
}

export function AktarimFormu({
  eylem,
}: {
  eylem: (
    onceki: AktarimSonucu | null,
    veri: FormData,
  ) => Promise<AktarimSonucu>
}) {
  const [sonuc, calistir] = useActionState(eylem, null)
  const [tur, setTur] = useState<'irsaliye' | 'fatura'>('irsaliye')
  const [dosyaSecili, setDosyaSecili] = useState(false)

  const onizleme = sonuc?.tip === 'onizleme' ? sonuc : null
  const yeniSayisi =
    onizleme?.irsaliyeler?.filter((i) => i.durum === 'yeni').length ??
    onizleme?.faturalar?.filter((f) => f.durum === 'yeni').length ??
    0

  return (
    <form action={calistir} className="flex flex-col gap-4">
      <section className="kart p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className="etiket">Ne aktarılıyor?</span>
            <div className="flex gap-4">
              {(
                [
                  ['irsaliye', 'İrsaliyeler'],
                  ['fatura', 'Faturalar'],
                ] as const
              ).map(([d, ad]) => (
                <label key={d} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="tur"
                    value={d}
                    checked={tur === d}
                    onChange={() => setTur(d)}
                  />
                  {ad}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="etiket" htmlFor="dosya">
              Dosya (.csv veya .xlsx)
            </label>
            <input
              id="dosya"
              name="dosya"
              type="file"
              accept=".csv,.xlsx,.xlsm,text/csv"
              className="alan"
              required
              onChange={(e) => setDosyaSecili(Boolean(e.target.files?.length))}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Dugme etiket="Önizle" deger="onizle" sinif="dugme-ikincil" />
          {onizleme && yeniSayisi > 0 ? (
            <Dugme
              etiket={`${yeniSayisi} kaydı aktar`}
              deger="aktar"
              sinif="dugme-birincil"
            />
          ) : null}
        </div>

        {onizleme && !dosyaSecili ? (
          <p className="mt-2 text-xs text-bekliyor">
            Aktarmadan önce dosyayı tekrar seçin — tarayıcı güvenliği gereği
            dosya form içinde saklanmıyor.
          </p>
        ) : null}
      </section>

      {sonuc?.tip === 'hata' ? (
        <p className="rounded-md bg-red-zemin px-3 py-2 text-sm text-red">
          {sonuc.mesaj}
        </p>
      ) : null}

      {sonuc?.tip === 'tamam' ? (
        <div className="rounded-md bg-onayli-zemin px-4 py-3 text-sm text-onayli">
          <strong>{sonuc.eklenen}</strong>{' '}
          {sonuc.tur === 'irsaliye' ? 'irsaliye' : 'fatura'} aktarıldı.
          {sonuc.atlanan > 0
            ? ` ${sonuc.atlanan} kayıt zaten vardı, atlandı.`
            : ''}
        </div>
      ) : null}

      {onizleme ? (
        <>
          <section className="kart p-4">
            <h2 className="text-sm font-semibold">Önizleme</h2>
            <p className="mt-1 text-sm text-soluk">
              {onizleme.okunanSatir} satır okundu ·{' '}
              {onizleme.irsaliyeler?.length ?? onizleme.faturalar?.length ?? 0}{' '}
              kayıt oluştu · <strong>{yeniSayisi}</strong> yeni
              {onizleme.sorunlar.length > 0
                ? ` · ${onizleme.sorunlar.length} satır atlanacak`
                : ''}
            </p>

            {onizleme.yeniFirmalar.length > 0 ? (
              <p className="mt-2 text-xs text-soluk">
                Yeni açılacak firmalar: {onizleme.yeniFirmalar.join(', ')}
              </p>
            ) : null}
          </section>

          {onizleme.sorunlar.length > 0 ? (
            <section className="kart p-4">
              <h2 className="mb-2 text-sm font-semibold text-bekliyor">
                Atlanacak satırlar
              </h2>
              <ul className="flex flex-col gap-1 text-sm">
                {onizleme.sorunlar.slice(0, 30).map((s, i) => (
                  <li key={i}>
                    <span className="text-soluk tabular-nums">
                      Satır {s.satir}:
                    </span>{' '}
                    {s.mesaj}
                  </li>
                ))}
                {onizleme.sorunlar.length > 30 ? (
                  <li className="text-soluk">
                    …ve {onizleme.sorunlar.length - 30} satır daha
                  </li>
                ) : null}
              </ul>
            </section>
          ) : null}

          <section className="kart overflow-x-auto">
            <table className="tablo">
              <thead>
                {onizleme.tur === 'irsaliye' ? (
                  <tr>
                    <th className="w-28">İrsaliye no</th>
                    <th className="w-28">Tarih</th>
                    <th>Firma</th>
                    <th className="w-24 text-right">Kalem</th>
                    <th className="w-32 text-right">Tutar</th>
                    <th className="w-28">Durum</th>
                  </tr>
                ) : (
                  <tr>
                    <th className="w-32">Fatura no</th>
                    <th className="w-28">Tarih</th>
                    <th>Firma</th>
                    <th className="w-36">Kategori</th>
                    <th className="w-32 text-right">Tutar</th>
                    <th className="w-28">Durum</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {onizleme.irsaliyeler?.slice(0, 200).map((i) => (
                  <tr key={i.anahtar}>
                    <td>{i.no ?? <span className="text-soluk">no yok</span>}</td>
                    <td className="tabular-nums">{tarih(i.tarih)}</td>
                    <td>{i.firma}</td>
                    <td className="text-right tabular-nums">{i.kalemSayisi}</td>
                    <td className="text-right tabular-nums">
                      {i.toplam ? para(i.toplam) : '—'}
                    </td>
                    <td>
                      {i.durum === 'yeni' ? (
                        <Rozet renk="yesil">yeni</Rozet>
                      ) : (
                        <Rozet>zaten var</Rozet>
                      )}
                    </td>
                  </tr>
                ))}
                {onizleme.faturalar?.slice(0, 200).map((f) => (
                  <tr key={`${f.firma}-${f.no}`}>
                    <td>{f.no}</td>
                    <td className="tabular-nums">{tarih(f.tarih)}</td>
                    <td>{f.firma}</td>
                    <td className="text-soluk">{f.kategori ?? '—'}</td>
                    <td className="text-right tabular-nums">{para(f.tutar)}</td>
                    <td>
                      {f.durum === 'yeni' ? (
                        <Rozet renk="yesil">yeni</Rozet>
                      ) : (
                        <Rozet>zaten var</Rozet>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      ) : null}
    </form>
  )
}
