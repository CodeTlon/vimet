'use client'

import { Clock, Plus, Trash2 } from 'lucide-react'
import { useFormState, useFormStatus } from 'react-dom'

import {
  agregarHorarioAction,
  eliminarHorarioAction,
  type HorarioState,
} from '@/actions/horarios'
import { useResetOnSuccess } from '@/components/seguimiento/use-reset-on-success'

export type Horario = {
  id: number
  dia_semana: number
  hora_inicio: string
  hora_fin: string
  modalidad: 'presencial' | 'virtual' | 'ambas'
  activo: boolean
}

// Orden de visualización: Lun → Dom (0 = domingo en Postgres).
const DIAS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
] as const

const MODALIDAD_LABEL: Record<Horario['modalidad'], string> = {
  presencial: 'Presencial',
  virtual: 'Virtual',
  ambas: 'Ambas',
}

const inputBase =
  'rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40 focus:border-vimet-orange'

function hhmm(t: string) {
  return t.slice(0, 5)
}

function AddBtn() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-lg bg-vimet-orange px-5 py-2 text-sm font-semibold text-white hover:bg-vimet-red transition-colors disabled:opacity-60"
    >
      <Plus className="size-4" />
      {pending ? 'Agregando…' : 'Agregar franja'}
    </button>
  )
}

export function HorariosEditor({ horarios }: { horarios: Horario[] }) {
  const [state, action] = useFormState<HorarioState, FormData>(agregarHorarioAction, {})
  const formRef = useResetOnSuccess(state)

  const porDia = new Map<number, Horario[]>()
  for (const h of horarios) {
    const arr = porDia.get(h.dia_semana) ?? []
    arr.push(h)
    porDia.set(h.dia_semana, arr)
  }

  return (
    <div className="space-y-6">
      {/* Agenda actual */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Agenda actual</h2>
        <div className="space-y-3">
          {DIAS.map((d) => {
            const franjas = (porDia.get(d.value) ?? []).sort((a, b) =>
              a.hora_inicio.localeCompare(b.hora_inicio),
            )
            return (
              <div
                key={d.value}
                className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 py-2 border-b border-gray-100 last:border-0"
              >
                <span className="w-24 shrink-0 text-sm font-medium text-gray-900">{d.label}</span>
                {franjas.length === 0 ? (
                  <span className="text-sm text-gray-400">No atiende</span>
                ) : (
                  <ul className="flex flex-wrap gap-2">
                    {franjas.map((f) => (
                      <li
                        key={f.id}
                        className="inline-flex items-center gap-2 rounded-full bg-vimet-cream border border-vimet-orange/20 pl-3 pr-1.5 py-1 text-sm text-gray-800"
                      >
                        <Clock className="size-3.5 text-vimet-orange shrink-0" />
                        <span className="font-medium">
                          {hhmm(f.hora_inicio)}–{hhmm(f.hora_fin)}
                        </span>
                        <span className="text-xs text-gray-500">{MODALIDAD_LABEL[f.modalidad]}</span>
                        <form action={eliminarHorarioAction}>
                          <input type="hidden" name="id" value={f.id} />
                          <button
                            type="submit"
                            aria-label="Eliminar franja"
                            className="inline-flex items-center justify-center size-6 rounded-full text-gray-400 hover:text-vimet-red hover:bg-white transition-colors"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Agregar franja */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Agregar franja horaria</h2>
        <p className="text-sm text-gray-500 mb-5">
          Elegí el día, el rango de horas y la modalidad en la que atendés.
        </p>

        <form ref={formRef} action={action} className="space-y-4">
          {state.error ? (
            <p className="text-sm text-red-600">{state.error}</p>
          ) : null}
          {state.ok ? (
            <p className="text-sm text-green-600">Franja agregada.</p>
          ) : null}

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <label className="block text-sm">
              <span className="block font-medium text-gray-700 mb-1">Día</span>
              <select name="dia_semana" defaultValue="1" className={`${inputBase} w-full`}>
                {DIAS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="block font-medium text-gray-700 mb-1">Desde</span>
              <input type="time" name="hora_inicio" defaultValue="09:00" required className={`${inputBase} w-full`} />
            </label>
            <label className="block text-sm">
              <span className="block font-medium text-gray-700 mb-1">Hasta</span>
              <input type="time" name="hora_fin" defaultValue="13:00" required className={`${inputBase} w-full`} />
            </label>
            <label className="block text-sm">
              <span className="block font-medium text-gray-700 mb-1">Modalidad</span>
              <select name="modalidad" defaultValue="ambas" className={`${inputBase} w-full`}>
                <option value="ambas">Ambas</option>
                <option value="presencial">Presencial</option>
                <option value="virtual">Virtual</option>
              </select>
            </label>
          </div>

          <AddBtn />
        </form>
      </div>
    </div>
  )
}
