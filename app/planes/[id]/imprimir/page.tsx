import { notFound, redirect } from 'next/navigation'

import { PlanImprimirToolbar } from '@/components/seguimiento/plan-imprimir-toolbar'
import { PlanImprimirView } from '@/components/seguimiento/plan-imprimir-view'
import { readClinicalField } from '@/lib/crypto/clinical'
import { obtenerSeccionesPlan } from '@/lib/plan-secciones'
import { eq } from 'drizzle-orm'

import { fichas_paciente, planes, profiles } from '@/db/schema'
import { esStaff, getUserAndProfile } from '@/lib/auth/session'
import { obtenerRutinaPlan } from '@/lib/data/rutina'
import { db } from '@/lib/db'
export const dynamic = 'force-dynamic'

export default async function ImprimirPlanPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const planId = Number(params.id)

  const { user, profile } = await getUserAndProfile()
  if (!user || !profile) redirect(`/login?next=/planes/${params.id}/imprimir`)

  const [planRaw] = await db.select().from(planes).where(eq(planes.id, planId)).limit(1)
  if (!planRaw) notFound()

  // Paciente dueño o staff (reemplaza la policy `planes read`).
  if (!esStaff(profile.rol) && planRaw.paciente_id !== user.id) notFound()

  // Ver lib/crypto/clinical.ts — `_enc` si el plan ya está cifrado, si no
  // cae a la columna vieja en texto plano (histórico sin backfillear).
  const plan = { ...planRaw, notas: readClinicalField(planRaw.notas_enc, planRaw.notas) }

  const [[paciente], [ficha], profesional, secciones, rutina] = await Promise.all([
    db
      .select({ nombre: profiles.nombre, apellido: profiles.apellido, email: profiles.email })
      .from(profiles)
      .where(eq(profiles.id, plan.paciente_id))
      .limit(1),
    db
      .select({
        fecha_nacimiento: fichas_paciente.fecha_nacimiento,
        sexo: fichas_paciente.sexo,
        ocupacion: fichas_paciente.ocupacion,
      })
      .from(fichas_paciente)
      .where(eq(fichas_paciente.paciente_id, plan.paciente_id))
      .limit(1),
    plan.profesional_id
      ? db
          .select({ nombre: profiles.nombre, apellido: profiles.apellido })
          .from(profiles)
          .where(eq(profiles.id, plan.profesional_id))
          .limit(1)
          .then((r) => r[0] ?? null)
      : Promise.resolve(null),
    obtenerSeccionesPlan(planId),
    plan.tipo === 'entrenamiento' || plan.tipo === 'combo' ? obtenerRutinaPlan(planId) : Promise.resolve([]),
  ])

  if (!paciente) notFound()

  const diasDescanso = plan.dias_descanso
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
          ficha={ficha ?? null}
          profesional={profesional}
          secciones={secciones}
          rutina={rutina}
          diasDescanso={diasDescanso}
          tieneEntreno={Boolean(tieneEntreno)}
        />
      </div>
    </>
  )
}
