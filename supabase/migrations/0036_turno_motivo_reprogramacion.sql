-- VIMET — mensaje obligatorio del profesional al reprogramar un turno.
--
-- reprogramarTurno (actions/turnos.ts) solo opera sobre turnos ya
-- "confirmado" — el mismo caso de máxima exigencia que motivo_cancelacion en
-- un turno confirmado, así que acá el motivo es siempre obligatorio (a
-- diferencia de cancelar un turno "pendiente", que no lo exige). El
-- paciente lo ve en /mis-turnos mientras el turno reprogramado siga
-- "pendiente" de reconfirmación — no hace falta limpiar la columna en
-- ningún otro lado: en cuanto el paciente confirma (o el turno se cancela
-- o se reprograma de nuevo) el estado deja de ser "pendiente" y el cartel
-- deja de mostrarse solo por eso.
--
-- Columna distinta de motivo_cancelacion (el turno se cancela) y de
-- notas_profesional (interna, no visible al paciente). Mismo nombre que la
-- columna de la migración 0026, revertida en 0028 por un cambio de decisión
-- de producto ajeno a esta técnica — se reintroduce ahora que sí hace falta.

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

  if new.paciente_id is distinct from old.paciente_id
     or new.profesional_id is distinct from old.profesional_id
     or new.servicio_id is distinct from old.servicio_id
     or new.fecha is distinct from old.fecha
     or new.hora_inicio is distinct from old.hora_inicio
     or new.hora_fin is distinct from old.hora_fin
     or new.modalidad is distinct from old.modalidad
     or new.notas_profesional is distinct from old.notas_profesional
     or new.motivo_cancelacion is distinct from old.motivo_cancelacion
     or new.motivo_reprogramacion is distinct from old.motivo_reprogramacion then
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
