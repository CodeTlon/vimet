'use client'

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
      className={`rounded-full text-xs font-semibold px-3 py-1.5 border-0 cursor-pointer ${
        ESTADO_OBJETIVO_BADGE[estado]
      } disabled:opacity-60`}
    >
      {Object.entries(ESTADO_OBJETIVO_LABEL).map(([k, v]) => (
        <option key={k} value={k}>
          {v}
        </option>
      ))}
    </select>
  )
}
