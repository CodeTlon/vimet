-- Mismo problema que 0008 pero en horarios_disponibles: crearHorarioAction
-- valida solapamiento con un select + insert sin lock (TOCTOU). Acá el
-- horario es semanal (dia_semana + time), no una fecha concreta, así que el
-- rango se arma anclando hora_inicio/hora_fin a una fecha ficticia fija —
-- sólo importa la duración relativa entre las dos horas, no la fecha en sí.
--
-- Si esta migración falla porque ya existen horarios activos solapados,
-- hay que resolverlos a mano antes de aplicarla.

alter table public.horarios_disponibles
  add constraint horarios_disponibles_no_solapado
  exclude using gist (
    profesional_id with =,
    dia_semana with =,
    tsrange('2000-01-01'::date + hora_inicio, '2000-01-01'::date + hora_fin) with &&
  )
  where (activo);
