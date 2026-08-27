'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import type { FormEylemi } from '@/lib/eylem'

function Dugme({ etiket, sinif }: { etiket: string; sinif: string }) {
  const { pending } = useFormStatus()
  return (
    <button className={sinif} type="submit" disabled={pending}>
      {pending ? 'İşleniyor…' : etiket}
    </button>
  )
}

export function ImzaFormu({
  imzalaEylem,
  reddetEylem,
  kullaniciAdi,
}: {
  imzalaEylem: FormEylemi
  reddetEylem: FormEylemi
  kullaniciAdi: string
}) {
  const [imzaHatasi, imzala] = useActionState(imzalaEylem, null)
  const [redHatasi, reddet] = useActionState(reddetEylem, null)
  const [redAcik, setRedAcik] = useState(false)

  return (
    <div className="flex flex-col gap-4">
      <section className="kart p-4">
        <h2 className="text-sm font-semibold">İmzala</h2>
        <p className="mt-1 text-xs text-soluk">
          İmzaladığınızda faturanın ve bağlı irsaliyelerin o anki hali
          adınıza, tarih–saat ve parmak iziyle birlikte kayda geçer. Kayıt
          silinemez.
        </p>

        <form action={imzala} className="mt-3 flex flex-col gap-3">
          <div>
            <label className="etiket" htmlFor="imza-not">
              Not (isteğe bağlı)
            </label>
            <input id="imza-not" name="not" className="alan" />
          </div>

          {imzaHatasi ? (
            <p className="rounded-md bg-red-zemin px-3 py-2 text-sm text-red">
              {imzaHatasi}
            </p>
          ) : null}

          <Dugme
            etiket={`${kullaniciAdi} olarak imzala`}
            sinif="dugme-onay w-full"
          />
        </form>
      </section>

      <section className="kart p-4">
        {!redAcik ? (
          <button
            type="button"
            className="dugme-red w-full"
            onClick={() => setRedAcik(true)}
          >
            Şantiyeye geri gönder
          </button>
        ) : (
          <form action={reddet} className="flex flex-col gap-3">
            <div>
              <label className="etiket" htmlFor="red-not">
                Sebep (zorunlu)
              </label>
              <textarea
                id="red-not"
                name="not"
                className="alan"
                rows={3}
                required
                placeholder="Örn: İrsaliye eksik, miktar faturayla uyuşmuyor"
              />
            </div>

            {redHatasi ? (
              <p className="rounded-md bg-red-zemin px-3 py-2 text-sm text-red">
                {redHatasi}
              </p>
            ) : null}

            <div className="flex gap-2">
              <Dugme etiket="Geri gönder" sinif="dugme-red" />
              <button
                type="button"
                className="dugme-ikincil"
                onClick={() => setRedAcik(false)}
              >
                Vazgeç
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}
