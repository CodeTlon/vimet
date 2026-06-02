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
  semana_inicio:              z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Semana inválida'),
  estado_fisico:              intRange(1, 10),
  animo:                      intRange(1, 10),
  energia:                    intRange(1, 10),
  adherencia_entrenamiento:   intRange(0, 100),
  adherencia_alimentacion:    intRange(0, 100),
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
  dudas:         z.string().max(2000).optional().or(z.literal('')),
})

const FEEDBACK_ALLOWED_MIME = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf',
]
const FEEDBACK_MAX_BYTES = 15 * 1024 * 1024

const toStr = (v: string | undefined) => (v && v.trim() !== '' ? v.trim() : null)

export async function enviarFeedbackAction(
  _prev: unknown,
  formData: FormData,
): Promise<FeedbackState> {
  // Extraer archivo antes de parsear el schema (los File no pasan por zod)
  const file    = formData.get('adjunto') as File | null
  const hasFile = Boolean(file && file.size > 0)

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

  // Manejo del adjunto
  let adjunto_path: string | undefined = undefined // undefined → no tocar la columna

  if (hasFile && file) {
    if (!FEEDBACK_ALLOWED_MIME.includes(file.type)) {
      return { error: 'Solo podés adjuntar imágenes (JPG, PNG, WEBP, GIF) o PDFs.' }
    }
    if (file.size > FEEDBACK_MAX_BYTES) {
      return { error: 'El adjunto no puede superar 15 MB.' }
    }

    // Buscar el registro actual para borrar el adjunto previo si existe
    const { data: existing } = await supabase
      .from('feedback_semanal')
      .select('adjunto_path')
      .eq('paciente_id', user.id)
      .eq('semana_inicio', d.semana_inicio)
      .maybeSingle()

    const safeName   = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    adjunto_path     = `${user.id}/f/${d.semana_inicio}_${Date.now()}_${safeName}`
    const buf        = Buffer.from(await file.arrayBuffer())

    const { error: upErr } = await supabase.storage
      .from('recursos')
      .upload(adjunto_path, buf, { contentType: file.type, upsert: false })
    if (upErr) return { error: 'No se pudo subir el adjunto.' }

    // Borrar el adjunto previo después de subir el nuevo con éxito
    if (existing?.adjunto_path && existing.adjunto_path !== adjunto_path) {
      await supabase.storage.from('recursos').remove([existing.adjunto_path])
    }
  }

  const upsertData: Record<string, unknown> = {
    paciente_id:              user.id,
    semana_inicio:            d.semana_inicio,
    estado_fisico:            d.estado_fisico,
    animo:                    d.animo,
    energia:                  d.energia,
    adherencia_entrenamiento: d.adherencia_entrenamiento,
    adherencia_alimentacion:  d.adherencia_alimentacion,
    peso_autoreporte_kg:      d.peso_autoreporte_kg,
    observaciones:            toStr(d.observaciones),
    dudas:                    toStr(d.dudas),
  }

  // Solo incluir adjunto_path en el upsert cuando hay un archivo nuevo
  if (adjunto_path !== undefined) {
    upsertData.adjunto_path = adjunto_path
  }

  const { error } = await supabase
    .from('feedback_semanal')
    .upsert(upsertData, { onConflict: 'paciente_id,semana_inicio' })

  if (error) {
    // Si el upsert falló, limpiar el archivo recién subido para evitar huérfanos
    if (adjunto_path) {
      await supabase.storage.from('recursos').remove([adjunto_path])
    }
    return { error: 'No se pudo guardar tu feedback.' }
  }

  revalidatePath('/feedback-semanal')
  revalidatePath('/admin/pacientes')
  return { ok: true }
}

const responderSchema = z.object({
  id:                    z.coerce.number().int().positive(),
  paciente_id:           z.string().uuid(),
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
      respondido_por:        user.id,
      respondido_at:         new Date().toISOString(),
    })
    .eq('id', parsed.data.id)

  if (error) return { error: 'No se pudo guardar la respuesta.' }

  revalidatePath(`/admin/pacientes/${parsed.data.paciente_id}/feedback`)
  revalidatePath('/feedback-semanal')
  return { ok: true }
}
