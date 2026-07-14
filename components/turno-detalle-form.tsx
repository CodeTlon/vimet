'use client'

import { Check, CheckCheck, UserX, X } from 'lucide-react'
import { useFormState, useFormStatus } from 'react-dom'

import { actualizarTurnoStaffAction, type TurnoState } from '@/actions/turnos'
import { useAutoHideMessage, useScrollToMessage } from '@/components/seguimiento/use-reset-on-success'

const initialState: TurnoState = {}

const ACTIONS = [
  { value: 'confirmado', label: 'Confirmar', icon: Check, className: 'bg-green-600 hover:bg-green-700 text-white' },
  { value: 'completado', label: 'Completado', icon: CheckCheck, className: 'bg-vimet-gradient text-white' },
  { value: 'no_asistio', label: 'No asistió', icon: UserX, className: 'bg-yellow-500 hover:bg-yellow-600 text-white' },
  { value: 'cancelado', label: 'Cancelar', icon: X, className: 'bg-red-600 hover:bg-red-700 text-white' },
] as const

function StateButtons({ disableConfirm }: { disableConfirm: boolean }) {
  const { pending } = useFormStatus()
  return (
    <div className="flex flex-wrap gap-2">
      {ACTIONS.map((a) => {
        if (a.value === 'confirmado' && disableConfirm) return null
        return (
          <button
            key={a.value}
            type="submit"
            name="estado"
            value={a.value}
            disabled={pending}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold shadow-sm transition-all disabled:opacity-50 ${a.className}`}
          >
            <a.icon className="size-4" /> {a.label}
          </button>
        )
      })}
    </div>
  )
}

export function TurnoDetalleForm({
  id,
  estadoActual,
  notas,
}: {
  id: number
  estadoActual: string
  notas: string | null
}) {
  const [state, formAction] = useFormState(actualizarTurnoStaffAction, initialState)
  const msgRef = useScrollToMessage(state)
  const visible = useAutoHideMessage(state)
  const editable = ['pendiente', 'confirmado'].includes(estadoActual)

  if (!editable) {
    return (
      <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-4 py-3">
        Este turno está cerrado y no puede modificarse.
      </p>
    )
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={id} />

      <div ref={msgRef}>
        {visible && state.error ? (
          <div role="alert" className="rounded-lg bg-vimet-red/10 border border-vimet-red/20 px-4 py-3 text-sm text-vimet-red">
            {state.error}
          </div>
        ) : null}
        {visible && state.ok ? (
          <div role="status" className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            Turno actualizado correctamente.
          </div>
        ) : null}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-800 mb-1.5">
          Notas profesionales
        </label>
        <textarea
          name="notas_profesional"
          rows={4}
          defaultValue={notas ?? ''}
          placeholder="Notas internas sobre el turno (no visibles al paciente)"
          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40 focus:border-vimet-orange resize-none"
        />
      </div>

      <StateButtons disableConfirm={estadoActual === 'confirmado'} />
    </form>
  )
}
