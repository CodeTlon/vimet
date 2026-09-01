import { randomUUID } from 'crypto'

import { NextResponse } from 'next/server'

import { crearPacienteSchema } from '@/actions/staff'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireMobileStaff } from '@/lib/supabase/bearer'

export const dynamic = 'force-dynamic'

// Reimplementa crearPacienteGestionadoAction (actions/staff.ts) sin sesión de
// cookies: mismo comportamiento, autenticado por bearer en vez de requireStaff().
export async function POST(request: Request) {
  const ctx = await requireMobileStaff(request)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const body = await request.json().catch(() => null)
  const parsed = crearPacienteSchema.safeParse({
    nombre: body?.nombre,
    apellido: body?.apellido,
    telefono: body?.telefono,
    email: body?.email,
  })
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })
  }

  const { nombre, apellido, telefono, email } = parsed.data
  const admin = createAdminClient()

  const emailReal = email ? email : null
  const emailParaAuth = emailReal ?? `paciente.${randomUUID()}@sinacceso.vimet.local`

  const { data, error } = await admin.auth.admin.createUser({
    email: emailParaAuth,
    password: randomUUID(),
    email_confirm: true,
    user_metadata: { nombre, apellido, telefono },
  })

  if (error || !data.user) {
    if (error?.message?.toLowerCase().includes('already been registered')) {
      return NextResponse.json({ error: 'Ya existe una cuenta con ese email.' }, { status: 400 })
    }
    return NextResponse.json({ error: 'No se pudo crear el paciente.' }, { status: 400 })
  }

  await admin
    .from('profiles')
    .update({
      activo: true,
      activado_en: new Date().toISOString(),
      gestionado_por_staff: true,
      email: emailReal,
    })
    .eq('id', data.user.id)

  return NextResponse.json({ ok: true, id: data.user.id })
}
