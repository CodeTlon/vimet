-- VIMET — secciones modulares de plan (pautas generales / receta / comidas del
-- día / imágenes), en reemplazo del bloque fijo de 6 columnas nutricionales.
-- "Datos de entrenamiento" y el subsistema de ejercicios (plan_ejercicios) no
-- se tocan.

-- ─────────────────────────────────────────────────────────
-- plan_secciones — una fila por sección agregada a un plan
-- ─────────────────────────────────────────────────────────
do $$ begin
  create type public.tipo_seccion_plan as enum ('pautas_generales', 'receta', 'comidas_dia', 'imagenes');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.plan_secciones (
  id bigint generated always as identity primary key,
  plan_id bigint not null references public.planes(id) on delete cascade,
  tipo public.tipo_seccion_plan not null,
  titulo text not null,
  contenido text,                     -- texto libre: pautas_generales/receta; null en comidas_dia/imagenes
  orden int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists plan_secciones_plan_idx on public.plan_secciones(plan_id, orden);

drop trigger if exists plan_secciones_set_updated_at on public.plan_secciones;
create trigger plan_secciones_set_updated_at
before update on public.plan_secciones
for each row execute function public.set_updated_at();

alter table public.plan_secciones enable row level security;

drop policy if exists "plan_secciones paciente read" on public.plan_secciones;
create policy "plan_secciones paciente read"
  on public.plan_secciones for select
  using (
    exists (
      select 1 from public.planes p
      where p.id = plan_secciones.plan_id and p.paciente_id = auth.uid()
    )
    or public.is_staff()
  );

drop policy if exists "plan_secciones staff write" on public.plan_secciones;
create policy "plan_secciones staff write"
  on public.plan_secciones for all
  using (public.is_staff())
  with check (public.is_staff());

-- ─────────────────────────────────────────────────────────
-- plan_seccion_comidas — momentos del día de una sección tipo comidas_dia
-- (el profesional agrega los que necesite: no hay lista fija de momentos)
-- ─────────────────────────────────────────────────────────
create table if not exists public.plan_seccion_comidas (
  id bigint generated always as identity primary key,
  seccion_id bigint not null references public.plan_secciones(id) on delete cascade,
  nombre_momento text not null,
  contenido text not null,
  orden int not null default 0
);

create index if not exists plan_seccion_comidas_seccion_idx on public.plan_seccion_comidas(seccion_id, orden);

alter table public.plan_seccion_comidas enable row level security;

drop policy if exists "plan_seccion_comidas paciente read" on public.plan_seccion_comidas;
create policy "plan_seccion_comidas paciente read"
  on public.plan_seccion_comidas for select
  using (
    exists (
      select 1 from public.plan_secciones s
      join public.planes p on p.id = s.plan_id
      where s.id = plan_seccion_comidas.seccion_id and p.paciente_id = auth.uid()
    )
    or public.is_staff()
  );

drop policy if exists "plan_seccion_comidas staff write" on public.plan_seccion_comidas;
create policy "plan_seccion_comidas staff write"
  on public.plan_seccion_comidas for all
  using (public.is_staff())
  with check (public.is_staff());

-- ─────────────────────────────────────────────────────────
-- plan_seccion_imagenes — imágenes adjuntas a una sección (ilustran
-- pautas_generales/receta, o son el contenido único de una sección imagenes)
-- ─────────────────────────────────────────────────────────
create table if not exists public.plan_seccion_imagenes (
  id bigint generated always as identity primary key,
  seccion_id bigint not null references public.plan_secciones(id) on delete cascade,
  storage_path text not null,        -- bucket 'planes', path {paciente_id}/secciones/{seccion_id}/{ts}_{n}.webp
  orden int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists plan_seccion_imagenes_seccion_idx on public.plan_seccion_imagenes(seccion_id, orden);

alter table public.plan_seccion_imagenes enable row level security;

drop policy if exists "plan_seccion_imagenes paciente read" on public.plan_seccion_imagenes;
create policy "plan_seccion_imagenes paciente read"
  on public.plan_seccion_imagenes for select
  using (
    exists (
      select 1 from public.plan_secciones s
      join public.planes p on p.id = s.plan_id
      where s.id = plan_seccion_imagenes.seccion_id and p.paciente_id = auth.uid()
    )
    or public.is_staff()
  );

drop policy if exists "plan_seccion_imagenes staff write" on public.plan_seccion_imagenes;
create policy "plan_seccion_imagenes staff write"
  on public.plan_seccion_imagenes for all
  using (public.is_staff())
  with check (public.is_staff());

-- ─────────────────────────────────────────────────────────
-- Migrar datos existentes de las 6 columnas nutricionales de `planes` a
-- secciones `pautas_generales` (una fila por columna cargada, sin fusionar,
-- para no inventar un formato de combinación) y borrar esas columnas.
-- ─────────────────────────────────────────────────────────
insert into public.plan_secciones (plan_id, tipo, titulo, contenido, orden)
select id, 'pautas_generales'::public.tipo_seccion_plan, 'Pautas generales', pautas_generales, 0 from public.planes where pautas_generales is not null
union all
select id, 'pautas_generales'::public.tipo_seccion_plan, 'Hidratación', pautas_hidratacion, 1 from public.planes where pautas_hidratacion is not null
union all
select id, 'pautas_generales'::public.tipo_seccion_plan, 'Pre-entreno', pre_entreno, 2 from public.planes where pre_entreno is not null
union all
select id, 'pautas_generales'::public.tipo_seccion_plan, 'Intra-entreno', intra_entreno, 3 from public.planes where intra_entreno is not null
union all
select id, 'pautas_generales'::public.tipo_seccion_plan, 'Post-entreno', post_entreno, 4 from public.planes where post_entreno is not null
union all
select id, 'pautas_generales'::public.tipo_seccion_plan, 'Suplementación', suplementacion, 5 from public.planes where suplementacion is not null;

alter table public.planes
  drop column if exists pautas_generales,
  drop column if exists pautas_hidratacion,
  drop column if exists pre_entreno,
  drop column if exists intra_entreno,
  drop column if exists post_entreno,
  drop column if exists suplementacion;
