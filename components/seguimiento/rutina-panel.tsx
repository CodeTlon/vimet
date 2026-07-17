'use client'

import { Trash2 } from 'lucide-react'
import { useState, useTransition } from 'react'

import {
  actualizarEjercicioPlanAction,
  agregarEjercicioAction,
  eliminarEjercicioPlanAction,
} from '@/actions/plan-ejercicios'
import { EjercicioPicker, type EjercicioResultado } from '@/components/seguimiento/ejercicio-picker'

const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const

export type RutinaItem = {
  id: number
  ejercicio_id: number
  dia_semana: string | null
  orden: number
  series: number | null
  repeticiones: string | null
  descanso_seg: number | null
  notas: string | null
  ejercicio: { id: number; nombre: string; imagen_url: string | null } | null
}

const inputBase =
  'w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40 focus:border-vimet-orange'

function ordenar(a: RutinaItem, b: RutinaItem) {
  const da = a.dia_semana ?? ''
  const db = b.dia_semana ?? ''
  return da === db ? a.orden - b.orden : da.localeCompare(db)
}

export function RutinaPanel({
  planId,
  pacienteId,
  partes,
  equipos,
  rutinaInicial,
}: {
  planId: number
  pacienteId: string
  partes: string[]
  equipos: string[]
  rutinaInicial: RutinaItem[]
}) {
  const [rutina, setRutina] = useState(() => [...rutinaInicial].sort(ordenar))
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function agregar(ejercicio: EjercicioResultado) {
    setError(null)
    const fd = new FormData()
    fd.set('plan_id', String(planId))
    fd.set('paciente_id', pacienteId)
    fd.set('ejercicio_id', String(ejercicio.id))
    fd.set('orden', String(rutina.length))
    startTransition(async () => {
      const res = await agregarEjercicioAction(undefined, fd)
      if (res.error || res.id == null) {
        setError(res.error ?? 'No se pudo agregar el ejercicio.')
        return
      }
      setRutina((prev) =>
        [
          ...prev,
          {
            id: res.id!,
            ejercicio_id: ejercicio.id,
            dia_semana: null,
            orden: prev.length,
            series: null,
            repeticiones: null,
            descanso_seg: null,
            notas: null,
            ejercicio: { id: ejercicio.id, nombre: ejercicio.nombre, imagen_url: ejercicio.imagen_url },
          },
        ].sort(ordenar),
      )
    })
  }

  function actualizarCampo(id: number, campo: keyof RutinaItem, valor: string) {
    setRutina((prev) => prev.map((r) => (r.id === id ? { ...r, [campo]: valor === '' ? null : valor } : r)))
  }

  function guardar(item: RutinaItem) {
    setError(null)
    const fd = new FormData()
    fd.set('id', String(item.id))
    fd.set('plan_id', String(planId))
    fd.set('paciente_id', pacienteId)
    fd.set('dia_semana', item.dia_semana ?? '')
    fd.set('orden', String(item.orden))
    fd.set('series', item.series != null ? String(item.series) : '')
    fd.set('repeticiones', item.repeticiones ?? '')
    fd.set('descanso_seg', item.descanso_seg != null ? String(item.descanso_seg) : '')
    fd.set('notas', item.notas ?? '')
    startTransition(async () => {
      const res = await actualizarEjercicioPlanAction(undefined, fd)
      if (res.error) setError(res.error)
    })
  }

  function eliminar(item: RutinaItem) {
    setError(null)
    const fd = new FormData()
    fd.set('id', String(item.id))
    fd.set('plan_id', String(planId))
    fd.set('paciente_id', pacienteId)
    startTransition(async () => {
      await eliminarEjercicioPlanAction(fd)
      setRutina((prev) => prev.filter((r) => r.id !== item.id))
    })
  }

  return (
    <fieldset className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <legend className="px-2 font-heading font-semibold text-gray-900">Rutina de ejercicios</legend>

      <EjercicioPicker partes={partes} equipos={equipos} onAgregar={agregar} />

      {error ? (
        <div className="rounded-lg bg-vimet-red/10 border border-vimet-red/20 px-4 py-3 text-sm text-vimet-red">
          {error}
        </div>
      ) : null}

      {rutina.length === 0 ? (
        <p className="text-sm text-gray-500">Todavía no se agregaron ejercicios a este plan.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-1 pr-2 font-medium">Ejercicio</th>
                <th className="py-1 pr-2 font-medium">Día</th>
                <th className="py-1 pr-2 font-medium">Series</th>
                <th className="py-1 pr-2 font-medium">Reps</th>
                <th className="py-1 pr-2 font-medium">Descanso (seg)</th>
                <th className="py-1 pr-2 font-medium">Notas</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rutina.map((item) => (
                <tr key={item.id} className="border-t border-gray-100">
                  <td className="py-2 pr-2 font-medium text-gray-900">{item.ejercicio?.nombre ?? '—'}</td>
                  <td className="py-2 pr-2">
                    <select
                      className={inputBase}
                      value={item.dia_semana ?? ''}
                      onChange={(e) => actualizarCampo(item.id, 'dia_semana', e.target.value)}
                      onBlur={() => guardar(item)}
                    >
                      <option value="">General</option>
                      {DIAS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      className={inputBase}
                      inputMode="numeric"
                      defaultValue={item.series ?? ''}
                      onBlur={(e) => {
                        actualizarCampo(item.id, 'series', e.target.value)
                        guardar({ ...item, series: e.target.value ? Number(e.target.value) : null })
                      }}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      className={inputBase}
                      placeholder="8-12"
                      defaultValue={item.repeticiones ?? ''}
                      onBlur={(e) => {
                        actualizarCampo(item.id, 'repeticiones', e.target.value)
                        guardar({ ...item, repeticiones: e.target.value || null })
                      }}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      className={inputBase}
                      inputMode="numeric"
                      defaultValue={item.descanso_seg ?? ''}
                      onBlur={(e) => {
                        actualizarCampo(item.id, 'descanso_seg', e.target.value)
                        guardar({ ...item, descanso_seg: e.target.value ? Number(e.target.value) : null })
                      }}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      className={inputBase}
                      defaultValue={item.notas ?? ''}
                      onBlur={(e) => {
                        actualizarCampo(item.id, 'notas', e.target.value)
                        guardar({ ...item, notas: e.target.value || null })
                      }}
                    />
                  </td>
                  <td className="py-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => eliminar(item)}
                      className="text-gray-400 hover:text-vimet-red disabled:opacity-50"
                      aria-label="Eliminar ejercicio"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </fieldset>
  )
}
