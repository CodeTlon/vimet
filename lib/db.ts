import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import * as schema from '@/db/schema'

// Singleton: en desarrollo (HMR) y serverless evita abrir un pool por recarga/invocacion.
// El placeholder deja compilar y hacer `next build` sin credenciales: las consultas
// solo ocurren en runtime, nunca a nivel de modulo.
const globalForDb = globalThis as unknown as { pool?: Pool }

const pool =
  globalForDb.pool ??
  new Pool({
    connectionString:
      process.env.DATABASE_URL ?? 'postgres://placeholder:placeholder@localhost:5432/placeholder',
    max: 5,
  })
if (process.env.NODE_ENV !== 'production') globalForDb.pool = pool

export const db = drizzle({ client: pool, schema })
export { schema }
export type Db = typeof db

/**
 * Ejecuta `fn` en una transaccion donde `app.user_id` identifica al actor.
 * Lo lee el trigger `log_audit_change` (drizzle/0001) para llenar `audit_log.actor_id`
 * sin depender de `auth.uid()` de Supabase. Usar en toda escritura sobre tablas clinicas.
 */
export async function conActor<T>(actorId: string, fn: (tx: Parameters<Parameters<Db['transaction']>[0]>[0]) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.user_id', ${actorId}, true)`)
    return fn(tx)
  })
}
