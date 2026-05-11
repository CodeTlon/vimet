'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'

export type FeedbackState = { ok?: boolean; error?: string }

const intRange = (min: number, max: number) =>
  z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== '' ? Number(v) : null))
    .refine((v) => v === null || (Number.isInteger(v) && v >= min && v <= max), 'Fuera de rango')

const schema = z.object({
  semana_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Semana inválida'),
  estado_fisico: intRange(1, 10),
  animo: intRange(1, 10),
  energia: intRange(1, 10),
  adherencia_entrenamiento: intRange(0, 100),
  adherencia_alimentacion: intRange(0, 100),
  peso_autoreporte_kg: z
    .string()
    .optional()
    .transform((v) => {
      if (!v || v.trim() === '') return null
      const n = Number(v.replace(',', '.'))
      return Number.isFinite(n) ? n : null
    })
    .refine((v) => v === null || (v > 20 && v < 400), 'Peso inválido'),
  observaciones: z.string().max(4000).optional().or(z.literal('')),
  dudas: z.string().max(2000).optional().or(z.literal('')),
})

const toStr = (v: string | undefined) => (v && v.trim() !== '' ? v.trim() : null)

export async function enviarFeedbackAction(
  _prev: unknown,
  formData: FormData,
): Promise<FeedbackState> {
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const [{ data: ficha }, { count: planesVigentes }] = await Promise.all([
    supabase.from('fichas_paciente').select('paciente_id').eq('paciente_id', user.id).maybeSingle(),
    supabase
      .from('planes')
      .select('id', { count: 'exact', head: true })
      .eq('paciente_id', user.id)
      .eq('estado', 'vigente'),
  ])
  if (!ficha || (planesVigentes ?? 0) === 0) {
    return {
      error:
        'Para enviar feedback necesitás tener tu ficha clínica cargada y al menos un plan vigente.',
    }
  }

  const d = parsed.data
  const { error } = await supabase.from('feedback_semanal').upsert(
    {
      paciente_id: user.id,
      semana_inicio: d.semana_inicio,
      estado_fisico: d.estado_fisico,
      animo: d.animo,
      energia: d.energia,
      adherencia_entrenamiento: d.adherencia_entrenamiento,
      adherencia_alimentacion: d.adherencia_alimentacion,
      peso_autoreporte_kg: d.peso_autoreporte_kg,
      observaciones: toStr(d.observaciones),
      dudas: toStr(d.dudas),
    },
    { onConflict: 'paciente_id,semana_inicio' },
  )

  if (error) return { error: 'No se pudo guardar tu feedback.' }

  revalidatePath('/feedback-semanal')
  revalidatePath('/admin/pacientes')
  return { ok: true }
}

const responderSchema = z.object({
  id: z.coerce.number().int().positive(),
  paciente_id: z.string().uuid(),
  respuesta_profesional: z.string().min(1).max(4000),
})

export async function responderFeedbackAction(
  _prev: unknown,
  formData: FormData,
): Promise<FeedbackState> {
  const parsed = responderSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: 'Datos inválidos' }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile || !['nutricionista', 'entrenador', 'admin'].includes(profile.rol)) {
    return { error: 'No autorizado' }
  }

  const { error } = await supabase
    .from('feedback_semanal')
    .update({
      respuesta_profesional: parsed.data.respuesta_profesional,
      respondido_por: user.id,
      respondido_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.id)

  if (error) return { error: 'No se pudo guardar la respuesta.' }

  revalidatePath(`/admin/pacientes/${parsed.data.paciente_id}/feedback`)
  revalidatePath('/feedback-semanal')
  return { ok: true }
}
