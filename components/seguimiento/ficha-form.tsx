'use client'

import { Save } from 'lucide-react'
import { useFormState, useFormStatus } from 'react-dom'

import { guardarFichaAction, type FichaState } from '@/actions/ficha'

const initial: FichaState = {}

type Ficha = {
  paciente_id: string
  fecha_nacimiento: string | null
  sexo: 'femenino' | 'masculino' | 'otro' | null
  ocupacion: string | null
  fecha_primera_consulta: string | null
  fuma: boolean | null
  bebe: boolean | null
  drogas: boolean | null
  entrena: boolean | null
  actividad_diaria: string | null
  horas_sueno: number | null
  dx_medico: string | null
  dx_nutricional: string | null
  medicacion: string | null
  suplementacion: string | null
  lesiones: string | null
  molestias: string | null
  datos_laboratorio: string | null
  motivos_consulta: string | null
  observaciones_internas: string | null
}

const inputBase =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40 focus:border-vimet-orange'

function bv(v: boolean | null | undefined) {
  if (v === true) return 'true'
  if (v === false) return 'false'
  return ''
}

function SaveButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-vimet-gradient text-white font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
    >
      <Save className="size-4" />
      {pending ? 'Guardando…' : 'Guardar ficha'}
    </button>
  )
}

export function FichaForm({
  pacienteId,
  ficha,
}: {
  pacienteId: string
  ficha: Ficha | null
}) {
  const [state, action] = useFormState(guardarFichaAction, initial)
  const f = ficha

  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="paciente_id" value={pacienteId} />

      {state.error ? (
        <div className="rounded-lg bg-vimet-red/10 border border-vimet-red/20 px-4 py-3 text-sm text-vimet-red">
          {state.error}
        </div>
      ) : null}
      {state.ok ? (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          Ficha guardada correctamente.
        </div>
      ) : null}

      <Section title="Datos personales">
        <Field label="Fecha de nacimiento">
          <input
            type="date"
            name="fecha_nacimiento"
            defaultValue={f?.fecha_nacimiento ?? ''}
            className={inputBase}
          />
        </Field>
        <Field label="Sexo">
          <select name="sexo" defaultValue={f?.sexo ?? ''} className={inputBase}>
            <option value="">—</option>
            <option value="femenino">Femenino</option>
            <option value="masculino">Masculino</option>
            <option value="otro">Otro</option>
          </select>
        </Field>
        <Field label="Ocupación">
          <input name="ocupacion" defaultValue={f?.ocupacion ?? ''} className={inputBase} />
        </Field>
        <Field label="Fecha 1ª consulta">
          <input
            type="date"
            name="fecha_primera_consulta"
            defaultValue={f?.fecha_primera_consulta ?? ''}
            className={inputBase}
          />
        </Field>
      </Section>

      <Section title="Hábitos">
        <BoolField label="¿Fuma?" name="fuma" value={bv(f?.fuma)} />
        <BoolField label="¿Bebe alcohol?" name="bebe" value={bv(f?.bebe)} />
        <BoolField label="¿Consume otras drogas?" name="drogas" value={bv(f?.drogas)} />
        <BoolField label="¿Entrena actualmente?" name="entrena" value={bv(f?.entrena)} />
        <Field label="Actividad diaria">
          <select
            name="actividad_diaria"
            defaultValue={f?.actividad_diaria ?? ''}
            className={inputBase}
          >
            <option value="">—</option>
            <option value="poca">Poca</option>
            <option value="normal">Normal</option>
            <option value="mucha">Mucha</option>
          </select>
        </Field>
        <Field label="Horas de sueño">
          <input
            type="number"
            step="0.5"
            min="0"
            max="24"
            name="horas_sueno"
            defaultValue={f?.horas_sueno ?? ''}
            className={inputBase}
          />
        </Field>
      </Section>

      <Section title="Salud">
        <FullField label="Diagnóstico médico">
          <textarea
            name="dx_medico"
            rows={2}
            defaultValue={f?.dx_medico ?? ''}
            className={inputBase}
          />
        </FullField>
        <FullField label="Diagnóstico nutricional">
          <textarea
            name="dx_nutricional"
            rows={2}
            defaultValue={f?.dx_nutricional ?? ''}
            className={inputBase}
          />
        </FullField>
        <FullField label="Medicación">
          <textarea
            name="medicacion"
            rows={2}
            defaultValue={f?.medicacion ?? ''}
            className={inputBase}
          />
        </FullField>
        <FullField label="Suplementación">
          <textarea
            name="suplementacion"
            rows={2}
            defaultValue={f?.suplementacion ?? ''}
            className={inputBase}
          />
        </FullField>
        <FullField label="Lesiones">
          <textarea
            name="lesiones"
            rows={2}
            defaultValue={f?.lesiones ?? ''}
            className={inputBase}
          />
        </FullField>
        <FullField label="Molestias / pinzamientos">
          <textarea
            name="molestias"
            rows={2}
            defaultValue={f?.molestias ?? ''}
            className={inputBase}
          />
        </FullField>
      </Section>

      <Section title="Laboratorio y motivos">
        <FullField label="Datos de laboratorio de interés">
          <textarea
            name="datos_laboratorio"
            rows={4}
            defaultValue={f?.datos_laboratorio ?? ''}
            className={inputBase}
          />
        </FullField>
        <FullField label="Motivos de la consulta">
          <textarea
            name="motivos_consulta"
            rows={3}
            defaultValue={f?.motivos_consulta ?? ''}
            className={inputBase}
          />
        </FullField>
        <FullField label="Observaciones internas (no visibles al paciente)">
          <textarea
            name="observaciones_internas"
            rows={3}
            defaultValue={f?.observaciones_internas ?? ''}
            className={inputBase}
          />
        </FullField>
      </Section>

      <SaveButton />
    </form>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <legend className="px-2 font-heading font-semibold text-gray-900">{title}</legend>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </fieldset>
  )
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="block font-medium text-gray-800 mb-1">{label}</span>
      {children}
    </label>
  )
}
function FullField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm sm:col-span-2">
      <span className="block font-medium text-gray-800 mb-1">{label}</span>
      {children}
    </label>
  )
}
function BoolField({ label, name, value }: { label: string; name: string; value: string }) {
  return (
    <Field label={label}>
      <select name={name} defaultValue={value} className={inputBase}>
        <option value="">—</option>
        <option value="true">Sí</option>
        <option value="false">No</option>
      </select>
    </Field>
  )
}
