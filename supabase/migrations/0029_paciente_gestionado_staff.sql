-- Pacientes creados directamente por el staff (adultos mayores o con
-- dificultades para usar la web): nunca inician sesión, el staff opera todo
-- por ellos desde el admin. Distingue esos perfiles en el listado.
alter table public.profiles
  add column if not exists gestionado_por_staff boolean not null default false;
