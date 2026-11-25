import { eq } from 'drizzle-orm'

import { user } from '@/db/schema'
import { db } from '@/lib/db'

/**
 * ¿Existe una cuenta con este email? Solo para decidir si vale la pena conservar lo que el
 * usuario tipeo tras un login fallido — el mensaje de error que se le muestra es SIEMPRE el
 * mismo, exista o no (no revelamos la existencia de la cuenta por texto).
 *
 * Ante cualquier error devuelve `true` (asumimos que existe): equivocarse para este lado deja
 * el campo tal cual estaba, que es lo inocuo.
 */
export async function emailExists(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return true
  try {
    const filas = await db.select({ id: user.id }).from(user).where(eq(user.email, normalized)).limit(1)
    return filas.length > 0
  } catch (err) {
    console.error('emailExists:', err)
    return true
  }
}
