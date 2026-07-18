'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'

export type PlanEjercicioState = { ok?: boolean; error?: string; id?: number }

const diaEnum = z.enum(['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'])

const camposEditables = {
  dia_semana: diaEnum.optional().or(z.literal('')),
  orden: z.coerce.number().int().default(0),
  series: z.coerce.number().int().positive().optional().or(z.literal('')),
  repeticiones: z.string().max(50).optional().or(z.literal('')),
  descanso_seg: z.coerce.number().int().nonnegative().optional().or(z.literal('')),
  notas: z.string().max(500).optional().or(z.literal('')),
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

async function requireStaff() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' as const }
  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile || !['nutricionista', 'entrenador', 'admin'].includes(profile.rol)) {
    return { error: 'No autorizado' as const }
  }
  return { supabase }
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
  const { data: created, error } = await ctx.supabase
    .from('plan_ejercicios')
    .insert({
      plan_id: d.plan_id,
      ejercicio_id: d.ejercicio_id,
      dia_semana: toStr(d.dia_semana),
      orden: d.orden,
      series: toNum(d.series),
      repeticiones: toStr(d.repeticiones),
      descanso_seg: toNum(d.descanso_seg),
      notas: toStr(d.notas),
    })
    .select('id')
    .single()
  if (error) return { error: 'No se pudo agregar el ejercicio.' }

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
  const { error } = await ctx.supabase
    .from('plan_ejercicios')
    .update({
      dia_semana: toStr(d.dia_semana),
      orden: d.orden,
      series: toNum(d.series),
      repeticiones: toStr(d.repeticiones),
      descanso_seg: toNum(d.descanso_seg),
      notas: toStr(d.notas),
    })
    .eq('id', d.id)
  if (error) return { error: 'No se pudo actualizar el ejercicio.' }

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
  const { data: plan } = await ctx.supabase
    .from('planes')
    .select('dias_descanso')
    .eq('id', d.plan_id)
    .single()
  const actuales = (plan?.dias_descanso ?? []) as string[]
  const siguientes = d.activar === 'true'
    ? Array.from(new Set([...actuales, d.dia]))
    : actuales.filter((x) => x !== d.dia)

  const { error } = await ctx.supabase
    .from('planes')
    .update({ dias_descanso: siguientes })
    .eq('id', d.plan_id)
  if (error) return { error: 'No se pudo actualizar el día de descanso.' }

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

  await ctx.supabase.from('plan_ejercicios').delete().eq('id', id)
  revalidarPlan(pacienteId, planId)
}
