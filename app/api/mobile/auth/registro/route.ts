import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const registerSchema = z
  .object({
    nombre: z.string().min(1, 'El nombre es obligatorio'),
    apellido: z.string().min(1, 'El apellido es obligatorio'),
    email: z.string().email('Email inválido'),
    telefono: z.string().optional().default(''),
    password: z.string().min(6, 'Mínimo 6 caracteres'),
    password_confirm: z.string(),
  })
  .refine((d) => d.password === d.password_confirm, {
    message: 'Las contraseñas no coinciden',
    path: ['password_confirm'],
  })

// Misma lógica que registerAction (actions/auth.ts) — signUp + desactivar
// hasta que el admin la active. Sin esto, un registro mobile quedaría activo
// por el default de la columna (`profiles.activo default true`).
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })
  }

  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const { data, error } = await anon.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        nombre: parsed.data.nombre,
        apellido: parsed.data.apellido,
        telefono: parsed.data.telefono,
      },
    },
  })

  if (error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('already') || msg.includes('registered')) {
      return NextResponse.json({ error: 'Ya existe una cuenta con ese email.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (data.user) {
    await createAdminClient().from('profiles').update({ activo: false }).eq('id', data.user.id)
  }

  return NextResponse.json({ ok: true })
}
