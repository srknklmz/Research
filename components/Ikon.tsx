const YOLLAR: Record<string, string> = {
  pano: 'M3 3h7v7H3zM14 3h7v4h-7zM14 10h7v11h-7zM3 14h7v7H3z',
  irsaliye: 'M8 3h8l4 4v14H4V3zM16 3v5h4M8 12h8M8 16h5',
  fatura: 'M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2zM9 8h6M9 12h6',
  eslestir: 'M4 7h6M4 17h6M14 7h6M14 17h6M10 7l4 10M10 17l4-10',
  imza: 'M3 18c4 0 5-12 9-12s2 9 5 9 4-3 4-3M3 21h18',
  merkez: 'M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6',
  aktar: 'M12 3v12M8 11l4 4 4-4M4 19h16',
  ayar: 'M12 15a3 3 0 100-6 3 3 0 000 6zM4 12h2M18 12h2M12 4v2M12 18v2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M17.7 6.3l-1.4 1.4M7.7 16.3l-1.4 1.4',
  cikis: 'M15 12H4M8 8l-4 4 4 4M14 4h5v16h-5',
}

export function Ikon({ ad, className = 'h-4 w-4' }: { ad: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={YOLLAR[ad] ?? ''} />
    </svg>
  )
}
