-- VIMET — permitir que el service role actualice turnos (barridos automáticos)
--
-- turnos_restrict_patient_update (0004, relajado en 0014) chequea
-- `is_staff()`, que depende de auth.uid(). Bajo service role (barridos
-- perezosos de actions/turnos.ts, o el SQL/Table Editor) auth.uid() es null
-- → is_staff() devuelve null → el trigger cae en la rama "paciente" y
-- bloquea el update. Confirmado en vivo: `select is_staff()` vía RPC con la
-- service role key devuelve null, no true.
--
-- Esto ya rompía en silencio, antes de esta migración, cualquier update de
-- `estado` hecho con el cliente admin: marcarNoAsistioVencidos() (no-show a
-- 15min/24h), cancelarPendientesSinConfirmar() (auto-cancelación a 3h), y la
-- propagación a turno_par_id en actualizarTurnoStaffAction() para turnos
-- combo. Mismo bug, mismo fix ya aplicado para `profiles` en 0006: un
-- paciente operando por la API SIEMPRE tiene auth.uid() seteado, así que el
-- bloqueo de auto-escalación del paciente sigue intacto — el cortocircuito
-- solo lo alcanza el service role, que de todos modos ya saltea RLS.

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
