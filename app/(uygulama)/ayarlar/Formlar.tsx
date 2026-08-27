'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import type { FormEylemi } from '@/lib/eylem'

function Dugme({ etiket, sinif = 'dugme-birincil' }: { etiket: string; sinif?: string }) {
  const { pending } = useFormStatus()
  return (
    <button className={sinif} type="submit" disabled={pending}>
      {pending ? 'Kaydediliyor…' : etiket}
    </button>
  )
}

function Bildirim({ mesaj }: { mesaj: string | null | undefined }) {
  if (!mesaj) return null
  const iyi = /kaydedildi|eklendi|değiştirildi|sıfırlandı/i.test(mesaj)
  return (
    <p
      className={`rounded-md px-3 py-2 text-sm ${
        iyi ? 'bg-onayli-zemin text-onayli' : 'bg-red-zemin text-red'
      }`}
    >
      {mesaj}
    </p>
  )
}

export function AyarFormu({
  eylem,
  baslangic,
}: {
  eylem: FormEylemi
  baslangic: Record<string, string>
}) {
  const [mesaj, calistir] = useActionState(eylem, null)

  return (
    <form action={calistir} className="flex flex-col gap-3">
      {(
        [
          ['sirket_adi', 'Şirket adı', 'Çıktıların başlığında görünür'],
          ['santiye_adi', 'Şantiye adı', ''],
          ['musavir_adi', 'Müşavir', 'Gönderim formunda öntanımlı gelir'],
        ] as const
      ).map(([anahtar, etiket, ipucu]) => (
        <div key={anahtar}>
          <label className="etiket" htmlFor={anahtar}>
            {etiket}
          </label>
          <input
            id={anahtar}
            name={anahtar}
            className="alan"
            defaultValue={baslangic[anahtar] ?? ''}
          />
          {ipucu ? <p className="mt-1 text-xs text-soluk">{ipucu}</p> : null}
        </div>
      ))}
      <Bildirim mesaj={mesaj} />
      <div>
        <Dugme etiket="Ayarları kaydet" />
      </div>
    </form>
  )
}

export function KullaniciEkleFormu({
  eylem,
  roller,
}: {
  eylem: FormEylemi
  roller: [string, string][]
}) {
  const [mesaj, calistir] = useActionState(eylem, null)

  return (
    <form action={calistir} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="etiket" htmlFor="yk-ad">
            Ad soyad
          </label>
          <input id="yk-ad" name="ad" className="alan" required />
        </div>
        <div>
          <label className="etiket" htmlFor="yk-eposta">
            E-posta
          </label>
          <input id="yk-eposta" name="eposta" type="email" className="alan" required />
        </div>
        <div>
          <label className="etiket" htmlFor="yk-rol">
            Rol
          </label>
          <select id="yk-rol" name="rol" className="alan" defaultValue="SANTIYE">
            {roller.map(([d, ad]) => (
              <option key={d} value={d}>
                {ad}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="etiket" htmlFor="yk-parola">
            Geçici parola
          </label>
          <input
            id="yk-parola"
            name="parola"
            type="text"
            className="alan"
            minLength={8}
            required
          />
        </div>
      </div>
      <Bildirim mesaj={mesaj} />
      <div>
        <Dugme etiket="Kullanıcı ekle" />
      </div>
    </form>
  )
}

export function ParolaFormu({ eylem }: { eylem: FormEylemi }) {
  const [mesaj, calistir] = useActionState(eylem, null)

  return (
    <form action={calistir} className="flex max-w-md flex-col gap-3">
      <div>
        <label className="etiket" htmlFor="p-eski">
          Mevcut parola
        </label>
        <input
          id="p-eski"
          name="eski"
          type="password"
          autoComplete="current-password"
          className="alan"
          required
        />
      </div>
      <div>
        <label className="etiket" htmlFor="p-yeni">
          Yeni parola
        </label>
        <input
          id="p-yeni"
          name="yeni"
          type="password"
          autoComplete="new-password"
          className="alan"
          minLength={8}
          required
        />
      </div>
      <div>
        <label className="etiket" htmlFor="p-tekrar">
          Yeni parola (tekrar)
        </label>
        <input
          id="p-tekrar"
          name="tekrar"
          type="password"
          autoComplete="new-password"
          className="alan"
          minLength={8}
          required
        />
      </div>
      <Bildirim mesaj={mesaj} />
      <div>
        <Dugme etiket="Parolamı değiştir" />
      </div>
    </form>
  )
}

export function ParolaSifirlaFormu({ eylem }: { eylem: FormEylemi }) {
  const [mesaj, calistir] = useActionState(eylem, null)

  return (
    <form action={calistir} className="flex items-center gap-2">
      <input
        name="parola"
        type="text"
        className="alan w-40 text-xs"
        placeholder="yeni parola"
        minLength={8}
        required
        aria-label="Yeni parola"
      />
      <Dugme etiket="Sıfırla" sinif="dugme-ikincil text-xs" />
      {mesaj ? <span className="text-xs text-soluk">{mesaj}</span> : null}
    </form>
  )
}
