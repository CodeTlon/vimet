// Mediciones del reloj (HealthKit / Health Connect) que sincroniza la app. SIN 'use server'.
import { z } from 'zod'

import { mediciones_wearable } from '@/db/schema'
import { db as dbGlobal, type Db } from '@/lib/db'

const entero = z.number().int().min(0).max(10_000_000).nullable().optional()

const filaSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fuente: z.enum(['health_connect', 'apple_health']),
  pasos: entero,
  calorias_activas: entero,
  fc_prom: entero,
  fc_min: entero,
  fc_max: entero,
  minutos_sueno: entero,
})

/**
 * Upsert de las mediciones del propio paciente. `paciente_id` lo fija el servidor con la sesion:
 * la app no puede cargar datos a nombre de otro (policy `mediciones_wearable paciente rw`).
 */
export async function guardarMedicionesWearable(
  userId: string,
  filas: Record<string, unknown>[],
  db: Db = dbGlobal,
): Promise<number> {
  const validas = filas.flatMap((f) => {
    const p = filaSchema.safeParse(f)
    return p.success ? [p.data] : []
  })
  for (const f of validas) {
    const datos = {
      pasos: f.pasos ?? null,
      calorias_activas: f.calorias_activas ?? null,
      fc_prom: f.fc_prom ?? null,
      fc_min: f.fc_min ?? null,
      fc_max: f.fc_max ?? null,
      minutos_sueno: f.minutos_sueno ?? null,
      sincronizado_at: new Date().toISOString(),
    }
    await db
      .insert(mediciones_wearable)
      .values({ paciente_id: userId, fecha: f.fecha, fuente: f.fuente, ...datos })
      .onConflictDoUpdate({
        target: [mediciones_wearable.paciente_id, mediciones_wearable.fecha, mediciones_wearable.fuente],
        set: datos,
      })
  }
  return validas.length
}
