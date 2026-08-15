'use client'

import { useTransition } from 'react'

import { cambiarEstadoObjetivoAction } from '@/actions/objetivos'
import { Select } from '@/components/ui/select'
import {
  ESTADO_OBJETIVO_BADGE,
  ESTADO_OBJETIVO_LABEL,
} from '@/lib/seguimiento'

const OPCIONES = Object.entries(ESTADO_OBJETIVO_LABEL).map(([k, v]) => ({ value: k, label: v }))

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
    <div className={`inline-flex rounded-full ${ESTADO_OBJETIVO_BADGE[estado]}`}>
      <Select
        value={estado}
        disabled={pending}
        options={OPCIONES}
        onChange={(nuevoEstado) => {
          const fd = new FormData()
          fd.set('id', String(id))
          fd.set('paciente_id', pacienteId)
          fd.set('estado', nuevoEstado)
          start(async () => {
            await cambiarEstadoObjetivoAction(fd)
          })
        }}
        triggerClassName="flex items-center gap-1 bg-transparent rounded-full text-xs font-semibold pl-3 pr-2.5 py-1.5 border-0 cursor-pointer focus:outline-none disabled:opacity-60"
        valueClassName="text-current"
      />
    </div>
  )
}
