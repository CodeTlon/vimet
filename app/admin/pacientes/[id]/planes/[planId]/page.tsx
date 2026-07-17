import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PlanForm } from '@/components/seguimiento/plan-form'
import { RutinaPanel, type RutinaItem } from '@/components/seguimiento/rutina-panel'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function EditarPlanPage(
  props: {
    params: Promise<{ id: string; planId: string }>
  }
) {
  const params = await props.params;
  const planId = Number(params.planId)
  const supabase = await createClient()
  const { data: plan } = await supabase
    .from('planes')
    .select('*')
    .eq('id', planId)
    .eq('paciente_id', params.id)
    .maybeSingle()
  if (!plan) notFound()

  const tieneRutina = plan.tipo === 'entrenamiento' || plan.tipo === 'combo'

  const [{ data: catalogo }, { data: rutina }] = tieneRutina
    ? await Promise.all([
        supabase
          .from('ejercicios')
          .select('id, nombre, parte_cuerpo, equipo, musculo_principal, imagen_url')
          .order('nombre'),
        supabase
          .from('plan_ejercicios')
          .select('id, ejercicio_id, dia_semana, orden, series, repeticiones, descanso_seg, notas, ejercicio:ejercicios(id, nombre, imagen_url)')
          .eq('plan_id', planId),
      ])
    : [{ data: [] }, { data: [] }]

  return (
    <div className="space-y-4">
      <Link
        href={`/admin/pacientes/${params.id}/planes`}
        className="inline-flex items-center gap-1 text-sm text-gray-700 hover:text-vimet-orange"
      >
        <ChevronLeft className="size-4" /> Planes
      </Link>
      <h2 className="font-heading text-xl font-semibold text-gray-900">Editar plan</h2>
      <PlanForm pacienteId={params.id} plan={plan} />
      {tieneRutina ? (
        <RutinaPanel
          planId={planId}
          pacienteId={params.id}
          catalogo={catalogo ?? []}
          rutinaInicial={(rutina ?? []) as unknown as RutinaItem[]}
        />
      ) : null}
    </div>
  )
}
