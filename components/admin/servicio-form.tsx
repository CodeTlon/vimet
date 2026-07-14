'use client'

import { useFormState, useFormStatus } from 'react-dom'

import type { ContenidoState } from '@/actions/contenido'
import { useResetOnSuccess, useScrollToMessage } from '@/components/seguimiento/use-reset-on-success'

const inputBase =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40 focus:border-vimet-orange resize-none'

const ICONOS = ['Apple', 'Activity', 'HeartPulse', 'Sprout', 'Dumbbell', 'Stethoscope', 'HandHeart']

export type ServicioDefaults = {
  id?: number
  nombre?: string
  descripcion?: string | null
  duracion_minutos?: number
  tipo?: string
  icono?: string | null
  profesional_id?: string | null
}

function Btn({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-vimet-gradient text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
    >
      {pending ? 'Guardando…' : label}
    </button>
  )
}

export function ServicioForm({
  action,
  servicio,
  profesionales,
  submitLabel,
}: {
  action: (prev: ContenidoState, formData: FormData) => Promise<ContenidoState>
  servicio?: ServicioDefaults
  profesionales: { id: string; nombre: string }[]
  submitLabel: string
}) {
  const [state, formAction] = useFormState(action, {})
  const formRef = useResetOnSuccess(state)
  const msgRef = useScrollToMessage(state)

  return (
    <form
      ref={formRef}
      action={formAction}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4"
    >
      {servicio?.id ? <input type="hidden" name="id" value={servicio.id} /> : null}

      <div ref={msgRef}>
        {state.error ? (
          <div className="rounded-lg bg-vimet-red/10 border border-vimet-red/20 px-4 py-2 text-sm text-vimet-red">
            {state.error}
          </div>
        ) : null}
        {state.ok ? (
          <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-700">
            Guardado.
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <label className="block">
          <span className="block font-medium text-gray-800 mb-1">Nombre</span>
          <input name="nombre" required defaultValue={servicio?.nombre} className={inputBase} />
        </label>
        <label className="block">
          <span className="block font-medium text-gray-800 mb-1">Duración (min)</span>
          <input
            type="number"
            name="duracion_minutos"
            min={5}
            max={300}
            required
            defaultValue={servicio?.duracion_minutos ?? 60}
            className={inputBase}
          />
        </label>
        <label className="block">
          <span className="block font-medium text-gray-800 mb-1">Tipo</span>
          <select name="tipo" defaultValue={servicio?.tipo ?? 'nutricion'} className={inputBase}>
            <option value="nutricion">Nutrición</option>
            <option value="entrenamiento">Entrenamiento</option>
            <option value="combo">Plan Integral</option>
          </select>
        </label>
        <label className="block">
          <span className="block font-medium text-gray-800 mb-1">Ícono</span>
          <select name="icono" defaultValue={servicio?.icono ?? ICONOS[0]} className={inputBase}>
            {ICONOS.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className="block font-medium text-gray-800 mb-1">Profesional a cargo</span>
          <select name="profesional_id" defaultValue={servicio?.profesional_id ?? ''} className={inputBase}>
            <option value="">Sin asignar</option>
            {profesionales.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block text-sm">
        <span className="block font-medium text-gray-800 mb-1">Descripción</span>
        <textarea
          name="descripcion"
          rows={2}
          defaultValue={servicio?.descripcion ?? ''}
          className={inputBase}
        />
      </label>

      <Btn label={submitLabel} />
    </form>
  )
}
