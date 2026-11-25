import { createHmac, timingSafeEqual } from 'node:crypto'
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve, sep } from 'node:path'

// Archivos en disco: volumen persistente de Coolify (STORAGE_DIR). Reemplaza a S3/MinIO con los mismos
// nombres de bucket y el mismo layout de paths, asi las columnas *_path siguen validas. Cada bucket es una
// carpeta; los buckets publicos se sirven por /media/<bucket>/<path> y los privados solo con URL firmada
// (HMAC con vencimiento), que verifica app/media/[...ruta]/route.ts.
//
// Autorizacion: quien llama (action o ruta) verifica el permiso ANTES de pedir la URL firmada o de subir;
// ver docs/migracion/inventario.md (policies de storage.objects).

export type Bucket = 'planes' | 'recursos' | 'ejercicios-media' | 'sitio'

export const BUCKETS: readonly Bucket[] = ['planes', 'recursos', 'ejercicios-media', 'sitio']
// Los buckets de lectura publica sirven sus objetos por URL directa; el resto, solo firmado.
export const PUBLICOS: readonly Bucket[] = ['ejercicios-media', 'sitio']

export const STORAGE_DIR = resolve(process.env.STORAGE_DIR ?? './storage')

/** Extensiones servibles y su Content-Type. El tipo sale de la extension, nunca de lo que diga el cliente. */
export const TIPOS_POR_EXT: Record<string, string> = {
  webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', avif: 'image/avif', gif: 'image/gif',
  pdf: 'application/pdf', mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
}

// Resuelve la ruta dentro del bucket y rechaza todo lo que se escape (.., absolutas, caracteres raros).
export function rutaSegura(bucket: Bucket, path: string): string {
  if (!BUCKETS.includes(bucket)) throw new Error('Bucket invalido')
  const partes = path.split('/')
  if (!partes.length || !partes.every((p) => p !== '' && p !== '.' && p !== '..' && !/[\\\0]/.test(p))) {
    throw new Error('Ruta de archivo invalida')
  }
  const base = resolve(STORAGE_DIR, bucket)
  const abs = resolve(base, ...partes)
  if (!abs.startsWith(base + sep)) throw new Error('Ruta de archivo invalida')
  return abs
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- _contentType se conserva por compatibilidad con S3 (el tipo sale de la extension)
export async function subirArchivo(bucket: Bucket, path: string, body: Buffer | Uint8Array, _contentType?: string): Promise<void> {
  const abs = rutaSegura(bucket, path)
  await mkdir(dirname(abs), { recursive: true })
  await writeFile(abs, body)
}

export async function borrarArchivos(bucket: Bucket, paths: string[]): Promise<void> {
  for (const p of paths) {
    try {
      await rm(rutaSegura(bucket, p), { force: true })
    } catch {
      // Ruta invalida o archivo ya borrado: no es un error para quien llama.
    }
  }
}

/** Todas las claves bajo un prefijo (ej. `{paciente_id}/`). */
export async function listarArchivos(bucket: Bucket, prefijo: string): Promise<string[]> {
  const base = resolve(STORAGE_DIR, bucket)
  const claves: string[] = []
  async function recorrer(dirRel: string) {
    let entradas
    try {
      entradas = await readdir(resolve(base, dirRel), { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entradas) {
      const rel = dirRel ? `${dirRel}/${e.name}` : e.name
      if (e.isDirectory()) await recorrer(rel)
      else if (rel.startsWith(prefijo)) claves.push(rel)
    }
  }
  await recorrer('')
  return claves
}

// URL publica del origen de los archivos (la propia app): STORAGE_PUBLIC_URL = https://<dominio>/media.
function baseUrl(): string {
  const base = (process.env.STORAGE_PUBLIC_URL ?? '').replace(/\/$/, '')
  if (!base) throw new Error('Falta STORAGE_PUBLIC_URL (https://<dominio>/media).')
  return base
}

const urlDe = (bucket: Bucket, path: string) => `${baseUrl()}/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}`

function secreto(): string {
  const s = process.env.MEDIA_SIGNING_SECRET || process.env.BETTER_AUTH_SECRET
  if (!s) throw new Error('Falta BETTER_AUTH_SECRET para firmar URLs de archivos.')
  return s
}

const firmar = (bucket: Bucket, path: string, exp: number) =>
  createHmac('sha256', secreto()).update(`${bucket}/${path}:${exp}`).digest('hex')

/** Valida la firma y el vencimiento de una URL privada (lo usa la ruta /media). */
export function firmaValida(bucket: Bucket, path: string, exp: number, sig: string): boolean {
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return false
  const esperada = Buffer.from(firmar(bucket, path, exp))
  const recibida = Buffer.from(sig)
  return esperada.length === recibida.length && timingSafeEqual(esperada, recibida)
}

/** URL firmada de lectura. El permiso del usuario sobre el archivo lo verifica el llamador. */
export async function urlFirmada(bucket: Bucket, path: string, ttlSegundos: number): Promise<string | null> {
  try {
    rutaSegura(bucket, path)
    const exp = Math.floor(Date.now() / 1000) + ttlSegundos
    return `${urlDe(bucket, path)}?exp=${exp}&sig=${firmar(bucket, path, exp)}`
  } catch (err) {
    console.error(`urlFirmada(${bucket}/${path}):`, err)
    return null
  }
}

export async function urlsFirmadas(bucket: Bucket, paths: string[], ttlSegundos: number): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  await Promise.all(
    paths.map(async (p) => {
      const url = await urlFirmada(bucket, p, ttlSegundos)
      if (url) out.set(p, url)
    }),
  )
  return out
}

/** URL directa de un objeto en un bucket de lectura publica (`ejercicios-media`, `sitio`). */
export function urlPublica(bucket: Bucket, path: string): string {
  if (!PUBLICOS.includes(bucket)) throw new Error(`El bucket ${bucket} no es publico: usar urlFirmada.`)
  return urlDe(bucket, path)
}
