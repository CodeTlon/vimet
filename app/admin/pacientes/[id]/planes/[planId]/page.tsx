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

  // Solo 2 columnas angostas de las 1324 filas (para armar los <select> de filtro),
  // no el catálogo completo con nombres/thumbnails — eso se busca on-demand vía /api/ejercicios.
  const [{ data: valoresFiltro }, { data: rutina }] = tieneRutina
    ? await Promise.all([
        supabase.from('ejercicios').select('parte_cuerpo, equipo'),
        supabase
          .from('plan_ejercicios')
          .select('id, ejercicio_id, dia_semana, orden, series, repeticiones, descanso_seg, notas, ejercicio:ejercicios(id, nombre, imagen_url, gif_url)')
          .eq('plan_id', planId),
      ])
    : [{ data: [] }, { data: [] }]

  const partes = Array.from(
    new Set((valoresFiltro ?? []).map((v) => v.parte_cuerpo).filter(Boolean)),
  ).sort() as string[]
  const equipos = Array.from(
    new Set((valoresFiltro ?? []).map((v) => v.equipo).filter(Boolean)),
  ).sort() as string[]

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
          partes={partes}
          equipos={equipos}
          rutinaInicial={(rutina ?? []) as unknown as RutinaItem[]}
          diasDescansoInicial={plan.dias_descanso ?? []}
        />
      ) : null}
    </div>
  )
}
