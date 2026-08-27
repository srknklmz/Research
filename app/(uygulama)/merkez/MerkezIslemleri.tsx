'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import type { FormEylemi } from '@/lib/eylem'

function Dugme({ etiket, sinif }: { etiket: string; sinif: string }) {
  const { pending } = useFormStatus()
  return (
    <button className={sinif} type="submit" disabled={pending}>
      {pending ? '…' : etiket}
    </button>
  )
}

export function MerkezIslemleri({
  faturaId,
  onaylaEylem,
  reddetEylem,
}: {
  faturaId: number
  onaylaEylem: () => Promise<void>
  reddetEylem: FormEylemi
}) {
  const [hata, reddet] = useActionState(reddetEylem, null)
  const [acik, setAcik] = useState(false)

  if (acik) {
    return (
      <form action={reddet} className="flex flex-col items-end gap-2">
        <input
          name="not"
          className="alan w-full text-xs"
          placeholder="Geri gönderme sebebi"
          required
          aria-label={`${faturaId} numaralı fatura için geri gönderme sebebi`}
        />
        <div className="flex gap-2">
          <Dugme etiket="Geri gönder" sinif="dugme-red text-xs" />
          <button
            type="button"
            className="dugme-ikincil text-xs"
            onClick={() => setAcik(false)}
          >
            Vazgeç
          </button>
        </div>
        {hata ? <p className="text-xs text-red">{hata}</p> : null}
      </form>
    )
  }

  return (
    <div className="flex justify-end gap-2">
      <a
        href={`/cikti/fatura/${faturaId}`}
        className="dugme-ikincil text-xs"
        target="_blank"
        rel="noreferrer"
      >
        Çıktı
      </a>
      <button
        type="button"
        className="dugme-ikincil text-xs"
        onClick={() => setAcik(true)}
      >
        Geri gönder
      </button>
      <form action={onaylaEylem}>
        <Dugme etiket="Onayla" sinif="dugme-onay text-xs" />
      </form>
    </div>
  )
}
