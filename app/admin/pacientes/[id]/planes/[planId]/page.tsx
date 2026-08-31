import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PlanForm } from '@/components/seguimiento/plan-form'
import { PlanPrintButton } from '@/components/seguimiento/plan-print-button'
import { PlanSeccionesPanel } from '@/components/seguimiento/plan-secciones-panel'
import { RutinaPanel, type RutinaItem } from '@/components/seguimiento/rutina-panel'
import { obtenerSeccionesPlan } from '@/lib/plan-secciones'
import { createClient } from '@/lib/supabase/server'
export const dynamic = 'force-dynamic'

type SetDetalle = {
  sesion_id: number
  plan_ejercicio_id: number
  numero_set: number
  peso_kg: number | null
  repeticiones: string | null
  duracion_seg: number | null
  descanso_seg: number | null
  plan_ejercicio: { descanso_seg: number | null; ejercicio: { nombre: string } | null } | null
}

const TOLERANCIA_DESCANSO_SEG = 3

function tagDescanso(real: number | null, planificado: number | null | undefined) {
  if (real == null || planificado == null) return null
  if (real < planificado - TOLERANCIA_DESCANSO_SEG) return 'Saltó descanso'
  if (real > planificado + TOLERANCIA_DESCANSO_SEG) return 'Agregó tiempo'
  return null
}

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
  const secciones = await obtenerSeccionesPlan(supabase, planId)

  // Solo 2 columnas angostas de las 1324 filas (para armar los <select> de filtro),
  // no el catálogo completo con nombres/thumbnails — eso se busca on-demand vía /api/ejercicios.
  const [{ data: valoresFiltro }, { data: rutina }, { data: sesiones }] = tieneRutina
    ? await Promise.all([
        supabase.from('ejercicios').select('parte_cuerpo, equipo'),
        supabase
          .from('plan_ejercicios')
          .select(
            'id, ejercicio_id, dia_semana, orden, series, repeticiones, descanso_seg, notas, ' +
              'cardio_entrada_calor_valor, cardio_entrada_calor_unidad, ' +
              'cardio_trabajo_principal_valor, cardio_trabajo_principal_unidad, ' +
              'cardio_vuelta_calma_valor, cardio_vuelta_calma_unidad, ' +
              'ejercicio:ejercicios(id, nombre, imagen_url, gif_url, youtube_url, instrucciones, modo)',
          )
          .eq('plan_id', planId),
        supabase
          .from('sesiones_entrenamiento')
          .select('id, dia_semana, iniciada_at, finalizada_at, sets_completados(count)')
          .eq('plan_id', planId)
          .order('iniciada_at', { ascending: false })
          .limit(10),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }]

  const partes = Array.from(
    new Set((valoresFiltro ?? []).map((v) => v.parte_cuerpo).filter(Boolean)),
  ).sort() as string[]
  const equipos = Array.from(
    new Set((valoresFiltro ?? []).map((v) => v.equipo).filter(Boolean)),
  ).sort() as string[]

  // Detalle por serie (peso/reps/descanso real vs. planificado) para cada sesión,
  // se pide aparte porque necesita los ids de sesiones ya resueltos.
  const sesionIds = (sesiones ?? []).map((s) => s.id)
  const { data: setsDetalleRaw } = sesionIds.length
    ? await supabase
        .from('sets_completados')
        .select(
          'sesion_id, plan_ejercicio_id, numero_set, peso_kg, repeticiones, duracion_seg, descanso_seg, plan_ejercicio:plan_ejercicios(descanso_seg, ejercicio:ejercicios(nombre))',
        )
        .in('sesion_id', sesionIds)
        .order('id')
    : { data: [] }
  const setsDetalle = setsDetalleRaw as unknown as SetDetalle[] | null

  return (
    <div className="space-y-4">
      <Link
        href={`/admin/pacientes/${params.id}/planes`}
        className="inline-flex items-center gap-1 text-sm text-gray-700 hover:text-vimet-orange"
      >
        <ChevronLeft className="size-4" /> Planes
      </Link>
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl font-semibold text-gray-900">Editar plan</h2>
        <PlanPrintButton planId={planId} />
      </div>
      <PlanForm
        pacienteId={params.id}
        plan={plan}
        secciones={<PlanSeccionesPanel planId={planId} pacienteId={params.id} secciones={secciones} />}
        rutina={
          tieneRutina ? (
            <RutinaPanel
              planId={planId}
              pacienteId={params.id}
              partes={partes}
              equipos={equipos}
              rutinaInicial={(rutina ?? []) as unknown as RutinaItem[]}
              diasDescansoInicial={plan.dias_descanso ?? []}
            />
          ) : null
        }
      />
      {tieneRutina && sesiones && sesiones.length > 0 && (
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-heading text-lg font-semibold text-gray-900 mb-3">Historial de entrenamientos</h3>
          <ul className="space-y-2">
            {sesiones.map((s) => {
              const sets = Array.isArray(s.sets_completados) ? (s.sets_completados[0]?.count ?? 0) : 0
              const setsSesion = (setsDetalle ?? []).filter((d) => d.sesion_id === s.id)
              const ejercicioIds = Array.from(new Set(setsSesion.map((d) => d.plan_ejercicio_id)))
              return (
                <li key={s.id} className="border-b border-gray-50 pb-2 last:border-0">
                  <details className="group">
                    <summary className="flex items-center justify-between text-sm text-gray-700 cursor-pointer list-none">
                      <span>
                        {new Date(s.iniciada_at).toLocaleDateString('es-AR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                        {s.dia_semana ? ` · ${s.dia_semana}` : ''}
                      </span>
                      <span className="text-gray-500">
                        {sets} series {s.finalizada_at ? '· completo' : '· sin terminar'}
                      </span>
                    </summary>
                    {ejercicioIds.length > 0 && (
                      <div className="mt-2 space-y-2 pl-2 border-l-2 border-gray-100">
                        {ejercicioIds.map((peId) => {
                          const setsEjercicio = setsSesion.filter((d) => d.plan_ejercicio_id === peId)
                          const nombre = setsEjercicio[0].plan_ejercicio?.ejercicio?.nombre ?? 'Ejercicio'
                          return (
                            <div key={peId} className="text-sm">
                              <p className="font-medium text-gray-800">{nombre}</p>
                              <ul className="text-gray-500">
                                {setsEjercicio.map((d, i) => {
                                  const planificado = d.plan_ejercicio?.descanso_seg
                                  const tag = tagDescanso(d.descanso_seg, planificado)
                                  return (
                                    <li key={i} className="flex items-center gap-2">
                                      <span className="w-14">Serie {d.numero_set}</span>
                                      <span className="flex-1">
                                        {d.peso_kg != null ? `${d.peso_kg} kg · ` : ''}
                                        {d.repeticiones ?? '—'} reps
                                      </span>
                                      <span>
                                        descanso {d.descanso_seg ?? '—'}s{planificado != null ? ` / ${planificado}s` : ''}
                                      </span>
                                      {tag && (
                                        <span className="text-xs font-medium text-vimet-orange bg-vimet-orange/10 rounded-full px-2 py-0.5">
                                          {tag}
                                        </span>
                                      )}
                                    </li>
                                  )
                                })}
                              </ul>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </details>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
