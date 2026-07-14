'use client'

import { Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'

import {
  editarMensajeFeedbackAction,
  enviarMensajeFeedbackAction,
  type FeedbackState,
} from '@/actions/feedback'
import { useResetOnSuccess } from '@/components/seguimiento/use-reset-on-success'

export type MensajeFeedback = {
  id: number
  autor_id: string
  contenido: string
  created_at: string
  edited_at: string | null
  autor: { nombre: string; apellido: string } | null
}

function formatHora(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function SendBtn() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label="Enviar"
      className="inline-flex items-center justify-center size-9 rounded-full bg-vimet-orange text-white hover:bg-vimet-red transition-colors disabled:opacity-60 shrink-0"
    >
      <Send className="size-4" />
    </button>
  )
}

function Composer({ feedbackId }: { feedbackId: number }) {
  const [state, action] = useFormState<FeedbackState, FormData>(enviarMensajeFeedbackAction, {})
  const formRef = useResetOnSuccess(state)

  return (
    <form ref={formRef} action={action} className="pt-3">
      <input type="hidden" name="feedback_id" value={feedbackId} />
      <div className="flex items-end gap-2">
        <textarea
          name="contenido"
          required
          rows={1}
          placeholder="Escribí un mensaje…"
          className="flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40 focus:border-vimet-orange"
        />
        <SendBtn />
      </div>
      {state.error ? <p className="text-xs text-red-600 mt-1">{state.error}</p> : null}
    </form>
  )
}

function EditarMensajeForm({ mensaje, onDone }: { mensaje: MensajeFeedback; onDone: () => void }) {
  const [state, action] = useFormState<FeedbackState, FormData>(editarMensajeFeedbackAction, {})

  useEffect(() => {
    if (state.ok) onDone()
  }, [state, onDone])

  return (
    <form action={action} className="space-y-1.5">
      <input type="hidden" name="id" value={mensaje.id} />
      <textarea
        name="contenido"
        defaultValue={mensaje.contenido}
        required
        rows={2}
        className="w-full resize-none rounded-lg border border-white/40 bg-white/10 px-2 py-1.5 text-sm placeholder:text-white/60 focus:outline-none"
      />
      <div className="flex items-center gap-3 text-xs">
        <button type="submit" className="font-semibold underline">
          Guardar
        </button>
        <button type="button" onClick={onDone} className="underline">
          Cancelar
        </button>
      </div>
      {state.error ? <p className="text-xs text-red-100">{state.error}</p> : null}
    </form>
  )
}

export function FeedbackChat({
  feedbackId,
  mensajes,
  currentUserId,
  pacienteId,
  abierto,
}: {
  feedbackId: number
  mensajes: MensajeFeedback[]
  currentUserId: string
  pacienteId: string
  abierto: boolean
}) {
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const ultimoId = mensajes.at(-1)?.id

  if (mensajes.length === 0 && !abierto) return null

  return (
    <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
      {mensajes.length > 0 ? (
        <ul className="space-y-3">
          {mensajes.map((m) => {
            const esPaciente = m.autor_id === pacienteId
            const puedeEditar = m.autor_id === currentUserId && abierto && m.id === ultimoId

            return (
              <li key={m.id} className={`flex ${esPaciente ? 'justify-start' : 'justify-end'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                    esPaciente
                      ? 'bg-white border border-gray-200 text-gray-800'
                      : 'bg-vimet-orange text-white'
                  }`}
                >
                  {editandoId === m.id ? (
                    <EditarMensajeForm mensaje={m} onDone={() => setEditandoId(null)} />
                  ) : (
                    <>
                      <p
                        className={`text-xs font-semibold mb-0.5 ${
                          esPaciente ? 'text-gray-500' : 'text-white/80'
                        }`}
                      >
                        {m.autor
                          ? `${m.autor.nombre} ${m.autor.apellido}`
                          : esPaciente
                            ? 'Paciente'
                            : 'Equipo VIMET'}
                      </p>
                      <p className="whitespace-pre-line">{m.contenido}</p>
                      <div
                        className={`flex items-center gap-2 mt-1 text-xs ${
                          esPaciente ? 'text-gray-400' : 'text-white/70'
                        }`}
                      >
                        <span>{formatHora(m.created_at)}</span>
                        {m.edited_at ? <span>(editado)</span> : null}
                        {puedeEditar ? (
                          <button type="button" onClick={() => setEditandoId(m.id)} className="underline">
                            Editar
                          </button>
                        ) : null}
                      </div>
                    </>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">Todavía no hay mensajes.</p>
      )}

      {abierto ? (
        <Composer feedbackId={feedbackId} />
      ) : (
        <p className="text-xs text-gray-400 pt-3">Esta conversación se cerró.</p>
      )}
    </div>
  )
}
