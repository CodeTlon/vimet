// Servicio de feedback semanal y chat. SIN 'use server': recibe al usuario ya autenticado; lo usan
// actions/feedback.ts (web) y lib/mobile (app).
import { and, desc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'

import { feedback_mensajes, feedback_semanal, fichas_paciente, planes } from '@/db/schema'
import { esStaff, type Profile } from '@/lib/auth/session'
import { lunesDeSemanaArgentina } from '@/lib/datetime'
import { db } from '@/lib/db'
import { pareceUnPdf } from '@/lib/file-sniff'
import { optimizeImage } from '@/lib/storage/optimize-image'
import { borrarArchivos, subirArchivo } from '@/lib/storage/disk'

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
}).refine(
  (d) =>
    d.estado_fisico != null ||
    d.animo != null ||
    d.energia != null ||
    d.adherencia_entrenamiento != null ||
    d.adherencia_alimentacion != null ||
    d.peso_autoreporte_kg != null ||
    (d.observaciones ?? '').trim() !== '',
  { message: 'Cargá al menos un dato del feedback.', path: ['estado_fisico'] },
)

const FEEDBACK_ALLOWED_MIME = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf',
]
const FEEDBACK_MAX_BYTES = 15 * 1024 * 1024

const toStr = (v: string | undefined) => (v && v.trim() !== '' ? v.trim() : null)

/** `raw` trae los campos del form; la semana siempre es la actual (la fija el servidor). */
export async function enviarFeedback(
  userId: string,
  raw: Record<string, unknown>,
  file: File | null = null,
): Promise<FeedbackState> {
  const hasFile = Boolean(file && file.size > 0)

  const parsed = schema.safeParse({ ...raw, semana_inicio: lunesDeSemanaArgentina() })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }

  const user = { id: userId }

  const [[ficha], [{ planesVigentes }]] = await Promise.all([
    db.select({ paciente_id: fichas_paciente.paciente_id }).from(fichas_paciente).where(eq(fichas_paciente.paciente_id, user.id)).limit(1),
    db
      .select({ planesVigentes: sql<number>`count(*)::int` })
      .from(planes)
      .where(and(eq(planes.paciente_id, user.id), eq(planes.estado, 'vigente'))),
  ])
  if (!ficha || planesVigentes === 0) {
    return {
      error:
        'Para enviar feedback necesitás tener tu ficha clínica cargada y al menos un plan vigente.',
    }
  }

  const d = parsed.data

  // Defensa en profundidad: la UI ya no muestra el form una vez enviada la
  // semana, pero una pestaña vieja reabierta no debería poder pisar el envío.
  const [yaEnviado] = await db
    .select({ id: feedback_semanal.id })
    .from(feedback_semanal)
    .where(and(eq(feedback_semanal.paciente_id, user.id), eq(feedback_semanal.semana_inicio, d.semana_inicio)))
    .limit(1)
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
    const [existing] = await db
      .select({ adjunto_path: feedback_semanal.adjunto_path })
      .from(feedback_semanal)
      .where(and(eq(feedback_semanal.paciente_id, user.id), eq(feedback_semanal.semana_inicio, d.semana_inicio)))
      .limit(1)

    const esImagen = file.type.startsWith('image/')
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    let buf: Buffer<ArrayBufferLike> = Buffer.from(await file.arrayBuffer())
    let contentType = file.type
    adjunto_path    = `${user.id}/f/${d.semana_inicio}_${Date.now()}_${safeName}`

    if (esImagen) {
      buf = await optimizeImage(buf)
      contentType = 'image/webp'
      adjunto_path = adjunto_path.replace(/\.\w+$/, '') + '.webp'
    } else if (!pareceUnPdf(buf)) {
      return { error: 'El archivo no es un PDF válido.' }
    }

    try {
      await subirArchivo('recursos', adjunto_path, buf, contentType)
    } catch (err) {
      console.error('enviarFeedbackAction (subida):', err)
      return { error: 'No se pudo subir el adjunto.' }
    }

    // Borrar el adjunto previo después de subir el nuevo con éxito
    if (existing?.adjunto_path && existing.adjunto_path !== adjunto_path) {
      await borrarArchivos('recursos', [existing.adjunto_path]).catch(() => {})
    }
  }

  const datos = {
    estado_fisico: d.estado_fisico,
    animo: d.animo,
    energia: d.energia,
    adherencia_entrenamiento: d.adherencia_entrenamiento,
    adherencia_alimentacion: d.adherencia_alimentacion,
    peso_autoreporte_kg: d.peso_autoreporte_kg,
    observaciones: toStr(d.observaciones),
    // Solo se incluye el adjunto cuando hay un archivo nuevo (undefined = no tocar la columna).
    ...(adjunto_path !== undefined ? { adjunto_path } : {}),
  }

  try {
    await db
      .insert(feedback_semanal)
      .values({ paciente_id: user.id, semana_inicio: d.semana_inicio, ...datos })
      .onConflictDoUpdate({ target: [feedback_semanal.paciente_id, feedback_semanal.semana_inicio], set: datos })
  } catch (err) {
    console.error('enviarFeedbackAction:', err)
    // Si el upsert falló, limpiar el archivo recién subido para evitar huérfanos
    if (adjunto_path) await borrarArchivos('recursos', [adjunto_path]).catch(() => {})
    return { error: 'No se pudo guardar tu feedback.' }
  }

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
export async function enviarMensajeFeedback(
  actor: Pick<Profile, 'id' | 'rol'>,
  raw: Record<string, unknown>,
): Promise<FeedbackState & { paciente_id?: string }> {
  const parsed = mensajeSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }

  const user = actor

  const [feedback] = await db
    .select({ paciente_id: feedback_semanal.paciente_id, semana_inicio: feedback_semanal.semana_inicio })
    .from(feedback_semanal)
    .where(eq(feedback_semanal.id, parsed.data.feedback_id))
    .limit(1)
  if (!feedback) return { error: 'No se encontró el feedback de esa semana.' }

  // Policy `feedback_mensajes insert propio o staff`: el paciente dueño del hilo o el staff.
  if (feedback.paciente_id !== user.id && !esStaff(actor.rol)) return { error: 'No autorizado' }

  if (feedback.semana_inicio !== lunesDeSemanaArgentina()) {
    return { error: 'Esta conversación ya se cerró, fue de una semana anterior.' }
  }

  try {
    await db.insert(feedback_mensajes).values({
      feedback_id: parsed.data.feedback_id,
      autor_id: user.id,
      contenido: parsed.data.contenido,
    })
  } catch (err) {
    console.error('enviarMensajeFeedbackAction:', err)
    return { error: 'No se pudo enviar el mensaje.' }
  }

  return { ok: true, paciente_id: feedback.paciente_id }
}

const editarMensajeSchema = z.object({
  id:        z.coerce.number().int().positive(),
  contenido: z.string().trim().min(1, 'Escribí un mensaje').max(2000),
})

// Como en un chat: solo se puede editar el último mensaje del hilo, y solo el
// propio — una vez que el otro lado respondió, ese mensaje queda congelado.
export async function editarMensajeFeedback(
  userId: string,
  raw: Record<string, unknown>,
): Promise<FeedbackState & { paciente_id?: string }> {
  const parsed = editarMensajeSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }

  const user = { id: userId }

  const [mensaje] = await db
    .select({ id: feedback_mensajes.id, feedback_id: feedback_mensajes.feedback_id, autor_id: feedback_mensajes.autor_id })
    .from(feedback_mensajes)
    .where(eq(feedback_mensajes.id, parsed.data.id))
    .limit(1)
  if (!mensaje) return { error: 'Mensaje no encontrado.' }
  if (mensaje.autor_id !== user.id) return { error: 'Solo podés editar tus propios mensajes.' }

  const [ultimo] = await db
    .select({ id: feedback_mensajes.id })
    .from(feedback_mensajes)
    .where(eq(feedback_mensajes.feedback_id, mensaje.feedback_id))
    .orderBy(desc(feedback_mensajes.id))
    .limit(1)
  if (ultimo?.id !== mensaje.id) {
    return { error: 'Solo se puede editar el último mensaje de la conversación.' }
  }

  const [feedback] = await db
    .select({ paciente_id: feedback_semanal.paciente_id, semana_inicio: feedback_semanal.semana_inicio })
    .from(feedback_semanal)
    .where(eq(feedback_semanal.id, mensaje.feedback_id))
    .limit(1)
  if (!feedback || feedback.semana_inicio !== lunesDeSemanaArgentina()) {
    return { error: 'Esta conversación ya se cerró.' }
  }

  try {
    await db
      .update(feedback_mensajes)
      .set({ contenido: parsed.data.contenido, edited_at: new Date().toISOString() })
      .where(eq(feedback_mensajes.id, mensaje.id))
  } catch (err) {
    console.error('editarMensajeFeedbackAction:', err)
    return { error: 'No se pudo editar el mensaje.' }
  }

  return { ok: true, paciente_id: feedback.paciente_id }
}
