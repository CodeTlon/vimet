'use client'

import { Plus, Save } from 'lucide-react'
import { useEffect } from 'react'
import { useFormState, useFormStatus } from 'react-dom'

import {
  actualizarEvaluacionAction,
  crearEvaluacionAction,
  type EvalState,
} from '@/actions/evaluaciones'
import {
  useAutoHideMessage,
  useResetOnSuccess,
  useScrollToMessage,
} from '@/components/seguimiento/use-reset-on-success'
import { haceDiasArgentina, hoyArgentina } from '@/lib/datetime'
import { TESTS_FUNCIONALES } from '@/lib/seguimiento'

const initial: EvalState = {}
const inputBase =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40 focus:border-vimet-orange resize-none'

type Evaluacion = {
  id: number
  fecha: string
  test_wells_adams: number | null
  test_thomas: number | null
  test_dorsiflexion: number | null
  test_sentadilla: number | null
  test_estabilidad: number | null
  fuerza_inferior: number | null
  fuerza_superior: number | null
  resistencia_metabolica: number | null
  observaciones: string | null
}

function Btn({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-vimet-gradient text-white font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
    >
      {editing ? <Save className="size-4" /> : <Plus className="size-4" />}
      {pending ? 'Guardando…' : editing ? 'Guardar cambios' : 'Registrar evaluación'}
    </button>
  )
}

export function EvaluacionForm({
  pacienteId,
  evaluacion,
  onCancel,
}: {
  pacienteId: string
  evaluacion?: Evaluacion
  onCancel?: () => void
}) {
  const editing = Boolean(evaluacion)
  const [state, action] = useFormState(
    editing ? actualizarEvaluacionAction : crearEvaluacionAction,
    initial,
  )
  const formRef = useResetOnSuccess(state)
  const msgRef = useScrollToMessage(state)
  const visible = useAutoHideMessage(state)
  const today = hoyArgentina()
  const hace14Dias = haceDiasArgentina(14)

  useEffect(() => {
    if (editing && state.ok) onCancel?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  return (
    <form
      ref={editing ? undefined : formRef}
      action={action}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4"
    >
      <input type="hidden" name="paciente_id" value={pacienteId} />
      {editing ? <input type="hidden" name="id" value={evaluacion!.id} /> : null}
      {!editing ? (
        <h3 className="font-heading font-semibold text-gray-900">Nueva evaluación funcional</h3>
      ) : null}

      <div ref={msgRef}>
        {visible && state.error ? (
          <div className="rounded-lg bg-vimet-red/10 border border-vimet-red/20 px-4 py-2 text-sm text-vimet-red">
            {state.error}
          </div>
        ) : null}
        {visible && state.ok && !editing ? (
          <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-700">
            Evaluación registrada.
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <label className="block">
          <span className="block min-h-10 font-medium text-gray-800 mb-1">Fecha</span>
          <input
            type="date"
            name="fecha"
            defaultValue={evaluacion?.fecha ?? today}
            min={hace14Dias}
            max={today}
            className={inputBase}
            required
          />
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
              defaultValue={evaluacion ? ((evaluacion as unknown as Record<string, number | null>)[t.key] ?? '') : ''}
              placeholder={`0–${t.max}`}
              className={inputBase}
            />
          </label>
        ))}
      </div>

      <label className="block text-sm">
        <span className="block font-medium text-gray-800 mb-1">Observaciones</span>
        <textarea
          name="observaciones"
          rows={3}
          defaultValue={evaluacion?.observaciones ?? ''}
          placeholder="Notas de la evaluación (opcional)"
          className={inputBase}
        />
      </label>

      <div className="flex items-center gap-3">
        <Btn editing={editing} />
        {editing ? (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            Cancelar
          </button>
        ) : null}
      </div>
    </form>
  )
}
