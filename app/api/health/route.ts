import { sql } from 'drizzle-orm'

import { db } from '@/lib/db'

// Usado por el healthcheck de Coolify y por el uptime check externo.
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await db.execute(sql`select 1`)
    // `started_at` (arranque del proceso) permite a CI saber que ya corre el contenedor del deploy que acaba de pedir.
    return Response.json({ status: 'ok', started_at: new Date(Date.now() - process.uptime() * 1000).toISOString() })
  } catch {
    return Response.json({ status: 'db_error' }, { status: 503 })
  }
}
