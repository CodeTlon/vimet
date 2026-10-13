import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Almacenamiento de archivos sobre S3 (MinIO en Coolify). Reemplaza a Supabase Storage con los
// mismos nombres de bucket y el mismo layout de paths, asi las columnas *_path siguen validas.
//
// Autorizacion: S3 no sabe de usuarios. Quien llama (action o ruta) verifica el permiso ANTES de
// pedir la URL firmada o de subir; ver docs/migracion/inventario.md (policies de storage.objects).

export type Bucket = 'planes' | 'recursos' | 'ejercicios-media' | 'sitio'

// Los buckets de lectura publica sirven sus objetos por URL directa; el resto, solo firmado.
const PUBLICOS: readonly Bucket[] = ['ejercicios-media', 'sitio']

let cliente: S3Client | null = null
function getClient(): S3Client {
  if (cliente) return cliente
  const endpoint = process.env.S3_ENDPOINT
  if (!endpoint) throw new Error('Falta S3_ENDPOINT: no se puede acceder al almacenamiento de archivos.')
  cliente = new S3Client({
    endpoint,
    region: process.env.S3_REGION ?? 'us-east-1',
    forcePathStyle: true, // MinIO
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
    },
  })
  return cliente
}

/** Nombre real del bucket (permite un prefijo por entorno: S3_BUCKET_PREFIX=test-). */
const nombre = (b: Bucket) => `${process.env.S3_BUCKET_PREFIX ?? ''}${b}`

export async function subirArchivo(
  bucket: Bucket,
  path: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<void> {
  await getClient().send(new PutObjectCommand({ Bucket: nombre(bucket), Key: path, Body: body, ContentType: contentType }))
}

export async function borrarArchivos(bucket: Bucket, paths: string[]): Promise<void> {
  if (paths.length === 0) return
  // DeleteObjects admite hasta 1000 claves por llamada.
  for (let i = 0; i < paths.length; i += 1000) {
    const lote = paths.slice(i, i + 1000)
    await getClient().send(
      new DeleteObjectsCommand({ Bucket: nombre(bucket), Delete: { Objects: lote.map((Key) => ({ Key })), Quiet: true } }),
    )
  }
}

/** Todas las claves bajo un prefijo (ej. `{paciente_id}/`). */
export async function listarArchivos(bucket: Bucket, prefijo: string): Promise<string[]> {
  const claves: string[] = []
  let token: string | undefined
  do {
    const res = await getClient().send(
      new ListObjectsV2Command({ Bucket: nombre(bucket), Prefix: prefijo, ContinuationToken: token }),
    )
    for (const o of res.Contents ?? []) if (o.Key) claves.push(o.Key)
    token = res.IsTruncated ? res.NextContinuationToken : undefined
  } while (token)
  return claves
}

/** URL firmada de lectura. El permiso del usuario sobre el archivo lo verifica el llamador. */
export async function urlFirmada(bucket: Bucket, path: string, ttlSegundos: number): Promise<string | null> {
  try {
    return await getSignedUrl(getClient(), new GetObjectCommand({ Bucket: nombre(bucket), Key: path }), {
      expiresIn: ttlSegundos,
    })
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
  const base = (process.env.S3_PUBLIC_URL ?? '').replace(/\/$/, '')
  if (!base) throw new Error('Falta S3_PUBLIC_URL.')
  return `${base}/${nombre(bucket)}/${path}`
}
