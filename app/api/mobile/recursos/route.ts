import { NextResponse } from 'next/server'

import { requireMobileStaff } from '@/lib/auth/mobile'
import { crearRecurso } from '@/lib/services/recursos'

export const dynamic = 'force-dynamic'

// Mismo comportamiento que crearRecursoAction (actions/recursos.ts): ambos usan lib/services/recursos.
// Es multipart (FormData), no JSON, por los archivos.
export async function POST(request: Request) {
  const ctx = await requireMobileStaff(request)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const formData = await request.formData()
  const planIdRaw = String(formData.get('plan_id') ?? '')

  const res = await crearRecurso(ctx.user.id, {
    tipo: String(formData.get('tipo') ?? ''),
    paciente_id: String(formData.get('paciente_id') ?? ''),
    categoria: String(formData.get('categoria') ?? ''),
    titulo: String(formData.get('titulo') ?? ''),
    descripcion: String(formData.get('descripcion') ?? ''),
    visible_paciente: formData.get('visible_paciente') === 'true',
    plan_id: planIdRaw ? Number(planIdRaw) || null : null,
    url: String(formData.get('url') ?? ''),
    archivo: formData.get('archivo') as File | null,
  })
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}
