// Servicio de evaluaciones funcionales. SIN 'use server': recibe al actor (staff) ya autenticado.
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { evaluaciones_funcionales } from '@/db/schema'
import { haceDiasArgentina, hoyArgentina } from '@/lib/datetime'
import { conActor } from '@/lib/db'

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
}).refine(
  (d) =>
    [
      d.test_wells_adams,
      d.test_thomas,
      d.test_dorsiflexion,
      d.test_sentadilla,
      d.test_estabilidad,
      d.fuerza_inferior,
      d.fuerza_superior,
      d.resistencia_metabolica,
    ].some((v) => v != null),
  { message: 'Cargá al menos un test.', path: ['test_wells_adams'] },
)

function valores(d: z.infer<typeof schema>) {
  return {
    test_wells_adams: d.test_wells_adams,
    test_thomas: d.test_thomas,
    test_dorsiflexion: d.test_dorsiflexion,
    test_sentadilla: d.test_sentadilla,
    test_estabilidad: d.test_estabilidad,
    fuerza_inferior: d.fuerza_inferior,
    fuerza_superior: d.fuerza_superior,
    resistencia_metabolica: d.resistencia_metabolica,
    observaciones: d.observaciones && d.observaciones.trim() !== '' ? d.observaciones.trim() : null,
  }
}

type Res = EvalState & { paciente_id?: string }

export async function crearEvaluacion(actorId: string, raw: Record<string, unknown>): Promise<Res> {
  const parsed = schema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  const d = parsed.data
  try {
    await conActor(actorId, (tx) =>
      tx.insert(evaluaciones_funcionales).values({
        paciente_id: d.paciente_id,
        fecha: d.fecha,
        ...valores(d),
        registrado_por: actorId,
      }),
    )
  } catch (err) {
    console.error('crearEvaluacion:', err)
    return { error: 'No se pudo guardar la evaluación.' }
  }
  return { ok: true, paciente_id: d.paciente_id }
}

export async function actualizarEvaluacion(actorId: string, raw: Record<string, unknown>): Promise<Res> {
  const parsed = schema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  if (!parsed.data.id) return { error: 'Falta el id de la evaluación.' }
  const d = parsed.data
  try {
    await conActor(actorId, (tx) =>
      tx
        .update(evaluaciones_funcionales)
        .set({ fecha: d.fecha, ...valores(d) })
        .where(eq(evaluaciones_funcionales.id, d.id!)),
    )
  } catch (err) {
    console.error('actualizarEvaluacion:', err)
    return { error: 'No se pudo actualizar la evaluación.' }
  }
  return { ok: true, paciente_id: d.paciente_id }
}

export async function eliminarEvaluacion(actorId: string, id: number): Promise<EvalState> {
  if (!id) return { error: 'Datos inválidos' }
  try {
    await conActor(actorId, (tx) => tx.delete(evaluaciones_funcionales).where(eq(evaluaciones_funcionales.id, id)))
  } catch (err) {
    console.error('eliminarEvaluacion:', err)
    return { error: 'No se pudo eliminar la evaluación.' }
  }
  return { ok: true }
}
