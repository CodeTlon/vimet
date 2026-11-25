import { NextResponse } from 'next/server'

import { requireMobileStaff } from '@/lib/auth/mobile'
import { cambiarActivo } from '@/lib/services/staff'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  const ctx = await requireMobileStaff(request)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const body = await request.json().catch(() => null)
  const id = String(body?.id ?? '')
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Paciente inválido' }, { status: 400 })

  const res = await cambiarActivo(ctx.profile, id, body?.activo === true)
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status ?? 400 })
  return NextResponse.json({ ok: true })
}
