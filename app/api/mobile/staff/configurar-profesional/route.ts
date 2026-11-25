import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireMobileAdmin } from '@/lib/auth/mobile'
import { configurarProfesional } from '@/lib/services/staff'

export const dynamic = 'force-dynamic'

const schema = z.object({
  email: z.string().email('Email inválido'),
  tipo: z.enum(['nutricionista', 'entrenador']),
})

// Mismo comportamiento que configurarProfesionalAction (actions/staff.ts): ambos usan el servicio.
export async function POST(request: Request) {
  const ctx = await requireMobileAdmin(request)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })

  const res = await configurarProfesional(parsed.data.email, parsed.data.tipo)
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status ?? 400 })
  return NextResponse.json({ ok: true })
}
