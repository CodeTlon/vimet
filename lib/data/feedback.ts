import { asc, eq, inArray } from 'drizzle-orm'

import type { MensajeFeedback } from '@/components/seguimiento/feedback-chat'
import { feedback_mensajes, profiles } from '@/db/schema'
import { db as dbGlobal, type Db } from '@/lib/db'

/**
 * Mensajes de uno o varios hilos de feedback, con el nombre del autor. NO autoriza: el llamador ya
 * verifico que los hilos son del paciente logueado o que el actor es staff (policy
 * `feedback_mensajes select propio o staff`).
 */
export async function mensajesDeFeedback(
  feedbackIds: number[],
  db: Db = dbGlobal,
): Promise<Map<number, MensajeFeedback[]>> {
  const porFeedback = new Map<number, MensajeFeedback[]>()
  if (feedbackIds.length === 0) return porFeedback

  const filas = await db
    .select({
      id: feedback_mensajes.id,
      feedback_id: feedback_mensajes.feedback_id,
      autor_id: feedback_mensajes.autor_id,
      contenido: feedback_mensajes.contenido,
      created_at: feedback_mensajes.created_at,
      edited_at: feedback_mensajes.edited_at,
      autor: { nombre: profiles.nombre, apellido: profiles.apellido },
    })
    .from(feedback_mensajes)
    .leftJoin(profiles, eq(profiles.id, feedback_mensajes.autor_id))
    .where(inArray(feedback_mensajes.feedback_id, feedbackIds))
    .orderBy(asc(feedback_mensajes.id))

  for (const m of filas as unknown as (MensajeFeedback & { feedback_id: number })[]) {
    const arr = porFeedback.get(m.feedback_id) ?? []
    arr.push(m)
    porFeedback.set(m.feedback_id, arr)
  }
  return porFeedback
}
