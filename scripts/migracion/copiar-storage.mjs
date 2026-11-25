// Copia los objetos de Supabase Storage al volumen de archivos (STORAGE_DIR, estandar CodeTlon) y reescribe las URLs absolutas que la base
// guarda (profiles.foto_url, ejercicios.gif_url / imagen_url). Mismo nombre de bucket y mismo path de
// objeto, asi que las columnas *_path / storage_path siguen siendo validas sin tocarlas.
//
//   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=...   (origen, solo lectura)
//   STORAGE_DIR=/data/storage STORAGE_PUBLIC_URL=https://<dominio>/media
//   DATABASE_URL=...                                                          (base nueva)
//   node scripts/migracion/copiar-storage.mjs [--apply]
//
// Sin --apply solo lista y cuenta (dry-run). Es idempotente: re-ejecutar vuelve a copiar y a verificar.
import { mkdir, stat, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import pg from 'pg'

const BUCKETS = ['planes', 'recursos', 'ejercicios-media', 'sitio']
const APPLY = process.argv.includes('--apply')

function requerir(n) {
  const v = process.env[n]
  if (!v) throw new Error(`Falta ${n}`)
  return v
}

const SUPABASE_URL = requerir('SUPABASE_URL').replace(/\/$/, '')
const SERVICE_KEY = requerir('SUPABASE_SERVICE_ROLE_KEY')
const STORAGE_DIR = resolve(process.env.STORAGE_DIR ?? './storage')
const PUBLIC_URL = requerir('STORAGE_PUBLIC_URL').replace(/\/$/, '')
const auth = { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY }

/** Lista recursivamente todos los archivos de un bucket (la API lista un nivel por llamada). */
async function listar(bucket, prefix = '') {
  const archivos = []
  for (let offset = 0; ; offset += 1000) {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${bucket}`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix, limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } }),
    })
    if (!res.ok) throw new Error(`list ${bucket}/${prefix}: HTTP ${res.status}`)
    const items = await res.json()
    for (const it of items) {
      const ruta = prefix ? `${prefix}/${it.name}` : it.name
      if (it.id === null) archivos.push(...(await listar(bucket, ruta))) // carpeta
      else archivos.push({ ruta, size: it.metadata?.size ?? null, tipo: it.metadata?.mimetype ?? null })
    }
    if (items.length < 1000) break
  }
  return archivos
}

async function main() {
  let fallos = 0
  const resumen = {}
  for (const bucket of BUCKETS) {
    const archivos = await listar(bucket)
    const bytes = archivos.reduce((a, f) => a + Number(f.size ?? 0), 0)
    console.log(`${bucket}: ${archivos.length} objetos, ${(bytes / 1048576).toFixed(1)} MB`)
    resumen[bucket] = archivos.length
    if (!APPLY) continue

    for (const f of archivos) {
      const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${encodeURI(f.ruta)}`, { headers: auth })
      if (!res.ok) {
        console.error(`  x ${bucket}/${f.ruta}: descarga HTTP ${res.status}`)
        fallos++
        continue
      }
      const body = Buffer.from(await res.arrayBuffer())
      const abs = resolve(STORAGE_DIR, bucket, f.ruta)
      await mkdir(dirname(abs), { recursive: true })
      await writeFile(abs, body)
      // Verificacion: el archivo existe y pesa lo mismo.
      const { size } = await stat(abs)
      if (size !== body.length) {
        console.error(`  x ${bucket}/${f.ruta}: tamano distinto (${size} vs ${body.length})`)
        fallos++
      }
    }
  }

  if (APPLY) {
    const db = new pg.Client({ connectionString: requerir('DATABASE_URL') })
    await db.connect()
    try {
      const desde = `${SUPABASE_URL}/storage/v1/object/public/`
      const hacia = `${PUBLIC_URL}/`
      for (const [tabla, col] of [
        ['profiles', 'foto_url'],
        ['ejercicios', 'gif_url'],
        ['ejercicios', 'imagen_url'],
      ]) {
        const r = await db.query(
          `update ${tabla} set ${col} = replace(${col}, $1, $2) where ${col} like $3`,
          [desde, hacia, `${desde}%`],
        )
        console.log(`URLs reescritas en ${tabla}.${col}: ${r.rowCount}`)
      }
    } finally {
      await db.end()
    }
  } else {
    console.log('\n(dry-run: no se copio nada ni se reescribieron URLs; pasar --apply)')
  }
  console.log(fallos ? `\nTERMINO CON ${fallos} FALLOS` : '\nOK')
  process.exit(fallos ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
