-- VIMET — endurecimiento de seguridad
--
-- Cierra agujeros de RLS:
--   1) profiles SELECT pasa a requerir sesión (evita filtración de email/teléfono
--      del staff a anónimos).
--   2) Los pacientes no pueden cambiar su propio rol/activo (auto-escalación).
--   3) Los pacientes solo pueden cancelar sus turnos, no mover hora/fecha/estado
--      ni editar notas del profesional.
--   4) Los pacientes no pueden falsificar respuestas del profesional en su
--      feedback semanal.
--
-- Las policies originales seguían siendo necesarias para el `using` clause
-- (decidir qué filas ve cada quién); los triggers BEFORE UPDATE refinan a nivel
-- columna lo que la policy no puede expresar.

-- ─────────────────────────────────────────────────────────
-- 1) profiles: SELECT requiere auth
-- ─────────────────────────────────────────────────────────
drop policy if exists "profiles select staff public" on public.profiles;
create policy "profiles select staff public"
  on public.profiles for select
  using (
    auth.uid() is not null
    and (
      auth.uid() = id
      or public.is_staff()
      or rol in ('nutricionista', 'entrenador', 'admin')
    )
  );

-- ─────────────────────────────────────────────────────────
-- 2) profiles: bloqueo de auto-escalación
-- ─────────────────────────────────────────────────────────
create or replace function public.profiles_block_privilege_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if new.rol is distinct from old.rol then
    raise exception 'No autorizado a cambiar el rol del perfil';
  end if;
  if new.activo is distinct from old.activo then
    raise exception 'No autorizado a cambiar el estado activo del perfil';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_block_privilege_self_update on public.profiles;
create trigger profiles_block_privilege_self_update
before update on public.profiles
for each row execute function public.profiles_block_privilege_self_update();

-- ─────────────────────────────────────────────────────────
-- 3) turnos: paciente solo puede cancelar
-- ─────────────────────────────────────────────────────────
create or replace function public.turnos_restrict_patient_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- staff puede tocar todo según su policy
  if public.is_staff() then
    return new;
  end if;

  -- a partir de acá: es el propio paciente actualizando su turno
  if new.paciente_id is distinct from old.paciente_id
     or new.profesional_id is distinct from old.profesional_id
     or new.servicio_id is distinct from old.servicio_id
     or new.fecha is distinct from old.fecha
     or new.hora_inicio is distinct from old.hora_inicio
     or new.hora_fin is distinct from old.hora_fin
     or new.modalidad is distinct from old.modalidad
     or new.notas_profesional is distinct from old.notas_profesional then
    raise exception 'Solo el equipo puede modificar estos campos del turno';
  end if;

  -- el paciente solo puede pasar el turno a "cancelado" desde estados abiertos
  if new.estado is distinct from old.estado then
    if new.estado <> 'cancelado' then
      raise exception 'El paciente solo puede cancelar el turno';
    end if;
    if old.estado not in ('pendiente', 'confirmado') then
      raise exception 'Este turno ya no puede cancelarse';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists turnos_restrict_patient_update on public.turnos;
create trigger turnos_restrict_patient_update
before update on public.turnos
for each row execute function public.turnos_restrict_patient_update();

-- ─────────────────────────────────────────────────────────
-- 4) feedback_semanal: paciente no falsifica respuesta profesional
-- ─────────────────────────────────────────────────────────
create or replace function public.feedback_restrict_patient_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_staff() then
    return new;
  end if;

  if new.paciente_id is distinct from old.paciente_id then
    raise exception 'No autorizado a cambiar el paciente del feedback';
  end if;

  if new.respuesta_profesional is distinct from old.respuesta_profesional
     or new.respondido_por is distinct from old.respondido_por
     or new.respondido_at is distinct from old.respondido_at then
    raise exception 'Solo el equipo puede responder el feedback';
  end if;

  return new;
end;
$$;

drop trigger if exists feedback_restrict_patient_update on public.feedback_semanal;
create trigger feedback_restrict_patient_update
before update on public.feedback_semanal
for each row execute function public.feedback_restrict_patient_update();
