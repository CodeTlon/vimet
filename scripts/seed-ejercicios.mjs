// Seed unico del catalogo de ejercicios (tabla `ejercicios` + bucket `ejercicios-media`) desde
// github.com/hasaneyldrm/exercises-dataset. No corre en runtime: se ejecuta a mano una vez por entorno.
//   DATABASE_URL=... STORAGE_DIR=/data/storage STORAGE_PUBLIC_URL=https://<dominio>/media node scripts/seed-ejercicios.mjs
// (en Coolify: `docker exec <app> ...` o con el volumen `storage` montado en STORAGE_DIR)
//
// ponytail: nombres de campo (name/category/body_part/target/...) tomados de la documentacion del
// dataset. Si `data/exercises.schema.json` real difiere, ajustar el mapeo antes de correr.

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import pg from 'pg'

const RAW_BASE = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main'
const BUCKET = 'ejercicios-media'

function requerir(nombre) {
  const v = process.env[nombre]
  if (!v) throw new Error(`Falta ${nombre}`)
  return v
}

const STORAGE_DIR = resolve(process.env.STORAGE_DIR ?? './storage')
const PUBLIC_URL = requerir('STORAGE_PUBLIC_URL').replace(/\/$/, '')

async function fetchJson(path) {
  const res = await fetch(`${RAW_BASE}/${path}`)
  if (!res.ok) throw new Error(`No se pudo bajar ${path}: ${res.status}`)
  return res.json()
}

async function subirMedia(relPath, destPrefix) {
  if (!relPath) return null
  const res = await fetch(`${RAW_BASE}/${relPath}`)
  if (!res.ok) {
    console.warn(`  ! no se pudo bajar ${relPath} (${res.status})`)
    return null
  }
  const buf = Buffer.from(await res.arrayBuffer())
  const destPath = `${destPrefix}/${relPath.split('/').pop()}`
  try {
    const abs = resolve(STORAGE_DIR, BUCKET, destPath)
    await mkdir(dirname(abs), { recursive: true })
    await writeFile(abs, buf)
  } catch (e) {
    console.warn(`  ! no se pudo guardar ${destPath}: ${e.message}`)
    return null
  }
  return `${PUBLIC_URL}/${BUCKET}/${destPath}`
}

async function main() {
  const client = new pg.Client({ connectionString: requerir('DATABASE_URL') })
  await client.connect()
  try {
    console.log('Descargando data/exercises.json...')
    const ejercicios = await fetchJson('data/exercises.json')
    console.log(`${ejercicios.length} ejercicios encontrados.`)

    for (const [i, ej] of ejercicios.entries()) {
      const imagen_url = await subirMedia(ej.image, 'images')
      const gif_url = await subirMedia(ej.gif_url, 'gifs')
      try {
        await client.query(
          `insert into ejercicios (id, nombre, categoria, parte_cuerpo, equipo, musculo_principal, musculos_secundarios, instrucciones, imagen_url, gif_url, atribucion)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           on conflict (id) do update set nombre = excluded.nombre, categoria = excluded.categoria,
             parte_cuerpo = excluded.parte_cuerpo, equipo = excluded.equipo, musculo_principal = excluded.musculo_principal,
             musculos_secundarios = excluded.musculos_secundarios, instrucciones = excluded.instrucciones,
             imagen_url = excluded.imagen_url, gif_url = excluded.gif_url, atribucion = excluded.atribucion`,
          [
            ej.id,
            ej.name,
            ej.category ?? null,
            ej.body_part ?? null,
            ej.equipment ?? null,
            ej.target ?? null,
            ej.secondary_muscles ?? [],
            ej.instructions?.es ?? ej.instructions?.en ?? null,
            imagen_url,
            gif_url,
            ej.attribution ?? null,
          ],
        )
      } catch (e) {
        console.error(`x ejercicio ${ej.id} (${ej.name}): ${e.message}`)
        continue
      }
      if ((i + 1) % 100 === 0) console.log(`  ${i + 1}/${ejercicios.length}`)
    }
    console.log('Listo.')
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
