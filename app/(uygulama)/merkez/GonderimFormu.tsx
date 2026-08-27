'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { para, tarih } from '@/lib/bicim'
import type { FormEylemi } from '@/lib/eylem'

export type GonderilebilirFatura = {
  id: number
  no: string
  tarih: Date | string
  firmaAdi: string
  tutar: number
  irsaliyeSayisi: number
  irsaliyesiz: boolean
}

function Gonder({ sayi, tutar }: { sayi: number; tutar: number }) {
  const { pending } = useFormStatus()
  return (
    <button
      className="dugme-birincil"
      type="submit"
      disabled={pending || sayi === 0}
    >
      {pending
        ? 'Oluşturuluyor…'
        : `${sayi} faturayı müşavire gönder (${para(tutar)})`}
    </button>
  )
}

export function GonderimFormu({
  eylem,
  faturalar,
  musavirVarsayilan,
}: {
  eylem: FormEylemi
  faturalar: GonderilebilirFatura[]
  musavirVarsayilan: string
}) {
  const [hata, calistir] = useActionState(eylem, null)
  const [secili, setSecili] = useState<number[]>(faturalar.map((f) => f.id))

  const tumu = secili.length === faturalar.length && faturalar.length > 0
  const tutar = faturalar
    .filter((f) => secili.includes(f.id))
    .reduce((t, f) => t + f.tutar, 0)

  return (
    <form action={calistir} className="kart">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cizgi px-4 py-3">
        <h2 className="text-sm font-semibold">
          Gönderime hazır ({faturalar.length})
        </h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={tumu}
            onChange={() => setSecili(tumu ? [] : faturalar.map((f) => f.id))}
          />
          Hepsini seç
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="tablo">
          <thead>
            <tr>
              <th className="w-10"></th>
              <th className="w-32">Fatura no</th>
              <th className="w-28">Tarih</th>
              <th>Firma</th>
              <th className="w-28">İrsaliye</th>
              <th className="w-32 text-right">Tutar</th>
            </tr>
          </thead>
          <tbody>
            {faturalar.map((f) => (
              <tr key={f.id}>
                <td>
                  <input
                    type="checkbox"
                    name="fatura"
                    value={f.id}
                    checked={secili.includes(f.id)}
                    onChange={() =>
                      setSecili((s) =>
                        s.includes(f.id)
                          ? s.filter((x) => x !== f.id)
                          : [...s, f.id],
                      )
                    }
                  />
                </td>
                <td className="font-medium">{f.no}</td>
                <td className="tabular-nums">{tarih(f.tarih)}</td>
                <td>{f.firmaAdi}</td>
                <td className="text-soluk">
                  {f.irsaliyesiz ? 'yok' : `${f.irsaliyeSayisi} adet`}
                </td>
                <td className="text-right tabular-nums">{para(f.tutar)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-end gap-3 border-t border-cizgi px-4 py-4">
        <div className="min-w-[220px] flex-1">
          <label className="etiket" htmlFor="musavir">
            Müşavir
          </label>
          <input
            id="musavir"
            name="musavir"
            className="alan"
            defaultValue={musavirVarsayilan}
            placeholder="Mali müşavir adı"
          />
        </div>
        <div className="min-w-[220px] flex-1">
          <label className="etiket" htmlFor="not">
            Not
          </label>
          <input id="not" name="not" className="alan" />
        </div>
        <Gonder sayi={secili.length} tutar={tutar} />
      </div>

      {hata ? (
        <p className="mx-4 mb-4 rounded-md bg-red-zemin px-3 py-2 text-sm text-red">
          {hata}
        </p>
      ) : null}
    </form>
  )
}
