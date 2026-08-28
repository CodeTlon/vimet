'use client'

import { Maximize2 } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'

import { Modal } from '@/components/ui/modal'
import { EvolutionChart } from './evolution-chart'

type Punto = { x: string; y: number | null }
type Serie = { label: string; color: string; data: Punto[] }

export function ExpandableChart({
  series,
  unit = '',
  title = 'Evolución',
  heading,
}: {
  series: Serie[]
  unit?: string
  title?: string
  heading?: ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="font-heading font-semibold text-gray-900">{heading ?? title}</h3>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="shrink-0 rounded-full border border-gray-200 p-1.5 text-gray-500 hover:text-vimet-orange hover:border-vimet-orange/40"
          aria-label="Ampliar gráfico"
        >
          <Maximize2 className="size-4" />
        </button>
      </div>
      <EvolutionChart series={series} unit={unit} />

      <Modal open={open} onClose={() => setOpen(false)} title={title} size="lg">
        <EvolutionChart series={series} unit={unit} height={320} />
      </Modal>
    </div>
  )
}
