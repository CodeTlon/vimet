'use client'

import { Check, CheckCheck, UserX, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom';
import { useActionState } from 'react';

import { actualizarTurnoStaffAction, type TurnoState } from '@/actions/turnos'
import { useAutoHideMessage, useScrollToMessage } from '@/components/seguimiento/use-reset-on-success'
import { Modal } from '@/components/ui/modal'
import { NotaTextarea } from '@/components/ui/nota-textarea'

const initialState: TurnoState = {}

const ACTIONS = [
  { value: 'confirmado', label: 'Confirmar', icon: Check, className: 'bg-green-600 hover:bg-green-700 text-white' },
  { value: 'completado', label: 'Completado', icon: CheckCheck, className: 'bg-vimet-gradient text-white' },
  { value: 'no_asistio', label: 'No asistió', icon: UserX, className: 'bg-yellow-500 hover:bg-yellow-600 text-white' },
] as const

const CANCEL_CLASS =
  'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold shadow-sm transition-all disabled:opacity-50 bg-red-600 hover:bg-red-700 text-white'

// ponytail: useFormState (React 18) no preserva el submitter del <button
// type="submit" name value>, así que el FormData que llega al server action
// nunca trae "estado". Se setea el input oculto por ref, a mano, en el click
// (síncrono, antes del submit) — más simple que migrar a formAction por botón.
// "cancelado" no vive acá — ver CancelarTurnoButton más abajo, tiene reglas
// propias según el estado actual.
function StateButtons({
  disableConfirm,
  estadoRef,
}: {
  disableConfirm: boolean
  estadoRef: React.RefObject<HTMLInputElement | null>
}) {
  const { pending } = useFormStatus()
  return (
    <>
      {ACTIONS.map((a) => {
        if (a.value === 'confirmado' && disableConfirm) return null
        return (
          <button
            key={a.value}
            type="submit"
            onClick={() => {
              if (estadoRef.current) estadoRef.current.value = a.value
            }}
            disabled={pending}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold shadow-sm transition-all disabled:opacity-50 ${a.className}`}
          >
            <a.icon className="size-4" /> {a.label}
          </button>
        )
      })}
    </>
  )
}

function CancelarPendienteSubmit() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className={CANCEL_CLASS}>
      <X className="size-4" /> Cancelar
    </button>
  )
}

// El paciente todavía no había confirmado esa franja — cancelar es un click,
// sin motivo obligatorio.
function CancelarTurnoPendienteForm({ id }: { id: number }) {
  const [, formAction] = useActionState(actualizarTurnoStaffAction, initialState)
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="estado" value="cancelado" />
      <CancelarPendienteSubmit />
    </form>
  )
}

function CancelarConfirmadoSubmit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <X className="size-4" /> Cancelar turno y avisar
    </button>
  )
}

// El paciente ya había confirmado esta franja — cancelar exige contarle el
// motivo (se lo va a ver en /mis-turnos, columna motivo_cancelacion). Se
// valida server-side en actualizarTurnoStaff; acá solo se deshabilita el
// submit hasta que haya texto, para no hacerle perder el viaje al staff.
// Manda las notas profesionales existentes como hidden: este form es
// independiente del de arriba, si no las mandara actualizarTurnoStaff las
// pisaría con null al cancelar.
function CancelarTurnoConfirmadoModal({ id, notas }: { id: number; notas: string | null }) {
  const [open, setOpen] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [state, formAction] = useActionState(actualizarTurnoStaffAction, initialState)

  useEffect(() => {
    if (state?.ok) setOpen(false)
  }, [state?.ok])

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={CANCEL_CLASS}>
        <X className="size-4" /> Cancelar
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Cancelar turno confirmado" size="md">
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="estado" value="cancelado" />
          <input type="hidden" name="notas_profesional" value={notas ?? ''} />

          {state?.error ? (
            <div role="alert" className="rounded-lg bg-vimet-red/10 border border-vimet-red/20 px-4 py-3 text-sm text-vimet-red">
              {state.error}
            </div>
          ) : null}

          <p className="text-sm text-gray-700">
            El paciente ya había confirmado este turno — contale por qué se cancela. Este mensaje
            se le va a mostrar en &quot;Mis turnos&quot;.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1.5">
              Mensaje para el paciente
            </label>
            <textarea
              name="motivo_cancelacion"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              required
              rows={4}
              maxLength={500}
              placeholder="Ej: Lo siento, no voy a poder atenderte ese día por..."
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40 focus:border-vimet-orange resize-none"
            />
          </div>

          <CancelarConfirmadoSubmit disabled={!motivo.trim()} />
        </form>
      </Modal>
    </>
  )
}

function CancelarTurnoButton({
  id,
  estadoActual,
  notas,
}: {
  id: number
  estadoActual: string
  notas: string | null
}) {
  return estadoActual === 'pendiente' ? (
    <CancelarTurnoPendienteForm id={id} />
  ) : (
    <CancelarTurnoConfirmadoModal id={id} notas={notas} />
  )
}

export function TurnoDetalleForm({
  id,
  estadoActual,
  notas,
  motivoCancelacion,
  motivoReprogramacion,
}: {
  id: number
  estadoActual: string
  notas: string | null
  motivoCancelacion?: string | null
  motivoReprogramacion?: string | null
}) {
  const [state, formAction] = useActionState(actualizarTurnoStaffAction, initialState)
  const msgRef = useScrollToMessage(state)
  const visible = useAutoHideMessage(state)
  const estadoRef = useRef<HTMLInputElement>(null)
  const editable = ['pendiente', 'confirmado'].includes(estadoActual)

  if (!editable) {
    return (
      <div className="text-sm text-gray-700 bg-gray-50 rounded-lg px-4 py-3 space-y-1">
        <p>Este turno está cerrado y no puede modificarse.</p>
        {motivoCancelacion ? (
          <p>
            <span className="font-semibold">Motivo de la cancelación:</span> {motivoCancelacion}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {estadoActual === 'pendiente' && motivoReprogramacion ? (
        <div className="text-sm text-gray-700 bg-gray-50 rounded-lg px-4 py-3">
          <span className="font-semibold">Motivo de la reprogramación:</span> {motivoReprogramacion}
        </div>
      ) : null}
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="estado" ref={estadoRef} />

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
          <NotaTextarea
            name="notas_profesional"
            rows={4}
            defaultValue={notas}
            placeholder="Notas internas sobre el turno (no visibles al paciente)"
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40 focus:border-vimet-orange resize-none"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <StateButtons disableConfirm={estadoActual === 'confirmado'} estadoRef={estadoRef} />
        </div>
      </form>

      <div className="flex flex-wrap gap-2">
        <CancelarTurnoButton id={id} estadoActual={estadoActual} notas={notas} />
      </div>
    </div>
  )
}
