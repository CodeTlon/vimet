import { NextResponse } from 'next/server'

import { crearTurno } from '@/actions/turnos'
import { requireMobileUser } from '@/lib/supabase/bearer'
import { crearSchema } from '@/lib/validation/turnos'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const ctx = await requireMobileUser(request)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  // Mismo schema que crearTurnoAction (web) — antes esta ruta construía el
  // objeto a mano sin validar formato y confiaba en que crearTurno() ya
  // vendría con datos bien formados.
  const parsed = crearSchema.safeParse({
    profesional_id: body.profesional_id,
    servicio_id: body.servicio_id,
    fecha: body.fecha,
    hora_inicio: body.hora_inicio,
    hora_fin: body.hora_fin,
    modalidad: body.modalidad === 'virtual' ? 'virtual' : 'presencial',
    notas: body.notas ?? '',
  })
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })
  }

  const result = await crearTurno(ctx.supabase, ctx.user.id, parsed.data)

  if ('error' in result) return NextResponse.json(result, { status: 400 })
  return NextResponse.json(result)
}
