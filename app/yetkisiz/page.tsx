import Link from 'next/link'

export default function YetkisizSayfasi() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="kart max-w-md p-8 text-center">
        <h1 className="text-base font-semibold">Bu sayfaya erişiminiz yok</h1>
        <p className="mt-2 text-sm text-soluk">
          Bu bölüm başka bir rol için ayrılmış. Gerekiyorsa yöneticinizden yetki
          isteyin.
        </p>
        <Link href="/" className="dugme-ikincil mt-5">
          Panoya dön
        </Link>
      </div>
    </div>
  )
}
