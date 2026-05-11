'use client'

import { Send } from 'lucide-react'
import { useFormState, useFormStatus } from 'react-dom'

import { enviarFeedbackAction, type FeedbackState } from '@/actions/feedback'
import { lunesDeSemana } from '@/lib/seguimiento'

const initial: FeedbackState = {}
const inputBase =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40 focus:border-vimet-orange'

function Btn() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-vimet-gradient text-white font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
    >
      <Send className="size-4" />
      {pending ? 'Enviando…' : 'Enviar feedback'}
    </button>
  )
}

type Existente = {
  semana_inicio: string
  estado_fisico: number | null
  animo: number | null
  energia: number | null
  adherencia_entrenamiento: number | null
  adherencia_alimentacion: number | null
  peso_autoreporte_kg: number | null
  observaciones: string | null
  dudas: string | null
}

export function FeedbackForm({ existente }: { existente: Existente | null }) {
  const [state, action] = useFormState(enviarFeedbackAction, initial)
  const semana = existente?.semana_inicio ?? lunesDeSemana()

  return (
    <form
      action={action}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6"
    >
      <input type="hidden" name="semana_inicio" value={semana} />

      {state.error ? (
        <div className="rounded-lg bg-vimet-red/10 border border-vimet-red/20 px-4 py-3 text-sm text-vimet-red">
          {state.error}
        </div>
      ) : null}
      {state.ok ? (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          ¡Gracias! Tu feedback fue guardado.
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ScaleField
          label="Estado físico"
          name="estado_fisico"
          defaultValue={existente?.estado_fisico ?? null}
        />
        <ScaleField label="Ánimo" name="animo" defaultValue={existente?.animo ?? null} />
        <ScaleField label="Energía" name="energia" defaultValue={existente?.energia ?? null} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <PercentField
          label="Adherencia al entrenamiento (%)"
          name="adherencia_entrenamiento"
          defaultValue={existente?.adherencia_entrenamiento ?? null}
        />
        <PercentField
          label="Adherencia a la alimentación (%)"
          name="adherencia_alimentacion"
          defaultValue={existente?.adherencia_alimentacion ?? null}
        />
        <label className="block text-sm">
          <span className="block font-medium text-gray-800 mb-1">Peso autoreporte (kg)</span>
          <input
            type="number"
            step="0.1"
            min="20"
            max="400"
            name="peso_autoreporte_kg"
            defaultValue={existente?.peso_autoreporte_kg ?? ''}
            className={inputBase}
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="block font-medium text-gray-800 mb-1">¿Cómo te sentiste esta semana?</span>
        <textarea
          name="observaciones"
          rows={4}
          defaultValue={existente?.observaciones ?? ''}
          className={inputBase}
        />
      </label>

      <label className="block text-sm">
        <span className="block font-medium text-gray-800 mb-1">Dudas / preguntas para tu equipo</span>
        <textarea
          name="dudas"
          rows={3}
          defaultValue={existente?.dudas ?? ''}
          className={inputBase}
        />
      </label>

      <Btn />
    </form>
  )
}

function ScaleField({
  label,
  name,
  defaultValue,
}: {
  label: string
  name: string
  defaultValue: number | null
}) {
  return (
    <label className="block text-sm">
      <span className="block font-medium text-gray-800 mb-1">{label} (1–10)</span>
      <input
        type="number"
        min={1}
        max={10}
        step={1}
        name={name}
        defaultValue={defaultValue ?? ''}
        className={inputBase}
      />
    </label>
  )
}

function PercentField({
  label,
  name,
  defaultValue,
}: {
  label: string
  name: string
  defaultValue: number | null
}) {
  return (
    <label className="block text-sm">
      <span className="block font-medium text-gray-800 mb-1">{label}</span>
      <input
        type="number"
        min={0}
        max={100}
        step={1}
        name={name}
        defaultValue={defaultValue ?? ''}
        className={inputBase}
      />
    </label>
  )
}
