'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { plan_ejercicios, planes } from '@/db/schema'
import { authStaff } from '@/lib/auth/session'
import { db } from '@/lib/db'

export type PlanEjercicioState = { ok?: boolean; error?: string; id?: number }

const diaEnum = z.enum(['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'])
const unidadCardioEnum = z.enum(['minutos', 'horas', 'km'])

const camposEditables = {
  dia_semana: diaEnum.optional().or(z.literal('')),
  orden: z.coerce.number().int().default(0),
  series: z.coerce.number().int().positive().optional().or(z.literal('')),
  repeticiones: z.string().max(50).optional().or(z.literal('')),
  descanso_seg: z.coerce.number().int().nonnegative().optional().or(z.literal('')),
  notas: z.string().max(500).optional().or(z.literal('')),
  cardio_entrada_calor_valor: z.coerce.number().positive().optional().or(z.literal('')),
  cardio_entrada_calor_unidad: unidadCardioEnum.optional().or(z.literal('')),
  cardio_trabajo_principal_valor: z.coerce.number().positive().optional().or(z.literal('')),
  cardio_trabajo_principal_unidad: unidadCardioEnum.optional().or(z.literal('')),
  cardio_vuelta_calma_valor: z.coerce.number().positive().optional().or(z.literal('')),
  cardio_vuelta_calma_unidad: unidadCardioEnum.optional().or(z.literal('')),
}

const agregarSchema = z.object({
  plan_id: z.coerce.number().int(),
  paciente_id: z.string().uuid(),
  ejercicio_id: z.coerce.number().int(),
  ...camposEditables,
})

const actualizarSchema = z.object({
  id: z.coerce.number().int(),
  plan_id: z.coerce.number().int(),
  paciente_id: z.string().uuid(),
  ...camposEditables,
})

const toNum = (v: number | '' | undefined) => (v === '' || v === undefined ? null : v)
const toStr = (v: string | undefined) => (v && v.trim() !== '' ? v.trim() : null)

// Solo staff escribe la rutina (policy `plan_ejercicios staff write`).
const requireStaff = authStaff

// Campos editables de una fila de la rutina (el constraint de la base exige pares valor+unidad completos).
function camposDeFila(d: Omit<z.infer<typeof actualizarSchema>, "id">) {
  return {
    dia_semana: toStr(d.dia_semana),
    orden: d.orden,
    series: toNum(d.series),
    repeticiones: toStr(d.repeticiones),
    descanso_seg: toNum(d.descanso_seg),
    notas: toStr(d.notas),
    cardio_entrada_calor_valor: toNum(d.cardio_entrada_calor_valor),
    cardio_entrada_calor_unidad: toStr(d.cardio_entrada_calor_unidad),
    cardio_trabajo_principal_valor: toNum(d.cardio_trabajo_principal_valor),
    cardio_trabajo_principal_unidad: toStr(d.cardio_trabajo_principal_unidad),
    cardio_vuelta_calma_valor: toNum(d.cardio_vuelta_calma_valor),
    cardio_vuelta_calma_unidad: toStr(d.cardio_vuelta_calma_unidad),
  }
}

function revalidarPlan(pacienteId: string, planId: number) {
  revalidatePath(`/admin/pacientes/${pacienteId}/planes/${planId}`)
  revalidatePath(`/mis-planes/${planId}`)
}

export async function agregarEjercicioAction(
  _prev: unknown,
  formData: FormData,
): Promise<PlanEjercicioState> {
  const parsed = agregarSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }

  const ctx = await requireStaff()
  if ('error' in ctx) return { error: ctx.error }

  const d = parsed.data
  let created: { id: number }
  try {
    ;[created] = await db
      .insert(plan_ejercicios)
      .values({
        plan_id: d.plan_id,
        ejercicio_id: d.ejercicio_id,
        ...camposDeFila(d),
      })
      .returning({ id: plan_ejercicios.id })
  } catch (err) {
    console.error('agregarEjercicioAction:', err)
    return { error: 'No se pudo agregar el ejercicio.' }
  }

  revalidarPlan(d.paciente_id, d.plan_id)
  return { ok: true, id: created.id }
}

export async function actualizarEjercicioPlanAction(
  _prev: unknown,
  formData: FormData,
): Promise<PlanEjercicioState> {
  const parsed = actualizarSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }

  const ctx = await requireStaff()
  if ('error' in ctx) return { error: ctx.error }

  const d = parsed.data
  try {
    await db.update(plan_ejercicios).set(camposDeFila(d)).where(eq(plan_ejercicios.id, d.id))
  } catch (err) {
    console.error('actualizarEjercicioPlanAction:', err)
    return { error: 'No se pudo actualizar el ejercicio.' }
  }

  revalidarPlan(d.paciente_id, d.plan_id)
  return { ok: true }
}

const diasDescansoSchema = z.object({
  plan_id: z.coerce.number().int(),
  paciente_id: z.string().uuid(),
  dia: diaEnum,
  activar: z.enum(['true', 'false']),
})

export async function actualizarDiaDescansoAction(
  _prev: unknown,
  formData: FormData,
): Promise<PlanEjercicioState> {
  const parsed = diasDescansoSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }

  const ctx = await requireStaff()
  if ('error' in ctx) return { error: ctx.error }

  const d = parsed.data
  const [plan] = await db.select({ dias_descanso: planes.dias_descanso }).from(planes).where(eq(planes.id, d.plan_id)).limit(1)
  if (!plan) return { error: 'Ese plan ya no existe.' }
  const actuales = plan.dias_descanso
  const siguientes = d.activar === 'true'
    ? Array.from(new Set([...actuales, d.dia]))
    : actuales.filter((x) => x !== d.dia)

  try {
    await db.update(planes).set({ dias_descanso: siguientes }).where(eq(planes.id, d.plan_id))
  } catch (err) {
    console.error('actualizarDiaDescansoAction:', err)
    return { error: 'No se pudo actualizar el día de descanso.' }
  }

  revalidarPlan(d.paciente_id, d.plan_id)
  return { ok: true }
}

export async function eliminarEjercicioPlanAction(formData: FormData) {
  const id = Number(formData.get('id'))
  const planId = Number(formData.get('plan_id'))
  const pacienteId = String(formData.get('paciente_id') ?? '')
  if (!id) return

  const ctx = await requireStaff()
  if ('error' in ctx) return

  await db.delete(plan_ejercicios).where(eq(plan_ejercicios.id, id))
  revalidarPlan(pacienteId, planId)
}
