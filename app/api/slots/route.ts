import { eq } from 'drizzle-orm'
import { NextResponse, type NextRequest } from 'next/server'

import { servicios } from '@/db/schema'
import { auth } from '@/lib/auth'
import { getSlotsDisponibles, getSlotsDisponiblesCombo } from '@/lib/booking/slots'
import { db } from '@/lib/db'
import { ipDeRequest, rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  if (!rateLimit(`slots:${ipDeRequest(request)}`, 60, 60 * 1000)) {
    return NextResponse.json({ error: 'Demasiados intentos' }, { status: 429 })
  }

  // Cookie de sesión (web) o `Authorization: Bearer` (app mobile): Better Auth resuelve ambas.
  // Se exige sesión: la disponibilidad se calcula con todos los turnos del profesional.
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const url = request.nextUrl
  const profesionalId = url.searchParams.get('profesional_id') ?? ''
  const fecha = url.searchParams.get('fecha') ?? ''
  const servicioId = Number(url.searchParams.get('servicio_id')) || 0
  const modalidadParam = url.searchParams.get('modalidad')
  const modalidad = modalidadParam === 'presencial' || modalidadParam === 'virtual' ? modalidadParam : undefined
  const excludeTurnoId = Number(url.searchParams.get('excluir_turno_id')) || undefined

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || (!profesionalId && !servicioId)) {
    return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
  }

  let duracion = 60
  let esCombo = false
  if (servicioId) {
    const [s] = await db
      .select({ duracion_minutos: servicios.duracion_minutos, tipo: servicios.tipo })
      .from(servicios)
      .where(eq(servicios.id, servicioId))
      .limit(1)
    if (s?.duracion_minutos) duracion = s.duracion_minutos
    esCombo = s?.tipo === 'combo'
  }

  if (esCombo) {
    const slots = await getSlotsDisponiblesCombo({ fecha, duracion, modalidad, excludeTurnoId })
    return NextResponse.json({ slots })
  }

  if (!profesionalId) {
    return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
  }

  const slots = await getSlotsDisponibles({ profesionalId, fecha, duracion, modalidad, excludeTurnoId })
  return NextResponse.json({ slots })
}
