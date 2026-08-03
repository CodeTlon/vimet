import { NextResponse } from 'next/server'

import { crearTurno } from '@/actions/turnos'
import { requireMobileUser } from '@/lib/supabase/bearer'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const ctx = await requireMobileUser(request)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  const result = await crearTurno(ctx.supabase, ctx.user.id, {
    profesional_id: String(body.profesional_id ?? ''),
    servicio_id: String(body.servicio_id ?? ''),
    fecha: String(body.fecha ?? ''),
    hora_inicio: String(body.hora_inicio ?? ''),
    hora_fin: String(body.hora_fin ?? ''),
    modalidad: body.modalidad === 'virtual' ? 'virtual' : 'presencial',
    notas: String(body.notas ?? ''),
  })

  if ('error' in result) return NextResponse.json(result, { status: 400 })
  return NextResponse.json(result)
}
