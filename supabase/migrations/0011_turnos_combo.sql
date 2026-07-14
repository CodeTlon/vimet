-- ─────────────────────────────────────────────────────────
-- turno_par_id: vincula los dos turnos que genera una reserva de
-- servicio "combo" (uno por profesional, mismo paciente/fecha/hora).
-- Gestionar uno (confirmar/cancelar/completar/no asistió) propaga el
-- cambio al otro. No hace falta relajar RLS: el paciente es dueño de
-- ambas filas (paciente_id = auth.uid() en las dos) y la propagación
-- del lado staff se hace con el cliente admin desde la Server Action.
-- ─────────────────────────────────────────────────────────
alter table public.turnos
  add column if not exists turno_par_id bigint references public.turnos(id) on delete set null;

create index if not exists turnos_turno_par_idx on public.turnos(turno_par_id);
