import { createHash, randomBytes } from 'node:crypto'
import { and, eq, gt } from 'drizzle-orm'

import { verification } from '@/db/schema'
import { db as dbGlobal, type Db } from '@/lib/db'

// Invitacion = enlace de un solo uso para que una cuenta creada por staff elija su contrasena.
// Reemplaza el "invite" de Supabase. El token es `<userId>.<secreto>`; en la base solo se guarda
// el hash del secreto (tabla `verification`, identifier `invitacion:<userId>`).
const DIAS_VALIDEZ = 7
const hash = (secreto: string) => createHash('sha256').update(secreto).digest('hex')

export async function crearInvitacion(userId: string, db: Db = dbGlobal): Promise<string> {
  const secreto = randomBytes(32).toString('base64url')
  const identifier = `invitacion:${userId}`
  await db.delete(verification).where(eq(verification.identifier, identifier))
  await db.insert(verification).values({
    identifier,
    value: hash(secreto),
    expiresAt: new Date(Date.now() + DIAS_VALIDEZ * 24 * 60 * 60 * 1000),
  })
  return `${userId}.${secreto}`
}

/** Valida y CONSUME el token. Devuelve el userId o null si es invalido, vencido o ya usado. */
export async function consumirInvitacion(token: string, db: Db = dbGlobal): Promise<string | null> {
  const punto = token.indexOf('.')
  if (punto < 1) return null
  const userId = token.slice(0, punto)
  const secreto = token.slice(punto + 1)
  if (!/^[0-9a-f-]{36}$/i.test(userId) || !secreto) return null

  const borradas = await db
    .delete(verification)
    .where(
      and(
        eq(verification.identifier, `invitacion:${userId}`),
        eq(verification.value, hash(secreto)),
        gt(verification.expiresAt, new Date()),
      ),
    )
    .returning({ id: verification.id })
  return borradas.length === 1 ? userId : null
}
