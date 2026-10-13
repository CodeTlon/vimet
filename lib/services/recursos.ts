// Alta de recursos multimedia del paciente (link / pdf / imagen / video). SIN 'use server':
// lo comparten actions/recursos.ts (web) y app/api/mobile/recursos (bearer); ambos validan que el
// actor sea staff ANTES de llamar (policy `recursos staff all`).
import { z } from 'zod'

import { recursos_paciente } from '@/db/schema'
import { db as dbGlobal, type Db } from '@/lib/db'
import { pareceUnPdf, pareceUnVideo } from '@/lib/file-sniff'
import { optimizeImage } from '@/lib/storage/optimize-image'
import { borrarArchivos, subirArchivo } from '@/lib/storage/s3'

export type RecursoResultado = { ok: true } | { ok: false; error: string }

const ALLOWED_MIME = {
  pdf: ['application/pdf'],
  imagen: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  video: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
} as const

const MAX_BYTES = {
  pdf: 20 * 1024 * 1024,
  imagen: 10 * 1024 * 1024,
  // ponytail: sin transcodificación server-side (requeriría ffmpeg + infra que este proyecto no
  // tiene). Si el tamaño sigue siendo un problema, la solución real es un servicio externo o un
  // worker con ffmpeg aparte.
  video: 40 * 1024 * 1024,
} as const

const comunes = z.object({
  paciente_id: z.string().uuid('Paciente inválido'),
  categoria: z.enum(['ejercicio', 'nutricion', 'progreso', 'educativo', 'otro']),
  titulo: z.string().trim().min(1, 'El título es requerido').max(200),
  descripcion: z.string().max(1000).optional().or(z.literal('')),
  visible_paciente: z.boolean(),
  plan_id: z.number().int().positive().nullable(),
})

export type EntradaRecurso = {
  tipo: string
  paciente_id: string
  categoria: string
  titulo: string
  descripcion?: string
  visible_paciente: boolean
  plan_id: number | null
  url?: string
  archivo?: File | null
}

export async function crearRecurso(
  actorId: string,
  entrada: EntradaRecurso,
  db: Db = dbGlobal,
): Promise<RecursoResultado> {
  const base = comunes.safeParse(entrada)
  if (!base.success) return { ok: false, error: base.error.issues[0]?.message ?? 'Datos inválidos' }
  const d = base.data
  const fila = {
    paciente_id: d.paciente_id,
    categoria: d.categoria,
    titulo: d.titulo,
    descripcion: d.descripcion?.trim() || null,
    visible_paciente: d.visible_paciente,
    plan_id: d.plan_id,
    creado_por: actorId,
  }

  if (entrada.tipo === 'link') {
    const url = z.string().url('Ingresá una URL válida').safeParse(entrada.url)
    if (!url.success) return { ok: false, error: url.error.issues[0]?.message ?? 'URL inválida' }
    try {
      await db.insert(recursos_paciente).values({ ...fila, tipo: 'link', url: url.data })
    } catch (err) {
      console.error('crearRecurso(link):', err)
      return { ok: false, error: 'No se pudo guardar el recurso.' }
    }
    return { ok: true }
  }

  if (!(entrada.tipo in ALLOWED_MIME)) return { ok: false, error: 'Tipo inválido' }
  const t = entrada.tipo as keyof typeof ALLOWED_MIME

  const file = entrada.archivo
  if (!file || file.size === 0) return { ok: false, error: 'Seleccioná un archivo.' }
  if (!(ALLOWED_MIME[t] as readonly string[]).includes(file.type)) {
    return { ok: false, error: `Tipo de archivo no permitido para ${t}.` }
  }
  if (file.size > MAX_BYTES[t]) {
    return { ok: false, error: `El archivo supera el límite de ${MAX_BYTES[t] / 1024 / 1024} MB.` }
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  let buf: Buffer<ArrayBufferLike> = Buffer.from(await file.arrayBuffer())
  let contentType = file.type
  // paciente_id ya es un uuid validado: no puede inyectar segmentos de path.
  let storage_path = `${d.paciente_id}/r/${Date.now()}_${safeName}`

  if (t === 'imagen') {
    buf = await optimizeImage(buf)
    contentType = 'image/webp'
    storage_path = storage_path.replace(/\.\w+$/, '') + '.webp'
  } else if (t === 'pdf' && !pareceUnPdf(buf)) {
    return { ok: false, error: 'El archivo no es un PDF válido.' }
  } else if (t === 'video' && !pareceUnVideo(buf, file.type)) {
    return { ok: false, error: 'El archivo no es un video válido.' }
  }

  try {
    await subirArchivo('recursos', storage_path, buf, contentType)
  } catch (err) {
    console.error('crearRecurso (subida):', err)
    return { ok: false, error: 'No se pudo subir el archivo.' }
  }

  try {
    await db.insert(recursos_paciente).values({ ...fila, tipo: t, storage_path })
  } catch (err) {
    console.error('crearRecurso:', err)
    await borrarArchivos('recursos', [storage_path]).catch(() => {})
    return { ok: false, error: 'No se pudo guardar el recurso.' }
  }
  return { ok: true }
}
