-- VIMET — el paciente puede confirmar su propio turno
--
-- Hasta ahora `turnos_restrict_patient_update` (0004_security_hardening.sql)
-- solo dejaba al paciente pasar su turno a "cancelado". Se suma "confirmado"
-- desde "pendiente" para que el paciente pueda confirmar su turno desde la
-- plataforma (ver actions/turnos.ts → confirmarTurnoAction).

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

  -- el paciente solo puede confirmar (desde pendiente) o cancelar (desde
  -- pendiente/confirmado) su turno
  if new.estado is distinct from old.estado then
    if new.estado = 'cancelado' then
      if old.estado not in ('pendiente', 'confirmado') then
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
