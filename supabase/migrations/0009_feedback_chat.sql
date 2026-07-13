-- Chat de feedback semanal: reemplaza el par único dudas/respuesta_profesional
-- por un hilo de mensajes. feedback_semanal sigue guardando las columnas de
-- stats de la semana; dudas/respuesta_profesional/respondido_* quedan como
-- legacy (se dejan de escribir, se siguen leyendo para semanas históricas
-- ya guardadas antes de esta migración).

create table public.feedback_mensajes (
  id bigint generated always as identity primary key,
  feedback_id bigint not null references public.feedback_semanal(id) on delete cascade,
  autor_id uuid not null references public.profiles(id) on delete cascade,
  contenido text not null check (char_length(contenido) between 1 and 2000),
  created_at timestamptz not null default now(),
  edited_at timestamptz
);

create index feedback_mensajes_feedback_idx on public.feedback_mensajes(feedback_id, id);

alter table public.feedback_mensajes enable row level security;

create policy "feedback_mensajes select propio o staff" on public.feedback_mensajes for select
  using (
    exists (
      select 1 from public.feedback_semanal f
      where f.id = feedback_id and (f.paciente_id = auth.uid() or public.is_staff())
    )
  );

create policy "feedback_mensajes insert propio o staff" on public.feedback_mensajes for insert
  with check (
    autor_id = auth.uid()
    and exists (
      select 1 from public.feedback_semanal f
      where f.id = feedback_id and (f.paciente_id = auth.uid() or public.is_staff())
    )
  );

create policy "feedback_mensajes update propio" on public.feedback_mensajes for update
  using (autor_id = auth.uid())
  with check (autor_id = auth.uid());
