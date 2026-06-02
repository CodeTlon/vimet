'use client'

import { Download } from 'lucide-react'
import { useTransition, useState } from 'react'

import { obtenerUrlPlanAction } from '@/actions/planes'

export function PlanDownloadButton({ planId }: { planId: number }) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <button
      type="button"
      onClick={() => {
        setError(null)
        const fd = new FormData()
        fd.set('id', String(planId))
        start(async () => {
          const res = await obtenerUrlPlanAction(fd)
          if (res.error || !res.url) {
            setError(res.error ?? 'Error')
            return
          }
          window.open(res.url, '_blank', 'noopener,noreferrer')
        })
      }}
      disabled={pending}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-vimet-gradient text-white text-sm font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-50"
      aria-label="Descargar PDF"
    >
      <Download className="size-4" />
      {pending ? 'Generando…' : 'Ver PDF'}
      {error ? <span className="ml-2 text-xs text-white/80">({error})</span> : null}
    </button>
  )
}
