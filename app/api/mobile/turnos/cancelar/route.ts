import { NextResponse } from 'next/server'

import { cancelarTurno } from '@/lib/services/turnos'
import { requireMobileUser } from '@/lib/auth/mobile'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const ctx = await requireMobileUser(request)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const body = await request.json().catch(() => null)
  const id = Number(body?.id)
  if (!id) return NextResponse.json({ error: 'Turno inválido' }, { status: 400 })

  const result = await cancelarTurno(ctx.user.id, id)
  if ('error' in result) return NextResponse.json(result, { status: 400 })
  return NextResponse.json(result)
}
