'use client'

import { ChevronDown } from 'lucide-react'
import { useTransition } from 'react'

import { cambiarEstadoObjetivoAction } from '@/actions/objetivos'
import {
  ESTADO_OBJETIVO_BADGE,
  ESTADO_OBJETIVO_LABEL,
} from '@/lib/seguimiento'

export function ObjetivoEstadoSelect({
  id,
  pacienteId,
  estado,
}: {
  id: number
  pacienteId: string
  estado: keyof typeof ESTADO_OBJETIVO_LABEL
}) {
  const [pending, start] = useTransition()
  return (
    <div className={`relative inline-flex rounded-full ${ESTADO_OBJETIVO_BADGE[estado]}`}>
      <select
        defaultValue={estado}
        disabled={pending}
        onChange={(e) => {
          const fd = new FormData()
          fd.set('id', String(id))
          fd.set('paciente_id', pacienteId)
          fd.set('estado', e.currentTarget.value)
          start(async () => {
            await cambiarEstadoObjetivoAction(fd)
          })
        }}
        className="appearance-none bg-transparent rounded-full text-xs font-semibold pl-3 pr-7 py-1.5 border-0 cursor-pointer focus:outline-none disabled:opacity-60"
      >
        {Object.entries(ESTADO_OBJETIVO_LABEL).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3.5" />
    </div>
  )
}
