alter table public.planes
  add column dias_descanso text[] not null default '{}';

alter table public.planes
  add constraint planes_dias_descanso_check
  check (dias_descanso <@ array['lunes','martes','miercoles','jueves','viernes','sabado','domingo']::text[]);
