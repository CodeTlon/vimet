import { eq } from 'drizzle-orm'
import { readFileSync } from 'node:fs'

import { SMOKE_EMAIL, SMOKE_PASSWORD } from './_creds'

// Garantiza un usuario staff (rol nutricionista) en la base de TEST para que el smoke pueda
// atravesar el gate de /admin. Idempotente: si ya existe, re-fija la contrasena y el rol.
// Nunca correr contra produccion: usa la DATABASE_URL de .env.local.
export default async function globalSetup() {
  const env = Object.fromEntries(
    readFileSync('.env.local', 'utf8')
      .split('\n')
      .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
      .map((l) => {
        const i = l.indexOf('=')
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
      }),
  )
  if (!env.DATABASE_URL) throw new Error('Falta DATABASE_URL en .env.local')
  if (process.env.APP_ENV === 'production') throw new Error('El smoke no corre contra produccion.')
  process.env.DATABASE_URL = env.DATABASE_URL

  // Import dinamico: lib/db lee DATABASE_URL al cargarse.
  const { db } = await import('../lib/db')
  const { profiles } = await import('../db/schema')
  const { crearUsuario } = await import('../lib/auth/usuarios')
  const { setUserPassword } = await import('../lib/auth/password')

  const [existente] = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.email, SMOKE_EMAIL)).limit(1)
  if (existente) {
    await setUserPassword(existente.id, SMOKE_PASSWORD)
    await db.update(profiles).set({ rol: 'nutricionista', activo: true }).where(eq(profiles.id, existente.id))
  } else {
    await crearUsuario({
      email: SMOKE_EMAIL,
      nombre: 'Smoke',
      apellido: 'Staff',
      rol: 'nutricionista',
      password: SMOKE_PASSWORD,
      emailVerificado: true,
      activo: true,
    })
  }

  console.log('[global-setup] usuario staff de smoke listo:', SMOKE_EMAIL)
}
