import { and, eq } from 'drizzle-orm'
import { hashPassword } from 'better-auth/crypto'

import { account } from '@/db/schema'
import { db as dbGlobal, type Db } from '@/lib/db'

/**
 * Fija la contrasena de la cuenta (provider `credential`) sin pedir la anterior.
 * Para acciones de administracion y para el cierre de una invitacion; nunca exponerlo sin
 * verificar antes quien lo pide (requireAdmin / token de invitacion).
 */
export async function setUserPassword(userId: string, plain: string, db: Db = dbGlobal): Promise<void> {
  const password = await hashPassword(plain)
  const res = await db
    .update(account)
    .set({ password, updatedAt: new Date() })
    .where(and(eq(account.userId, userId), eq(account.providerId, 'credential')))
    .returning({ id: account.id })
  if (res.length === 0) throw new Error('El usuario no tiene cuenta con contraseña.')
}
