'use client'

import { Plus } from 'lucide-react'
import { useFormState, useFormStatus } from 'react-dom'

import { crearEvaluacionAction, type EvalState } from '@/actions/evaluaciones'
import { useResetOnSuccess, useScrollToMessage } from '@/components/seguimiento/use-reset-on-success'
import { hoyArgentina } from '@/lib/datetime'
import { TESTS_FUNCIONALES } from '@/lib/seguimiento'

const initial: EvalState = {}
const inputBase =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40 focus:border-vimet-orange'

function Btn() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-vimet-gradient text-white font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
    >
      <Plus className="size-4" />
      {pending ? 'Guardando…' : 'Registrar evaluación'}
    </button>
  )
}

export function EvaluacionForm({ pacienteId }: { pacienteId: string }) {
  const [state, action] = useFormState(crearEvaluacionAction, initial)
  const formRef = useResetOnSuccess(state)
  const msgRef = useScrollToMessage(state)
  const today = hoyArgentina()
  return (
    <form
      ref={formRef}
      action={action}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4"
    >
      <input type="hidden" name="paciente_id" value={pacienteId} />
      <h3 className="font-heading font-semibold text-gray-900">Nueva evaluación funcional</h3>

      <div ref={msgRef}>
        {state.error ? (
          <div className="rounded-lg bg-vimet-red/10 border border-vimet-red/20 px-4 py-2 text-sm text-vimet-red">
            {state.error}
          </div>
        ) : null}
        {state.ok ? (
          <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-700">
            Evaluación registrada.
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <label className="block">
          <span className="block min-h-10 font-medium text-gray-800 mb-1">Fecha</span>
          <input type="date" name="fecha" defaultValue={today} max={today} className={inputBase} required />
        </label>
        {TESTS_FUNCIONALES.map((t) => (
          <label key={t.key} className="block">
            <span className="block min-h-10 font-medium text-gray-800 mb-1">
              {t.label} <span className="text-gray-400">/ {t.max}</span>
            </span>
            <input
              type="number"
              min={0}
              max={t.max}
              name={t.key}
              placeholder={`0–${t.max}`}
              className={inputBase}
            />
          </label>
        ))}
      </div>

      <label className="block text-sm">
        <span className="block font-medium text-gray-800 mb-1">Observaciones</span>
        <textarea name="observaciones" rows={3} placeholder="Notas de la evaluación (opcional)" className={inputBase} />
      </label>

      <Btn />
    </form>
  )
}
