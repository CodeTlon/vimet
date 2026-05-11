'use client'

import { Plus } from 'lucide-react'
import { useFormState, useFormStatus } from 'react-dom'

import { crearMedicionAction, type MedicionState } from '@/actions/mediciones'

const initial: MedicionState = {}
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
      {pending ? 'Guardando…' : 'Agregar medición'}
    </button>
  )
}

export function MedicionForm({ pacienteId }: { pacienteId: string }) {
  const [state, action] = useFormState(crearMedicionAction, initial)
  const today = new Date().toISOString().slice(0, 10)
  return (
    <form
      action={action}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4"
    >
      <input type="hidden" name="paciente_id" value={pacienteId} />
      <h3 className="font-heading font-semibold text-gray-900">Nueva medición</h3>

      {state.error ? (
        <div className="rounded-lg bg-vimet-red/10 border border-vimet-red/20 px-4 py-2 text-sm text-vimet-red">
          {state.error}
        </div>
      ) : null}
      {state.ok ? (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-700">
          Medición agregada.
        </div>
      ) : null}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <Lab label="Fecha">
          <input type="date" name="fecha_medicion" defaultValue={today} className={inputBase} required />
        </Lab>
        <Lab label="Peso (kg)">
          <input type="number" step="0.1" name="peso_kg" className={inputBase} />
        </Lab>
        <Lab label="Talla (cm)">
          <input type="number" step="0.1" name="talla_cm" className={inputBase} />
        </Lab>
        <Lab label="DX antropométrico">
          <input name="dx_antropometrico" className={inputBase} />
        </Lab>
        <Lab label="% grasa">
          <input type="number" step="0.1" name="porc_grasa" className={inputBase} />
        </Lab>
        <Lab label="% masa muscular">
          <input type="number" step="0.1" name="porc_masa_muscular" className={inputBase} />
        </Lab>
        <Lab label="Kg grasa">
          <input type="number" step="0.1" name="kg_grasa" className={inputBase} />
        </Lab>
        <Lab label="Kg músculo">
          <input type="number" step="0.1" name="kg_musculo" className={inputBase} />
        </Lab>
      </div>
      <Lab label="Observaciones">
        <textarea name="observaciones" rows={2} className={inputBase} />
      </Lab>

      <Btn />
    </form>
  )
}

function Lab({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block font-medium text-gray-800 mb-1">{label}</span>
      {children}
    </label>
  )
}
