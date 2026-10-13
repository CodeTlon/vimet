import { PGlite } from '@electric-sql/pglite'
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist'
import { drizzle } from 'drizzle-orm/pglite'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import * as schema from '@/db/schema'

// Postgres en memoria (PGlite) con las migraciones reales de drizzle/. Sin Docker ni credenciales,
// asi los tests de autorizacion corren igual en la VPS, en CI y en la PC.
export async function crearDbDePrueba() {
  const client = new PGlite({ extensions: { btree_gist } })
  const dir = join(process.cwd(), 'drizzle')
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.sql')).sort()) {
    for (const stmt of readFileSync(join(dir, f), 'utf8').split('--> statement-breakpoint')) {
      if (stmt.trim()) await client.exec(stmt)
    }
  }
  return { client, db: drizzle(client, { schema }) }
}
