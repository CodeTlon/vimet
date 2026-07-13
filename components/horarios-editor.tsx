'use client'

import { Clock, MessageCircle, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'

import {
  actualizarHorarioAction,
  agregarHorarioAction,
  eliminarHorarioAction,
  type CanceladoInfo,
  type HorarioState,
} from '@/actions/horarios'
import { useResetOnSuccess } from '@/components/seguimiento/use-reset-on-success'
import { formatearFechaCorta } from '@/lib/seguimiento'

export type Horario = {
  id: number
  dia_semana: number
  hora_inicio: string
  hora_fin: string
  modalidad: 'presencial' | 'virtual' | 'ambas'
  activo: boolean
}

// Orden de visualización: Lun → Dom (0 = domingo en Postgres).
const DIAS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
] as const

const MODALIDAD_LABEL: Record<Horario['modalidad'], string> = {
  presencial: 'Presencial',
  virtual: 'Virtual',
  ambas: 'Ambas',
}

const inputBase =
  'rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40 focus:border-vimet-orange'

function hhmm(t: string) {
  return t.slice(0, 5)
}

function SubmitBtn({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-lg bg-vimet-orange px-5 py-2 text-sm font-semibold text-white hover:bg-vimet-red transition-colors disabled:opacity-60"
    >
      <Plus className="size-4" />
      {pending ? 'Guardando…' : editing ? 'Guardar cambios' : 'Agregar franja'}
    </button>
  )
}

function EliminarFranjaForm({
  id,
  onCancelados,
}: {
  id: number
  onCancelados: (cancelados: CanceladoInfo[]) => void
}) {
  const [state, action] = useFormState<HorarioState, FormData>(eliminarHorarioAction, {})

  useEffect(() => {
    if (state.cancelados?.length) onCancelados(state.cancelados)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        aria-label="Eliminar franja"
        className="inline-flex items-center justify-center size-6 rounded-full text-gray-400 hover:text-vimet-red hover:bg-white transition-colors"
      >
        <Trash2 className="size-3.5" />
      </button>
    </form>
  )
}

function TurnosCanceladosAviso({ cancelados }: { cancelados: CanceladoInfo[] }) {
  return (
    <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-1">
        Turnos cancelados por el cambio de agenda
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        Ya se les avisó por mail. Podés escribirles también por WhatsApp:
      </p>
      <ul className="space-y-2">
        {cancelados.map((c) => {
          const mensaje = `Hola ${c.pacienteNombre.split(' ')[0]}, tu turno del ${formatearFechaCorta(
            c.fecha,
          )} a las ${c.horaInicio} fue cancelado por un cambio de agenda. ¿Coordinamos otro horario?`
          return (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-2 text-sm bg-white rounded-lg border border-gray-200 px-3 py-2"
            >
              <span>
                <strong>{c.pacienteNombre}</strong> — {c.servicioNombre} ·{' '}
                {formatearFechaCorta(c.fecha)} {c.horaInicio}–{c.horaFin}
              </span>
              {c.pacienteTelefono ? (
                <a
                  href={`https://wa.me/54${c.pacienteTelefono.replace(/\D/g, '')}?text=${encodeURIComponent(mensaje)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 hover:underline"
                >
                  <MessageCircle className="size-3.5" /> WhatsApp
                </a>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function HorariosEditor({ horarios }: { horarios: Horario[] }) {
  const [editing, setEditing] = useState<Horario | null>(null)
  const [state, action] = useFormState<HorarioState, FormData>(
    editing ? actualizarHorarioAction : agregarHorarioAction,
    {},
  )
  const formRef = useResetOnSuccess(state)
  const [cancelados, setCancelados] = useState<CanceladoInfo[]>([])

  useEffect(() => {
    if (state.ok) setEditing(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  const porDia = new Map<number, Horario[]>()
  for (const h of horarios) {
    const arr = porDia.get(h.dia_semana) ?? []
    arr.push(h)
    porDia.set(h.dia_semana, arr)
  }

  return (
    <div className="space-y-6">
      {cancelados.length > 0 ? <TurnosCanceladosAviso cancelados={cancelados} /> : null}

      {/* Agenda actual */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Agenda actual</h2>
        <div className="space-y-3">
          {DIAS.map((d) => {
            const franjas = (porDia.get(d.value) ?? []).sort((a, b) =>
              a.hora_inicio.localeCompare(b.hora_inicio),
            )
            return (
              <div
                key={d.value}
                className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 py-2 border-b border-gray-100 last:border-0"
              >
                <span className="w-24 shrink-0 text-sm font-medium text-gray-900">{d.label}</span>
                {franjas.length === 0 ? (
                  <span className="text-sm text-gray-400">No atiende</span>
                ) : (
                  <ul className="flex flex-wrap gap-2">
                    {franjas.map((f) => (
                      <li
                        key={f.id}
                        className="inline-flex items-center gap-2 rounded-full bg-vimet-cream border border-vimet-orange/20 pl-3 pr-1.5 py-1 text-sm text-gray-800"
                      >
                        <Clock className="size-3.5 text-vimet-orange shrink-0" />
                        <span className="font-medium">
                          {hhmm(f.hora_inicio)}–{hhmm(f.hora_fin)}
                        </span>
                        <span className="text-xs text-gray-500">{MODALIDAD_LABEL[f.modalidad]}</span>
                        <button
                          type="button"
                          aria-label="Editar franja"
                          onClick={() => setEditing(f)}
                          className="inline-flex items-center justify-center size-6 rounded-full text-gray-400 hover:text-vimet-orange hover:bg-white transition-colors"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <EliminarFranjaForm
                          id={f.id}
                          onCancelados={(c) => setCancelados((prev) => [...prev, ...c])}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Agregar / editar franja */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-3 mb-1">
          <h2 className="text-base font-semibold text-gray-900">
            {editing ? 'Editar franja horaria' : 'Agregar franja horaria'}
          </h2>
          {editing ? (
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="text-sm font-medium text-gray-500 hover:text-vimet-orange transition-colors"
            >
              Cancelar edición
            </button>
          ) : null}
        </div>
        <p className="text-sm text-gray-500 mb-5">
          Elegí el día, el rango de horas y la modalidad en la que atendés.
        </p>

        <form key={editing?.id ?? 'new'} ref={formRef} action={action} className="space-y-4">
          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
          {state.error ? (
            <p className="text-sm text-red-600">{state.error}</p>
          ) : null}
          {state.ok ? (
            <p className="text-sm text-green-600">{editing ? 'Franja actualizada.' : 'Franja agregada.'}</p>
          ) : null}

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <label className="block text-sm">
              <span className="block font-medium text-gray-700 mb-1">Día</span>
              <select name="dia_semana" defaultValue={String(editing?.dia_semana ?? 1)} className={`${inputBase} w-full`}>
                {DIAS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="block font-medium text-gray-700 mb-1">Desde</span>
              <input
                type="time"
                name="hora_inicio"
                defaultValue={editing ? hhmm(editing.hora_inicio) : '09:00'}
                required
                className={`${inputBase} w-full`}
              />
            </label>
            <label className="block text-sm">
              <span className="block font-medium text-gray-700 mb-1">Hasta</span>
              <input
                type="time"
                name="hora_fin"
                defaultValue={editing ? hhmm(editing.hora_fin) : '13:00'}
                required
                className={`${inputBase} w-full`}
              />
            </label>
            <label className="block text-sm">
              <span className="block font-medium text-gray-700 mb-1">Modalidad</span>
              <select name="modalidad" defaultValue={editing?.modalidad ?? 'ambas'} className={`${inputBase} w-full`}>
                <option value="ambas">Ambas</option>
                <option value="presencial">Presencial</option>
                <option value="virtual">Virtual</option>
              </select>
            </label>
          </div>

          <SubmitBtn editing={Boolean(editing)} />
        </form>
      </div>
    </div>
  )
}
