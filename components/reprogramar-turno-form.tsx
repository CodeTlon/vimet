'use client'

import { CalendarClock, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { useActionState } from 'react'

import { reprogramarTurnoAction, type TurnoState } from '@/actions/turnos'
import { HORAS_CORTE_RESERVA, hoyArgentina } from '@/lib/datetime'
import { Modal } from '@/components/ui/modal'

type Slot = { hora_inicio: string; hora_fin: string }

const initialState: TurnoState = {}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-vimet-gradient text-white font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" /> Guardando…
        </>
      ) : (
        <>
          <CalendarClock className="size-4" /> Reprogramar
        </>
      )}
    </button>
  )
}

// El profesional carga acá el horario nuevo después de coordinarlo con el
// paciente por fuera del sistema (llamada/WhatsApp al teléfono que ya se ve
// en el detalle del turno) — el paciente no interviene en este paso.
export function ReprogramarTurnoForm({
  turnoId,
  profesionalId,
  servicioId,
  modalidad,
}: {
  turnoId: number
  profesionalId: string
  servicioId: number
  modalidad: 'presencial' | 'virtual'
}) {
  const [open, setOpen] = useState(false)
  const [state, formAction] = useActionState(reprogramarTurnoAction, initialState)
  const [fecha, setFecha] = useState(hoyArgentina())
  const [slot, setSlot] = useState<Slot | null>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [slotError, setSlotError] = useState<string | null>(null)

  useEffect(() => {
    if (state?.ok) setOpen(false)
  }, [state?.ok])

  useEffect(() => {
    setSlot(null)
  }, [fecha])

  useEffect(() => {
    if (!open || !fecha) return
    let cancelled = false
    setLoadingSlots(true)
    setSlotError(null)
    fetch(
      `/api/slots?profesional_id=${profesionalId}&fecha=${fecha}&servicio_id=${servicioId}&modalidad=${modalidad}&excluir_turno_id=${turnoId}`,
    )
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (data?.error) {
          setSlots([])
          setSlotError(data.error)
        } else {
          setSlots(Array.isArray(data?.slots) ? data.slots : [])
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSlotError('Error de conexión. Intentá de nuevo.')
          setSlots([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, fecha, profesionalId, servicioId, modalidad, turnoId])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-vimet-orange hover:underline"
      >
        <CalendarClock className="size-4" /> Reprogramar horario
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Reprogramar turno" size="md">
        <form action={formAction} className="space-y-5">
          {state?.error ? (
            <div role="alert" className="rounded-lg bg-vimet-red/10 border border-vimet-red/20 px-4 py-3 text-sm text-vimet-red">
              {state.error}
            </div>
          ) : null}

          <p className="text-xs text-gray-500">
            Cargá el horario nuevo después de coordinarlo con el paciente. Si el turno estaba
            pendiente, al reprogramarlo queda confirmado.
          </p>

          <input type="hidden" name="id" value={turnoId} />
          <input type="hidden" name="hora_inicio" value={slot?.hora_inicio ?? ''} />
          <input type="hidden" name="hora_fin" value={slot?.hora_fin ?? ''} />

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1.5">Fecha</label>
            <input
              type="date"
              name="fecha"
              min={hoyArgentina()}
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40 focus:border-vimet-orange"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Horarios disponibles
            </label>
            {loadingSlots ? (
              <p className="text-sm text-gray-700 flex items-center gap-2 py-3">
                <Loader2 className="size-4 animate-spin" /> Buscando disponibilidad…
              </p>
            ) : slotError ? (
              <p className="text-sm text-vimet-red">{slotError}</p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-4 py-3">
                {fecha === hoyArgentina()
                  ? `No quedan horarios para hoy dentro de las ${HORAS_CORTE_RESERVA} horas de anticipación mínima. Probá con otro día.`
                  : 'No hay horarios disponibles para esta fecha. Probá con otro día.'}
              </p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {slots.map((s) => {
                  const selected = slot?.hora_inicio === s.hora_inicio
                  return (
                    <button
                      key={s.hora_inicio}
                      type="button"
                      onClick={() => setSlot(s)}
                      className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                        selected
                          ? 'bg-vimet-gradient text-white border-transparent shadow'
                          : 'border-gray-200 bg-white text-gray-800 hover:border-vimet-orange hover:text-vimet-orange'
                      }`}
                    >
                      {s.hora_inicio}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <SubmitButton disabled={!slot} />
        </form>
      </Modal>
    </>
  )
}
