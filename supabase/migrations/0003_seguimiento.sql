-- VIMET — módulo de seguimiento integral
-- Reemplaza Excels FICHA + PROYECTO y carpeta Drive de planes.

-- ─────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'sexo_paciente') then
    create type sexo_paciente as enum ('femenino','masculino','otro');
  end if;
  if not exists (select 1 from pg_type where typname = 'tipo_plan') then
    create type tipo_plan as enum ('nutricion','entrenamiento','combo');
  end if;
  if not exists (select 1 from pg_type where typname = 'estado_plan') then
    create type estado_plan as enum ('vigente','archivado','borrador');
  end if;
  if not exists (select 1 from pg_type where typname = 'categoria_objetivo') then
    create type categoria_objetivo as enum ('nutricional','antropometrico','clinico','entrenamiento','rendimiento');
  end if;
  if not exists (select 1 from pg_type where typname = 'estado_objetivo') then
    create type estado_objetivo as enum ('pendiente','en_progreso','cumplido','descartado');
  end if;
  if not exists (select 1 from pg_type where typname = 'origen_evolucion') then
    create type origen_evolucion as enum ('nutricion','entrenamiento');
  end if;
end$$;

-- ─────────────────────────────────────────────────────────
-- fichas_paciente — datos clínicos/personales (1:1 con paciente)
-- ─────────────────────────────────────────────────────────
create table if not exists public.fichas_paciente (
  paciente_id uuid primary key references public.profiles(id) on delete cascade,
  fecha_nacimiento date,
  sexo sexo_paciente,
  ocupacion text,
  fecha_primera_consulta date,
  -- Hábitos
  fuma boolean,
  bebe boolean,
  drogas boolean,
  entrena boolean,
  actividad_diaria text,        -- poca / normal / mucha
  horas_sueno numeric(3,1),
  -- Salud
  dx_medico text,
  dx_nutricional text,
  medicacion text,
  suplementacion text,
  lesiones text,
  molestias text,
  -- Lab + motivos
  datos_laboratorio text,
  motivos_consulta text,
  observaciones_internas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

create index if not exists fichas_updated_idx on public.fichas_paciente(updated_at desc);

drop trigger if exists fichas_set_updated_at on public.fichas_paciente;
create trigger fichas_set_updated_at
before update on public.fichas_paciente
for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────
-- mediciones_antropometricas — histórico
-- ─────────────────────────────────────────────────────────
create table if not exists public.mediciones_antropometricas (
  id bigint generated always as identity primary key,
  paciente_id uuid not null references public.profiles(id) on delete cascade,
  fecha_medicion date not null default current_date,
  peso_kg numeric(5,2),
  talla_cm numeric(5,2),
  imc numeric(5,2),                -- calculado en cliente al guardar
  porc_grasa numeric(5,2),
  porc_masa_muscular numeric(5,2),
  kg_grasa numeric(5,2),
  kg_musculo numeric(5,2),
  dx_antropometrico text,
  observaciones text,
  registrado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists mediciones_paciente_idx on public.mediciones_antropometricas(paciente_id, fecha_medicion desc);

-- ─────────────────────────────────────────────────────────
-- evaluaciones_funcionales — entrenador, snapshot temporal
-- 8 tests con escalas distintas (4×10, 1×10, 2×15, 1×20) → max 100
-- ─────────────────────────────────────────────────────────
create table if not exists public.evaluaciones_funcionales (
  id bigint generated always as identity primary key,
  paciente_id uuid not null references public.profiles(id) on delete cascade,
  fecha date not null default current_date,
  test_wells_adams smallint check (test_wells_adams between 0 and 10),
  test_thomas smallint check (test_thomas between 0 and 10),
  test_dorsiflexion smallint check (test_dorsiflexion between 0 and 10),
  test_sentadilla smallint check (test_sentadilla between 0 and 10),
  test_estabilidad smallint check (test_estabilidad between 0 and 10),
  fuerza_inferior smallint check (fuerza_inferior between 0 and 15),
  fuerza_superior smallint check (fuerza_superior between 0 and 15),
  resistencia_metabolica smallint check (resistencia_metabolica between 0 and 20),
  puntaje_total smallint generated always as (
    coalesce(test_wells_adams,0) + coalesce(test_thomas,0) + coalesce(test_dorsiflexion,0)
    + coalesce(test_sentadilla,0) + coalesce(test_estabilidad,0)
    + coalesce(fuerza_inferior,0) + coalesce(fuerza_superior,0) + coalesce(resistencia_metabolica,0)
  ) stored,
  observaciones text,
  registrado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists evals_paciente_idx on public.evaluaciones_funcionales(paciente_id, fecha desc);

-- ─────────────────────────────────────────────────────────
-- planes — PDF + campos estructurados
-- ─────────────────────────────────────────────────────────
create table if not exists public.planes (
  id bigint generated always as identity primary key,
  paciente_id uuid not null references public.profiles(id) on delete cascade,
  profesional_id uuid references public.profiles(id) on delete set null,
  tipo tipo_plan not null,
  titulo text not null,
  estado estado_plan not null default 'vigente',
  fecha_desde date not null default current_date,
  fecha_hasta date,
  archivo_path text,                       -- path en bucket 'planes' (sin URL pública)
  -- Campos nutricionales
  pautas_generales text,
  pautas_hidratacion text,
  pre_entreno text,
  intra_entreno text,
  post_entreno text,
  suplementacion text,
  -- Campos entrenamiento
  disciplina text,
  experiencia_previa text,
  frecuencia text,
  volumen text,
  disponibilidad_lunes text,
  disponibilidad_martes text,
  disponibilidad_miercoles text,
  disponibilidad_jueves text,
  disponibilidad_viernes text,
  disponibilidad_sabado text,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists planes_paciente_tipo_idx on public.planes(paciente_id, tipo, estado);

drop trigger if exists planes_set_updated_at on public.planes;
create trigger planes_set_updated_at
before update on public.planes
for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────
-- feedback_semanal — reporte del paciente
-- ─────────────────────────────────────────────────────────
create table if not exists public.feedback_semanal (
  id bigint generated always as identity primary key,
  paciente_id uuid not null references public.profiles(id) on delete cascade,
  semana_inicio date not null,                       -- lunes de la semana reportada
  estado_fisico smallint check (estado_fisico between 1 and 10),
  animo smallint check (animo between 1 and 10),
  energia smallint check (energia between 1 and 10),
  adherencia_entrenamiento smallint check (adherencia_entrenamiento between 0 and 100),
  adherencia_alimentacion smallint check (adherencia_alimentacion between 0 and 100),
  peso_autoreporte_kg numeric(5,2),
  observaciones text,
  dudas text,
  respuesta_profesional text,
  respondido_por uuid references public.profiles(id) on delete set null,
  respondido_at timestamptz,
  created_at timestamptz not null default now(),
  unique (paciente_id, semana_inicio)
);

create index if not exists feedback_paciente_idx on public.feedback_semanal(paciente_id, semana_inicio desc);

-- ─────────────────────────────────────────────────────────
-- evolucion_entradas — timeline de notas profesionales
-- ─────────────────────────────────────────────────────────
create table if not exists public.evolucion_entradas (
  id bigint generated always as identity primary key,
  paciente_id uuid not null references public.profiles(id) on delete cascade,
  origen origen_evolucion not null,
  tipo text not null check (tipo in ('evolucion','observacion')),
  contenido text not null,
  visible_paciente boolean not null default false,
  registrado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists evolucion_paciente_idx on public.evolucion_entradas(paciente_id, created_at desc);

-- ─────────────────────────────────────────────────────────
-- objetivos
-- ─────────────────────────────────────────────────────────
create table if not exists public.objetivos (
  id bigint generated always as identity primary key,
  paciente_id uuid not null references public.profiles(id) on delete cascade,
  categoria categoria_objetivo not null,
  descripcion text not null,
  estado estado_objetivo not null default 'pendiente',
  fecha_objetivo date,
  registrado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists objetivos_paciente_idx on public.objetivos(paciente_id, categoria);

drop trigger if exists objetivos_set_updated_at on public.objetivos;
create trigger objetivos_set_updated_at
before update on public.objetivos
for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────
alter table public.fichas_paciente             enable row level security;
alter table public.mediciones_antropometricas  enable row level security;
alter table public.evaluaciones_funcionales    enable row level security;
alter table public.planes                      enable row level security;
alter table public.feedback_semanal            enable row level security;
alter table public.evolucion_entradas          enable row level security;
alter table public.objetivos                   enable row level security;

-- Helper común: el usuario actual es el paciente o es staff
-- (usamos las funciones is_staff() / is_admin() ya creadas en 0001)

-- fichas_paciente: paciente lee la suya, staff todo
drop policy if exists "fichas paciente read" on public.fichas_paciente;
create policy "fichas paciente read"
  on public.fichas_paciente for select
  using (auth.uid() = paciente_id or public.is_staff());

drop policy if exists "fichas staff write" on public.fichas_paciente;
create policy "fichas staff write"
  on public.fichas_paciente for all
  using (public.is_staff())
  with check (public.is_staff());

-- mediciones: paciente lee las suyas, staff todo
drop policy if exists "mediciones read" on public.mediciones_antropometricas;
create policy "mediciones read"
  on public.mediciones_antropometricas for select
  using (auth.uid() = paciente_id or public.is_staff());

drop policy if exists "mediciones staff write" on public.mediciones_antropometricas;
create policy "mediciones staff write"
  on public.mediciones_antropometricas for all
  using (public.is_staff())
  with check (public.is_staff());

-- evaluaciones funcionales: igual
drop policy if exists "evals read" on public.evaluaciones_funcionales;
create policy "evals read"
  on public.evaluaciones_funcionales for select
  using (auth.uid() = paciente_id or public.is_staff());

drop policy if exists "evals staff write" on public.evaluaciones_funcionales;
create policy "evals staff write"
  on public.evaluaciones_funcionales for all
  using (public.is_staff())
  with check (public.is_staff());

-- planes: paciente lee los suyos, staff todo
drop policy if exists "planes read" on public.planes;
create policy "planes read"
  on public.planes for select
  using (auth.uid() = paciente_id or public.is_staff());

drop policy if exists "planes staff write" on public.planes;
create policy "planes staff write"
  on public.planes for all
  using (public.is_staff())
  with check (public.is_staff());

-- feedback_semanal: paciente CRUD propio + staff lee/responde
drop policy if exists "feedback paciente own select" on public.feedback_semanal;
create policy "feedback paciente own select"
  on public.feedback_semanal for select
  using (auth.uid() = paciente_id or public.is_staff());

drop policy if exists "feedback paciente own insert" on public.feedback_semanal;
create policy "feedback paciente own insert"
  on public.feedback_semanal for insert
  with check (auth.uid() = paciente_id);

drop policy if exists "feedback paciente own update" on public.feedback_semanal;
create policy "feedback paciente own update"
  on public.feedback_semanal for update
  using (auth.uid() = paciente_id or public.is_staff())
  with check (auth.uid() = paciente_id or public.is_staff());

drop policy if exists "feedback staff delete" on public.feedback_semanal;
create policy "feedback staff delete"
  on public.feedback_semanal for delete
  using (public.is_staff());

-- evolucion_entradas: staff CRUD; paciente solo lee las que están marcadas visibles
drop policy if exists "evolucion staff all" on public.evolucion_entradas;
create policy "evolucion staff all"
  on public.evolucion_entradas for all
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "evolucion paciente read visible" on public.evolucion_entradas;
create policy "evolucion paciente read visible"
  on public.evolucion_entradas for select
  using (auth.uid() = paciente_id and visible_paciente = true);

-- objetivos: paciente lee, staff escribe
drop policy if exists "objetivos read" on public.objetivos;
create policy "objetivos read"
  on public.objetivos for select
  using (auth.uid() = paciente_id or public.is_staff());

drop policy if exists "objetivos staff write" on public.objetivos;
create policy "objetivos staff write"
  on public.objetivos for all
  using (public.is_staff())
  with check (public.is_staff());

-- ─────────────────────────────────────────────────────────
-- Storage bucket 'planes' (privado) + policies
-- ─────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('planes','planes', false)
on conflict (id) do nothing;

-- Convención: archivos guardados en 'planes/{paciente_id}/{filename}'
-- → primer segmento del path = paciente_id

drop policy if exists "planes storage staff all" on storage.objects;
create policy "planes storage staff all"
  on storage.objects for all
  using (bucket_id = 'planes' and public.is_staff())
  with check (bucket_id = 'planes' and public.is_staff());

drop policy if exists "planes storage paciente read own" on storage.objects;
create policy "planes storage paciente read own"
  on storage.objects for select
  using (
    bucket_id = 'planes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
