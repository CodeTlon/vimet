'use client'

import { Maximize2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { EvolutionChart } from './evolution-chart'

type Punto = { x: string; y: number | null }
type Serie = { label: string; color: string; data: Punto[] }

export function ExpandableChart({ series, unit = '' }: { series: Serie[]; unit?: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="absolute top-5 right-5 z-10 rounded-full bg-white/90 border border-gray-200 p-1.5 text-gray-500 hover:text-vimet-orange hover:border-vimet-orange/40"
        aria-label="Ampliar gráfico"
      >
        <Maximize2 className="size-4" />
      </button>
      <EvolutionChart series={series} unit={unit} />

      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === ref.current) setOpen(false)
        }}
        className="backdrop:bg-black/60 rounded-none sm:rounded-2xl p-0 w-full h-full sm:h-auto sm:max-w-2xl m-0 sm:m-auto print:hidden"
      >
        <div className="p-4 flex flex-col h-full sm:h-auto">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="self-end text-gray-400 hover:text-gray-700 mb-2"
            aria-label="Cerrar"
          >
            <X className="size-5" />
          </button>
          <div className="flex-1 flex items-center">
            <EvolutionChart series={series} unit={unit} height={320} />
          </div>
        </div>
      </dialog>
    </div>
  )
}
