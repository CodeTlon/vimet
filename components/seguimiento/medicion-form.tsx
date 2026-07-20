'use client'

import { Plus, Save } from 'lucide-react'
import { useEffect } from 'react'
import { useFormState, useFormStatus } from 'react-dom'

import {
  actualizarMedicionAction,
  crearMedicionAction,
  type MedicionState,
} from '@/actions/mediciones'
import {
  useAutoHideMessage,
  useResetOnSuccess,
  useScrollToMessage,
} from '@/components/seguimiento/use-reset-on-success'
import { NotaTextarea } from '@/components/ui/nota-textarea'
import { haceDiasArgentina, hoyArgentina } from '@/lib/datetime'

const initial: MedicionState = {}
const inputBase =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40 focus:border-vimet-orange resize-none'

type Medicion = {
  id: number
  fecha_medicion: string
  peso_kg: number | null
  talla_cm: number | null
  porc_grasa: number | null
  porc_masa_muscular: number | null
  kg_grasa: number | null
  kg_musculo: number | null
  dx_antropometrico: string | null
  observaciones: string | null
}

function Btn({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-vimet-gradient text-white font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
    >
      {editing ? <Save className="size-4" /> : <Plus className="size-4" />}
      {pending ? 'Guardando…' : editing ? 'Guardar cambios' : 'Agregar medición'}
    </button>
  )
}

export function MedicionForm({
  pacienteId,
  medicion,
  onCancel,
}: {
  pacienteId: string
  medicion?: Medicion
  onCancel?: () => void
}) {
  const editing = Boolean(medicion)
  const [state, action] = useFormState(
    editing ? actualizarMedicionAction : crearMedicionAction,
    initial,
  )
  const formRef = useResetOnSuccess(state)
  const msgRef = useScrollToMessage(state)
  const visible = useAutoHideMessage(state)
  const today = hoyArgentina()
  const hace7Dias = haceDiasArgentina(7)

  useEffect(() => {
    if (editing && state.ok) onCancel?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  return (
    <form
      ref={editing ? undefined : formRef}
      action={action}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4"
    >
      <input type="hidden" name="paciente_id" value={pacienteId} />
      {editing ? <input type="hidden" name="id" value={medicion!.id} /> : null}
      {!editing ? <h3 className="font-heading font-semibold text-gray-900">Nueva medición</h3> : null}

      <div ref={msgRef}>
        {visible && state.error ? (
          <div className="rounded-lg bg-vimet-red/10 border border-vimet-red/20 px-4 py-2 text-sm text-vimet-red">
            {state.error}
          </div>
        ) : null}
        {visible && state.ok && !editing ? (
          <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-700">
            Medición agregada.
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <Lab label="Fecha">
          <input
            type="date"
            name="fecha_medicion"
            defaultValue={medicion?.fecha_medicion ?? today}
            min={hace7Dias}
            max={today}
            className={inputBase}
            required
          />
        </Lab>
        <Lab label="Peso (kg)">
          <input
            type="number"
            step="0.1"
            name="peso_kg"
            defaultValue={medicion?.peso_kg ?? ''}
            placeholder="Ej: 72.5"
            className={inputBase}
          />
        </Lab>
        <Lab label="Talla (cm)">
          <input
            type="number"
            step="0.1"
            name="talla_cm"
            defaultValue={medicion?.talla_cm ?? ''}
            placeholder="Ej: 170"
            className={inputBase}
          />
        </Lab>
        <Lab label="DX antropométrico">
          <input
            name="dx_antropometrico"
            defaultValue={medicion?.dx_antropometrico ?? ''}
            placeholder="Ej: normopeso"
            className={inputBase}
          />
        </Lab>
        <Lab label="% grasa">
          <input
            type="number"
            step="0.01"
            name="porc_grasa"
            defaultValue={medicion?.porc_grasa ?? ''}
            placeholder="Ej: 22.05"
            className={inputBase}
          />
        </Lab>
        <Lab label="% masa muscular">
          <input
            type="number"
            step="0.01"
            name="porc_masa_muscular"
            defaultValue={medicion?.porc_masa_muscular ?? ''}
            placeholder="Ej: 38.05"
            className={inputBase}
          />
        </Lab>
        <Lab label="Kg grasa">
          <input
            type="number"
            step="0.1"
            name="kg_grasa"
            defaultValue={medicion?.kg_grasa ?? ''}
            placeholder="Ej: 16.0"
            className={inputBase}
          />
        </Lab>
        <Lab label="Kg músculo">
          <input
            type="number"
            step="0.1"
            name="kg_musculo"
            defaultValue={medicion?.kg_musculo ?? ''}
            placeholder="Ej: 27.5"
            className={inputBase}
          />
        </Lab>
      </div>
      <Lab label="Observaciones">
        <NotaTextarea
          name="observaciones"
          rows={2}
          defaultValue={medicion?.observaciones}
          placeholder="Notas de la medición (opcional)"
          className={inputBase}
        />
      </Lab>

      <div className="flex items-center gap-3">
        <Btn editing={editing} />
        {editing ? (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            Cancelar
          </button>
        ) : null}
      </div>
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
