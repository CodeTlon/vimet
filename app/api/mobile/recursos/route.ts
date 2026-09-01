import { NextResponse } from 'next/server'

import { pareceUnPdf, pareceUnVideo } from '@/lib/file-sniff'
import { optimizeImage } from '@/lib/storage/optimize-image'
import { requireMobileStaff } from '@/lib/supabase/bearer'

export const dynamic = 'force-dynamic'

const ALLOWED_MIME = {
  pdf: ['application/pdf'],
  imagen: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  video: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
} as const

const MAX_BYTES = { pdf: 20 * 1024 * 1024, imagen: 10 * 1024 * 1024, video: 40 * 1024 * 1024 } as const

// Mismo comportamiento que crearRecursoAction (actions/recursos.ts) — se
// duplica acá en vez de extraer porque esta acción está atada a FormData de
// verdad (multipart, no JSON) y el único paso no trivial (optimizeImage, que
// usa sharp) ya se reusa tal cual.
export async function POST(request: Request) {
  const ctx = await requireMobileStaff(request)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const formData = await request.formData()
  const tipo = String(formData.get('tipo') ?? '')
  const paciente_id = String(formData.get('paciente_id') ?? '')
  const categoria = String(formData.get('categoria') ?? '')
  const titulo = String(formData.get('titulo') ?? '').trim()
  const descripcion = String(formData.get('descripcion') ?? '').trim() || null
  const visible_paciente = formData.get('visible_paciente') === 'true'
  const plan_id_raw = String(formData.get('plan_id') ?? '')
  const plan_id = plan_id_raw ? Number(plan_id_raw) || null : null

  if (!paciente_id || !categoria || !titulo) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const base = { paciente_id, categoria, titulo, descripcion, visible_paciente, plan_id, creado_por: ctx.user.id }

  if (tipo === 'link') {
    const url = String(formData.get('url') ?? '')
    if (!url) return NextResponse.json({ error: 'Ingresá una URL válida' }, { status: 400 })
    const { error } = await ctx.supabase.from('recursos_paciente').insert({ ...base, tipo: 'link', url })
    if (error) return NextResponse.json({ error: 'No se pudo guardar el recurso.' }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  const t = tipo as 'pdf' | 'imagen' | 'video'
  if (!(t in ALLOWED_MIME)) return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })

  const file = formData.get('archivo') as File | null
  if (!file || file.size === 0) return NextResponse.json({ error: 'Seleccioná un archivo.' }, { status: 400 })
  if (!(ALLOWED_MIME[t] as readonly string[]).includes(file.type)) {
    return NextResponse.json({ error: `Tipo de archivo no permitido para ${tipo}.` }, { status: 400 })
  }
  if (file.size > MAX_BYTES[t]) {
    return NextResponse.json({ error: `El archivo supera el límite de ${MAX_BYTES[t] / 1024 / 1024} MB.` }, { status: 400 })
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  let buf: Buffer<ArrayBufferLike> = Buffer.from(await file.arrayBuffer())
  let contentType = file.type
  let storage_path = `${paciente_id}/r/${Date.now()}_${safeName}`

  if (t === 'imagen') {
    buf = await optimizeImage(buf)
    contentType = 'image/webp'
    storage_path = storage_path.replace(/\.\w+$/, '') + '.webp'
  } else if (t === 'pdf' && !pareceUnPdf(buf)) {
    return NextResponse.json({ error: 'El archivo no es un PDF válido.' }, { status: 400 })
  } else if (t === 'video' && !pareceUnVideo(buf, file.type)) {
    return NextResponse.json({ error: 'El archivo no es un video válido.' }, { status: 400 })
  }

  const { error: upErr } = await ctx.supabase.storage
    .from('recursos')
    .upload(storage_path, Buffer.from(buf), { contentType, upsert: false })
  if (upErr) return NextResponse.json({ error: 'No se pudo subir el archivo.' }, { status: 400 })

  const { error } = await ctx.supabase.from('recursos_paciente').insert({ ...base, tipo, storage_path })
  if (error) {
    await ctx.supabase.storage.from('recursos').remove([storage_path])
    return NextResponse.json({ error: 'No se pudo guardar el recurso.' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
