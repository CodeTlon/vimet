import { eq } from 'drizzle-orm'

import { profiles } from '@/db/schema'
import { db as dbGlobal, type Db } from '@/lib/db'

// Modulo SIN 'use server' a proposito: estas funciones no deben ser invocables desde el
// cliente. (En la version de Supabase vivian en actions/auth.ts como Server Action exportada,
// y `activarPerfilConfirmado(userId)` podia llamarse sin sesion con un uuid.)

/**
 * Activa el perfil de un paciente que confirmo su email. Pisa `activado_en` solo en la primera
 * activacion real, mismo criterio que `toggleActivoAction`, para que /admin/pacientes siga
 * distinguiendo "nunca activado" de "activo/inactivo".
 */
export async function activarPerfilConfirmado(userId: string, db: Db = dbGlobal): Promise<void> {
  const [perfil] = await db.select({ activado_en: profiles.activado_en }).from(profiles).where(eq(profiles.id, userId)).limit(1)
  if (!perfil) return
  await db
    .update(profiles)
    .set({ activo: true, ...(perfil.activado_en ? {} : { activado_en: new Date().toISOString() }) })
    .where(eq(profiles.id, userId))
}
