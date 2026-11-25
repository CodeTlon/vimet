import { NextResponse } from 'next/server'

import { requireMobileStaff } from '@/lib/auth/mobile'
import { crearPacienteGestionado } from '@/lib/services/staff'
import { crearPacienteSchema } from '@/lib/validation/staff'

export const dynamic = 'force-dynamic'

// Mismo comportamiento que crearPacienteGestionadoAction (actions/staff.ts): ambos usan el servicio.
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

  const res = await crearPacienteGestionado(parsed.data)
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status ?? 400 })
  return NextResponse.json({ ok: true, id: res.id })
}
