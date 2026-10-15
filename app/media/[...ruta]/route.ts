import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { NextResponse, type NextRequest } from 'next/server'

import { BUCKETS, PUBLICOS, TIPOS_POR_EXT, firmaValida, rutaSegura, type Bucket } from '@/lib/storage/disk'

// Sirve los archivos del volumen. Buckets publicos: directo. Buckets privados: solo con ?exp=&sig= validos
// (URL firmada emitida por quien ya verifico el permiso). Tipo por extension, nosniff, Range para video.
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: Promise<{ ruta: string[] }> }) {
  const { ruta } = await params
  const [bucketRaw, ...resto] = ruta.map((p) => decodeURIComponent(p))
  if (!BUCKETS.includes(bucketRaw as Bucket) || resto.length === 0) return new NextResponse(null, { status: 404 })
  const bucket = bucketRaw as Bucket
  const path = resto.join('/')

  const publico = PUBLICOS.includes(bucket)
  if (!publico) {
    const exp = Number(request.nextUrl.searchParams.get('exp'))
    const sig = request.nextUrl.searchParams.get('sig') ?? ''
    let valida = false
    try {
      valida = firmaValida(bucket, path, exp, sig)
    } catch {
      valida = false
    }
    if (!valida) return new NextResponse(null, { status: 403 })
  }

  let abs: string
  try {
    abs = rutaSegura(bucket, path)
  } catch {
    return new NextResponse(null, { status: 404 })
  }
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  const tipo = TIPOS_POR_EXT[ext]
  if (!tipo) return new NextResponse(null, { status: 404 })
  let size: number
  try {
    const s = await stat(abs)
    if (!s.isFile()) return new NextResponse(null, { status: 404 })
    size = s.size
  } catch {
    return new NextResponse(null, { status: 404 })
  }

  const headers: Record<string, string> = {
    'Content-Type': tipo,
    'X-Content-Type-Options': 'nosniff',
    'Accept-Ranges': 'bytes',
    'Cache-Control': publico ? 'public, max-age=3600' : 'private, no-store',
  }
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') ?? '')
  if (range && (range[1] || range[2])) {
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]))
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1
    if (start >= size || start > end) return new NextResponse(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } })
    const stream = Readable.toWeb(createReadStream(abs, { start, end })) as ReadableStream
    return new NextResponse(stream, { status: 206, headers: { ...headers, 'Content-Length': String(end - start + 1), 'Content-Range': `bytes ${start}-${end}/${size}` } })
  }
  return new NextResponse(Readable.toWeb(createReadStream(abs)) as ReadableStream, { headers: { ...headers, 'Content-Length': String(size) } })
}
