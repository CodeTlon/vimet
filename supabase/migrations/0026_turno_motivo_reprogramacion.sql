-- VIMET — mensaje obligatorio del profesional al reprogramar un turno.
--
-- El staff lo carga al apretar "Reprogramar" (actions/turnos.ts valida que no
-- venga vacío) y el paciente lo lee dentro del modal de elegir nuevo horario,
-- antes de elegir. Se limpia solo cuando el paciente confirma el horario
-- nuevo (elegirNuevoHorarioTurno) — no tiene sentido que quede pegado en un
-- turno que ya volvió a 'pendiente'.
--
-- Columna distinta de notas_profesional a propósito: esa es "no visible al
-- paciente" en todo el resto del proyecto, no se le cambia la semántica acá.

alter table public.turnos add column motivo_reprogramacion text;

-- Se suma motivo_reprogramacion a la lista de columnas que
-- turnos_restrict_patient_update() le bloquea al paciente (mismo criterio
-- documentado en CLAUDE.md: toda columna sensible nueva hay que sumarla
-- explícitamente al chequeo, si no el paciente podría escribirla directo).
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
       or new.motivo_reprogramacion is distinct from old.motivo_reprogramacion then
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
