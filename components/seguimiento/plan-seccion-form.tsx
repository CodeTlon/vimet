'use client'

import { Save, Trash2, X } from 'lucide-react'
import { useActionState, useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'

import {
  actualizarSeccionAction,
  crearSeccionAction,
  eliminarImagenSeccionAction,
  type SeccionState,
} from '@/actions/plan-secciones'
import { TIPO_SECCION_PLAN_LABEL, type TipoSeccionPlan } from '@/lib/seguimiento'

const initial: SeccionState = {}
const inputBase =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40 focus:border-vimet-orange'

export type ImagenSeccion = { id: number; url: string }
export type MomentoSeccion = { id: number; nombre_momento: string; contenido: string }
export type Seccion = {
  id: number
  tipo: TipoSeccionPlan
  titulo: string
  contenido: string | null
  momentos: MomentoSeccion[]
  imagenes: ImagenSeccion[]
}

function Btn({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-vimet-gradient text-white font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
    >
      <Save className="size-4" />
      {pending ? 'Guardando…' : editing ? 'Guardar cambios' : 'Agregar sección'}
    </button>
  )
}

function ImagenExistente({
  imagen,
  planId,
  pacienteId,
}: {
  imagen: ImagenSeccion
  planId: number
  pacienteId: string
}) {
  const [oculta, setOculta] = useState(false)
  if (oculta) return null
  return (
    <form
      action={eliminarImagenSeccionAction}
      onSubmit={() => setOculta(true)}
      className="relative"
    >
      <input type="hidden" name="id" value={imagen.id} />
      <input type="hidden" name="plan_id" value={planId} />
      <input type="hidden" name="paciente_id" value={pacienteId} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imagen.url} alt="" className="h-20 w-20 rounded-lg object-cover border border-gray-200" />
      <button
        type="submit"
        aria-label="Quitar imagen"
        className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center size-5 rounded-full bg-white text-gray-500 border border-gray-200 hover:text-vimet-red shadow-sm"
      >
        <X className="size-3" />
      </button>
    </form>
  )
}

function MomentosFields({ momentos: iniciales }: { momentos: MomentoSeccion[] }) {
  const [filas, setFilas] = useState(() =>
    iniciales.length > 0
      ? iniciales.map((m) => ({ key: m.id, nombre_momento: m.nombre_momento, contenido: m.contenido }))
      : [{ key: 0, nombre_momento: '', contenido: '' }],
  )
  const nextKey = useRef(Math.max(0, ...filas.map((f) => f.key)) + 1)

  return (
    <div className="sm:col-span-2 space-y-3">
      {filas.map((f) => (
        <div key={f.key} className="rounded-lg border border-gray-200 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <input
              name="momento_nombre"
              defaultValue={f.nombre_momento}
              required
              placeholder="Ej: Desayuno, Media mañana..."
              className={`${inputBase} font-medium`}
            />
            {filas.length > 1 ? (
              <button
                type="button"
                aria-label="Quitar momento"
                onClick={() => setFilas((prev) => prev.filter((x) => x.key !== f.key))}
                className="shrink-0 inline-flex items-center justify-center size-8 rounded-full text-gray-400 hover:text-vimet-red hover:bg-gray-50"
              >
                <Trash2 className="size-4" />
              </button>
            ) : null}
          </div>
          <textarea
            name="momento_contenido"
            defaultValue={f.contenido}
            required
            rows={3}
            placeholder="Nutrientes e ideas de comida para este momento"
            className={`${inputBase} resize-none`}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => setFilas((prev) => [...prev, { key: nextKey.current++, nombre_momento: '', contenido: '' }])}
        className="text-sm font-medium text-vimet-orange hover:text-vimet-red transition-colors"
      >
        + Agregar momento del día
      </button>
    </div>
  )
}

export function PlanSeccionForm({
  planId,
  pacienteId,
  tipo,
  seccion,
  onDone,
}: {
  planId: number
  pacienteId: string
  tipo: TipoSeccionPlan
  seccion?: Seccion
  onDone: () => void
}) {
  const editing = Boolean(seccion)
  const [state, action] = useActionState(editing ? actualizarSeccionAction : crearSeccionAction, initial)

  useEffect(() => {
    if (state.ok) onDone()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  const requiereImagenes = tipo === 'imagenes' && (!seccion || seccion.imagenes.length === 0)

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="plan_id" value={planId} />
      <input type="hidden" name="paciente_id" value={pacienteId} />
      <input type="hidden" name="tipo" value={tipo} />
      {seccion ? <input type="hidden" name="id" value={seccion.id} /> : null}

      {state.error ? <p className="text-sm text-vimet-red">{state.error}</p> : null}

      <label className="block text-sm">
        <span className="block font-medium text-gray-800 mb-1">Título</span>
        <input
          name="titulo"
          defaultValue={seccion?.titulo ?? TIPO_SECCION_PLAN_LABEL[tipo]}
          className={inputBase}
        />
      </label>

      {(tipo === 'pautas_generales' || tipo === 'receta') && (
        <>
          <label className="block text-sm">
            <span className="block font-medium text-gray-800 mb-1">Contenido</span>
            <textarea
              name="contenido"
              defaultValue={seccion?.contenido ?? ''}
              required
              rows={8}
              placeholder={
                tipo === 'receta'
                  ? 'Ingredientes y preparación'
                  : 'Indicaciones, recomendaciones generales, etc.'
              }
              className={`${inputBase} resize-none`}
            />
          </label>
          {seccion && seccion.imagenes.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {seccion.imagenes.map((img) => (
                <ImagenExistente key={img.id} imagen={img} planId={planId} pacienteId={pacienteId} />
              ))}
            </div>
          ) : null}
          <label className="block text-sm">
            <span className="block font-medium text-gray-800 mb-1">
              {seccion?.imagenes.length ? 'Agregar más imágenes (opcional)' : 'Imágenes (opcional)'}
            </span>
            <input type="file" name="imagenes" accept="image/*" multiple className="text-sm" />
          </label>
        </>
      )}

      {tipo === 'comidas_dia' ? <MomentosFields momentos={seccion?.momentos ?? []} /> : null}

      {tipo === 'imagenes' && (
        <>
          <p className="text-sm text-gray-500">
            Estas imágenes no se muestran grandes en el detalle del plan — se van a usar para imprimir el
            plan más adelante.
          </p>
          {seccion && seccion.imagenes.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {seccion.imagenes.map((img) => (
                <ImagenExistente key={img.id} imagen={img} planId={planId} pacienteId={pacienteId} />
              ))}
            </div>
          ) : null}
          <label className="block text-sm">
            <span className="block font-medium text-gray-800 mb-1">
              {requiereImagenes ? 'Imágenes' : 'Agregar más imágenes'}
            </span>
            <input
              type="file"
              name="imagenes"
              accept="image/*"
              multiple
              required={requiereImagenes}
              className="text-sm"
            />
          </label>
        </>
      )}

      <Btn editing={editing} />
    </form>
  )
}
