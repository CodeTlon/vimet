-- VIMET — habilita el paso de reprogramación en turnos_restrict_patient_update()
-- (última versión previa en 0015_turno_trigger_service_role.sql).
--
-- Hasta ahora el trigger bloqueaba SIEMPRE que un paciente cambiara
-- fecha/hora_inicio/hora_fin. Con el flujo de reprogramación (staff pasa el
-- turno a 'pendiente_reprogramacion', el paciente elige el nuevo horario
-- desde /mis-turnos vía elegirNuevoHorarioTurnoAction), el paciente necesita
-- poder escribir esas tres columnas — pero SOLO en esa transición puntual
-- (old.estado = 'pendiente_reprogramacion' -> new.estado = 'pendiente').
-- profesional_id/servicio_id/modalidad/notas_profesional siguen bloqueados
-- incluso en ese caso: el paciente reprograma el horario, no el servicio.
--
-- También se suma 'pendiente_reprogramacion' a los estados desde los que el
-- paciente puede cancelar (por si prefiere cancelar en vez de reprogramar).

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
       or new.notas_profesional is distinct from old.notas_profesional then
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
     or new.notas_profesional is distinct from old.notas_profesional then
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
