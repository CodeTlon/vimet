import { NextResponse } from 'next/server'

import { reprogramarTurno } from '@/actions/turnos'
import { requireMobileUser } from '@/lib/supabase/bearer'

export const dynamic = 'force-dynamic'

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/
const HORA_RE = /^\d{2}:\d{2}$/

export async function POST(request: Request) {
  const ctx = await requireMobileUser(request)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const body = await request.json().catch(() => null)
  const id = Number(body?.id)
  const fecha = String(body?.fecha ?? '')
  const hora_inicio = String(body?.hora_inicio ?? '')
  const hora_fin = String(body?.hora_fin ?? '')
  const motivo_reprogramacion = String(body?.motivo_reprogramacion ?? '')
  if (!id || !FECHA_RE.test(fecha) || !HORA_RE.test(hora_inicio) || !HORA_RE.test(hora_fin)) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const result = await reprogramarTurno(ctx.supabase, ctx.user.id, {
    id,
    fecha,
    hora_inicio,
    hora_fin,
    motivo_reprogramacion,
  })
  if ('error' in result) return NextResponse.json(result, { status: 400 })
  return NextResponse.json(result)
}
