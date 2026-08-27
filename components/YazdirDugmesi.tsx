'use client'

export function YazdirDugmesi() {
  return (
    <button className="dugme-birincil" type="button" onClick={() => window.print()}>
      Yazdır
    </button>
  )
}
