import { NextResponse, type NextRequest } from 'next/server'

import { getSlotsDisponibles, getSlotsDisponiblesCombo } from '@/lib/booking/slots'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const url = request.nextUrl
  const profesionalId = url.searchParams.get('profesional_id') ?? ''
  const fecha = url.searchParams.get('fecha') ?? ''
  const servicioId = url.searchParams.get('servicio_id') ?? ''
  const modalidadParam = url.searchParams.get('modalidad')
  const modalidad = modalidadParam === 'presencial' || modalidadParam === 'virtual' ? modalidadParam : undefined

  if (!fecha || (!profesionalId && !servicioId)) {
    return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
  }

  let duracion = 60
  let esCombo = false
  if (servicioId) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('servicios')
      .select('duracion_minutos, tipo')
      .eq('id', servicioId)
      .maybeSingle()
    if (data?.duracion_minutos) duracion = data.duracion_minutos
    esCombo = data?.tipo === 'combo'
  }

  if (esCombo) {
    const slots = await getSlotsDisponiblesCombo({ fecha, duracion, modalidad })
    return NextResponse.json({ slots })
  }

  if (!profesionalId) {
    return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
  }

  const slots = await getSlotsDisponibles({ profesionalId, fecha, duracion, modalidad })
  return NextResponse.json({ slots })
}
