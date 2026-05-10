import { NextResponse, type NextRequest } from 'next/server'

import { getSlotsDisponibles } from '@/lib/booking/slots'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const url = request.nextUrl
  const profesionalId = url.searchParams.get('profesional_id') ?? ''
  const fecha = url.searchParams.get('fecha') ?? ''
  const servicioId = url.searchParams.get('servicio_id') ?? ''

  if (!profesionalId || !fecha) {
    return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
  }

  let duracion = 60
  if (servicioId) {
    const supabase = createClient()
    const { data } = await supabase
      .from('servicios')
      .select('duracion_minutos')
      .eq('id', servicioId)
      .maybeSingle()
    if (data?.duracion_minutos) duracion = data.duracion_minutos
  }

  const slots = await getSlotsDisponibles({ profesionalId, fecha, duracion })
  return NextResponse.json({ slots })
}
