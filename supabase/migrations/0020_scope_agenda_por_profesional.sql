-- Las policies de horarios_disponibles (write), bloqueos_horario (write) y
-- turnos (delete) sólo exigían is_staff(), sin el scope por profesional_id
-- que sí usan las policies de select/update de turnos en 0001_init.sql.
-- Cualquier staff con su propio JWT podía tocar la agenda de un colega vía
-- API directa de Supabase, sin pasar por las Server Actions (que sí filtran
-- por profesional_id en la app). is_admin() sigue con acceso total.

drop policy if exists "horarios staff write" on public.horarios_disponibles;
create policy "horarios staff write"
  on public.horarios_disponibles for all
  using (public.is_admin() or (public.is_staff() and profesional_id = auth.uid()))
  with check (public.is_admin() or (public.is_staff() and profesional_id = auth.uid()));

drop policy if exists "bloqueos staff write" on public.bloqueos_horario;
create policy "bloqueos staff write"
  on public.bloqueos_horario for all
  using (public.is_admin() or (public.is_staff() and profesional_id = auth.uid()))
  with check (public.is_admin() or (public.is_staff() and profesional_id = auth.uid()));

drop policy if exists "turnos staff delete" on public.turnos;
create policy "turnos staff delete"
  on public.turnos for delete
  using (public.is_admin() or (public.is_staff() and profesional_id = auth.uid()));
