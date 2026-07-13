'use client'

import { CheckCheck } from 'lucide-react'
import { useFormState, useFormStatus } from 'react-dom'

import { responderFeedbackAction, type FeedbackState } from '@/actions/feedback'
import { useRemountKeyOnSuccess, useScrollToMessage } from '@/components/seguimiento/use-reset-on-success'

const initial: FeedbackState = {}
const inputBase =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40 focus:border-vimet-orange'

function Btn() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-vimet-gradient text-white text-sm font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-50"
    >
      <CheckCheck className="size-4" />
      {pending ? 'Enviando…' : 'Enviar respuesta'}
    </button>
  )
}

export function ResponderFeedbackForm({
  id,
  pacienteId,
  respuestaActual,
}: {
  id: number
  pacienteId: string
  respuestaActual: string | null
}) {
  const [state, action] = useFormState(responderFeedbackAction, initial)
  const remountKey = useRemountKeyOnSuccess(state)
  const msgRef = useScrollToMessage(state)
  return (
    <form key={remountKey} action={action} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="paciente_id" value={pacienteId} />

      <div ref={msgRef}>
        {state.error ? (
          <div className="rounded-lg bg-vimet-red/10 border border-vimet-red/20 px-3 py-2 text-xs text-vimet-red">
            {state.error}
          </div>
        ) : null}
        {state.ok ? (
          <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700">
            Respuesta enviada.
          </div>
        ) : null}
      </div>

      <textarea
        name="respuesta_profesional"
        rows={3}
        defaultValue={respuestaActual ?? ''}
        required
        className={inputBase}
        placeholder="Respondé las dudas del paciente…"
      />
      <Btn />
    </form>
  )
}
