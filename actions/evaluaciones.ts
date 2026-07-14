'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { haceDiasArgentina, hoyArgentina } from '@/lib/datetime'
import { createClient } from '@/lib/supabase/server'

export type EvalState = { ok?: boolean; error?: string }

const intInRange = (max: number) =>
  z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== '' ? Number(v) : null))
    .refine((v) => v === null || (Number.isInteger(v) && v >= 0 && v <= max), 'Fuera de rango')

const schema = z.object({
  id: z.coerce.number().int().positive().optional(),
  paciente_id: z.string().uuid(),
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(
      (v) => v >= haceDiasArgentina(14) && v <= hoyArgentina(),
      'La fecha debe estar dentro de las últimas 2 semanas',
    ),
  test_wells_adams: intInRange(10),
  test_thomas: intInRange(10),
  test_dorsiflexion: intInRange(10),
  test_sentadilla: intInRange(10),
  test_estabilidad: intInRange(10),
  fuerza_inferior: intInRange(15),
  fuerza_superior: intInRange(15),
  resistencia_metabolica: intInRange(20),
  observaciones: z.string().max(2000).optional().or(z.literal('')),
})

async function getStaff() {
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
  return { user, supabase }
}

export async function crearEvaluacionAction(
  _prev: unknown,
  formData: FormData,
): Promise<EvalState> {
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }

  const ctx = await getStaff()
  if ('error' in ctx) return { error: ctx.error }

  const d = parsed.data
  const { error } = await ctx.supabase.from('evaluaciones_funcionales').insert({
    paciente_id: d.paciente_id,
    fecha: d.fecha,
    test_wells_adams: d.test_wells_adams,
    test_thomas: d.test_thomas,
    test_dorsiflexion: d.test_dorsiflexion,
    test_sentadilla: d.test_sentadilla,
    test_estabilidad: d.test_estabilidad,
    fuerza_inferior: d.fuerza_inferior,
    fuerza_superior: d.fuerza_superior,
    resistencia_metabolica: d.resistencia_metabolica,
    observaciones: d.observaciones && d.observaciones.trim() !== '' ? d.observaciones.trim() : null,
    registrado_por: ctx.user.id,
  })

  if (error) return { error: 'No se pudo guardar la evaluación.' }

  revalidatePath(`/admin/pacientes/${d.paciente_id}/evaluacion-funcional`)
  return { ok: true }
}

export async function actualizarEvaluacionAction(
  _prev: unknown,
  formData: FormData,
): Promise<EvalState> {
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  if (!parsed.data.id) return { error: 'Falta el id de la evaluación.' }

  const ctx = await getStaff()
  if ('error' in ctx) return { error: ctx.error }

  const d = parsed.data
  const { error } = await ctx.supabase
    .from('evaluaciones_funcionales')
    .update({
      fecha: d.fecha,
      test_wells_adams: d.test_wells_adams,
      test_thomas: d.test_thomas,
      test_dorsiflexion: d.test_dorsiflexion,
      test_sentadilla: d.test_sentadilla,
      test_estabilidad: d.test_estabilidad,
      fuerza_inferior: d.fuerza_inferior,
      fuerza_superior: d.fuerza_superior,
      resistencia_metabolica: d.resistencia_metabolica,
      observaciones: d.observaciones && d.observaciones.trim() !== '' ? d.observaciones.trim() : null,
    })
    .eq('id', d.id)

  if (error) return { error: 'No se pudo actualizar la evaluación.' }

  revalidatePath(`/admin/pacientes/${d.paciente_id}/evaluacion-funcional`)
  return { ok: true }
}

export async function eliminarEvaluacionAction(
  _prev: unknown,
  formData: FormData,
): Promise<EvalState> {
  const id = Number(formData.get('id'))
  const paciente_id = String(formData.get('paciente_id') ?? '')
  if (!id) return { error: 'Datos inválidos' }
  const ctx = await getStaff()
  if ('error' in ctx) return { error: ctx.error }
  const { error } = await ctx.supabase.from('evaluaciones_funcionales').delete().eq('id', id)
  if (error) return { error: 'No se pudo eliminar la evaluación.' }
  revalidatePath(`/admin/pacientes/${paciente_id}/evaluacion-funcional`)
  return { ok: true }
}
