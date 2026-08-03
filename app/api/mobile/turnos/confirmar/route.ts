import { NextResponse } from 'next/server'

import { confirmarTurno } from '@/actions/turnos'
import { requireMobileUser } from '@/lib/supabase/bearer'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const ctx = await requireMobileUser(request)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const body = await request.json().catch(() => null)
  const id = Number(body?.id)
  if (!id) return NextResponse.json({ error: 'Turno inválido' }, { status: 400 })

  const result = await confirmarTurno(ctx.supabase, ctx.user.id, id)
  if ('error' in result) return NextResponse.json(result, { status: 400 })
  return NextResponse.json(result)
}
