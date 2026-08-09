-- VIMET — datos de wearables (Health Connect / Apple Health), del reloj hacia el sistema.
-- Una fila por paciente y día sincronizado. Igual que sesiones_entrenamiento.fuente,
-- no se integra marca por marca (Xiaomi, Garmin, etc.) — se lee del agregador del
-- sistema operativo, que ya trae los datos de cualquier reloj conectado ahí.

create table if not exists public.mediciones_wearable (
  id                bigint generated always as identity primary key,
  paciente_id       uuid not null references public.profiles(id) on delete cascade,
  fecha             date not null,
  pasos             int,
  calorias_activas  int,
  fc_prom           int,
  fc_min            int,
  fc_max            int,
  minutos_sueno     int,
  fuente            text not null,
  sincronizado_at   timestamptz not null default now(),
  constraint mediciones_wearable_fuente_valida check (fuente in ('health_connect', 'apple_health')),
  constraint mediciones_wearable_paciente_fecha_fuente_unica unique (paciente_id, fecha, fuente)
);

create index if not exists mediciones_wearable_paciente_idx
  on public.mediciones_wearable(paciente_id, fecha desc);

alter table public.mediciones_wearable enable row level security;

drop policy if exists "mediciones_wearable paciente rw" on public.mediciones_wearable;
create policy "mediciones_wearable paciente rw"
  on public.mediciones_wearable for all
  using (paciente_id = auth.uid() or public.is_staff())
  with check (paciente_id = auth.uid() or public.is_staff());
