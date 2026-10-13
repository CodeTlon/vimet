// Servicio de evolucion clinica. SIN 'use server': recibe al actor (staff) ya autenticado.
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

import { evolucion_entradas } from '@/db/schema'
import { encryptClinical } from '@/lib/crypto/clinical'
import { conActor } from '@/lib/db'

export type EvolucionState = { ok?: boolean; error?: string }

const schema = z.object({
  paciente_id: z.string().uuid(),
  origen: z.enum(['nutricion', 'entrenamiento']),
  tipo: z.enum(['evolucion', 'observacion']),
  contenido: z.string().min(1, 'Escribí algo').max(4000),
  visible_paciente: z.enum(['true', 'false']).default('false'),
})

export async function crearEntradaEvolucion(actorId: string, raw: Record<string, unknown>): Promise<EvolucionState & { paciente_id?: string }> {
  const parsed = schema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  const d = parsed.data
  let contenido_enc: string | null
  try {
    contenido_enc = encryptClinical(d.contenido)
  } catch (e) {
    console.error('crearEntradaEvolucion: fallo al cifrar contenido', e)
    return { error: 'No se pudo guardar la entrada (falló el cifrado — revisar CLINICAL_DATA_ENCRYPTION_KEY del entorno).' }
  }
  try {
    await conActor(actorId, (tx) =>
      tx.insert(evolucion_entradas).values({
        paciente_id: d.paciente_id,
        origen: d.origen,
        tipo: d.tipo,
        contenido: null,
        contenido_enc,
        visible_paciente: d.visible_paciente === 'true',
        registrado_por: actorId,
      }),
    )
  } catch (err) {
    console.error('crearEntradaEvolucion:', err)
    return { error: 'No se pudo guardar la entrada.' }
  }
  return { ok: true, paciente_id: d.paciente_id }
}

const updateSchema = schema.extend({ id: z.coerce.number().int().positive() })

export async function actualizarEntradaEvolucion(actorId: string, raw: Record<string, unknown>): Promise<EvolucionState & { paciente_id?: string }> {
  const parsed = updateSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  const d = parsed.data
  let contenido_enc: string | null
  try {
    contenido_enc = encryptClinical(d.contenido)
  } catch (e) {
    console.error('actualizarEntradaEvolucion: fallo al cifrar contenido', e)
    return { error: 'No se pudo actualizar la entrada (falló el cifrado — revisar CLINICAL_DATA_ENCRYPTION_KEY del entorno).' }
  }
  try {
    await conActor(actorId, (tx) =>
      tx
        .update(evolucion_entradas)
        .set({ origen: d.origen, tipo: d.tipo, contenido: null, contenido_enc, visible_paciente: d.visible_paciente === 'true' })
        .where(eq(evolucion_entradas.id, d.id)),
    )
  } catch (err) {
    console.error('actualizarEntradaEvolucion:', err)
    return { error: 'No se pudo actualizar la entrada.' }
  }
  return { ok: true, paciente_id: d.paciente_id }
}

/** `pacienteId` acota el borrado: la entrada tiene que ser de ese paciente. */
export async function eliminarEntradaEvolucion(actorId: string, id: number, pacienteId?: string): Promise<EvolucionState> {
  if (!id) return { error: 'Datos inválidos' }
  try {
    await conActor(actorId, (tx) =>
      tx
        .delete(evolucion_entradas)
        .where(
          pacienteId
            ? and(eq(evolucion_entradas.id, id), eq(evolucion_entradas.paciente_id, pacienteId))
            : eq(evolucion_entradas.id, id),
        ),
    )
  } catch (err) {
    console.error('eliminarEntradaEvolucion:', err)
    return { error: 'No se pudo eliminar la entrada.' }
  }
  return { ok: true }
}
