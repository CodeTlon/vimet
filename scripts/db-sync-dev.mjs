#!/usr/bin/env node
/**
 * db-sync-dev.mjs — Reconstruye el Supabase DEV desde supabase/migrations/.
 *
 * Patrón CodeTlon: "dev automático, prod manual".
 *   - DEV: este script borra todo y reaplica TODAS las migraciones en orden
 *     (replay limpio) → garantiza que el schema de dev == el de las migraciones == prod.
 *   - PROD: NUNCA se toca con este script. Se promueve a mano al mergear a main
 *     (SQL Editor o `supabase db push` contra el proyecto -prod). Ver deploy.md.
 *
 * Requisitos:
 *   - psql en el PATH (cliente de PostgreSQL).
 *   - Un archivo `.env.supabase.local` (gitignored) en la raíz del proyecto con:
 *       SUPABASE_ACCESS_TOKEN=sbp_...
 *       SUPABASE_DEV_PROJECT_REF=xxxxxxxxxxxx
 *       SUPABASE_DEV_DB_PASSWORD=...
 *
 * Uso:
 *   node scripts/db-sync-dev.mjs           # dry-run: muestra el plan, no toca nada
 *   node scripts/db-sync-dev.mjs --yes     # ejecuta el wipe + replay contra DEV
 *
 * Seguridad: aborta si el nombre del proyecto en Supabase no termina en "-dev".
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const APPLY = process.argv.includes('--yes');

function loadEnvFile(name) {
  const p = resolve(ROOT, name);
  if (!existsSync(p)) return {};
  const out = {};
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

const env = { ...loadEnvFile('.env.supabase.local'), ...process.env };
const TOKEN = env.SUPABASE_ACCESS_TOKEN;
const REF = env.SUPABASE_DEV_PROJECT_REF;
const PW = env.SUPABASE_DEV_DB_PASSWORD;

if (!TOKEN || !REF || !PW) {
  console.error('✖ Faltan credenciales. Definí SUPABASE_ACCESS_TOKEN, SUPABASE_DEV_PROJECT_REF y SUPABASE_DEV_DB_PASSWORD en .env.supabase.local');
  process.exit(1);
}

const NUKE_SQL = `
do $$ declare r record; begin
  for r in select tgname from pg_trigger t
           join pg_class c on c.oid=t.tgrelid
           join pg_namespace n on n.oid=c.relnamespace
           where n.nspname='auth' and c.relname='users' and not t.tgisinternal
  loop execute format('drop trigger if exists %I on auth.users cascade', r.tgname); end loop;
end $$;
do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname='storage'
  loop execute format('drop policy if exists %I on storage.%I', r.policyname, r.tablename); end loop;
end $$;
do $$ begin
  delete from storage.objects; delete from storage.buckets;
exception when others then raise notice 'storage cleanup skipped: %', sqlerrm;
end $$;
drop schema if exists public cascade;
create schema public;
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on schema public to postgres, service_role;
alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on routines to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;
`;

async function getProject() {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!res.ok) throw new Error(`Management API ${res.status}: ${await res.text()}`);
  return res.json();
}

function psql(host, sql, { file = false, tuplesOnly = false } = {}) {
  const conn = `host=${host} port=5432 dbname=postgres user=postgres.${REF} sslmode=require connect_timeout=20`;
  const args = ['-v', 'ON_ERROR_STOP=1', '-q', conn];
  if (tuplesOnly) args.push('-tA');
  if (file) args.push('-f', sql);
  else args.push('-c', sql);
  return execFileSync('psql', args, {
    env: { ...process.env, PGPASSWORD: PW },
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
  });
}

function pickHost(region) {
  for (const host of [`aws-1-${region}.pooler.supabase.com`, `aws-0-${region}.pooler.supabase.com`]) {
    try { psql(host, 'select 1;'); return host; } catch { /* try next */ }
  }
  throw new Error(`No pude conectar al pooler para la región ${region}`);
}

function migrations() {
  const dir = resolve(ROOT, 'supabase/migrations');
  // Solo archivos de migración reales: nombre que empieza con dígito (excluye bbdd-schema.sql, etc.)
  return readdirSync(dir).filter((f) => /^\d.*\.sql$/.test(f)).sort();
}

const project = await getProject();
console.log(`Proyecto: ${project.name} (${REF}) · región ${project.region} · estado ${project.status}`);
if (!/-dev$/.test(project.name)) {
  console.error(`✖ ABORTADO: el proyecto "${project.name}" no termina en "-dev". Este script SOLO opera sobre dev.`);
  process.exit(1);
}

const files = migrations();
console.log(`\nMigraciones a aplicar (replay limpio), ${files.length}:`);
files.forEach((f) => console.log('  ' + f));

if (!APPLY) {
  console.log('\n(dry-run) Nada ejecutado. Re-corré con --yes para borrar dev y reaplicar.');
  process.exit(0);
}

const host = pickHost(project.region);
console.log(`\n→ Conectado por ${host}. Borrando todo y reaplicando...\n`);
psql(host, NUKE_SQL);
for (const f of files) {
  process.stdout.write(`  ${f} ... `);
  psql(host, resolve(ROOT, 'supabase/migrations', f), { file: true });
  console.log('ok');
}
const count = psql(host, "select count(*) from pg_tables where schemaname='public';", { tuplesOnly: true }).trim();
console.log(`\n✓ DEV reconstruido. Tablas en public: ${count}`);
console.log('Recordá: PROD se promueve a mano al mergear a main (no lo toca este script).');
