import { createClient } from '@supabase/supabase-js'

// Cliente para las rutas app/api/mobile/* — la app mobile no tiene cookies,
// manda el access_token de su sesión Supabase por Authorization header.
// El resto (RLS, auth.uid()) funciona exactamente igual que con cookies.
export function createClientFromToken(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  )
}

export async function requireMobileUser(request: Request) {
  const auth = request.headers.get('authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) return { error: 'No autenticado' as const, status: 401 as const }

  const supabase = createClientFromToken(token)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' as const, status: 401 as const }

  // Defensa en profundidad: la app mobile ya bloquea localmente una sesión
  // con activo=false (vimet-app/store/session.ts, forzando signOut), pero
  // eso es un chequeo client-side — un bearer token válido obtenido fuera de
  // la app (ej. contra el endpoint REST de Supabase Auth directo, sin pasar
  // nunca por esa pantalla) lo pasaría igual sin este chequeo server-side.
  // Mismo criterio que ya aplica actions/auth.ts (loginAction) del lado web.
  const { data: profile } = await supabase
    .from('profiles')
    .select('activo')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile || !profile.activo) {
    return { error: 'Cuenta pendiente de activación.' as const, status: 403 as const }
  }

  return { user, supabase }
}

export async function requireMobileStaff(request: Request) {
  const ctx = await requireMobileUser(request)
  if ('error' in ctx) return ctx
  const { data: profile } = await ctx.supabase
    .from('profiles')
    .select('rol')
    .eq('id', ctx.user.id)
    .maybeSingle()
  if (!profile || !['nutricionista', 'entrenador', 'admin'].includes(profile.rol)) {
    return { error: 'No autorizado' as const, status: 403 as const }
  }
  return ctx
}

// Para rutas que tocan cuentas de otro staff (passwords, roles):
// requireMobileStaff() sólo exige "no ser paciente", no alcanza para eso.
// Activar/desactivar paciente sí queda abierto a cualquier staff (ver
// app/api/mobile/staff/toggle-activo).
export async function requireMobileAdmin(request: Request) {
  const ctx = await requireMobileUser(request)
  if ('error' in ctx) return ctx
  const { data: profile } = await ctx.supabase
    .from('profiles')
    .select('rol')
    .eq('id', ctx.user.id)
    .maybeSingle()
  if (!profile || profile.rol !== 'admin') {
    return { error: 'No autorizado' as const, status: 403 as const }
  }
  return ctx
}
