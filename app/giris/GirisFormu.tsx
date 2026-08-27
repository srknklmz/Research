'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { girisYap } from './eylemler'

function Gonder() {
  const { pending } = useFormStatus()
  return (
    <button className="dugme-birincil w-full" type="submit" disabled={pending}>
      {pending ? 'Kontrol ediliyor…' : 'Giriş yap'}
    </button>
  )
}

export function GirisFormu() {
  const [hata, eylem] = useActionState(girisYap, null)

  return (
    <form action={eylem} className="flex flex-col gap-4">
      <div>
        <label className="etiket" htmlFor="eposta">
          E-posta
        </label>
        <input
          id="eposta"
          name="eposta"
          type="email"
          autoComplete="username"
          className="alan"
          required
          autoFocus
        />
      </div>

      <div>
        <label className="etiket" htmlFor="parola">
          Parola
        </label>
        <input
          id="parola"
          name="parola"
          type="password"
          autoComplete="current-password"
          className="alan"
          required
        />
      </div>

      {hata ? (
        <p className="rounded-md bg-red-zemin px-3 py-2 text-sm text-red">
          {hata}
        </p>
      ) : null}

      <Gonder />
    </form>
  )
}
