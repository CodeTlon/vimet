import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireMobileStaff } from '@/lib/supabase/bearer'

export const dynamic = 'force-dynamic'

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

export async function POST(request: Request) {
  const ctx = await requireMobileStaff(request)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('id').eq('email', parsed.data.email).maybeSingle()
  if (!profile) return NextResponse.json({ error: 'No se encontró ningún usuario con ese email.' }, { status: 404 })

  const { error } = await admin.auth.admin.updateUserById(profile.id, { password: parsed.data.password })
  if (error) return NextResponse.json({ error: 'No se pudo cambiar la contraseña.' }, { status: 400 })

  return NextResponse.json({ ok: true })
}
