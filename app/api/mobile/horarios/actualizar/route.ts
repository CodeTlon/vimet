import { NextResponse } from 'next/server'
import { z } from 'zod'

import { cancelarYNotificar, turnosSinCobertura } from '@/actions/horarios'
import { requireMobileStaff } from '@/lib/supabase/bearer'

export const dynamic = 'force-dynamic'

const schema = z.object({
  id: z.coerce.number().int().positive(),
  dia_semana: z.coerce.number().int().min(0).max(6),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}$/),
  hora_fin: z.string().regex(/^\d{2}:\d{2}$/),
  modalidad: z.enum(['presencial', 'virtual', 'ambas']),
})

export async function POST(request: Request) {
  const ctx = await requireMobileStaff(request)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  const d = parsed.data

  if (d.hora_inicio >= d.hora_fin) {
    return NextResponse.json({ error: 'La hora de inicio debe ser anterior a la de fin.' }, { status: 400 })
  }

  const { data: actual } = await ctx.supabase
    .from('horarios_disponibles')
    .select('dia_semana')
    .eq('id', d.id)
    .eq('profesional_id', ctx.user.id)
    .maybeSingle()
  if (!actual) return NextResponse.json({ error: 'Franja no encontrada.' }, { status: 404 })

  const { data: existentes } = await ctx.supabase
    .from('horarios_disponibles')
    .select('hora_inicio, hora_fin')
    .eq('profesional_id', ctx.user.id)
    .eq('dia_semana', d.dia_semana)
    .eq('activo', true)
    .neq('id', d.id)

  const seSolapa = (existentes ?? []).some(
    (h) => d.hora_inicio < h.hora_fin.slice(0, 5) && d.hora_fin > h.hora_inicio.slice(0, 5),
  )
  if (seSolapa) {
    return NextResponse.json({ error: 'Esa franja se superpone con otra que ya tenés cargada ese día.' }, { status: 400 })
  }

  const { error } = await ctx.supabase
    .from('horarios_disponibles')
    .update({ dia_semana: d.dia_semana, hora_inicio: d.hora_inicio, hora_fin: d.hora_fin, modalidad: d.modalidad })
    .eq('id', d.id)
    .eq('profesional_id', ctx.user.id)
  if (error) return NextResponse.json({ error: 'No se pudo guardar la franja horaria.' }, { status: 400 })

  const dias = [...new Set([actual.dia_semana, d.dia_semana])]
  const afectados = await turnosSinCobertura(ctx.supabase, ctx.user.id, dias)
  const cancelados = await cancelarYNotificar(ctx.supabase, afectados)

  return NextResponse.json({ ok: true, cancelados })
}
