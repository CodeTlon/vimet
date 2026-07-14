'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { lunesDeSemanaArgentina } from '@/lib/datetime'
import { optimizeImage } from '@/lib/storage/optimize-image'
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

  const supabase = await createClient()
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

  // Defensa en profundidad: la UI ya no muestra el form una vez enviada la
  // semana, pero una pestaña vieja reabierta no debería poder pisar el envío.
  const { data: yaEnviado } = await supabase
    .from('feedback_semanal')
    .select('id')
    .eq('paciente_id', user.id)
    .eq('semana_inicio', d.semana_inicio)
    .maybeSingle()
  if (yaEnviado) {
    return { error: 'Ya enviaste tu feedback de esta semana.' }
  }

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

    const esImagen = file.type.startsWith('image/')
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    let buf: Buffer<ArrayBufferLike> = Buffer.from(await file.arrayBuffer())
    let contentType = file.type
    adjunto_path    = `${user.id}/f/${d.semana_inicio}_${Date.now()}_${safeName}`

    if (esImagen) {
      buf = await optimizeImage(buf)
      contentType = 'image/webp'
      adjunto_path = adjunto_path.replace(/\.\w+$/, '') + '.webp'
    }

    const { error: upErr } = await supabase.storage
      .from('recursos')
      .upload(adjunto_path, Buffer.from(buf), { contentType, upsert: false })
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

const mensajeSchema = z.object({
  feedback_id: z.coerce.number().int().positive(),
  contenido:   z.string().trim().min(1, 'Escribí un mensaje').max(2000),
})

// El chat solo admite mensajes nuevos mientras feedback_semanal.semana_inicio
// sigue siendo la semana en curso — apenas pasa el lunes, la fila ya no es
// "la actual" y la conversación queda congelada (misma fuente de verdad que
// usa la UI para separar semana actual de histórico).
export async function enviarMensajeFeedbackAction(
  _prev: unknown,
  formData: FormData,
): Promise<FeedbackState> {
  const parsed = mensajeSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: feedback } = await supabase
    .from('feedback_semanal')
    .select('paciente_id, semana_inicio')
    .eq('id', parsed.data.feedback_id)
    .maybeSingle()
  if (!feedback) return { error: 'No se encontró el feedback de esa semana.' }

  const { data: profile } = await supabase.from('profiles').select('rol').eq('id', user.id).maybeSingle()
  const esStaff = Boolean(profile && ['nutricionista', 'entrenador', 'admin'].includes(profile.rol))
  if (feedback.paciente_id !== user.id && !esStaff) return { error: 'No autorizado' }

  if (feedback.semana_inicio !== lunesDeSemanaArgentina()) {
    return { error: 'Esta conversación ya se cerró, fue de una semana anterior.' }
  }

  const { error } = await supabase.from('feedback_mensajes').insert({
    feedback_id: parsed.data.feedback_id,
    autor_id:    user.id,
    contenido:   parsed.data.contenido,
  })
  if (error) return { error: 'No se pudo enviar el mensaje.' }

  revalidatePath('/feedback-semanal')
  revalidatePath(`/admin/pacientes/${feedback.paciente_id}/feedback`)
  return { ok: true }
}

const editarMensajeSchema = z.object({
  id:        z.coerce.number().int().positive(),
  contenido: z.string().trim().min(1, 'Escribí un mensaje').max(2000),
})

// Como en un chat: solo se puede editar el último mensaje del hilo, y solo el
// propio — una vez que el otro lado respondió, ese mensaje queda congelado.
export async function editarMensajeFeedbackAction(
  _prev: unknown,
  formData: FormData,
): Promise<FeedbackState> {
  const parsed = editarMensajeSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: mensaje } = await supabase
    .from('feedback_mensajes')
    .select('id, feedback_id, autor_id')
    .eq('id', parsed.data.id)
    .maybeSingle()
  if (!mensaje) return { error: 'Mensaje no encontrado.' }
  if (mensaje.autor_id !== user.id) return { error: 'Solo podés editar tus propios mensajes.' }

  const { data: ultimo } = await supabase
    .from('feedback_mensajes')
    .select('id')
    .eq('feedback_id', mensaje.feedback_id)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (ultimo?.id !== mensaje.id) {
    return { error: 'Solo se puede editar el último mensaje de la conversación.' }
  }

  const { data: feedback } = await supabase
    .from('feedback_semanal')
    .select('paciente_id, semana_inicio')
    .eq('id', mensaje.feedback_id)
    .maybeSingle()
  if (feedback?.semana_inicio !== lunesDeSemanaArgentina()) {
    return { error: 'Esta conversación ya se cerró.' }
  }

  const { error } = await supabase
    .from('feedback_mensajes')
    .update({ contenido: parsed.data.contenido, edited_at: new Date().toISOString() })
    .eq('id', mensaje.id)
  if (error) return { error: 'No se pudo editar el mensaje.' }

  revalidatePath('/feedback-semanal')
  revalidatePath(`/admin/pacientes/${feedback.paciente_id}/feedback`)
  return { ok: true }
}
