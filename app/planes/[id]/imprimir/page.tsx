import { notFound, redirect } from 'next/navigation'

import { PlanImprimirToolbar } from '@/components/seguimiento/plan-imprimir-toolbar'
import { PlanImprimirView } from '@/components/seguimiento/plan-imprimir-view'
import type { RutinaEjercicio } from '@/components/seguimiento/rutina-viewer'
import { readClinicalField } from '@/lib/crypto/clinical'
import { obtenerSeccionesPlan } from '@/lib/plan-secciones'
import { getUserAndProfile } from '@/lib/supabase/auth-helpers'
import { createClient } from '@/lib/supabase/server'
export const dynamic = 'force-dynamic'

export default async function ImprimirPlanPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const planId = Number(params.id)

  const { user, profile } = await getUserAndProfile()
  if (!user || !profile) redirect(`/login?next=/planes/${params.id}/imprimir`)

  const supabase = await createClient()
  const { data: planRaw } = await supabase.from('planes').select('*').eq('id', planId).maybeSingle()
  if (!planRaw) notFound()

  const isStaff = ['nutricionista', 'entrenador', 'admin'].includes(profile.rol)
  if (!isStaff && planRaw.paciente_id !== user.id) notFound()

  // Ver lib/crypto/clinical.ts — `_enc` si el plan ya está cifrado, si no
  // cae a la columna vieja en texto plano (histórico sin backfillear).
  const plan = { ...planRaw, notas: readClinicalField(planRaw.notas_enc, planRaw.notas) }

  const [{ data: paciente }, { data: ficha }, { data: profesional }, secciones, { data: rutina }] =
    await Promise.all([
      supabase.from('profiles').select('nombre, apellido, email').eq('id', plan.paciente_id).maybeSingle(),
      supabase
        .from('fichas_paciente')
        .select('fecha_nacimiento, sexo, ocupacion')
        .eq('paciente_id', plan.paciente_id)
        .maybeSingle(),
      plan.profesional_id
        ? supabase.from('profiles').select('nombre, apellido').eq('id', plan.profesional_id).maybeSingle()
        : Promise.resolve({ data: null }),
      obtenerSeccionesPlan(supabase, planId),
      plan.tipo === 'entrenamiento' || plan.tipo === 'combo'
        ? supabase
            .from('plan_ejercicios')
            .select(
              'id, dia_semana, series, repeticiones, descanso_seg, notas, ' +
                'cardio_entrada_calor_valor, cardio_entrada_calor_unidad, ' +
                'cardio_trabajo_principal_valor, cardio_trabajo_principal_unidad, ' +
                'cardio_vuelta_calma_valor, cardio_vuelta_calma_unidad, ' +
                'ejercicio:ejercicios(nombre, gif_url, imagen_url, youtube_url, atribucion, instrucciones, modo)',
            )
            .eq('plan_id', planId)
            .order('orden')
        : Promise.resolve({ data: null }),
    ])

  if (!paciente) notFound()

  const diasDescanso = (plan.dias_descanso ?? []) as string[]
  const dias = [
    'disponibilidad_lunes',
    'disponibilidad_martes',
    'disponibilidad_miercoles',
    'disponibilidad_jueves',
    'disponibilidad_viernes',
    'disponibilidad_sabado',
  ] as const
  const tieneEntreno = dias.some((d) => plan[d]) || plan.disciplina || plan.frecuencia

  return (
    <>
      <PlanImprimirToolbar />
      <div className="px-4 pb-16">
        <PlanImprimirView
          plan={plan}
          paciente={paciente}
          ficha={ficha}
          profesional={profesional}
          secciones={secciones}
          rutina={(rutina ?? []) as unknown as RutinaEjercicio[]}
          diasDescanso={diasDescanso}
          tieneEntreno={Boolean(tieneEntreno)}
        />
      </div>
    </>
  )
}
