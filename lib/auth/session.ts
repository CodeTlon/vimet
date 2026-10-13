import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'

import { profiles } from '@/db/schema'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export type Profile = typeof profiles.$inferSelect
export type Rol = Profile['rol']
export type SessionUser = { id: string; email: string }

export const ROLES_STAFF: readonly Rol[] = ['nutricionista', 'entrenador', 'admin']
export const esStaff = (rol: Rol | null | undefined): boolean => !!rol && ROLES_STAFF.includes(rol)

/** Perfil por id (sin pasar por la sesion). Usar solo con un id ya autenticado. */
export async function perfilPorId(id: string): Promise<Profile | null> {
  const [perfil] = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1)
  return perfil ?? null
}

/** Sesion actual desde las cookies de la request, o null. Deduplicada por request. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() })
  return session ? { id: session.user.id, email: session.user.email } : null
})

// Mismos nombres y firmas que lib/supabase/auth-helpers.ts: los ~50 call sites cambian solo el import.
export async function getUserAndProfile(): Promise<
  { user: SessionUser; profile: Profile | null } | { user: null; profile: null }
> {
  const user = await getSessionUser()
  if (!user) return { user: null, profile: null }
  return { user, profile: await perfilPorId(user.id) }
}

export async function requireAuth() {
  const { user, profile } = await getUserAndProfile()
  if (!user || !profile) redirect('/login')
  return { user, profile }
}

export async function requireStaff() {
  const { user, profile } = await getUserAndProfile()
  if (!user || !profile) redirect('/login')
  if (!esStaff(profile.rol)) redirect('/mis-turnos')
  return { user, profile }
}

// Para acciones que tocan cuentas de otro staff (passwords, roles): requireStaff() solo exige
// "no ser paciente". Activar/desactivar y eliminar pacientes quedan abiertos a cualquier staff.
export async function requireAdmin() {
  const { user, profile } = await getUserAndProfile()
  if (!user || !profile) redirect('/login')
  if (profile.rol !== 'admin') redirect('/mis-turnos')
  return { user, profile }
}

// Variantes "sin redirect" para Server Actions que devuelven `{ error }` en vez de navegar.
export type AuthError = { error: 'No autenticado' | 'No autorizado' }

/** Cualquier usuario con sesion y perfil. */
export async function authUsuario(): Promise<{ user: SessionUser; profile: Profile } | AuthError> {
  const { user, profile } = await getUserAndProfile()
  if (!user) return { error: 'No autenticado' }
  if (!profile) return { error: 'No autorizado' }
  return { user, profile }
}

/** Solo staff (nutricionista, entrenador, admin). */
export async function authStaff(): Promise<{ user: SessionUser; profile: Profile } | AuthError> {
  const ctx = await authUsuario()
  if ('error' in ctx) return ctx
  return esStaff(ctx.profile.rol) ? ctx : { error: 'No autorizado' }
}
