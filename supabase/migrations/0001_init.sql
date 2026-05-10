-- VIMET — schema inicial Postgres (migración desde MySQL legacy)

-- ─────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'rol_usuario') then
    create type rol_usuario as enum ('admin','nutricionista','entrenador','paciente');
  end if;
  if not exists (select 1 from pg_type where typname = 'tipo_servicio') then
    create type tipo_servicio as enum ('nutricion','entrenamiento','combo');
  end if;
  if not exists (select 1 from pg_type where typname = 'modalidad_horario') then
    create type modalidad_horario as enum ('presencial','virtual','ambas');
  end if;
  if not exists (select 1 from pg_type where typname = 'modalidad_turno') then
    create type modalidad_turno as enum ('presencial','virtual');
  end if;
  if not exists (select 1 from pg_type where typname = 'estado_turno') then
    create type estado_turno as enum ('pendiente','confirmado','cancelado','completado','no_asistio');
  end if;
end$$;

-- ─────────────────────────────────────────────────────────
-- profiles (1:1 con auth.users)
-- ─────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null default '',
  apellido text not null default '',
  email text,
  telefono text,
  rol rol_usuario not null default 'paciente',
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_rol_idx on public.profiles(rol);
create index if not exists profiles_activo_idx on public.profiles(activo);

-- ─────────────────────────────────────────────────────────
-- servicios
-- ─────────────────────────────────────────────────────────
create table if not exists public.servicios (
  id bigint generated always as identity primary key,
  nombre text not null,
  descripcion text,
  duracion_minutos integer not null default 60,
  tipo tipo_servicio not null,
  icono text,
  profesional_id uuid references public.profiles(id) on delete set null,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists servicios_tipo_idx on public.servicios(tipo);
create index if not exists servicios_profesional_idx on public.servicios(profesional_id);

-- ─────────────────────────────────────────────────────────
-- horarios_disponibles
-- ─────────────────────────────────────────────────────────
create table if not exists public.horarios_disponibles (
  id bigint generated always as identity primary key,
  profesional_id uuid not null references public.profiles(id) on delete cascade,
  dia_semana smallint not null check (dia_semana between 0 and 6),
  hora_inicio time not null,
  hora_fin time not null,
  modalidad modalidad_horario not null default 'ambas',
  activo boolean not null default true
);

create index if not exists horarios_prof_dia_idx on public.horarios_disponibles(profesional_id, dia_semana);

-- ─────────────────────────────────────────────────────────
-- turnos
-- ─────────────────────────────────────────────────────────
create table if not exists public.turnos (
  id bigint generated always as identity primary key,
  paciente_id uuid not null references public.profiles(id) on delete cascade,
  profesional_id uuid not null references public.profiles(id) on delete cascade,
  servicio_id bigint references public.servicios(id) on delete set null,
  fecha date not null,
  hora_inicio time not null,
  hora_fin time not null,
  modalidad modalidad_turno not null default 'presencial',
  estado estado_turno not null default 'pendiente',
  notas_paciente text,
  notas_profesional text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists turnos_paciente_idx on public.turnos(paciente_id);
create index if not exists turnos_profesional_fecha_idx on public.turnos(profesional_id, fecha);
create index if not exists turnos_estado_idx on public.turnos(estado);

-- ─────────────────────────────────────────────────────────
-- bloqueos_horario
-- ─────────────────────────────────────────────────────────
create table if not exists public.bloqueos_horario (
  id bigint generated always as identity primary key,
  profesional_id uuid not null references public.profiles(id) on delete cascade,
  fecha_inicio timestamptz not null,
  fecha_fin timestamptz not null,
  motivo text
);

create index if not exists bloqueos_profesional_idx on public.bloqueos_horario(profesional_id);

-- ─────────────────────────────────────────────────────────
-- updated_at trigger
-- ─────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists turnos_set_updated_at on public.turnos;
create trigger turnos_set_updated_at
before update on public.turnos
for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────
-- Trigger: crear profile al registrar un auth.user
-- ─────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, nombre, apellido, telefono, rol)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nombre', ''),
    coalesce(new.raw_user_meta_data->>'apellido', ''),
    nullif(new.raw_user_meta_data->>'telefono', ''),
    'paciente'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────
-- Helper: ¿el usuario actual es staff?
-- ─────────────────────────────────────────────────────────
create or replace function public.current_user_rol()
returns rol_usuario
language sql
stable
security definer
set search_path = public
as $$
  select rol from public.profiles where id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
as $$
  select public.current_user_rol() in ('admin','nutricionista','entrenador');
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select public.current_user_rol() = 'admin';
$$;

-- ─────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.servicios enable row level security;
alter table public.horarios_disponibles enable row level security;
alter table public.turnos enable row level security;
alter table public.bloqueos_horario enable row level security;

-- profiles
drop policy if exists "profiles select own" on public.profiles;
create policy "profiles select own"
  on public.profiles for select
  using (auth.uid() = id or public.is_staff());

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own"
  on public.profiles for update
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

drop policy if exists "profiles admin all" on public.profiles;
create policy "profiles admin all"
  on public.profiles for all
  using (public.is_admin())
  with check (public.is_admin());

-- servicios (catálogo público)
drop policy if exists "servicios read all" on public.servicios;
create policy "servicios read all"
  on public.servicios for select
  using (true);

drop policy if exists "servicios admin write" on public.servicios;
create policy "servicios admin write"
  on public.servicios for all
  using (public.is_admin())
  with check (public.is_admin());

-- horarios_disponibles (público para que el wizard arme slots)
drop policy if exists "horarios read all" on public.horarios_disponibles;
create policy "horarios read all"
  on public.horarios_disponibles for select
  using (true);

drop policy if exists "horarios staff write" on public.horarios_disponibles;
create policy "horarios staff write"
  on public.horarios_disponibles for all
  using (public.is_staff())
  with check (public.is_staff());

-- turnos
drop policy if exists "turnos paciente own select" on public.turnos;
create policy "turnos paciente own select"
  on public.turnos for select
  using (
    auth.uid() = paciente_id
    or auth.uid() = profesional_id
    or public.is_admin()
  );

drop policy if exists "turnos paciente own insert" on public.turnos;
create policy "turnos paciente own insert"
  on public.turnos for insert
  with check (auth.uid() = paciente_id);

drop policy if exists "turnos paciente own update" on public.turnos;
create policy "turnos paciente own update"
  on public.turnos for update
  using (
    auth.uid() = paciente_id
    or auth.uid() = profesional_id
    or public.is_admin()
  )
  with check (
    auth.uid() = paciente_id
    or auth.uid() = profesional_id
    or public.is_admin()
  );

drop policy if exists "turnos staff delete" on public.turnos;
create policy "turnos staff delete"
  on public.turnos for delete
  using (public.is_staff());

-- bloqueos_horario (lectura pública para el wizard)
drop policy if exists "bloqueos read all" on public.bloqueos_horario;
create policy "bloqueos read all"
  on public.bloqueos_horario for select
  using (true);

drop policy if exists "bloqueos staff write" on public.bloqueos_horario;
create policy "bloqueos staff write"
  on public.bloqueos_horario for all
  using (public.is_staff())
  with check (public.is_staff());
