'use client'

import { Trash2 } from 'lucide-react'
import Image from 'next/image'
import { useState, useTransition } from 'react'

import {
  actualizarDiaDescansoAction,
  actualizarEjercicioPlanAction,
  agregarEjercicioAction,
  eliminarEjercicioPlanAction,
} from '@/actions/plan-ejercicios'
import { EjercicioPicker, type EjercicioResultado } from '@/components/seguimiento/ejercicio-picker'

const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const
// ponytail: "general" (sin día) es el bucket legacy de ejercicios cargados antes de que existieran las tabs.
const TABS = ['general', ...DIAS] as const
const DIA_LABEL: Record<(typeof TABS)[number], string> = {
  general: 'General',
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  domingo: 'Domingo',
}

export type RutinaItem = {
  id: number
  ejercicio_id: number
  dia_semana: string | null
  orden: number
  series: number | null
  repeticiones: string | null
  descanso_seg: number | null
  notas: string | null
  ejercicio: { id: number; nombre: string; imagen_url: string | null; gif_url: string | null } | null
}

const inputBase =
  'w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40 focus:border-vimet-orange'

function ordenar(a: RutinaItem, b: RutinaItem) {
  return a.orden - b.orden
}

export function RutinaPanel({
  planId,
  pacienteId,
  partes,
  equipos,
  rutinaInicial,
  diasDescansoInicial,
}: {
  planId: number
  pacienteId: string
  partes: string[]
  equipos: string[]
  rutinaInicial: RutinaItem[]
  diasDescansoInicial: string[]
}) {
  const [rutina, setRutina] = useState(() => [...rutinaInicial].sort(ordenar))
  const [diasDescanso, setDiasDescanso] = useState(() => new Set(diasDescansoInicial))
  const [diaActivo, setDiaActivo] = useState<(typeof TABS)[number]>('lunes')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const diaValor = diaActivo === 'general' ? '' : diaActivo
  const rutinaDelDia = rutina.filter((r) => (r.dia_semana ?? '') === diaValor)
  const esDescanso = diaActivo !== 'general' && diasDescanso.has(diaActivo)

  function agregar(ejercicio: EjercicioResultado) {
    setError(null)
    const fd = new FormData()
    fd.set('plan_id', String(planId))
    fd.set('paciente_id', pacienteId)
    fd.set('ejercicio_id', String(ejercicio.id))
    fd.set('dia_semana', diaValor)
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
            dia_semana: diaValor || null,
            orden: prev.length,
            series: null,
            repeticiones: null,
            descanso_seg: null,
            notas: null,
            ejercicio: { id: ejercicio.id, nombre: ejercicio.nombre, imagen_url: ejercicio.imagen_url, gif_url: ejercicio.gif_url },
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

  function toggleDescanso(activar: boolean) {
    if (diaActivo === 'general') return
    setError(null)
    const dia = diaActivo
    const fd = new FormData()
    fd.set('plan_id', String(planId))
    fd.set('paciente_id', pacienteId)
    fd.set('dia', dia)
    fd.set('activar', String(activar))
    startTransition(async () => {
      const res = await actualizarDiaDescansoAction(undefined, fd)
      if (res.error) {
        setError(res.error)
        return
      }
      setDiasDescanso((prev) => {
        const next = new Set(prev)
        activar ? next.add(dia) : next.delete(dia)
        return next
      })
    })
  }

  return (
    <fieldset className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <legend className="px-2 font-heading font-semibold text-gray-900">Rutina de ejercicios</legend>

      {error ? (
        <div className="rounded-lg bg-vimet-red/10 border border-vimet-red/20 px-4 py-3 text-sm text-vimet-red">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {TABS.map((d) => {
          const valor = d === 'general' ? '' : d
          const cantidad = rutina.filter((r) => (r.dia_semana ?? '') === valor).length
          const descanso = d !== 'general' && diasDescanso.has(d)
          return (
            <button
              key={d}
              type="button"
              onClick={() => setDiaActivo(d)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                diaActivo === d
                  ? 'bg-vimet-orange text-white border-vimet-orange'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-vimet-orange/40'
              }`}
            >
              {DIA_LABEL[d]}
              {descanso ? ' · Descanso' : cantidad > 0 ? ` (${cantidad})` : ''}
            </button>
          )
        })}
      </div>

      {diaActivo !== 'general' ? (
        <>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={esDescanso}
              disabled={pending || (!esDescanso && rutinaDelDia.length > 0)}
              onChange={(e) => toggleDescanso(e.target.checked)}
            />
            Marcar {DIA_LABEL[diaActivo]} como día de descanso
          </label>
          {!esDescanso && rutinaDelDia.length > 0 ? (
            <p className="text-xs text-gray-400">
              Sacá los ejercicios de este día para poder marcarlo como descanso.
            </p>
          ) : null}
        </>
      ) : null}

      {esDescanso ? (
        <p className="text-sm text-gray-500">Día de descanso — sin ejercicios.</p>
      ) : (
        <>
          <EjercicioPicker partes={partes} equipos={equipos} onAgregar={agregar} />

          {rutinaDelDia.length === 0 ? (
            <p className="text-sm text-gray-500">Todavía no se agregaron ejercicios a {DIA_LABEL[diaActivo].toLowerCase()}.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="py-1 pr-2 font-medium">Ejercicio</th>
                    <th className="py-1 pr-2 font-medium">Series</th>
                    <th className="py-1 pr-2 font-medium">Reps</th>
                    <th className="py-1 pr-2 font-medium">Descanso (seg)</th>
                    <th className="py-1 pr-2 font-medium">Notas</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rutinaDelDia.map((item) => (
                    <tr key={item.id} className="border-t border-gray-100">
                      <td className="py-2 pr-2 font-medium text-gray-900">
                        <div className="group flex items-center gap-2">
                          {item.ejercicio?.imagen_url ? (
                            <span className="relative size-16 lg:size-28 rounded-md overflow-hidden shrink-0 bg-gray-100">
                              <Image
                                src={item.ejercicio.imagen_url}
                                alt=""
                                width={112}
                                height={112}
                                unoptimized
                                className="absolute inset-0 size-full object-cover transition-opacity group-hover:opacity-0"
                              />
                              {item.ejercicio.gif_url ? (
                                <Image
                                  src={item.ejercicio.gif_url}
                                  alt=""
                                  width={112}
                                  height={112}
                                  unoptimized
                                  className="absolute inset-0 size-full object-cover opacity-0 transition-opacity group-hover:opacity-100"
                                />
                              ) : null}
                            </span>
                          ) : null}
                          <span>{item.ejercicio?.nombre ?? '—'}</span>
                        </div>
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          className={inputBase}
                          inputMode="numeric"
                          placeholder="4"
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
                          placeholder="60"
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
                          placeholder="Opcional"
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
        </>
      )}
    </fieldset>
  )
}
