import { NextResponse } from 'next/server'

import { requireMobileStaff } from '@/lib/auth/mobile'
import {
  actualizarFranja,
  cancelarYNotificar,
  eliminarFranja,
  franjaPropia,
  franjaSeSolapa,
  turnosSinCobertura,
} from '@/lib/services/horarios'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const ctx = await requireMobileStaff(request)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const body = await request.json().catch(() => null)
  const id = Number(body?.id)
  if (!id) return NextResponse.json({ ok: true })

  // franjaPropia/eliminarFranja filtran por profesional_id: solo se borra una franja propia.
  const horario = await franjaPropia(ctx.user.id, id)
  await eliminarFranja(ctx.user.id, id)

  const afectados = horario ? await turnosSinCobertura(ctx.user.id, [horario.dia_semana]) : []
  const cancelados = await cancelarYNotificar(afectados)

  return NextResponse.json({ ok: true, cancelados })
}
