// Seed único del catálogo de ejercicios (tabla `ejercicios` + bucket
// `ejercicios-media`) desde github.com/hasaneyldrm/exercises-dataset.
// No corre en runtime — se ejecuta a mano una vez por proyecto Supabase:
//   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-ejercicios.mjs
//
// ponytail: nombres de campo (name/category/body_part/target/...) tomados de
// la documentación del dataset. Si `data/exercises.schema.json` real difiere,
// ajustar el mapeo de abajo antes de correr — no hay test de esto, es un script
// de una sola corrida.

import { createClient } from '@supabase/supabase-js'

const RAW_BASE = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main'

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key)
}

async function fetchJson(path) {
  const res = await fetch(`${RAW_BASE}/${path}`)
  if (!res.ok) throw new Error(`No se pudo bajar ${path}: ${res.status}`)
  return res.json()
}

async function subirMedia(supabase, relPath, destPrefix) {
  if (!relPath) return null
  const res = await fetch(`${RAW_BASE}/${relPath}`)
  if (!res.ok) {
    console.warn(`  ⚠ no se pudo bajar ${relPath} (${res.status})`)
    return null
  }
  const buf = Buffer.from(await res.arrayBuffer())
  const destPath = `${destPrefix}/${relPath.split('/').pop()}`
  const { error } = await supabase.storage
    .from('ejercicios-media')
    .upload(destPath, buf, { upsert: true })
  if (error) {
    console.warn(`  ⚠ no se pudo subir ${destPath}: ${error.message}`)
    return null
  }
  return supabase.storage.from('ejercicios-media').getPublicUrl(destPath).data.publicUrl
}

async function main() {
  const supabase = admin()
  console.log('Descargando data/exercises.json...')
  const ejercicios = await fetchJson('data/exercises.json')
  console.log(`${ejercicios.length} ejercicios encontrados.`)

  for (const [i, ej] of ejercicios.entries()) {
    const imagen_url = await subirMedia(supabase, ej.image, 'images')
    const gif_url = await subirMedia(supabase, ej.gif_url, 'gifs')

    const { error } = await supabase.from('ejercicios').upsert({
      id: ej.id,
      nombre: ej.name,
      categoria: ej.category ?? null,
      parte_cuerpo: ej.body_part ?? null,
      equipo: ej.equipment ?? null,
      musculo_principal: ej.target ?? null,
      musculos_secundarios: ej.secondary_muscles ?? [],
      instrucciones: ej.instructions?.es ?? ej.instructions?.en ?? null,
      imagen_url,
      gif_url,
      atribucion: ej.attribution ?? null,
    })

    if (error) {
      console.error(`✗ ejercicio ${ej.id} (${ej.name}): ${error.message}`)
    } else if ((i + 1) % 100 === 0) {
      console.log(`  ${i + 1}/${ejercicios.length}`)
    }
  }
  console.log('Listo.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
