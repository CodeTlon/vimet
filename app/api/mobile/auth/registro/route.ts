import { NextResponse } from 'next/server'
import { z } from 'zod'

import { registrarPaciente } from '@/lib/auth/registro'
import { ipDeRequest, rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const registerSchema = z
  .object({
    nombre: z.string().min(1, 'El nombre es obligatorio'),
    apellido: z.string().min(1, 'El apellido es obligatorio'),
    email: z.string().email('Email inválido'),
    telefono: z.string().optional().default(''),
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    password_confirm: z.string(),
  })
  .refine((d) => d.password === d.password_confirm, {
    message: 'Las contraseñas no coinciden',
    path: ['password_confirm'],
  })

// Misma lógica que registerAction (actions/auth.ts) vía registrarPaciente: alta inactiva hasta
// que confirme el email. El link de confirmación abre /auth/confirmar en el browser del teléfono.
export async function POST(request: Request) {
  // Mismo límite que registerAction (web).
  const ip = ipDeRequest(request)
  if (!rateLimit(`registro:${ip}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json({ error: 'Demasiados intentos. Probá de nuevo más tarde.' }, { status: 429 })
  }

  const body = await request.json().catch(() => null)
  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })
  }

  const res = await registrarPaciente(parsed.data, request.headers)
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status })
  return NextResponse.json({ ok: true })
}
