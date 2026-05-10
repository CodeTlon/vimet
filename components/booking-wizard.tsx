'use client'

import { Building2, CalendarCheck2, Loader2, Video } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'

import { crearTurnoAction, type TurnoState } from '@/actions/turnos'

type Profesional = { id: string; nombre: string; apellido: string; rol: string }
type Servicio = {
  id: number
  nombre: string
  duracion_minutos: number
  tipo: 'nutricion' | 'entrenamiento' | 'combo'
  profesional_id: string | null
}
type Slot = { hora_inicio: string; hora_fin: string }

const initialState: TurnoState = {}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

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
          <Loader2 className="size-4 animate-spin" /> Confirmando…
        </>
      ) : (
        <>
          <CalendarCheck2 className="size-4" /> Confirmar turno
        </>
      )}
    </button>
  )
}

export function BookingWizard({
  profesionales,
  servicios,
}: {
  profesionales: Profesional[]
  servicios: Servicio[]
}) {
  const [state, formAction] = useFormState(crearTurnoAction, initialState)

  const [profId, setProfId] = useState('')
  const [servId, setServId] = useState('')
  const [fecha, setFecha] = useState(todayISO())
  const [modalidad, setModalidad] = useState<'presencial' | 'virtual'>('presencial')
  const [slot, setSlot] = useState<Slot | null>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [slotError, setSlotError] = useState<string | null>(null)

  const profSel = profesionales.find((p) => p.id === profId) ?? null

  const serviciosFiltrados = useMemo(() => {
    if (!profSel) return [] as Servicio[]
    if (profSel.rol === 'nutricionista')
      return servicios.filter((s) => s.tipo === 'nutricion' || s.tipo === 'combo')
    if (profSel.rol === 'entrenador')
      return servicios.filter((s) => s.tipo === 'entrenamiento' || s.tipo === 'combo')
    return servicios
  }, [profSel, servicios])

  useEffect(() => {
    setServId('')
    setSlot(null)
    setSlots([])
  }, [profId])

  useEffect(() => {
    setSlot(null)
  }, [servId, fecha])

  useEffect(() => {
    if (!profId || !servId || !fecha) {
      setSlots([])
      return
    }
    let cancelled = false
    setLoadingSlots(true)
    setSlotError(null)
    fetch(`/api/slots?profesional_id=${profId}&fecha=${fecha}&servicio_id=${servId}`)
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
  }, [profId, servId, fecha])

  const submitDisabled = !profId || !servId || !fecha || !slot

  return (
    <form action={formAction} className="space-y-6">
      {state.error ? (
        <div
          role="alert"
          className="rounded-lg bg-vimet-red/10 border border-vimet-red/20 px-4 py-3 text-sm text-vimet-red"
        >
          {state.error}
        </div>
      ) : null}

      <input type="hidden" name="profesional_id" value={profId} />
      <input type="hidden" name="servicio_id" value={servId} />
      <input type="hidden" name="hora_inicio" value={slot?.hora_inicio ?? ''} />
      <input type="hidden" name="hora_fin" value={slot?.hora_fin ?? ''} />

      <div>
        <label className="block text-sm font-medium text-gray-800 mb-1.5">
          ¿Con quién querés consultar?
        </label>
        <select
          value={profId}
          onChange={(e) => setProfId(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40 focus:border-vimet-orange"
        >
          <option value="">Seleccioná un profesional</option>
          {profesionales.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre} {p.apellido} — {capitalize(p.rol)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-800 mb-1.5">Tipo de consulta</label>
        <select
          value={servId}
          onChange={(e) => setServId(e.target.value)}
          disabled={!profId}
          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40 focus:border-vimet-orange disabled:bg-gray-50 disabled:cursor-not-allowed"
        >
          <option value="">
            {profId ? 'Seleccioná un servicio' : 'Seleccioná primero un profesional'}
          </option>
          {serviciosFiltrados.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre} ({s.duracion_minutos} min)
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1.5">Fecha</label>
          <input
            type="date"
            name="fecha"
            min={todayISO()}
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40 focus:border-vimet-orange"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1.5">Modalidad</label>
          <div className="flex gap-2">
            <ModalidadOption
              icon={Building2}
              label="Presencial"
              value="presencial"
              current={modalidad}
              onChange={setModalidad}
            />
            <ModalidadOption
              icon={Video}
              label="Virtual"
              value="virtual"
              current={modalidad}
              onChange={setModalidad}
            />
          </div>
          <input type="hidden" name="modalidad" value={modalidad} />
        </div>
      </div>

      {profId && servId && fecha ? (
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
              No hay horarios disponibles para esta fecha. Probá con otro día.
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
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
      ) : null}

      <div>
        <label className="block text-sm font-medium text-gray-800 mb-1.5">
          Notas adicionales (opcional)
        </label>
        <textarea
          name="notas"
          rows={3}
          placeholder="Motivo de consulta, antecedentes, etc."
          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40 focus:border-vimet-orange"
        />
      </div>

      <SubmitButton disabled={submitDisabled} />
    </form>
  )
}

function ModalidadOption({
  icon: Icon,
  label,
  value,
  current,
  onChange,
}: {
  icon: typeof Building2
  label: string
  value: 'presencial' | 'virtual'
  current: 'presencial' | 'virtual'
  onChange: (v: 'presencial' | 'virtual') => void
}) {
  const active = current === value
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={`flex-1 inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors ${
        active
          ? 'border-vimet-orange bg-vimet-cream text-vimet-red'
          : 'border-gray-200 bg-white text-gray-700 hover:border-vimet-orange/50'
      }`}
    >
      <Icon className="size-4" /> {label}
    </button>
  )
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
