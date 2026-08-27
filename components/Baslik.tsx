export function Baslik({
  baslik,
  aciklama,
  children,
}: {
  baslik: string
  aciklama?: string
  children?: React.ReactNode
}) {
  return (
    <header className="yazdirma-gizle flex flex-wrap items-end justify-between gap-3 border-b border-cizgi bg-yuzey px-6 py-4">
      <div>
        <h1 className="text-base font-semibold tracking-tight">{baslik}</h1>
        {aciklama ? (
          <p className="mt-0.5 text-sm text-soluk">{aciklama}</p>
        ) : null}
      </div>
      {children ? <div className="flex items-center gap-2">{children}</div> : null}
    </header>
  )
}
