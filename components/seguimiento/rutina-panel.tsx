'use client'

import { Trash2 } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useRef, useState, useTransition } from 'react'

import {
  actualizarDiaDescansoAction,
  actualizarEjercicioPlanAction,
  agregarEjercicioAction,
  eliminarEjercicioPlanAction,
} from '@/actions/plan-ejercicios'
import { EjercicioModal, type EjercicioDetalle } from '@/components/seguimiento/ejercicio-modal'
import { EjercicioPicker, type EjercicioResultado } from '@/components/seguimiento/ejercicio-picker'
import { EjercicioYoutubeThumbnail } from '@/components/seguimiento/ejercicio-youtube-thumbnail'
import { NotaTextarea } from '@/components/ui/nota-textarea'
import { Select } from '@/components/ui/select'

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

const UNIDADES_CARDIO = [
  { value: 'minutos', label: 'min' },
  { value: 'horas', label: 'hs' },
  { value: 'km', label: 'km' },
] as const

type FaseCardio = 'entrada_calor' | 'trabajo_principal' | 'vuelta_calma'
const FASES_CARDIO: readonly FaseCardio[] = ['entrada_calor', 'trabajo_principal', 'vuelta_calma']
const FASE_HEADER: Record<FaseCardio, string> = {
  entrada_calor: 'Entrada en calor',
  trabajo_principal: 'Trabajo principal',
  vuelta_calma: 'Vuelta a la calma',
}
const FASE_CAMPOS = {
  entrada_calor: { valor: 'cardio_entrada_calor_valor', unidad: 'cardio_entrada_calor_unidad' },
  trabajo_principal: { valor: 'cardio_trabajo_principal_valor', unidad: 'cardio_trabajo_principal_unidad' },
  vuelta_calma: { valor: 'cardio_vuelta_calma_valor', unidad: 'cardio_vuelta_calma_unidad' },
} as const

export type RutinaItem = {
  id: number
  ejercicio_id: number
  dia_semana: string | null
  orden: number
  series: number | null
  repeticiones: string | null
  descanso_seg: number | null
  notas: string | null
  cardio_entrada_calor_valor: number | null
  cardio_entrada_calor_unidad: string | null
  cardio_trabajo_principal_valor: number | null
  cardio_trabajo_principal_unidad: string | null
  cardio_vuelta_calma_valor: number | null
  cardio_vuelta_calma_unidad: string | null
  ejercicio: {
    id: number
    nombre: string
    imagen_url: string | null
    gif_url: string | null
    youtube_url: string | null
    instrucciones: string | null
    modo: 'fuerza' | 'cardio'
  } | null
}

const inputBase =
  'w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40 focus:border-vimet-orange'
const thBase = 'py-2.5 px-3 font-semibold text-xs uppercase tracking-wide align-bottom'
const tdBase = 'py-3 px-3 align-middle'

function ordenar(a: RutinaItem, b: RutinaItem) {
  return a.orden - b.orden
}

// Celda "Ejercicio" (thumbnail + nombre): reusada por la tabla de Fuerza y la
// de Cardio. Si el ejercicio tiene youtube_url abre el video en pestaña
// nueva; si no, abre el modal in-app con el GIF/instrucciones.
function EjercicioCelda({ item, onAbrir }: { item: RutinaItem; onAbrir: (detalle: EjercicioDetalle) => void }) {
  if (item.ejercicio?.youtube_url) {
    return (
      <a
        href={item.ejercicio.youtube_url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-3 text-left hover:text-vimet-orange"
      >
        <EjercicioYoutubeThumbnail url={item.ejercicio.youtube_url} alt="" className="size-16 lg:size-28 rounded-md shrink-0" />
        <span>{item.ejercicio.nombre}</span>
      </a>
    )
  }
  return (
    <button
      type="button"
      onClick={() =>
        item.ejercicio &&
        onAbrir({
          nombre: item.ejercicio.nombre,
          gif_url: item.ejercicio.gif_url,
          imagen_url: item.ejercicio.imagen_url,
          instrucciones: item.ejercicio.instrucciones,
        })
      }
      className="group flex items-center gap-3 text-left hover:text-vimet-orange"
    >
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
    </button>
  )
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
  const [ultimoAgregadoId, setUltimoAgregadoId] = useState<number | null>(null)
  const ultimoAgregadoRef = useRef<HTMLTableRowElement | null>(null)
  const [ejercicioAbierto, setEjercicioAbierto] = useState<EjercicioDetalle | null>(null)

  useEffect(() => {
    if (ultimoAgregadoId == null) return
    ultimoAgregadoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setUltimoAgregadoId(null)
  }, [ultimoAgregadoId])

  const diaValor = diaActivo === 'general' ? '' : diaActivo
  const rutinaDelDia = rutina.filter((r) => (r.dia_semana ?? '') === diaValor)
  const itemsFuerza = rutinaDelDia.filter((r) => r.ejercicio?.modo !== 'cardio')
  const itemsCardio = rutinaDelDia.filter((r) => r.ejercicio?.modo === 'cardio')
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
            cardio_entrada_calor_valor: null,
            cardio_entrada_calor_unidad: null,
            cardio_trabajo_principal_valor: null,
            cardio_trabajo_principal_unidad: null,
            cardio_vuelta_calma_valor: null,
            cardio_vuelta_calma_unidad: null,
            ejercicio: {
              id: ejercicio.id,
              nombre: ejercicio.nombre,
              imagen_url: ejercicio.imagen_url,
              gif_url: ejercicio.gif_url,
              youtube_url: ejercicio.youtube_url,
              instrucciones: ejercicio.instrucciones,
              modo: ejercicio.modo,
            },
          },
        ].sort(ordenar),
      )
      setUltimoAgregadoId(res.id!)
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
    fd.set('cardio_entrada_calor_valor', item.cardio_entrada_calor_valor != null ? String(item.cardio_entrada_calor_valor) : '')
    fd.set('cardio_entrada_calor_unidad', item.cardio_entrada_calor_unidad ?? '')
    fd.set('cardio_trabajo_principal_valor', item.cardio_trabajo_principal_valor != null ? String(item.cardio_trabajo_principal_valor) : '')
    fd.set('cardio_trabajo_principal_unidad', item.cardio_trabajo_principal_unidad ?? '')
    fd.set('cardio_vuelta_calma_valor', item.cardio_vuelta_calma_valor != null ? String(item.cardio_vuelta_calma_valor) : '')
    fd.set('cardio_vuelta_calma_unidad', item.cardio_vuelta_calma_unidad ?? '')
    startTransition(async () => {
      const res = await actualizarEjercicioPlanAction(undefined, fd)
      if (res.error) setError(res.error)
    })
  }

  // Mantiene cada fase de cardio como un par valor+unidad consistente (sin
  // valor no hay unidad; con valor sin unidad, default a "minutos") — así
  // nunca se manda a guardar() un par a medias que el constraint de la DB rechace.
  function guardarFaseCardio(item: RutinaItem, fase: FaseCardio, cambio: { valor: string } | { unidad: string }) {
    const { valor: campoValor, unidad: campoUnidad } = FASE_CAMPOS[fase]
    let valor = 'valor' in cambio ? (cambio.valor === '' ? null : Number(cambio.valor)) : item[campoValor]
    let unidad: string | null = 'unidad' in cambio ? cambio.unidad : item[campoUnidad]
    if (valor == null) unidad = null
    else if (!unidad) unidad = 'minutos'

    const actualizado = { ...item, [campoValor]: valor, [campoUnidad]: unidad } as RutinaItem
    setRutina((prev) => prev.map((r) => (r.id === item.id ? actualizado : r)))
    guardar(actualizado)
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
        if (activar) next.add(dia)
        else next.delete(dia)
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

          {itemsFuerza.length === 0 && itemsCardio.length === 0 ? (
            <p className="text-sm text-gray-500">Todavía no se agregaron ejercicios a {DIA_LABEL[diaActivo].toLowerCase()}.</p>
          ) : (
            <div className="space-y-5">
              {itemsFuerza.length > 0 ? (
                <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 sm:p-4 space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Fuerza</h4>
                  <div className="overflow-x-auto rounded-lg bg-white border border-gray-100">
                    <table className="w-full min-w-[49rem] text-sm border-collapse table-fixed">
                      <colgroup>
                        <col className="w-10" />
                        <col className="w-60" />
                        <col className="w-24" />
                        <col className="w-24" />
                        <col className="w-28" />
                        <col className="w-40" />
                        <col className="w-10" />
                      </colgroup>
                      <thead>
                        <tr className="text-left text-gray-500 border-b border-gray-100">
                          <th className={thBase}>#</th>
                          <th className={thBase}>Ejercicio</th>
                          <th className={thBase}>Series</th>
                          <th className={thBase}>Reps</th>
                          <th className={thBase}>Descanso (seg)</th>
                          <th className={thBase}>Notas</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {itemsFuerza.map((item, idx) => (
                          <tr
                            key={item.id}
                            ref={item.id === ultimoAgregadoId ? ultimoAgregadoRef : undefined}
                          >
                            <td className={`${tdBase} text-gray-400`}>{idx + 1}</td>
                            <td className={`${tdBase} font-medium text-gray-900`}>
                              <EjercicioCelda item={item} onAbrir={setEjercicioAbierto} />
                            </td>
                            <td className={tdBase}>
                              <input
                                className={`${inputBase} w-20`}
                                inputMode="numeric"
                                placeholder="4"
                                defaultValue={item.series ?? ''}
                                onBlur={(e) => {
                                  actualizarCampo(item.id, 'series', e.target.value)
                                  guardar({ ...item, series: e.target.value ? Number(e.target.value) : null })
                                }}
                              />
                            </td>
                            <td className={tdBase}>
                              <input
                                className={`${inputBase} w-24`}
                                placeholder="8-12"
                                defaultValue={item.repeticiones ?? ''}
                                onBlur={(e) => {
                                  actualizarCampo(item.id, 'repeticiones', e.target.value)
                                  guardar({ ...item, repeticiones: e.target.value || null })
                                }}
                              />
                            </td>
                            <td className={tdBase}>
                              <input
                                className={`${inputBase} w-20`}
                                inputMode="numeric"
                                placeholder="60"
                                defaultValue={item.descanso_seg ?? ''}
                                onBlur={(e) => {
                                  actualizarCampo(item.id, 'descanso_seg', e.target.value)
                                  guardar({ ...item, descanso_seg: e.target.value ? Number(e.target.value) : null })
                                }}
                              />
                            </td>
                            <td className={tdBase}>
                              <NotaTextarea
                                rows={1}
                                className={inputBase}
                                placeholder="Opcional"
                                defaultValue={item.notas}
                                onSave={(value) => {
                                  actualizarCampo(item.id, 'notas', value)
                                  guardar({ ...item, notas: value || null })
                                }}
                              />
                            </td>
                            <td className={tdBase}>
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
                </div>
              ) : null}

              {itemsCardio.length > 0 ? (
                <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 sm:p-4 space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Cardio</h4>
                  <div className="overflow-x-auto rounded-lg bg-white border border-gray-100">
                    <table className="w-full min-w-[66rem] text-sm border-collapse table-fixed">
                      <colgroup>
                        <col className="w-10" />
                        <col className="w-60" />
                        <col className="w-48" />
                        <col className="w-48" />
                        <col className="w-48" />
                        <col className="w-40" />
                        <col className="w-10" />
                      </colgroup>
                      <thead>
                        <tr className="text-left text-gray-500 border-b border-gray-100">
                          <th className={thBase}>#</th>
                          <th className={thBase}>Ejercicio</th>
                          {FASES_CARDIO.map((fase) => (
                            <th key={fase} className={thBase}>{FASE_HEADER[fase]}</th>
                          ))}
                          <th className={thBase}>Notas</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {itemsCardio.map((item, idx) => (
                          <tr
                            key={item.id}
                            ref={item.id === ultimoAgregadoId ? ultimoAgregadoRef : undefined}
                          >
                            <td className={`${tdBase} text-gray-400`}>{idx + 1}</td>
                            <td className={`${tdBase} font-medium text-gray-900`}>
                              <EjercicioCelda item={item} onAbrir={setEjercicioAbierto} />
                            </td>
                            {FASES_CARDIO.map((fase) => {
                              const { valor: campoValor, unidad: campoUnidad } = FASE_CAMPOS[fase]
                              return (
                                <td key={fase} className={tdBase}>
                                  <div className="flex min-w-0 items-center gap-1.5">
                                    <input
                                      className={`${inputBase} w-16 shrink-0`}
                                      inputMode="decimal"
                                      placeholder="30"
                                      defaultValue={item[campoValor] ?? ''}
                                      onBlur={(e) => guardarFaseCardio(item, fase, { valor: e.target.value })}
                                    />
                                    <Select
                                      value={item[campoUnidad] ?? 'minutos'}
                                      onChange={(v) => guardarFaseCardio(item, fase, { unidad: v })}
                                      options={UNIDADES_CARDIO}
                                      className="w-20 shrink-0"
                                    />
                                  </div>
                                </td>
                              )
                            })}
                            <td className={tdBase}>
                              <NotaTextarea
                                rows={1}
                                className={inputBase}
                                placeholder="Opcional"
                                defaultValue={item.notas}
                                onSave={(value) => {
                                  actualizarCampo(item.id, 'notas', value)
                                  guardar({ ...item, notas: value || null })
                                }}
                              />
                            </td>
                            <td className={tdBase}>
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
                </div>
              ) : null}
            </div>
          )}
        </>
      )}

      <EjercicioModal ejercicio={ejercicioAbierto} onClose={() => setEjercicioAbierto(null)} />
    </fieldset>
  )
}
