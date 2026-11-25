// Reconstruye en memoria (PGlite) el esquema que tenia Supabase: shim minimo de auth/storage + las 39
// migraciones de supabase/migrations. Sirve para (a) comparar el esquema nuevo contra el viejo
// (paridad-esquema.mjs) y (b) probar el importador de datos sin tocar Supabase real.
import { PGlite } from '@electric-sql/pglite'
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export const extensionesPglite = { btree_gist, pgcrypto, uuid_ossp }

const leer = (dir) =>
  readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => [f, readFileSync(join(dir, f), 'utf8')])

/** Base con el esquema legado completo (con RLS y triggers), lista para sembrar datos de prueba. */
export async function crearBaseLegada(dirMigraciones = 'supabase/migrations') {
  const legado = new PGlite({ extensions: extensionesPglite })
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
  for (const [f, sql] of leer(dirMigraciones)) {
    try {
      await legado.exec(sql)
    } catch (e) {
      throw new Error(`Fallo la migracion legada ${f}: ${String(e.message).split('\n')[0]}`)
    }
  }
  return legado
}

/** Misma base pero sin RLS, triggers de Supabase ni FK a auth.users: es lo que se compara con drizzle/. */
export async function sanearBaseLegada(legado) {
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
  return legado
}
