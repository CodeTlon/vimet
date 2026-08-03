import { NextResponse } from 'next/server'

import { cancelarYNotificar, turnosSinCobertura } from '@/actions/horarios'
import { requireMobileStaff } from '@/lib/supabase/bearer'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const ctx = await requireMobileStaff(request)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const body = await request.json().catch(() => null)
  const id = Number(body?.id)
  if (!id) return NextResponse.json({ ok: true })

  const { data: horario } = await ctx.supabase
    .from('horarios_disponibles')
    .select('dia_semana, hora_inicio, hora_fin')
    .eq('id', id)
    .eq('profesional_id', ctx.user.id)
    .maybeSingle()

  await ctx.supabase.from('horarios_disponibles').delete().eq('id', id).eq('profesional_id', ctx.user.id)

  const afectados = horario ? await turnosSinCobertura(ctx.supabase, ctx.user.id, [horario.dia_semana]) : []
  const cancelados = await cancelarYNotificar(ctx.supabase, afectados)

  return NextResponse.json({ ok: true, cancelados })
}
