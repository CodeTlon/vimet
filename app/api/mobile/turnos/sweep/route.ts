import { NextResponse } from 'next/server'

import { cancelarPendientesSinConfirmar, marcarNoAsistioVencidos } from '@/actions/turnos'
import { requireMobileUser } from '@/lib/supabase/bearer'

export const dynamic = 'force-dynamic'

// Mismo barrido perezoso que hace la web al abrir mis-turnos / admin — la
// app mobile lo pega antes de listar turnos. No necesita rol específico,
// ambas funciones ya corren con service role y son globales (no tocan datos
// de "este" usuario en particular).
export async function POST(request: Request) {
  const ctx = await requireMobileUser(request)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  await Promise.all([marcarNoAsistioVencidos(), cancelarPendientesSinConfirmar()])
  return NextResponse.json({ ok: true })
}
