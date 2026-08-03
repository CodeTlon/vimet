import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireMobileStaff } from '@/lib/supabase/bearer'

export const dynamic = 'force-dynamic'

const schema = z.object({
  email: z.string().email('Email inválido'),
  tipo: z.enum(['nutricionista', 'entrenador']),
})

const SERVICIO_TIPO: Record<'nutricionista' | 'entrenador', string> = {
  nutricionista: 'nutricion',
  entrenador: 'entrenamiento',
}

// Réplica exacta de configurarProfesionalAction (actions/staff.ts).
export async function POST(request: Request) {
  const ctx = await requireMobileStaff(request)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })
  const { email, tipo } = parsed.data

  const admin = createAdminClient()

  const { data: nuevo } = await admin.from('profiles').select('id').eq('email', email).maybeSingle()
  if (!nuevo) return NextResponse.json({ error: 'No se encontró ningún usuario con ese email.' }, { status: 404 })

  const { data: anterior } = await admin
    .from('profiles')
    .select('id')
    .eq('rol', tipo)
    .neq('id', nuevo.id)
    .maybeSingle()

  await admin.from('profiles').update({ rol: tipo, activo: true }).eq('id', nuevo.id)
  await admin.from('servicios').update({ profesional_id: nuevo.id }).eq('tipo', SERVICIO_TIPO[tipo])

  if (anterior) {
    await admin.from('horarios_disponibles').update({ profesional_id: nuevo.id }).eq('profesional_id', anterior.id)
  }

  const { count: horariosCount } = await admin
    .from('horarios_disponibles')
    .select('id', { count: 'exact', head: true })
    .eq('profesional_id', nuevo.id)

  if (!horariosCount) {
    const dias = [1, 2, 3, 4, 5]
    await admin.from('horarios_disponibles').insert(
      dias.flatMap((dia) => [
        { profesional_id: nuevo.id, dia_semana: dia, hora_inicio: '09:00', hora_fin: '13:00', modalidad: 'ambas' as const },
        { profesional_id: nuevo.id, dia_semana: dia, hora_inicio: '14:00', hora_fin: '18:00', modalidad: 'ambas' as const },
      ]),
    )
  }

  return NextResponse.json({ ok: true })
}
