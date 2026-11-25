import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  out: './drizzle', // migraciones SQL versionadas en git
  schema: './db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL ?? 'postgres://vimet:vimet@127.0.0.1:5432/vimet' },
})
