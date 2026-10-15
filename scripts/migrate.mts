// Aplica las migraciones Drizzle pendientes (idempotente, falla cerrado). Se empaqueta con esbuild para la imagen:
// el standalone de Next no trae drizzle-kit. En local: `npx tsx scripts/migrate.mts` con DATABASE_URL.
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('Falta DATABASE_URL')
  process.exit(1)
}
const pool = new Pool({ connectionString: url, max: 1 })
try {
  await migrate(drizzle({ client: pool }), { migrationsFolder: process.env.MIGRATIONS_DIR ?? './drizzle' })
  console.log('Migraciones al dia')
} catch (e) {
  console.error('Fallo la migracion:', e instanceof Error ? e.message : e)
  process.exit(1)
} finally {
  await pool.end()
}
