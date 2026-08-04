-- VIMET — logging de series completadas (paciente registra su entrenamiento real)

-- ─────────────────────────────────────────────────────────
-- sesiones_entrenamiento: una fila por cada vez que el paciente arranca
-- un entrenamiento (un día de un plan)
-- ─────────────────────────────────────────────────────────
create table if not exists public.sesiones_entrenamiento (
  id             bigint generated always as identity primary key,
  plan_id        bigint not null references public.planes(id) on delete cascade,
  paciente_id    uuid not null references public.profiles(id) on delete cascade,
  dia_semana     text,
  -- ponytail: 'fuente' queda lista para wearables (Health Connect/HealthKit)
  -- sin necesitar otra migración cuando se conecten.
  fuente         text not null default 'manual',
  iniciada_at    timestamptz not null default now(),
  finalizada_at  timestamptz,
  constraint sesiones_entrenamiento_dia_valido check (
    dia_semana is null or dia_semana in ('lunes','martes','miercoles','jueves','viernes','sabado','domingo')
  ),
  constraint sesiones_entrenamiento_fuente_valida check (
    fuente in ('manual', 'health_connect', 'apple_health')
  )
);

create index if not exists sesiones_entrenamiento_paciente_idx
  on public.sesiones_entrenamiento(paciente_id, iniciada_at desc);

alter table public.sesiones_entrenamiento enable row level security;

drop policy if exists "sesiones_entrenamiento paciente rw" on public.sesiones_entrenamiento;
create policy "sesiones_entrenamiento paciente rw"
  on public.sesiones_entrenamiento for all
  using (paciente_id = auth.uid() or public.is_staff())
  with check (paciente_id = auth.uid() or public.is_staff());

-- ─────────────────────────────────────────────────────────
-- sets_completados: cada serie que el paciente marca como hecha dentro
-- de una sesión — lo que realmente hizo (peso/reps) y cuánto tardó
-- ─────────────────────────────────────────────────────────
create table if not exists public.sets_completados (
  id                 bigint generated always as identity primary key,
  sesion_id          bigint not null references public.sesiones_entrenamiento(id) on delete cascade,
  plan_ejercicio_id  bigint not null references public.plan_ejercicios(id) on delete cascade,
  numero_set         int not null,
  peso_kg            numeric,
  repeticiones       text,
  duracion_seg       int,  -- tiempo trabajando la serie (stopwatch en la app)
  descanso_seg       int,  -- descanso tomado después de esta serie
  completado_at      timestamptz not null default now()
);

create index if not exists sets_completados_sesion_idx on public.sets_completados(sesion_id);

alter table public.sets_completados enable row level security;

drop policy if exists "sets_completados paciente rw" on public.sets_completados;
create policy "sets_completados paciente rw"
  on public.sets_completados for all
  using (
    exists (
      select 1 from public.sesiones_entrenamiento s
      where s.id = sets_completados.sesion_id
        and (s.paciente_id = auth.uid() or public.is_staff())
    )
  )
  with check (
    exists (
      select 1 from public.sesiones_entrenamiento s
      where s.id = sets_completados.sesion_id
        and (s.paciente_id = auth.uid() or public.is_staff())
    )
  );
