import { gerekliKullanici } from '@/lib/oturum'

export default async function CiktiDuzeni({
  children,
}: {
  children: React.ReactNode
}) {
  await gerekliKullanici()
  return <div className="mx-auto max-w-[820px] px-6 py-8 print:px-0 print:py-0">{children}</div>
}
