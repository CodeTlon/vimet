'use client'

import { Save } from 'lucide-react'
import { useState } from 'react'
import { useFormStatus } from 'react-dom';
import { useActionState } from 'react';

import {
  actualizarPlanAction,
  crearPlanAction,
  type PlanState,
} from '@/actions/planes'
import {
  useAutoHideMessage,
  useRemountKeyOnSuccess,
  useScrollToMessage,
} from '@/components/seguimiento/use-reset-on-success'
import { NotaTextarea } from '@/components/ui/nota-textarea'
import { Select } from '@/components/ui/select'
import { hoyArgentina } from '@/lib/datetime'

const initial: PlanState = {}
const inputBase =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40 focus:border-vimet-orange resize-none'

type Plan = {
  id: number
  paciente_id: string
  tipo: 'nutricion' | 'entrenamiento' | 'combo'
  titulo: string
  estado: 'vigente' | 'archivado' | 'borrador'
  fecha_desde: string
  fecha_hasta: string | null
  archivo_path: string | null
  disciplina: string | null
  experiencia_previa: string | null
  frecuencia: string | null
  volumen: string | null
  disponibilidad_lunes: string | null
  disponibilidad_martes: string | null
  disponibilidad_miercoles: string | null
  disponibilidad_jueves: string | null
  disponibilidad_viernes: string | null
  disponibilidad_sabado: string | null
  notas: string | null
}

function Btn({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-vimet-gradient text-white font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
    >
      <Save className="size-4" />
      {pending ? 'Guardando…' : children}
    </button>
  )
}

export function PlanForm({
  pacienteId,
  plan,
  rutina,
  secciones,
}: {
  pacienteId: string
  plan?: Plan
  rutina?: React.ReactNode
  secciones?: React.ReactNode
}) {
  const editing = Boolean(plan)
  const [state, action] = useActionState(
    editing ? actualizarPlanAction : crearPlanAction,
    initial,
  )
  const p = plan
  const remountKey = useRemountKeyOnSuccess(state)
  const msgRef = useScrollToMessage(state)
  const visible = useAutoHideMessage(state)
  const [fechaDesde, setFechaDesde] = useState(p?.fecha_desde ?? hoyArgentina())
  const [tipo, setTipo] = useState(p?.tipo ?? 'nutricion')

  return (
    <form key={remountKey} action={action} className="space-y-6">
      <input type="hidden" name="paciente_id" value={pacienteId} />
      {editing ? <input type="hidden" name="id" value={p!.id} /> : null}

      <div ref={msgRef}>
        {visible && state.error ? (
          <div className="rounded-lg bg-vimet-red/10 border border-vimet-red/20 px-4 py-3 text-sm text-vimet-red">
            {state.error}
          </div>
        ) : null}
        {visible && state.ok ? (
          <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            Plan guardado correctamente.
          </div>
        ) : null}
      </div>

      <Section title="Datos del plan">
        <Field label="Tipo">
          <Select
            name="tipo"
            value={tipo}
            onChange={(v) => setTipo(v as typeof tipo)}
            options={[
              { value: 'nutricion', label: 'Nutrición' },
              { value: 'entrenamiento', label: 'Entrenamiento' },
              { value: 'combo', label: 'Combo' },
            ]}
          />
        </Field>
        <Field label="Estado">
          <Select
            name="estado"
            defaultValue={p?.estado ?? 'vigente'}
            options={[
              { value: 'vigente', label: 'Vigente' },
              { value: 'archivado', label: 'Archivado' },
              { value: 'borrador', label: 'Borrador' },
            ]}
          />
        </Field>
        <FullField label="Título">
          <input
            name="titulo"
            defaultValue={p?.titulo ?? ''}
            required
            placeholder="Ej: Plan nutricional — Mayo 2026"
            className={inputBase}
          />
        </FullField>
        <Field label="Vigente desde">
          <input
            type="date"
            name="fecha_desde"
            defaultValue={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            required
            className={inputBase}
          />
        </Field>
        <Field label="Vigente hasta (opcional)">
          <input
            type="date"
            name="fecha_hasta"
            defaultValue={p?.fecha_hasta ?? ''}
            min={fechaDesde}
            className={inputBase}
          />
        </Field>
      </Section>

      <Section title="Material auxiliar">
        {p?.archivo_path ? (
          <FullField label="Archivo actual">
            <p className="text-sm text-gray-700 break-all">
              {p.archivo_path.split('/').slice(1).join('/')}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Si subís uno nuevo, reemplaza al actual.
            </p>
          </FullField>
        ) : null}
        <FullField label={p?.archivo_path ? 'Nuevo material auxiliar (opcional)' : 'Material auxiliar (opcional, máx 15MB)'}>
          <input type="file" name="archivo" form={formId} accept="application/pdf" className="text-sm" />
        </FullField>
      </Section>

      {secciones}

      {tipo !== 'nutricion' && (
      <Section title="Datos de entrenamiento">
        <Field label="Disciplina">
          <input name="disciplina" defaultValue={p?.disciplina ?? ''} placeholder="Ej: Musculación" className={inputBase} />
        </Field>
        <Field label="Frecuencia">
          <input name="frecuencia" defaultValue={p?.frecuencia ?? ''} placeholder="Ej: 4 días/semana" className={inputBase} />
        </Field>
        <FullField label="Experiencia previa">
          <NotaTextarea
            name="experiencia_previa"
            rows={2}
            defaultValue={p?.experiencia_previa}
            placeholder="Ej: 2 años de musculación, antecedentes deportivos"
            className={inputBase}
          />
        </FullField>
        <FullField label="Volumen / orientación general">
          <NotaTextarea
            name="volumen"
            rows={2}
            defaultValue={p?.volumen}
            placeholder="Ej: 12–16 series por grupo muscular, progresión semanal"
            className={inputBase}
          />
        </FullField>
        <Field label="Lunes">
          <input
            name="disponibilidad_lunes"
            defaultValue={p?.disponibilidad_lunes ?? ''}
            placeholder="Ej: 18–19 hs"
            className={inputBase}
          />
        </Field>
        <Field label="Martes">
          <input
            name="disponibilidad_martes"
            defaultValue={p?.disponibilidad_martes ?? ''}
            placeholder="Ej: 18–19 hs"
            className={inputBase}
          />
        </Field>
        <Field label="Miércoles">
          <input
            name="disponibilidad_miercoles"
            defaultValue={p?.disponibilidad_miercoles ?? ''}
            placeholder="Ej: 18–19 hs"
            className={inputBase}
          />
        </Field>
        <Field label="Jueves">
          <input
            name="disponibilidad_jueves"
            defaultValue={p?.disponibilidad_jueves ?? ''}
            placeholder="Ej: 18–19 hs"
            className={inputBase}
          />
        </Field>
        <Field label="Viernes">
          <input
            name="disponibilidad_viernes"
            defaultValue={p?.disponibilidad_viernes ?? ''}
            placeholder="Ej: 18–19 hs"
            className={inputBase}
          />
        </Field>
        <Field label="Sábado">
          <input
            name="disponibilidad_sabado"
            defaultValue={p?.disponibilidad_sabado ?? ''}
            placeholder="Ej: 10–11 hs"
            className={inputBase}
          />
        </Field>
      </Section>
      )}

      {rutina}

      <Section title="Notas">
        <FullField label="Notas internas / extra">
          <NotaTextarea name="notas" rows={4} defaultValue={p?.notas} placeholder="Notas internas o aclaraciones extra del plan" className={inputBase} />
        </FullField>
      </Section>

      <Btn>{editing ? 'Guardar cambios' : 'Crear plan'}</Btn>
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
