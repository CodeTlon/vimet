import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireMobileStaff } from '@/lib/auth/mobile'
import {
  actualizarFranja,
  cancelarYNotificar,
  franjaPropia,
  franjaSeSolapa,
  turnosSinCobertura,
} from '@/lib/services/horarios'

export const dynamic = 'force-dynamic'

const schema = z.object({
  id: z.coerce.number().int().positive(),
  dia_semana: z.coerce.number().int().min(0).max(6),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}$/),
  hora_fin: z.string().regex(/^\d{2}:\d{2}$/),
  modalidad: z.enum(['presencial', 'virtual', 'ambas']),
})

export async function POST(request: Request) {
  const ctx = await requireMobileStaff(request)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  const d = parsed.data

  if (d.hora_inicio >= d.hora_fin) {
    return NextResponse.json({ error: 'La hora de inicio debe ser anterior a la de fin.' }, { status: 400 })
  }

  const actual = await franjaPropia(ctx.user.id, d.id)
  if (!actual) return NextResponse.json({ error: 'Franja no encontrada.' }, { status: 404 })

  const { id, ...franja } = d
  if (await franjaSeSolapa(ctx.user.id, franja, id)) {
    return NextResponse.json({ error: 'Esa franja se superpone con otra que ya tenés cargada ese día.' }, { status: 400 })
  }

  try {
    await actualizarFranja(ctx.user.id, id, franja)
  } catch (err) {
    console.error('horarios/actualizar:', err)
    return NextResponse.json({ error: 'No se pudo guardar la franja horaria.' }, { status: 400 })
  }

  const dias = [...new Set([actual.dia_semana, d.dia_semana])]
  const afectados = await turnosSinCobertura(ctx.user.id, dias)
  const cancelados = await cancelarYNotificar(afectados)

  return NextResponse.json({ ok: true, cancelados })
}
