import { NextResponse } from 'next/server'

import { actualizarTurnoStaff } from '@/actions/turnos'
import { requireMobileUser } from '@/lib/supabase/bearer'

export const dynamic = 'force-dynamic'

const ESTADOS = ['pendiente', 'confirmado', 'cancelado', 'completado', 'no_asistio'] as const

export async function POST(request: Request) {
  const ctx = await requireMobileUser(request)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const body = await request.json().catch(() => null)
  const id = Number(body?.id)
  const estado = ESTADOS.includes(body?.estado) ? body.estado : null
  if (!id || !estado) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  const result = await actualizarTurnoStaff(ctx.supabase, ctx.user.id, {
    id,
    estado,
    notas_profesional: String(body?.notas_profesional ?? ''),
  })
  if ('error' in result) return NextResponse.json(result, { status: 400 })
  return NextResponse.json(result)
}
