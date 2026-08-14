'use client'

import { Maximize2 } from 'lucide-react'
import { useState } from 'react'

import { Modal } from '@/components/ui/modal'
import { EvolutionChart } from './evolution-chart'

type Punto = { x: string; y: number | null }
type Serie = { label: string; color: string; data: Punto[] }

export function ExpandableChart({
  series,
  unit = '',
  title = 'Evolución',
}: {
  series: Serie[]
  unit?: string
  title?: string
}) {
  const [open, setOpen] = useState(false)

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

      <Modal open={open} onClose={() => setOpen(false)} title={title} size="lg">
        <EvolutionChart series={series} unit={unit} height={320} />
      </Modal>
    </div>
  )
}
