-- VIMET — pivot del flujo de reprogramación: el cliente pidió que sea el
-- profesional (no el paciente) quien cargue el horario nuevo, después de
-- coordinarlo por teléfono. El diseño anterior (estado
-- 'pendiente_reprogramacion' + el paciente elige desde /mis-turnos) queda
-- descartado — ver plan de la sesión.
--
-- Se borra motivo_reprogramacion (columna trivial de sacar) y se revierte el
-- trigger a la versión exacta de 0015_turno_trigger_service_role.sql: ya no
-- hace falta ningún caso especial para el paciente, todo pasa por is_staff().
--
-- El valor 'pendiente_reprogramacion' del enum estado_turno queda sin usar
-- a propósito — Postgres no permite un DROP VALUE seguro sin recrear el tipo
-- entero, y una vez sacado del código de la app queda inerte (decisión
-- explícita: no vale el riesgo de esa migración para algo puramente
-- cosmético).

alter table public.turnos drop column motivo_reprogramacion;

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
