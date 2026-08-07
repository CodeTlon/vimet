-- Tres WITH CHECK incompletos que permitían a un paciente autenticado
-- "engancharse" a datos ajenos cambiando un id numérico secuencial dentro
-- de una fila que sí le pertenece:

-- 1) feedback_mensajes: el UPDATE sólo validaba autor_id, no que feedback_id
--    siguiera apuntando a un hilo propio (o de staff) — permitía reasignar
--    el mensaje editado a un hilo de otro paciente.
drop policy if exists "feedback_mensajes update propio" on public.feedback_mensajes;
create policy "feedback_mensajes update propio"
  on public.feedback_mensajes for update
  using (autor_id = auth.uid())
  with check (
    autor_id = auth.uid()
    and exists (
      select 1 from public.feedback_semanal f
      where f.id = feedback_id and (f.paciente_id = auth.uid() or public.is_staff())
    )
  );

-- 2) sesiones_entrenamiento: paciente_id = auth.uid() no garantiza que
--    plan_id sea un plan del propio paciente.
drop policy if exists "sesiones_entrenamiento paciente rw" on public.sesiones_entrenamiento;
create policy "sesiones_entrenamiento paciente rw"
  on public.sesiones_entrenamiento for all
  using (paciente_id = auth.uid() or public.is_staff())
  with check (
    public.is_staff()
    or (
      paciente_id = auth.uid()
      and exists (
        select 1 from public.planes p
        where p.id = plan_id and p.paciente_id = auth.uid()
      )
    )
  );

-- 3) sets_completados: sólo validaba dueño de la sesión, no que
--    plan_ejercicio_id perteneciera al mismo plan que esa sesión.
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
    public.is_staff()
    or exists (
      select 1 from public.sesiones_entrenamiento s
      join public.plan_ejercicios pe on pe.id = sets_completados.plan_ejercicio_id
      where s.id = sets_completados.sesion_id
        and s.paciente_id = auth.uid()
        and pe.plan_id = s.plan_id
    )
  );
