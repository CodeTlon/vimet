-- VIMET — recursos multimedia por paciente + adjunto de feedback semanal

-- ─────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────
do $$ begin
  if not exists (select 1 from pg_type where typname = 'tipo_recurso') then
    create type tipo_recurso as enum ('link','pdf','imagen','video');
  end if;
  if not exists (select 1 from pg_type where typname = 'categoria_recurso') then
    create type categoria_recurso as enum ('ejercicio','nutricion','progreso','educativo','otro');
  end if;
end$$;

-- ─────────────────────────────────────────────────────────
-- recursos_paciente
-- ─────────────────────────────────────────────────────────
create table if not exists public.recursos_paciente (
  id            bigint generated always as identity primary key,
  paciente_id   uuid not null references public.profiles(id) on delete cascade,
  tipo          tipo_recurso not null,
  categoria     categoria_recurso not null default 'otro',
  titulo        text not null,
  descripcion   text,
  url           text,            -- solo para tipo = 'link'
  storage_path  text,            -- para tipo pdf | imagen | video (bucket 'recursos')
  visible_paciente boolean not null default false,
  plan_id       bigint references public.planes(id) on delete set null,
  creado_por    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  constraint recursos_titulo_len check (char_length(titulo) between 1 and 200),
  constraint recursos_url_o_path check (
    (tipo = 'link'  and url          is not null and storage_path is null) or
    (tipo != 'link' and storage_path is not null and url          is null)
  )
);

create index if not exists recursos_paciente_idx
  on public.recursos_paciente(paciente_id, created_at desc);

-- ─────────────────────────────────────────────────────────
-- feedback_semanal: adjunto opcional (un archivo por semana)
-- ─────────────────────────────────────────────────────────
alter table public.feedback_semanal
  add column if not exists adjunto_path text;

-- ─────────────────────────────────────────────────────────
-- RLS — recursos_paciente
-- ─────────────────────────────────────────────────────────
alter table public.recursos_paciente enable row level security;

drop policy if exists "recursos staff all" on public.recursos_paciente;
create policy "recursos staff all"
  on public.recursos_paciente for all
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "recursos paciente read visible" on public.recursos_paciente;
create policy "recursos paciente read visible"
  on public.recursos_paciente for select
  using (auth.uid() = paciente_id and visible_paciente = true);

-- ─────────────────────────────────────────────────────────
-- Storage bucket 'recursos' (privado)
-- Convención de paths:
--   Recursos del staff:     {paciente_id}/r/{timestamp}_{filename}
--   Adjuntos de feedback:   {paciente_id}/f/{semana}_{timestamp}_{filename}
-- ─────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('recursos', 'recursos', false)
on conflict (id) do nothing;

-- Staff: acceso total
drop policy if exists "recursos storage staff all" on storage.objects;
create policy "recursos storage staff all"
  on storage.objects for all
  using  (bucket_id = 'recursos' and public.is_staff())
  with check (bucket_id = 'recursos' and public.is_staff());

-- Paciente: puede leer cualquier archivo dentro de su carpeta
drop policy if exists "recursos storage paciente read" on storage.objects;
create policy "recursos storage paciente read"
  on storage.objects for select
  using (
    bucket_id = 'recursos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Paciente: puede subir solo a su subcarpeta de feedback (f/)
drop policy if exists "recursos storage paciente feedback insert" on storage.objects;
create policy "recursos storage paciente feedback insert"
  on storage.objects for insert
  with check (
    bucket_id = 'recursos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (storage.foldername(name))[2] = 'f'
  );

-- Paciente: puede borrar sus adjuntos de feedback (para reemplazarlos)
drop policy if exists "recursos storage paciente feedback delete" on storage.objects;
create policy "recursos storage paciente feedback delete"
  on storage.objects for delete
  using (
    bucket_id = 'recursos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (storage.foldername(name))[2] = 'f'
  );
