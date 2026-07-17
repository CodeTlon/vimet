-- VIMET — catálogo de ejercicios (seed desde exercises-dataset) + rutina por plan

-- ─────────────────────────────────────────────────────────
-- ejercicios: catálogo de solo lectura (se carga por seed, sin CRUD de usuario)
-- ─────────────────────────────────────────────────────────
create table if not exists public.ejercicios (
  id                  bigint primary key,
  nombre              text not null,
  categoria           text,
  parte_cuerpo        text,
  equipo              text,
  musculo_principal   text,
  musculos_secundarios text[] not null default '{}',
  instrucciones       text,
  imagen_url          text,
  gif_url             text,
  atribucion          text,
  created_at          timestamptz not null default now()
);

create index if not exists ejercicios_parte_cuerpo_idx on public.ejercicios(parte_cuerpo);
create index if not exists ejercicios_equipo_idx on public.ejercicios(equipo);

alter table public.ejercicios enable row level security;

drop policy if exists "ejercicios read auth" on public.ejercicios;
create policy "ejercicios read auth"
  on public.ejercicios for select
  using (auth.uid() is not null);

drop policy if exists "ejercicios staff write" on public.ejercicios;
create policy "ejercicios staff write"
  on public.ejercicios for all
  using (public.is_staff())
  with check (public.is_staff());

-- ─────────────────────────────────────────────────────────
-- plan_ejercicios: rutina vinculada a un plan (tipo entrenamiento | combo)
-- ─────────────────────────────────────────────────────────
create table if not exists public.plan_ejercicios (
  id            bigint generated always as identity primary key,
  plan_id       bigint not null references public.planes(id) on delete cascade,
  ejercicio_id  bigint not null references public.ejercicios(id) on delete restrict,
  dia_semana    text,             -- 'lunes'..'sabado' o null (rutina general, sin día asignado)
  orden         int not null default 0,
  series        int,
  repeticiones  text,             -- texto libre: admite "8-12", "al fallo", etc.
  descanso_seg  int,
  notas         text,
  constraint plan_ejercicios_dia_valido check (
    dia_semana is null or dia_semana in ('lunes','martes','miercoles','jueves','viernes','sabado','domingo')
  )
);

create index if not exists plan_ejercicios_plan_idx
  on public.plan_ejercicios(plan_id, dia_semana, orden);

alter table public.plan_ejercicios enable row level security;

drop policy if exists "plan_ejercicios paciente read" on public.plan_ejercicios;
create policy "plan_ejercicios paciente read"
  on public.plan_ejercicios for select
  using (
    exists (
      select 1 from public.planes p
      where p.id = plan_ejercicios.plan_id and p.paciente_id = auth.uid()
    )
    or public.is_staff()
  );

drop policy if exists "plan_ejercicios staff write" on public.plan_ejercicios;
create policy "plan_ejercicios staff write"
  on public.plan_ejercicios for all
  using (public.is_staff())
  with check (public.is_staff());

-- ─────────────────────────────────────────────────────────
-- Storage bucket 'ejercicios-media' (público — thumbnails/GIFs del catálogo,
-- sin datos de pacientes; se sirven directo por URL pública, sin signed URL)
-- ─────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('ejercicios-media', 'ejercicios-media', true)
on conflict (id) do nothing;

drop policy if exists "ejercicios media public read" on storage.objects;
create policy "ejercicios media public read"
  on storage.objects for select
  using (bucket_id = 'ejercicios-media');

drop policy if exists "ejercicios media staff write" on storage.objects;
create policy "ejercicios media staff write"
  on storage.objects for all
  using (bucket_id = 'ejercicios-media' and public.is_staff())
  with check (bucket_id = 'ejercicios-media' and public.is_staff());
