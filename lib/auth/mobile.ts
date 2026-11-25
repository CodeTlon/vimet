import { auth } from '@/lib/auth'
import { esStaff, perfilPorId, type Profile, type SessionUser } from '@/lib/auth/session'

// Autenticacion de las rutas app/api/mobile/*: la app manda `Authorization: Bearer <token>`
// (plugin `bearer` de Better Auth). Devuelve usuario y perfil, o un error con status.
export type MobileCtx = { user: SessionUser; profile: Profile }
export type MobileError = { error: string; status: 401 | 403 }

export async function requireMobileUser(request: Request): Promise<MobileCtx | MobileError> {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return { error: 'No autenticado', status: 401 }

  const profile = await perfilPorId(session.user.id)
  // `activo` se chequea server-side: un token valido obtenido fuera de la app no debe saltearlo.
  if (!profile || !profile.activo) return { error: 'Cuenta pendiente de activación.', status: 403 }

  return { user: { id: session.user.id, email: session.user.email }, profile }
}

export async function requireMobileStaff(request: Request): Promise<MobileCtx | MobileError> {
  const ctx = await requireMobileUser(request)
  if ('error' in ctx) return ctx
  return esStaff(ctx.profile.rol) ? ctx : { error: 'No autorizado', status: 403 }
}

// Para rutas que tocan cuentas de otro staff. Activar/desactivar paciente queda abierto a cualquier staff.
export async function requireMobileAdmin(request: Request): Promise<MobileCtx | MobileError> {
  const ctx = await requireMobileUser(request)
  if ('error' in ctx) return ctx
  return ctx.profile.rol === 'admin' ? ctx : { error: 'No autorizado', status: 403 }
}
