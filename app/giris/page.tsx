import { redirect } from 'next/navigation'
import { oturumKullanici } from '@/lib/oturum'
import { GirisFormu } from './GirisFormu'

export default async function GirisSayfasi() {
  if (await oturumKullanici()) redirect('/')

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-lg font-semibold tracking-tight">İrsaliye – Fatura</h1>
          <p className="mt-1 text-sm text-soluk">
            Şantiye evrak akışı
          </p>
        </div>

        <div className="kart p-6">
          <GirisFormu />
        </div>
      </div>
    </div>
  )
}
