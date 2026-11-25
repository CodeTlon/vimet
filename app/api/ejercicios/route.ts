import { and, asc, eq, ilike } from 'drizzle-orm'
import { NextResponse, type NextRequest } from 'next/server'

import { ejercicios } from '@/db/schema'
import { getSessionUser } from '@/lib/auth/session'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Catálogo de ejercicios: lectura para cualquier usuario autenticado (policy `ejercicios read auth`).
export async function GET(request: NextRequest) {
  if (!(await getSessionUser())) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const url = request.nextUrl
  const q = url.searchParams.get('q')?.trim() ?? ''
  const parte = url.searchParams.get('parte') ?? ''
  const equipo = url.searchParams.get('equipo') ?? ''

  try {
    const data = await db
      .select({
        id: ejercicios.id,
        nombre: ejercicios.nombre,
        parte_cuerpo: ejercicios.parte_cuerpo,
        equipo: ejercicios.equipo,
        imagen_url: ejercicios.imagen_url,
        gif_url: ejercicios.gif_url,
        youtube_url: ejercicios.youtube_url,
        modo: ejercicios.modo,
        instrucciones: ejercicios.instrucciones,
      })
      .from(ejercicios)
      .where(
        and(
          q ? ilike(ejercicios.nombre, `%${q.replace(/[\\%_]/g, '\\$&')}%`) : undefined,
          parte ? eq(ejercicios.parte_cuerpo, parte) : undefined,
          equipo ? eq(ejercicios.equipo, equipo) : undefined,
        ),
      )
      .orderBy(asc(ejercicios.nombre))
      .limit(30)
    return NextResponse.json({ data })
  } catch (err) {
    console.error('api/ejercicios:', err)
    return NextResponse.json({ error: 'No se pudo buscar ejercicios.' }, { status: 500 })
  }
}
