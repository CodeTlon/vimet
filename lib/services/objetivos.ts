// Servicio de objetivos. SIN 'use server': recibe al actor (staff) ya autenticado.
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

import { objetivos } from '@/db/schema'
import { hoyArgentina } from '@/lib/datetime'
import { db } from '@/lib/db'

export type ObjetivoState = { ok?: boolean; error?: string }

const schema = z.object({
  paciente_id: z.string().uuid(),
  categoria: z.enum(['nutricional', 'antropometrico', 'clinico', 'entrenamiento', 'rendimiento']),
  descripcion: z.string().min(1, 'Escribí el objetivo').max(500),
  estado: z.enum(['pendiente', 'en_progreso', 'cumplido', 'descartado']).default('pendiente'),
  fecha_objetivo: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || v >= hoyArgentina(), 'La fecha objetivo no puede ser pasada'),
})

export async function crearObjetivo(actorId: string, raw: Record<string, unknown>): Promise<ObjetivoState & { paciente_id?: string }> {
  const parsed = schema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  const d = parsed.data
  try {
    await db.insert(objetivos).values({
      paciente_id: d.paciente_id,
      categoria: d.categoria,
      descripcion: d.descripcion,
      estado: d.estado,
      fecha_objetivo: d.fecha_objetivo && d.fecha_objetivo !== '' ? d.fecha_objetivo : null,
      registrado_por: actorId,
    })
  } catch (err) {
    console.error('crearObjetivo:', err)
    return { error: 'No se pudo crear el objetivo.' }
  }
  return { ok: true, paciente_id: d.paciente_id }
}

const cambioEstadoSchema = z.object({
  id: z.coerce.number().int().positive(),
  paciente_id: z.string().uuid(),
  estado: z.enum(['pendiente', 'en_progreso', 'cumplido', 'descartado']),
})

export async function cambiarEstadoObjetivo(raw: Record<string, unknown>): Promise<ObjetivoState & { paciente_id?: string }> {
  const parsed = cambioEstadoSchema.safeParse(raw)
  if (!parsed.success) return { error: 'Datos inválidos' }
  // Acotado al paciente: el id del objetivo tiene que pertenecer a ese paciente.
  await db
    .update(objetivos)
    .set({ estado: parsed.data.estado })
    .where(and(eq(objetivos.id, parsed.data.id), eq(objetivos.paciente_id, parsed.data.paciente_id)))
  return { ok: true, paciente_id: parsed.data.paciente_id }
}

export async function eliminarObjetivo(id: number, pacienteId?: string): Promise<ObjetivoState> {
  if (!id) return { error: 'Datos inválidos' }
  await db
    .delete(objetivos)
    .where(pacienteId ? and(eq(objetivos.id, id), eq(objetivos.paciente_id, pacienteId)) : eq(objetivos.id, id))
  return { ok: true }
}
