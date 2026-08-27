'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Ikon } from './Ikon'

export type GezinmeOgesi = {
  yol: string
  ad: string
  ikon: string
  sayac?: number
}

export function Gezinme({ ogeler }: { ogeler: GezinmeOgesi[] }) {
  const yol = usePathname()
  return (
    <nav className="flex flex-col gap-0.5">
      {ogeler.map((o) => {
        const etkin = o.yol === '/' ? yol === '/' : yol.startsWith(o.yol)
        return (
          <Link
            key={o.yol}
            href={o.yol}
            className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
              etkin
                ? 'bg-vurgu-acik font-medium text-vurgu'
                : 'text-metin hover:bg-kagit'
            }`}
          >
            <Ikon ad={o.ikon} />
            <span className="flex-1">{o.ad}</span>
            {o.sayac ? (
              <span className="rounded-full bg-bekliyor-zemin px-1.5 py-0.5 text-[11px] font-semibold text-bekliyor">
                {o.sayac}
              </span>
            ) : null}
          </Link>
        )
      })}
    </nav>
  )
}
