// Backfill único: cifra los datos clínicos HISTÓRICOS que quedaron en texto
// plano en las columnas viejas (dx_medico, dx_nutricional, medicacion,
// datos_laboratorio, observaciones_internas de fichas_paciente; contenido de
// evolucion_entradas; notas de planes) hacia sus columnas `_enc` nuevas.
//
// Contexto: desde que se deployó el código de lib/crypto/clinical.ts, toda
// escritura NUEVA ya cifra sola (actions/ficha.ts, actions/evolucion.ts,
// actions/planes.ts). Pero las filas que ya existían en la base ANTES de ese
// deploy se quedaron con el dato viejo en texto plano y `_enc` en null hasta
// que alguien las vuelva a editar — este script es lo que las migra sin
// esperar a que un profesional las edite a mano una por una.
//
// REQUISITOS ANTES DE CORRER (léase con atención, esto toca datos de salud reales):
//   1. La migración supabase/migrations/0038_cifrado_datos_clinicos.sql debe
//      estar YA aplicada contra el proyecto Supabase de destino (las columnas
//      `_enc` tienen que existir) — si no, este script va a fallar al primer
//      update. Confirmar con supabase/scripts/verificar_migraciones_aplicadas.sql.
//   2. CLINICAL_DATA_ENCRYPTION_KEY tiene que ser la MISMA clave que va a usar
//      la app en ESE entorno (dev o prod) — si se cifra acá con una clave y la
//      app en prod tiene otra distinta seteada, nadie va a poder descifrar
//      nada después. Doble-chequear antes de correr contra prod.
//   3. Recomendado: sacar un backup/snapshot de la base antes de correr esto
//      contra prod (Supabase dashboard → Database → Backups, o un
//      `pg_dump` manual si se tiene el connection string). Es un UPDATE
//      masivo sobre datos clínicos reales — mejor tener con qué volver atrás.
//
// CÓMO CORRERLO
//   Primero SIEMPRE en modo dry-run (no escribe nada, solo reporta cuántas
//   filas migraría por tabla):
//     NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... CLINICAL_DATA_ENCRYPTION_KEY=... \
//       node scripts/migrar-cifrado-clinico.mjs
//
//   Recién después, para aplicar de verdad:
//     NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... CLINICAL_DATA_ENCRYPTION_KEY=... \
//       node scripts/migrar-cifrado-clinico.mjs --apply
//
//   Es idempotente: solo toca filas donde la columna `_enc` todavía es null
//   y la columna vieja tiene datos — correrlo dos veces no rompe nada, la
//   segunda vez no encuentra nada para migrar.
//
//   No corre en runtime de la app — es un script de mantenimiento de una
//   sola corrida por entorno (una vez en dev para probar, una vez en prod).

import { createClient } from '@supabase/supabase-js'
import { createCipheriv, randomBytes } from 'node:crypto'

const APPLY = process.argv.includes('--apply')
const BATCH_SIZE = 200

// ── Mismo algoritmo/formato que lib/crypto/clinical.ts — duplicado acá a
// propósito: este script corre standalone con `node`, sin el bundler de
// Next, así que no puede importar el .ts de la app directo. Si se toca el
// formato en lib/crypto/clinical.ts, actualizar acá también. ──
const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12
const FORMAT_VERSION = 'v1'

function getKey() {
  const raw = process.env.CLINICAL_DATA_ENCRYPTION_KEY
  if (!raw) throw new Error('Falta CLINICAL_DATA_ENCRYPTION_KEY')
  const key = Buffer.from(raw, 'base64')
  if (key.length !== 32) {
    throw new Error(`CLINICAL_DATA_ENCRYPTION_KEY debe decodificar a 32 bytes; decodificó a ${key.length}.`)
  }
  return key
}

function encryptClinical(plaintext, key) {
  if (plaintext === null || plaintext === undefined || plaintext === '') return null
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [FORMAT_VERSION, iv.toString('base64'), authTag.toString('base64'), ciphertext.toString('base64')].join('.')
}

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key)
}

/**
 * Migra una tabla: para cada fila donde `encCol` es null y al menos una de
 * `plainCols` tiene dato, cifra esas columnas hacia sus `_enc` y limpia la
 * vieja. `plainCols` es un array porque fichas_paciente tiene 5 columnas a
 * migrar juntas por fila (una sola query de update por fila, no una por
 * columna).
 */
async function migrarTabla(supabase, { tabla, idCol, columnas, filtroExtra }) {
  const key = getKey()
  let migradas = 0
  let revisadas = 0
  let offset = 0

  for (;;) {
    let query = supabase
      .from(tabla)
      .select([idCol, ...columnas.map((c) => c.plain), ...columnas.map((c) => c.enc)].join(', '))
      .range(offset, offset + BATCH_SIZE - 1)
      .order(idCol, { ascending: true })
    if (filtroExtra) query = filtroExtra(query)

    const { data, error } = await query
    if (error) throw new Error(`${tabla}: error leyendo batch — ${error.message}`)
    if (!data || data.length === 0) break

    for (const row of data) {
      revisadas++
      const necesitaMigrar = columnas.some((c) => row[c.enc] == null && row[c.plain] != null && row[c.plain] !== '')
      if (!necesitaMigrar) continue

      const update = {}
      for (const c of columnas) {
        if (row[c.enc] == null && row[c.plain] != null && row[c.plain] !== '') {
          update[c.enc] = encryptClinical(row[c.plain], key)
          update[c.plain] = null
        }
      }

      migradas++
      if (APPLY) {
        const { error: updErr } = await supabase.from(tabla).update(update).eq(idCol, row[idCol])
        if (updErr) {
          console.error(`  ✗ ${tabla} ${idCol}=${row[idCol]}: ${updErr.message}`)
          migradas--
        }
      }
    }

    offset += BATCH_SIZE
  }

  console.log(
    `${tabla}: ${revisadas} filas revisadas, ${migradas} ${APPLY ? 'migradas' : 'a migrar (dry-run)'}.`,
  )
}

async function main() {
  if (!APPLY) {
    console.log('── DRY RUN — no se escribe nada. Pasar --apply para aplicar de verdad. ──\n')
  } else {
    console.log('── APLICANDO — esto va a escribir sobre datos clínicos reales. ──\n')
  }

  const supabase = admin()

  await migrarTabla(supabase, {
    tabla: 'fichas_paciente',
    idCol: 'paciente_id',
    columnas: [
      { plain: 'dx_medico', enc: 'dx_medico_enc' },
      { plain: 'dx_nutricional', enc: 'dx_nutricional_enc' },
      { plain: 'medicacion', enc: 'medicacion_enc' },
      { plain: 'datos_laboratorio', enc: 'datos_laboratorio_enc' },
      { plain: 'observaciones_internas', enc: 'observaciones_internas_enc' },
    ],
  })

  await migrarTabla(supabase, {
    tabla: 'evolucion_entradas',
    idCol: 'id',
    columnas: [{ plain: 'contenido', enc: 'contenido_enc' }],
  })

  await migrarTabla(supabase, {
    tabla: 'planes',
    idCol: 'id',
    columnas: [{ plain: 'notas', enc: 'notas_enc' }],
  })

  console.log(APPLY ? '\nListo.' : '\nDry-run terminado — correr de nuevo con --apply para aplicar.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
