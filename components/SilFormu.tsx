'use client'

import { useFormStatus } from 'react-dom'

function Dugme({ etiket }: { etiket: string }) {
  const { pending } = useFormStatus()
  return (
    <button className="dugme-red" type="submit" disabled={pending}>
      {pending ? 'Siliniyor…' : etiket}
    </button>
  )
}

export function SilFormu({
  eylem,
  onay,
  etiket = 'Sil',
}: {
  eylem: () => Promise<void>
  onay: string
  etiket?: string
}) {
  return (
    <form
      action={eylem}
      onSubmit={(e) => {
        if (!confirm(onay)) e.preventDefault()
      }}
    >
      <Dugme etiket={etiket} />
    </form>
  )
}
