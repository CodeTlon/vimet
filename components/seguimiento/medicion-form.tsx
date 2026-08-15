'use client'

import { ChevronDown, Plus, Save } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useFormStatus } from 'react-dom';
import { useActionState } from 'react';

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
  pliegue_triceps_mm: number | null
  pliegue_subescapular_mm: number | null
  pliegue_supraespinal_mm: number | null
  pliegue_abdominal_mm: number | null
  pliegue_muslo_mm: number | null
  pliegue_pierna_mm: number | null
  pliegue_biceps_mm: number | null
  pliegue_cresta_iliaca_mm: number | null
  perimetro_brazo_cm: number | null
  perimetro_muslo_cm: number | null
  perimetro_pierna_cm: number | null
  kg_tejido_muscular: number | null
  kg_tejido_oseo: number | null
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
  const [state, action] = useActionState(
    editing ? actualizarMedicionAction : crearMedicionAction,
    initial,
  )
  const formRef = useResetOnSuccess(state)
  const msgRef = useScrollToMessage(state)
  const visible = useAutoHideMessage(state)
  const today = hoyArgentina()
  const hace7Dias = haceDiasArgentina(7)
  const isakDetailsRef = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    if (editing && state.ok) onCancel?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  useEffect(() => {
    if (state.error?.includes('ISAK') && isakDetailsRef.current) {
      isakDetailsRef.current.open = true
    }
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
            type="text"
            inputMode="decimal"
            name="peso_kg"
            defaultValue={medicion?.peso_kg ?? ''}
            placeholder="Ej: 72,5"
            className={inputBase}
          />
        </Lab>
        <Lab label="Talla (cm)">
          <input
            type="text"
            inputMode="decimal"
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
            type="text"
            inputMode="decimal"
            name="porc_grasa"
            defaultValue={medicion?.porc_grasa ?? ''}
            placeholder="Ej: 22,05"
            className={inputBase}
          />
        </Lab>
        <Lab label="% masa muscular">
          <input
            type="text"
            inputMode="decimal"
            name="porc_masa_muscular"
            defaultValue={medicion?.porc_masa_muscular ?? ''}
            placeholder="Ej: 38,05"
            className={inputBase}
          />
        </Lab>
        <Lab label="Kg grasa">
          <input
            type="text"
            inputMode="decimal"
            name="kg_grasa"
            defaultValue={medicion?.kg_grasa ?? ''}
            placeholder="Ej: 16,0"
            className={inputBase}
          />
        </Lab>
        <Lab label="Kg músculo">
          <input
            type="text"
            inputMode="decimal"
            name="kg_musculo"
            defaultValue={medicion?.kg_musculo ?? ''}
            placeholder="Ej: 27,5"
            className={inputBase}
          />
        </Lab>
      </div>

      <details ref={isakDetailsRef} className="group border-t border-gray-100 pt-4">
        <summary className="cursor-pointer list-none flex items-center justify-between text-sm font-medium text-gray-800">
          <span>Datos ISAK (opcional)</span>
          <ChevronDown className="size-4 text-gray-400 transition-transform group-open:rotate-180" />
        </summary>

        <div className="mt-4 space-y-4">
          <IsakGrupo titulo="Pliegues cutáneos (mm)">
            <Lab label="Tríceps">
              <input type="text" inputMode="decimal" name="pliegue_triceps_mm" defaultValue={medicion?.pliegue_triceps_mm ?? ''} className={inputBase} />
            </Lab>
            <Lab label="Subescapular">
              <input type="text" inputMode="decimal" name="pliegue_subescapular_mm" defaultValue={medicion?.pliegue_subescapular_mm ?? ''} className={inputBase} />
            </Lab>
            <Lab label="Bíceps">
              <input type="text" inputMode="decimal" name="pliegue_biceps_mm" defaultValue={medicion?.pliegue_biceps_mm ?? ''} className={inputBase} />
            </Lab>
            <Lab label="Cresta ilíaca">
              <input type="text" inputMode="decimal" name="pliegue_cresta_iliaca_mm" defaultValue={medicion?.pliegue_cresta_iliaca_mm ?? ''} className={inputBase} />
            </Lab>
            <Lab label="Supraespinal">
              <input type="text" inputMode="decimal" name="pliegue_supraespinal_mm" defaultValue={medicion?.pliegue_supraespinal_mm ?? ''} className={inputBase} />
            </Lab>
            <Lab label="Abdominal">
              <input type="text" inputMode="decimal" name="pliegue_abdominal_mm" defaultValue={medicion?.pliegue_abdominal_mm ?? ''} className={inputBase} />
            </Lab>
            <Lab label="Muslo">
              <input type="text" inputMode="decimal" name="pliegue_muslo_mm" defaultValue={medicion?.pliegue_muslo_mm ?? ''} className={inputBase} />
            </Lab>
            <Lab label="Pierna">
              <input type="text" inputMode="decimal" name="pliegue_pierna_mm" defaultValue={medicion?.pliegue_pierna_mm ?? ''} className={inputBase} />
            </Lab>
          </IsakGrupo>

          <IsakGrupo titulo="Perímetros (cm)">
            <Lab label="Brazo relajado">
              <input type="text" inputMode="decimal" name="perimetro_brazo_cm" defaultValue={medicion?.perimetro_brazo_cm ?? ''} className={inputBase} />
            </Lab>
            <Lab label="Muslo medio">
              <input type="text" inputMode="decimal" name="perimetro_muslo_cm" defaultValue={medicion?.perimetro_muslo_cm ?? ''} className={inputBase} />
            </Lab>
            <Lab label="Pierna">
              <input type="text" inputMode="decimal" name="perimetro_pierna_cm" defaultValue={medicion?.perimetro_pierna_cm ?? ''} className={inputBase} />
            </Lab>
          </IsakGrupo>

          <IsakGrupo titulo="Composición tisular (kg)">
            <Lab label="Tejido muscular">
              <input type="text" inputMode="decimal" name="kg_tejido_muscular" defaultValue={medicion?.kg_tejido_muscular ?? ''} className={inputBase} />
            </Lab>
            <Lab label="Tejido óseo">
              <input type="text" inputMode="decimal" name="kg_tejido_oseo" defaultValue={medicion?.kg_tejido_oseo ?? ''} className={inputBase} />
            </Lab>
          </IsakGrupo>
        </div>
      </details>

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

function IsakGrupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{titulo}</span>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">{children}</div>
    </div>
  )
}
