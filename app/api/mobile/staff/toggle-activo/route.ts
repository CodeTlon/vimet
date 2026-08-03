import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireMobileStaff } from '@/lib/supabase/bearer'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const ctx = await requireMobileStaff(request)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const body = await request.json().catch(() => null)
  const id = String(body?.id ?? '')
  const activo = body?.activo === true
  if (!id) return NextResponse.json({ error: 'Paciente inválido' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('profiles').update({ activo }).eq('id', id)
  if (error) return NextResponse.json({ error: 'No se pudo actualizar.' }, { status: 400 })

  return NextResponse.json({ ok: true })
}
