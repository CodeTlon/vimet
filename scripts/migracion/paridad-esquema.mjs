// Verifica que el esquema Drizzle (drizzle/*.sql) sea equivalente al esquema final de supabase/migrations/*.sql
// (sin RLS ni dependencias de auth). Usa PGlite (Postgres en WASM, en memoria): no necesita Docker ni credenciales.
//
// Uso: node scripts/migracion/paridad-esquema.mjs        (sale con codigo 1 si hay diferencias)
import { PGlite } from '@electric-sql/pglite'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { crearBaseLegada, extensionesPglite, sanearBaseLegada } from './legado.mjs'

const ext = extensionesPglite
const leer = (dir) => readdirSync(dir).filter((f) => f.endsWith('.sql')).sort().map((f) => [f, readFileSync(join(dir, f), 'utf8')])

// 1. Esquema legado, saneado.
let legado
try {
  legado = await sanearBaseLegada(await crearBaseLegada())
} catch (e) {
  console.error(e.message)
  process.exit(2)
}

// 2. Esquema nuevo: solo las migraciones de Drizzle.
const nuevo = new PGlite({ extensions: ext })
for (const [, sql] of leer('drizzle')) {
  for (const stmt of sql.split('--> statement-breakpoint')) if (stmt.trim()) await nuevo.exec(stmt)
}

// Las tablas de Better Auth no existian en Supabase (alli vivian en el esquema `auth`): se sacan de la comparacion.
await nuevo.exec('drop table session, account, verification, "user" cascade')

// 3. Comparacion estructural.
const snap = async (db) => {
  const q = async (s) => (await db.query(s)).rows.map((r) => Object.values(r).join(' | '))
  return {
    columnas: await q(`select table_name, column_name, udt_name, is_nullable, coalesce(column_default,'') as def, is_identity, coalesce(generation_expression,'') as gen, coalesce(character_maximum_length::text,'') as len, coalesce(numeric_precision::text,'') as prec, coalesce(numeric_scale::text,'') as scale from information_schema.columns where table_schema='public' order by 1,2`),
    constraints: await q(`select conrelid::regclass, contype, pg_get_constraintdef(oid) from pg_constraint where connamespace='public'::regnamespace order by 1,3`),
    indices: await q(`select tablename, regexp_replace(indexdef, 'INDEX \\S+ ON', 'INDEX ON') from pg_indexes where schemaname='public' order by 1,2`),
    enums: await q(`select t.typname, string_agg(e.enumlabel, ',' order by e.enumsortorder) from pg_type t join pg_enum e on e.enumtypid=t.oid group by 1 order by 1`),
    triggers: await q(`select tgrelid::regclass, tgname from pg_trigger where not tgisinternal and tgrelid::regclass::text not like 'auth.%' order by 1,2`),
  }
}
const a = await snap(legado)
const b = await snap(nuevo)
let diferencias = 0
for (const k of Object.keys(a)) {
  const sa = new Set(a[k]), sb = new Set(b[k])
  for (const x of sa) if (!sb.has(x)) { diferencias++; console.log(`[${k}] solo en supabase/migrations: ${x}`) }
  for (const x of sb) if (!sa.has(x)) { diferencias++; console.log(`[${k}] solo en drizzle: ${x}`) }
  console.log(`${k}: ${a[k].length} (legado) / ${b[k].length} (drizzle)`)
}
console.log(diferencias === 0 ? 'PARIDAD OK' : `DIFERENCIAS: ${diferencias}`)
process.exit(diferencias === 0 ? 0 : 1)
