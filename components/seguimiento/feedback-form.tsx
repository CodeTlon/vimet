'use client'

import { Send } from 'lucide-react'
import { useFormState, useFormStatus } from 'react-dom'

import { enviarFeedbackAction, type FeedbackState } from '@/actions/feedback'
import { useScrollToMessage } from '@/components/seguimiento/use-reset-on-success'
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

// Solo se renderiza para la semana actual cuando todavía no se envió nada
// (ver app/(paciente)/feedback-semanal/page.tsx) — por eso no recibe valores
// existentes: una vez enviado, esa semana pasa a mostrarse en modo solo lectura.
export function FeedbackForm() {
  const [state, action] = useFormState(enviarFeedbackAction, initial)
  const msgRef = useScrollToMessage(state)
  const semana = lunesDeSemana()

  return (
    <form
      action={action}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6"
    >
      <input type="hidden" name="semana_inicio" value={semana} />

      <div ref={msgRef}>
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
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ScaleField label="Estado físico" name="estado_fisico" />
        <ScaleField label="Ánimo" name="animo" />
        <ScaleField label="Energía" name="energia" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <PercentField label="Adherencia al entrenamiento (%)" name="adherencia_entrenamiento" />
        <PercentField label="Adherencia a la alimentación (%)" name="adherencia_alimentacion" />
        <label className="block text-sm">
          <span className="block font-medium text-gray-800 mb-1">Peso autoreporte (kg)</span>
          <input
            type="number"
            step="0.1"
            min="20"
            max="400"
            name="peso_autoreporte_kg"
            placeholder="Ej: 72.5"
            className={inputBase}
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="block font-medium text-gray-800 mb-1">¿Cómo te sentiste esta semana?</span>
        <textarea
          name="observaciones"
          rows={4}
          placeholder="Contanos cómo te fue con el plan, energía, descanso, dificultades…"
          className={inputBase}
        />
      </label>

      {/* Adjunto */}
      <div className="block text-sm">
        <span className="block font-medium text-gray-800 mb-1">Foto o adjunto (opcional)</span>
        <input
          type="file"
          name="adjunto"
          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
          className="w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-vimet-cream file:text-vimet-orange hover:file:bg-vimet-orange/10 cursor-pointer"
        />
        <span className="text-xs text-gray-400 mt-1 block">
          JPG, PNG, WEBP, GIF, PDF · máx 15 MB
        </span>
      </div>

      <Btn />
    </form>
  )
}

function ScaleField({ label, name }: { label: string; name: string }) {
  return (
    <label className="block text-sm">
      <span className="block font-medium text-gray-800 mb-1">{label} (1–10)</span>
      <input type="number" min={1} max={10} step={1} name={name} placeholder="1–10" className={inputBase} />
    </label>
  )
}

function PercentField({ label, name }: { label: string; name: string }) {
  return (
    <label className="block text-sm">
      <span className="block font-medium text-gray-800 mb-1">{label}</span>
      <input type="number" min={0} max={100} step={1} name={name} placeholder="0–100" className={inputBase} />
    </label>
  )
}
