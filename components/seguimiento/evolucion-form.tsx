'use client'

import { MessageSquarePlus } from 'lucide-react'
import { useFormState, useFormStatus } from 'react-dom'

import {
  crearEntradaEvolucionAction,
  type EvolucionState,
} from '@/actions/evolucion'

const initial: EvolucionState = {}
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
      <MessageSquarePlus className="size-4" />
      {pending ? 'Guardando…' : 'Agregar entrada'}
    </button>
  )
}

export function EvolucionForm({
  pacienteId,
  defaultOrigen = 'nutricion',
}: {
  pacienteId: string
  defaultOrigen?: 'nutricion' | 'entrenamiento'
}) {
  const [state, action] = useFormState(crearEntradaEvolucionAction, initial)
  return (
    <form
      action={action}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4"
    >
      <input type="hidden" name="paciente_id" value={pacienteId} />
      <h3 className="font-heading font-semibold text-gray-900">Nueva entrada</h3>

      {state.error ? (
        <div className="rounded-lg bg-vimet-red/10 border border-vimet-red/20 px-4 py-2 text-sm text-vimet-red">
          {state.error}
        </div>
      ) : null}
      {state.ok ? (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-700">
          Entrada agregada.
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <label className="block">
          <span className="block font-medium text-gray-800 mb-1">Origen</span>
          <select name="origen" defaultValue={defaultOrigen} className={inputBase}>
            <option value="nutricion">Nutrición</option>
            <option value="entrenamiento">Entrenamiento</option>
          </select>
        </label>
        <label className="block">
          <span className="block font-medium text-gray-800 mb-1">Tipo</span>
          <select name="tipo" defaultValue="evolucion" className={inputBase}>
            <option value="evolucion">Evolución</option>
            <option value="observacion">Observación</option>
          </select>
        </label>
        <label className="block">
          <span className="block font-medium text-gray-800 mb-1">Visible al paciente</span>
          <select name="visible_paciente" defaultValue="false" className={inputBase}>
            <option value="false">No</option>
            <option value="true">Sí</option>
          </select>
        </label>
      </div>

      <label className="block text-sm">
        <span className="block font-medium text-gray-800 mb-1">Contenido</span>
        <textarea name="contenido" rows={4} required className={inputBase} />
      </label>

      <Btn />
    </form>
  )
}
