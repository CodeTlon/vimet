-- VIMET — audit log de accesos/cambios a datos clínicos de pacientes.
--
-- Cubre dos mecanismos distintos, documentados acá porque no son
-- simétricos:
--
--   1. ESCRITURAS (insert/update/delete) en las tablas clínicas listadas
--      abajo: trigger de Postgres, automático, no depende de que el código
--      de la app se acuerde de loguear — cualquier cambio queda registrado
--      pase lo que pase (server action, SQL editor, service role, etc.).
--
--   2. LECTURAS (select) — ej. un profesional abre la ficha de un
--      paciente: Postgres NO audita SELECT nativamente sin la extensión
--      `pgaudit`, que no está garantizada en Supabase managed (requiere
--      habilitación a nivel de proyecto, no vía migración SQL normal). Por
--      eso las lecturas se loguean a nivel APP: la Server Component/Server
--      Action que abre la vista clínica llama `logAuditView()`
--      (lib/audit.ts) e inserta una fila con `accion = 'ver'` a mano. Esto
--      es una limitación real: cualquier lectura que no pase por ese call
--      site (ej. una query directa contra la API de Supabase con la
--      service_role key, o un acceso futuro que alguien olvide instrumentar)
--      NO queda registrada. Si en algún momento se necesita auditoría de
--      SELECT a prueba de bugs de la app, la alternativa es habilitar
--      `pgaudit` a nivel de proyecto Supabase (soporte/plan-dependiente) o
--      logging a nivel de PostgREST/proxy.

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  paciente_id uuid references public.profiles(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  accion text not null check (accion in ('insert', 'update', 'delete', 'ver')),
  tabla text not null,
  registro_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_paciente_idx on public.audit_log(paciente_id, created_at desc);
create index if not exists audit_log_actor_idx on public.audit_log(actor_id, created_at desc);
create index if not exists audit_log_tabla_idx on public.audit_log(tabla, created_at desc);

alter table public.audit_log enable row level security;

-- Quién accedió a qué es en sí mismo un dato sensible de compliance — solo
-- admin lo puede leer (ni nutricionista ni entrenador, aunque sean "staff"
-- para el resto del sistema).
drop policy if exists "audit_log admin read" on public.audit_log;
create policy "audit_log admin read"
  on public.audit_log for select
  using (public.is_admin());

-- Insert: usado por logAuditView() (lib/audit.ts) desde una Server
-- Component/Action con la sesión normal del staff — solo puede loguearse a
-- sí mismo, no puede insertar filas a nombre de otro actor_id. Los
-- triggers de abajo (`log_audit_change`, security definer) insertan
-- directo sin pasar por esta policy — no la necesitan porque corren con
-- los privilegios de quien creó la función (bypassa RLS igual que
-- `handle_new_user` en profiles).
drop policy if exists "audit_log staff insert propio" on public.audit_log;
create policy "audit_log staff insert propio"
  on public.audit_log for insert
  with check (public.is_staff() and (actor_id = auth.uid() or actor_id is null));

-- Sin policy de update/delete a propósito: el log es append-only, ni admin
-- puede editarlo/borrarlo vía API. Si hace falta purgar por política de
-- retención, es una acción manual de DBA (SQL editor con service role /
-- owner), no algo expuesto a la app.

-- ─────────────────────────────────────────────────────────
-- Trigger genérico de auditoría para insert/update/delete
-- ─────────────────────────────────────────────────────────
create or replace function public.log_audit_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_paciente_id uuid;
  v_registro_id text;
  v_metadata jsonb;
begin
  if TG_TABLE_NAME = 'fichas_paciente' then
    -- fichas_paciente no tiene columna `id` propia: paciente_id ES la PK.
    v_paciente_id := coalesce(new.paciente_id, old.paciente_id);
    v_registro_id := coalesce(new.paciente_id, old.paciente_id)::text;
  else
    v_paciente_id := coalesce(new.paciente_id, old.paciente_id);
    v_registro_id := coalesce(new.id, old.id)::text;
  end if;

  -- Metadata: en UPDATE, solo los NOMBRES de columna que cambiaron (no los
  -- valores) — evita duplicar datos clínicos reales (peso, % grasa,
  -- resultados de laboratorio, etc.) en una segunda tabla. Suficiente para
  -- compliance ("qué campos se tocaron"), no para reconstruir el dato viejo.
  if TG_OP = 'UPDATE' then
    select coalesce(jsonb_agg(n.key), '[]'::jsonb)
    into v_metadata
    from jsonb_each(to_jsonb(new)) as n
    join jsonb_each(to_jsonb(old)) as o on n.key = o.key
    where n.value is distinct from o.value;
    v_metadata := jsonb_build_object('campos_modificados', v_metadata);
  else
    v_metadata := null;
  end if;

  insert into public.audit_log (paciente_id, actor_id, accion, tabla, registro_id, metadata)
  values (v_paciente_id, auth.uid(), lower(TG_OP), TG_TABLE_NAME, v_registro_id, v_metadata);

  return coalesce(new, old);
end;
$$;

drop trigger if exists fichas_paciente_audit on public.fichas_paciente;
create trigger fichas_paciente_audit
  after insert or update or delete on public.fichas_paciente
  for each row execute function public.log_audit_change();

drop trigger if exists planes_audit on public.planes;
create trigger planes_audit
  after insert or update or delete on public.planes
  for each row execute function public.log_audit_change();

drop trigger if exists evolucion_entradas_audit on public.evolucion_entradas;
create trigger evolucion_entradas_audit
  after insert or update or delete on public.evolucion_entradas
  for each row execute function public.log_audit_change();

drop trigger if exists mediciones_antropometricas_audit on public.mediciones_antropometricas;
create trigger mediciones_antropometricas_audit
  after insert or update or delete on public.mediciones_antropometricas
  for each row execute function public.log_audit_change();

drop trigger if exists evaluaciones_funcionales_audit on public.evaluaciones_funcionales;
create trigger evaluaciones_funcionales_audit
  after insert or update or delete on public.evaluaciones_funcionales
  for each row execute function public.log_audit_change();
