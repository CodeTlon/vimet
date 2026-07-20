'use client'

import { Save } from 'lucide-react'
import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'

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
  pautas_generales: string | null
  pautas_hidratacion: string | null
  pre_entreno: string | null
  intra_entreno: string | null
  post_entreno: string | null
  suplementacion: string | null
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
}: {
  pacienteId: string
  plan?: Plan
  rutina?: React.ReactNode
}) {
  const editing = Boolean(plan)
  const [state, action] = useFormState(
    editing ? actualizarPlanAction : crearPlanAction,
    initial,
  )
  const p = plan
  const remountKey = useRemountKeyOnSuccess(state)
  const msgRef = useScrollToMessage(state)
  const visible = useAutoHideMessage(state)
  const [fechaDesde, setFechaDesde] = useState(p?.fecha_desde ?? hoyArgentina())

  return (
    <form key={remountKey} action={action} className="space-y-6" encType="multipart/form-data">
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
          <select name="tipo" defaultValue={p?.tipo ?? 'nutricion'} className={inputBase} required>
            <option value="nutricion">Nutrición</option>
            <option value="entrenamiento">Entrenamiento</option>
            <option value="combo">Combo</option>
          </select>
        </Field>
        <Field label="Estado">
          <select name="estado" defaultValue={p?.estado ?? 'vigente'} className={inputBase}>
            <option value="vigente">Vigente</option>
            <option value="archivado">Archivado</option>
            <option value="borrador">Borrador</option>
          </select>
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

      <Section title="PDF del plan">
        {p?.archivo_path ? (
          <FullField label="Archivo actual">
            <p className="text-sm text-gray-700 break-all">
              {p.archivo_path.split('/').slice(1).join('/')}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Si subís un PDF nuevo, reemplaza al actual.
            </p>
          </FullField>
        ) : null}
        <FullField label={p?.archivo_path ? 'Nuevo PDF (opcional)' : 'PDF (opcional, máx 15MB)'}>
          <input type="file" name="archivo" accept="application/pdf" className="text-sm" />
        </FullField>
      </Section>

      <Section title="Pautas nutricionales">
        <FullField label="Pautas generales">
          <NotaTextarea
            name="pautas_generales"
            rows={4}
            defaultValue={p?.pautas_generales}
            placeholder="Indicaciones generales del plan alimentario"
            className={inputBase}
          />
        </FullField>
        <FullField label="Pautas de hidratación">
          <NotaTextarea
            name="pautas_hidratacion"
            rows={2}
            defaultValue={p?.pautas_hidratacion}
            placeholder="Ej: 2,5 L de agua por día, más en días de entrenamiento"
            className={inputBase}
          />
        </FullField>
        <Field label="Pre entreno">
          <NotaTextarea
            name="pre_entreno"
            rows={2}
            defaultValue={p?.pre_entreno}
            placeholder="Qué consumir antes de entrenar"
            className={inputBase}
          />
        </Field>
        <Field label="Intra entreno">
          <NotaTextarea
            name="intra_entreno"
            rows={2}
            defaultValue={p?.intra_entreno}
            placeholder="Qué consumir durante el entrenamiento"
            className={inputBase}
          />
        </Field>
        <Field label="Post entreno">
          <NotaTextarea
            name="post_entreno"
            rows={2}
            defaultValue={p?.post_entreno}
            placeholder="Qué consumir después de entrenar"
            className={inputBase}
          />
        </Field>
        <Field label="Suplementación">
          <NotaTextarea
            name="suplementacion"
            rows={2}
            defaultValue={p?.suplementacion}
            placeholder="Suplementos sugeridos y dosis"
            className={inputBase}
          />
        </Field>
      </Section>

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
