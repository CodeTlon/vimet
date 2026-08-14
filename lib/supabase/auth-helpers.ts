import { redirect } from 'next/navigation'
import { createClient } from './server'

export type Profile = {
  id: string
  nombre: string
  apellido: string
  telefono: string | null
  rol: 'paciente' | 'nutricionista' | 'entrenador' | 'admin'
  email: string
  activo: boolean
  created_at: string
}

export async function getUserAndProfile() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { user: null, profile: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle<Profile>()

  return { user, profile }
}

export async function requireAuth() {
  const { user, profile } = await getUserAndProfile()
  if (!user || !profile) redirect('/login')
  return { user, profile }
}

export async function requireStaff() {
  const { user, profile } = await getUserAndProfile()
  if (!user || !profile) redirect('/login')
  if (!['nutricionista', 'entrenador', 'admin'].includes(profile.rol)) {
    redirect('/mis-turnos')
  }
  return { user, profile }
}

// Para acciones que tocan cuentas de otro staff (passwords, roles):
// requireStaff() sólo exige "no ser paciente", no alcanza para eso. Activar/
// desactivar y eliminar pacientes sí quedan abiertos a cualquier staff (ver
// actions/staff.ts) — ahí alcanza con requireStaff().
export async function requireAdmin() {
  const { user, profile } = await getUserAndProfile()
  if (!user || !profile) redirect('/login')
  if (profile.rol !== 'admin') {
    redirect('/mis-turnos')
  }
  return { user, profile }
}
