import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PlanForm } from '@/components/seguimiento/plan-form'
import { PlanPrintButton } from '@/components/seguimiento/plan-print-button'
import { PlanSeccionesPanel } from '@/components/seguimiento/plan-secciones-panel'
import { RutinaPanel, type RutinaItem } from '@/components/seguimiento/rutina-panel'
import { obtenerSeccionesPlan } from '@/lib/plan-secciones'
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'

import { ejercicios, plan_ejercicios, planes, sesiones_entrenamiento, sets_completados } from '@/db/schema'
import { requireStaff } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { readClinicalField } from '@/lib/crypto/clinical'
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
  await requireStaff()
  const planId = Number(params.planId)
  const [planRaw] = await db
    .select()
    .from(planes)
    .where(and(eq(planes.id, planId), eq(planes.paciente_id, params.id)))
    .limit(1)
  if (!planRaw) notFound()

  // Ver lib/crypto/clinical.ts — `_enc` si el plan ya está cifrado, si no
  // cae a la columna vieja en texto plano (histórico sin backfillear).
  const plan = { ...planRaw, notas: readClinicalField(planRaw.notas_enc, planRaw.notas) }

  const tieneRutina = plan.tipo === 'entrenamiento' || plan.tipo === 'combo'
  const secciones = await obtenerSeccionesPlan(planId)

  // Solo 2 columnas angostas (para armar los <select> de filtro), no el catálogo completo con
  // nombres/thumbnails — eso se busca on-demand vía /api/ejercicios.
  const [valoresFiltro, rutina, sesiones] = tieneRutina
    ? await Promise.all([
        db.select({ parte_cuerpo: ejercicios.parte_cuerpo, equipo: ejercicios.equipo }).from(ejercicios),
        db
          .select({
            id: plan_ejercicios.id,
            ejercicio_id: plan_ejercicios.ejercicio_id,
            dia_semana: plan_ejercicios.dia_semana,
            orden: plan_ejercicios.orden,
            series: plan_ejercicios.series,
            repeticiones: plan_ejercicios.repeticiones,
            descanso_seg: plan_ejercicios.descanso_seg,
            notas: plan_ejercicios.notas,
            cardio_entrada_calor_valor: plan_ejercicios.cardio_entrada_calor_valor,
            cardio_entrada_calor_unidad: plan_ejercicios.cardio_entrada_calor_unidad,
            cardio_trabajo_principal_valor: plan_ejercicios.cardio_trabajo_principal_valor,
            cardio_trabajo_principal_unidad: plan_ejercicios.cardio_trabajo_principal_unidad,
            cardio_vuelta_calma_valor: plan_ejercicios.cardio_vuelta_calma_valor,
            cardio_vuelta_calma_unidad: plan_ejercicios.cardio_vuelta_calma_unidad,
            ejercicio: {
              id: ejercicios.id,
              nombre: ejercicios.nombre,
              imagen_url: ejercicios.imagen_url,
              gif_url: ejercicios.gif_url,
              youtube_url: ejercicios.youtube_url,
              instrucciones: ejercicios.instrucciones,
              modo: ejercicios.modo,
            },
          })
          .from(plan_ejercicios)
          .leftJoin(ejercicios, eq(ejercicios.id, plan_ejercicios.ejercicio_id))
          .where(eq(plan_ejercicios.plan_id, planId)),
        db
          .select({
            id: sesiones_entrenamiento.id,
            dia_semana: sesiones_entrenamiento.dia_semana,
            iniciada_at: sesiones_entrenamiento.iniciada_at,
            finalizada_at: sesiones_entrenamiento.finalizada_at,
            n_sets: sql<number>`(select count(*)::int from ${sets_completados} where ${sets_completados.sesion_id} = ${sesiones_entrenamiento.id})`,
          })
          .from(sesiones_entrenamiento)
          .where(eq(sesiones_entrenamiento.plan_id, planId))
          .orderBy(desc(sesiones_entrenamiento.iniciada_at))
          .limit(10)
          .then((rows) => rows.map(({ n_sets, ...r }) => ({ ...r, sets_completados: [{ count: n_sets }] }))),
      ])
    : [[], [], []]

  const partes = Array.from(new Set(valoresFiltro.map((v) => v.parte_cuerpo).filter(Boolean))).sort() as string[]
  const equipos = Array.from(new Set(valoresFiltro.map((v) => v.equipo).filter(Boolean))).sort() as string[]

  // Detalle por serie (peso/reps/descanso real vs. planificado) para cada sesión, aparte porque
  // necesita los ids de sesiones ya resueltos.
  const sesionIds = sesiones.map((s) => s.id)
  const setsDetalle: SetDetalle[] = sesionIds.length
    ? (
        await db
          .select({
            sesion_id: sets_completados.sesion_id,
            plan_ejercicio_id: sets_completados.plan_ejercicio_id,
            numero_set: sets_completados.numero_set,
            peso_kg: sets_completados.peso_kg,
            repeticiones: sets_completados.repeticiones,
            duracion_seg: sets_completados.duracion_seg,
            descanso_seg: sets_completados.descanso_seg,
            pe_descanso: plan_ejercicios.descanso_seg,
            ej_nombre: ejercicios.nombre,
          })
          .from(sets_completados)
          .leftJoin(plan_ejercicios, eq(plan_ejercicios.id, sets_completados.plan_ejercicio_id))
          .leftJoin(ejercicios, eq(ejercicios.id, plan_ejercicios.ejercicio_id))
          .where(inArray(sets_completados.sesion_id, sesionIds))
          .orderBy(asc(sets_completados.id))
      ).map(({ pe_descanso, ej_nombre, ...r }) => ({
        ...r,
        plan_ejercicio: { descanso_seg: pe_descanso, ejercicio: ej_nombre != null ? { nombre: ej_nombre } : null },
      }))
    : []

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
