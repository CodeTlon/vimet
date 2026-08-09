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

// Para rutas que tocan cuentas de otro staff (passwords, roles, alta/baja):
// requireMobileStaff() sólo exige "no ser paciente", no alcanza para eso.
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
