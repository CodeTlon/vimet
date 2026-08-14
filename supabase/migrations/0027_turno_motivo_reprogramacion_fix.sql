-- VIMET — fix de 0026: el trigger bloqueaba CUALQUIER cambio del paciente a
-- motivo_reprogramacion, incluso durante la transición
-- pendiente_reprogramacion -> pendiente, donde elegirNuevoHorarioTurno()
-- necesita limpiarlo a null al confirmar el horario nuevo. El propio trigger
-- rechazaba ese update en silencio (0 filas afectadas → "No se pudo
-- reprogramar el turno").
--
-- Fix: en esa transición puntual se permite que motivo_reprogramacion pase a
-- null (limpieza esperada), pero se sigue bloqueando que el paciente le
-- ponga cualquier otro valor.

create or replace function public.turnos_restrict_patient_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_staff() then
    return new;
  end if;

  if old.estado = 'pendiente_reprogramacion' and new.estado = 'pendiente' then
    if new.paciente_id is distinct from old.paciente_id
       or new.profesional_id is distinct from old.profesional_id
       or new.servicio_id is distinct from old.servicio_id
       or new.modalidad is distinct from old.modalidad
       or new.notas_profesional is distinct from old.notas_profesional
       or new.motivo_reprogramacion is not null then
      raise exception 'Solo el equipo puede modificar estos campos del turno';
    end if;
    return new;
  end if;

  if new.paciente_id is distinct from old.paciente_id
     or new.profesional_id is distinct from old.profesional_id
     or new.servicio_id is distinct from old.servicio_id
     or new.fecha is distinct from old.fecha
     or new.hora_inicio is distinct from old.hora_inicio
     or new.hora_fin is distinct from old.hora_fin
     or new.modalidad is distinct from old.modalidad
     or new.notas_profesional is distinct from old.notas_profesional
     or new.motivo_reprogramacion is distinct from old.motivo_reprogramacion then
    raise exception 'Solo el equipo puede modificar estos campos del turno';
  end if;

  if new.estado is distinct from old.estado then
    if new.estado = 'cancelado' then
      if old.estado not in ('pendiente', 'confirmado', 'pendiente_reprogramacion') then
        raise exception 'Este turno ya no puede cancelarse';
      end if;
    elsif new.estado = 'confirmado' then
      if old.estado <> 'pendiente' then
        raise exception 'Este turno ya no puede confirmarse';
      end if;
    else
      raise exception 'El paciente solo puede confirmar o cancelar el turno';
    end if;
  end if;

  return new;
end;
$$;
