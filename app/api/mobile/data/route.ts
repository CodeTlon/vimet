import { NextResponse } from 'next/server'

import { requireMobileUser } from '@/lib/auth/mobile'
import { ejecutarOp } from '@/lib/mobile/registry'
import { ErrorOp, type Archivos } from '@/lib/mobile/tipos'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// Unico punto de datos de la app mobile: POST { op, args } (JSON) o multipart con `op`, `args`
// (JSON en texto) y los archivos `archivo` / `imagenes`. La autorizacion de cada operacion vive en
// lib/mobile/ops-*.ts; aca solo la sesion (bearer), el limite de uso y el manejo de errores.
export async function POST(request: Request) {
  const ctx = await requireMobileUser(request)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  if (!rateLimit(`mobile-data:${ctx.user.id}`, 240, 60 * 1000)) {
    return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })
  }

  let nombre = ''
  let args: unknown = {}
  const archivos: Archivos = { archivo: null, imagenes: [] }

  try {
    const tipo = request.headers.get('content-type') ?? ''
    if (tipo.includes('multipart/form-data')) {
      const fd = await request.formData()
      nombre = String(fd.get('op') ?? '')
      args = JSON.parse(String(fd.get('args') ?? '{}'))
      const archivo = fd.get('archivo')
      if (archivo instanceof File && archivo.size > 0) archivos.archivo = archivo
      archivos.imagenes = fd.getAll('imagenes').filter((f): f is File => f instanceof File && f.size > 0)
    } else {
      const body = (await request.json()) as { op?: unknown; args?: unknown }
      nombre = String(body.op ?? '')
      args = body.args ?? {}
    }
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
  }

  try {
    const data = await ejecutarOp(nombre, args, ctx, archivos)
    return NextResponse.json({ data: data ?? null })
  } catch (err) {
    if (err instanceof ErrorOp) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error(`mobile/data ${nombre}:`, err)
    return NextResponse.json({ error: 'No se pudo completar la operación.' }, { status: 500 })
  }
}
