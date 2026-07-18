import { CalendarDays, ChevronLeft, FileText } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PlanDownloadButton } from '@/components/seguimiento/plan-download'
import { createClient } from '@/lib/supabase/server'
import {
  ESTADO_PLAN_BADGE,
  ESTADO_PLAN_LABEL,
  TIPO_PLAN_LABEL,
  formatearFechaCorta,
} from '@/lib/seguimiento'

export const dynamic = 'force-dynamic'

const DIA_LABEL: Record<string, string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  domingo: 'Domingo',
}
const ORDEN_DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo', '']

type RutinaEjercicio = {
  id: number
  dia_semana: string | null
  series: number | null
  repeticiones: string | null
  descanso_seg: number | null
  notas: string | null
  ejercicio: {
    nombre: string
    gif_url: string | null
    imagen_url: string | null
    atribucion: string | null
    instrucciones: string | null
  } | null
}

export default async function MiPlanDetallePage(
  props: {
    params: Promise<{ id: string }>
  }
) {
  const params = await props.params;
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: plan } = await supabase
    .from('planes')
    .select('*')
    .eq('id', Number(params.id))
    .eq('paciente_id', user.id)
    .maybeSingle()

  if (!plan) notFound()

  const { data: rutina } =
    plan.tipo === 'entrenamiento' || plan.tipo === 'combo'
      ? await supabase
          .from('plan_ejercicios')
          .select(
            'id, dia_semana, series, repeticiones, descanso_seg, notas, ejercicio:ejercicios(nombre, gif_url, imagen_url, atribucion, instrucciones)',
          )
          .eq('plan_id', Number(params.id))
          .order('orden')
      : { data: null }

  const rutinaOrdenada = ((rutina ?? []) as unknown as RutinaEjercicio[])
    .slice()
    .sort(
      (a, b) => ORDEN_DIAS.indexOf(a.dia_semana ?? '') - ORDEN_DIAS.indexOf(b.dia_semana ?? ''),
    )
  const atribucion = rutinaOrdenada.find((r) => r.ejercicio?.atribucion)?.ejercicio?.atribucion
  const diasDescanso = (plan.dias_descanso ?? []) as string[]

  const dias = [
    { key: 'disponibilidad_lunes', label: 'Lunes' },
    { key: 'disponibilidad_martes', label: 'Martes' },
    { key: 'disponibilidad_miercoles', label: 'Miércoles' },
    { key: 'disponibilidad_jueves', label: 'Jueves' },
    { key: 'disponibilidad_viernes', label: 'Viernes' },
    { key: 'disponibilidad_sabado', label: 'Sábado' },
  ] as const

  const tieneEntreno = dias.some((d) => plan[d.key]) || plan.disciplina || plan.frecuencia
  const tieneNutri =
    plan.pautas_generales ||
    plan.pautas_hidratacion ||
    plan.suplementacion ||
    plan.pre_entreno ||
    plan.intra_entreno ||
    plan.post_entreno

  return (
    <>
      <Link
        href="/mis-planes"
        className="inline-flex items-center gap-1 text-sm text-gray-700 hover:text-vimet-orange mb-3"
      >
        <ChevronLeft className="size-4" /> Mis planes
      </Link>

      <header className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-vimet-orange flex items-center gap-1.5">
              <FileText className="size-3.5" />
              {TIPO_PLAN_LABEL[plan.tipo as keyof typeof TIPO_PLAN_LABEL]}
            </p>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-gray-900">
              {plan.titulo}
            </h1>
            <p className="text-sm text-gray-700 mt-1 inline-flex items-center gap-1.5">
              <CalendarDays className="size-4 text-vimet-orange" />
              Vigente desde {formatearFechaCorta(plan.fecha_desde)}
              {plan.fecha_hasta ? ` hasta ${formatearFechaCorta(plan.fecha_hasta)}` : ''}
            </p>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
              ESTADO_PLAN_BADGE[plan.estado as keyof typeof ESTADO_PLAN_BADGE]
            }`}
          >
            {ESTADO_PLAN_LABEL[plan.estado as keyof typeof ESTADO_PLAN_LABEL]}
          </span>
        </div>
        {plan.archivo_path ? (
          <div className="mt-4">
            <PlanDownloadButton planId={Number(params.id)} />
          </div>
        ) : null}
      </header>

      {tieneNutri ? (
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
          <h2 className="font-heading text-lg font-semibold text-gray-900 mb-4">
            Pautas nutricionales
          </h2>
          <div className="space-y-4">
            <Block label="Pautas generales" value={plan.pautas_generales} />
            <Block label="Hidratación" value={plan.pautas_hidratacion} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Block label="Pre entreno" value={plan.pre_entreno} compact />
              <Block label="Intra entreno" value={plan.intra_entreno} compact />
              <Block label="Post entreno" value={plan.post_entreno} compact />
            </div>
            <Block label="Suplementación" value={plan.suplementacion} />
          </div>
        </section>
      ) : null}

      {tieneEntreno ? (
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
          <h2 className="font-heading text-lg font-semibold text-gray-900 mb-4">
            Datos de entrenamiento
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Block label="Disciplina" value={plan.disciplina} compact />
            <Block label="Frecuencia" value={plan.frecuencia} compact />
            <Block label="Experiencia previa" value={plan.experiencia_previa} compact />
            <Block label="Volumen" value={plan.volumen} compact />
          </div>

          {dias.some((d) => plan[d.key]) ? (
            <div className="mt-5">
              <h3 className="font-heading font-semibold text-gray-900 mb-2">
                Disponibilidad / agenda
              </h3>
              <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                {dias.map((d) => (
                  <li key={d.key} className="rounded-lg border border-gray-100 px-3 py-2">
                    <p className="text-xs uppercase tracking-wide text-gray-500">{d.label}</p>
                    <p className="text-gray-900 mt-0.5">
                      {plan[d.key] ?? <span className="text-gray-400">—</span>}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {rutinaOrdenada.length > 0 || diasDescanso.length > 0 ? (
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
          <h2 className="font-heading text-lg font-semibold text-gray-900 mb-4">
            Rutina de ejercicios
          </h2>
          <div className="space-y-5">
            {ORDEN_DIAS.filter(
              (dia) => rutinaOrdenada.some((r) => (r.dia_semana ?? '') === dia) || diasDescanso.includes(dia),
            ).map((dia) => (
                <div key={dia || 'general'}>
                  <h3 className="font-heading font-semibold text-gray-900 mb-2">
                    {DIA_LABEL[dia] ?? 'General'}
                  </h3>
                  {diasDescanso.includes(dia) ? (
                    <p className="text-sm text-gray-500">Día de descanso.</p>
                  ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {rutinaOrdenada
                      .filter((r) => (r.dia_semana ?? '') === dia)
                      .map((r) => (
                        <div
                          key={r.id}
                          className="group flex items-center gap-4 rounded-lg border border-gray-100 p-3"
                        >
                          {r.ejercicio?.imagen_url || r.ejercicio?.gif_url ? (
                            <span className="relative size-24 lg:size-36 rounded-md overflow-hidden shrink-0 bg-gray-100">
                              {r.ejercicio.imagen_url ? (
                                <Image
                                  src={r.ejercicio.imagen_url}
                                  alt={r.ejercicio.nombre}
                                  width={144}
                                  height={144}
                                  unoptimized
                                  className="absolute inset-0 size-full object-cover transition-opacity group-hover:opacity-0"
                                />
                              ) : null}
                              {r.ejercicio.gif_url ? (
                                <Image
                                  src={r.ejercicio.gif_url}
                                  alt={r.ejercicio.nombre}
                                  width={144}
                                  height={144}
                                  unoptimized
                                  className="absolute inset-0 size-full object-cover opacity-0 transition-opacity group-hover:opacity-100"
                                />
                              ) : null}
                            </span>
                          ) : (
                            <div className="size-24 lg:size-36 rounded-md bg-gray-100 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900">{r.ejercicio?.nombre}</p>
                            <p className="text-xs text-gray-600 mt-0.5">
                              {[
                                r.series ? `${r.series} series` : null,
                                r.repeticiones ? `${r.repeticiones} reps` : null,
                                r.descanso_seg ? `${r.descanso_seg}s descanso` : null,
                              ]
                                .filter(Boolean)
                                .join(' · ') || '—'}
                            </p>
                            {r.notas ? <p className="text-xs text-gray-500 mt-0.5">{r.notas}</p> : null}
                            {r.ejercicio?.instrucciones ? (
                              <p className="text-xs text-gray-400 line-clamp-3 mt-0.5">
                                {r.ejercicio.instrucciones}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      ))}
                  </div>
                  )}
                </div>
            ))}
          </div>
          {atribucion ? <p className="mt-4 text-xs text-gray-400">{atribucion}</p> : null}
        </section>
      ) : null}

      {plan.notas ? (
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-heading text-lg font-semibold text-gray-900 mb-2">Notas</h2>
          <p className="text-sm text-gray-800 whitespace-pre-line">{plan.notas}</p>
        </section>
      ) : null}
    </>
  )
}

function Block({
  label,
  value,
  compact = false,
}: {
  label: string
  value: string | null
  compact?: boolean
}) {
  if (!value || value.trim() === '') {
    if (compact) {
      return (
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
          <p className="text-sm text-gray-400 mt-0.5">—</p>
        </div>
      )
    }
    return null
  }
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">{label}</p>
      <p className="text-sm text-gray-900 whitespace-pre-line">{value}</p>
    </div>
  )
}
