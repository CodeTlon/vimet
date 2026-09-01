import { NextResponse } from 'next/server'

import { removeAllUnderPrefix } from '@/actions/staff'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireMobileStaff } from '@/lib/supabase/bearer'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Reimplementa eliminarPacienteAction (actions/staff.ts) sin sesión de
// cookies. Solo borra un paciente ya desactivado — mismo resguardo que la web.
export async function POST(request: Request) {
  const ctx = await requireMobileStaff(request)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const body = await request.json().catch(() => null)
  const id = String(body?.id ?? '')
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  const admin = createAdminClient()

  const { data: objetivo } = await admin.from('profiles').select('rol, activo').eq('id', id).maybeSingle()
  if (!objetivo || objetivo.rol !== 'paciente' || objetivo.activo) {
    return NextResponse.json({ error: 'Solo se puede eliminar un paciente desactivado.' }, { status: 400 })
  }

  await removeAllUnderPrefix(admin, 'planes', id)
  await removeAllUnderPrefix(admin, 'recursos', id)

  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: 'No se pudo eliminar el paciente.' }, { status: 400 })

  return NextResponse.json({ ok: true })
}
