import { NextResponse, type NextRequest } from 'next/server'

import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const url = request.nextUrl
  const q = url.searchParams.get('q')?.trim() ?? ''
  const parte = url.searchParams.get('parte') ?? ''
  const equipo = url.searchParams.get('equipo') ?? ''

  const supabase = await createClient()
  let query = supabase
    .from('ejercicios')
    .select('id, nombre, parte_cuerpo, equipo, imagen_url, gif_url, instrucciones')
    .order('nombre')
    .limit(30)

  if (q) query = query.ilike('nombre', `%${q}%`)
  if (parte) query = query.eq('parte_cuerpo', parte)
  if (equipo) query = query.eq('equipo', equipo)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'No se pudo buscar ejercicios.' }, { status: 500 })
  return NextResponse.json({ data })
}
