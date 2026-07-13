-- VIMET — evita doble reserva a nivel de base de datos.
--
-- crearTurnoAction ya revalida disponibilidad antes del insert, pero es un
-- select + insert sin lock: dos reservas concurrentes del mismo profesional
-- para el mismo horario pueden pasar ambas la validación. Este exclusion
-- constraint lo rechaza aunque el chequeo en la aplicación pierda la carrera.
--
-- Si esta migración falla porque ya existen turnos activos solapados en la
-- base, hay que resolver esos casos a mano (cancelar o reprogramar uno de
-- los dos) antes de poder aplicarla.

create extension if not exists btree_gist;

alter table public.turnos
  add constraint turnos_no_solapado
  exclude using gist (
    profesional_id with =,
    tsrange(fecha + hora_inicio, fecha + hora_fin) with &&
  )
  where (estado in ('pendiente', 'confirmado'));
