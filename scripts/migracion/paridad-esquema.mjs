// Verifica que el esquema Drizzle (drizzle/*.sql) sea equivalente al esquema final de supabase/migrations/*.sql
// (sin RLS ni dependencias de auth). Usa PGlite (Postgres en WASM, en memoria): no necesita Docker ni credenciales.
//
// Uso: node scripts/migracion/paridad-esquema.mjs        (sale con codigo 1 si hay diferencias)
import { PGlite } from '@electric-sql/pglite'
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ext = { btree_gist, pgcrypto, uuid_ossp }
const leer = (dir) => readdirSync(dir).filter((f) => f.endsWith('.sql')).sort().map((f) => [f, readFileSync(join(dir, f), 'utf8')])

// 1. Esquema legado: shim minimo de Supabase + las 39 migraciones, luego se sanea.
const legado = new PGlite({ extensions: ext })
await legado.exec(`
create role anon nologin; create role authenticated nologin; create role service_role nologin;
create schema auth; create schema extensions; create schema storage;
create extension if not exists pgcrypto schema extensions;
create extension if not exists "uuid-ossp" schema extensions;
create extension if not exists btree_gist;
create table auth.users (id uuid primary key default gen_random_uuid(), email text,
  raw_user_meta_data jsonb default '{}'::jsonb, raw_app_meta_data jsonb default '{}'::jsonb,
  invited_at timestamptz, encrypted_password text, email_confirmed_at timestamptz,
  last_sign_in_at timestamptz, created_at timestamptz default now());
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.role() returns text language sql stable as $$ select 'anon'::text $$;
create table storage.buckets (id text primary key, name text, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid, metadata jsonb);
create function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name, '/') $$;
`)
for (const [f, sql] of leer('supabase/migrations')) {
  try { await legado.exec(sql) } catch (e) { console.error(`FALLA ${f}: ${String(e.message).split('\n')[0]}`); process.exit(2) }
}
await legado.exec(`
do $$ declare r record; begin
  for r in select schemaname, tablename, policyname from pg_policies where schemaname in ('public','storage') loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
  for r in select tablename from pg_tables where schemaname='public' loop
    execute format('alter table public.%I disable row level security', r.tablename);
  end loop;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists feedback_restrict_patient_update on public.feedback_semanal;
drop trigger if exists profiles_block_privilege_self_update on public.profiles;
drop trigger if exists turnos_restrict_patient_update on public.turnos;
alter table public.profiles drop constraint profiles_id_fkey;
-- Diferencia deliberada: audit_log sin FK a profiles (el rastro sobrevive al borrado del paciente).
alter table public.audit_log drop constraint audit_log_paciente_id_fkey;
alter table public.audit_log drop constraint audit_log_actor_id_fkey;
alter table public.ejercicios drop constraint ejercicios_creado_por_fkey;
alter table public.ejercicios add constraint ejercicios_creado_por_fkey foreign key (creado_por) references public.profiles(id) on delete set null;
`)

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
