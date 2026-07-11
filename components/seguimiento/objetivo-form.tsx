'use client'

import { Plus } from 'lucide-react'
import { useFormState, useFormStatus } from 'react-dom'

import { crearObjetivoAction, type ObjetivoState } from '@/actions/objetivos'
import { useResetOnSuccess } from '@/components/seguimiento/use-reset-on-success'
import { CATEGORIA_OBJETIVO_LABEL } from '@/lib/seguimiento'
import { hoyArgentina } from '@/lib/datetime'

const initial: ObjetivoState = {}
const hoy = hoyArgentina()
const inputBase =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40 focus:border-vimet-orange'

function Btn() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-vimet-gradient text-white font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
    >
      <Plus className="size-4" />
      {pending ? 'Guardando…' : 'Agregar objetivo'}
    </button>
  )
}

export function ObjetivoForm({ pacienteId }: { pacienteId: string }) {
  const [state, action] = useFormState(crearObjetivoAction, initial)
  const formRef = useResetOnSuccess(state)
  return (
    <form
      ref={formRef}
      action={action}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4"
    >
      <input type="hidden" name="paciente_id" value={pacienteId} />
      <h3 className="font-heading font-semibold text-gray-900">Nuevo objetivo</h3>

      {state.error ? (
        <div className="rounded-lg bg-vimet-red/10 border border-vimet-red/20 px-4 py-2 text-sm text-vimet-red">
          {state.error}
        </div>
      ) : null}
      {state.ok ? (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-700">
          Objetivo creado.
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <label className="block">
          <span className="block font-medium text-gray-800 mb-1">Categoría</span>
          <select name="categoria" defaultValue="nutricional" className={inputBase}>
            {Object.entries(CATEGORIA_OBJETIVO_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block font-medium text-gray-800 mb-1">Estado</span>
          <select name="estado" defaultValue="pendiente" className={inputBase}>
            <option value="pendiente">Pendiente</option>
            <option value="en_progreso">En progreso</option>
            <option value="cumplido">Cumplido</option>
            <option value="descartado">Descartado</option>
          </select>
        </label>
        <label className="block">
          <span className="block font-medium text-gray-800 mb-1">Fecha objetivo</span>
          <input type="date" name="fecha_objetivo" min={hoy} className={inputBase} />
        </label>
      </div>

      <label className="block text-sm">
        <span className="block font-medium text-gray-800 mb-1">Descripción</span>
        <textarea name="descripcion" rows={3} required placeholder="Ej: Bajar 5% de grasa corporal en 3 meses" className={inputBase} />
      </label>

      <Btn />
    </form>
  )
}
