-- getProfesionales() (lib/config/contenido.ts) y /admin/configuracion resolvían
-- "quién es Avril" / "quién es Gero" buscando por el email hardcodeado
-- avril@vimet.com / gero@vimet.com en lib/config/team.ts. Ese dominio nunca
-- se usó de verdad — las cuentas reales son
-- codetloncordoba+avril@gmail.com / codetloncordoba+gero@gmail.com — así que
-- la búsqueda nunca encontraba nada y las tarjetas de "Perfil público" no
-- se mostraban nunca en /admin/configuracion. Además, si el día de mañana
-- cambia el email de alguno, la misma búsqueda por email se rompería otra
-- vez: no es mantenible atar la identidad del "slot" público al email de
-- login.
--
-- Se agrega slot_publico: un identificador estable en el propio profile,
-- independiente del email, que dice a qué tarjeta pública corresponde esa
-- cuenta. Un índice único parcial garantiza que como mucho una cuenta ocupe
-- cada slot.

alter table public.profiles
  add column if not exists slot_publico text
  check (slot_publico in ('avril', 'gero'));

create unique index if not exists profiles_slot_publico_unique
  on public.profiles (slot_publico)
  where slot_publico is not null;

-- Backfill único, basado en los emails reales de hoy — de acá en adelante
-- ya no se lee más el email para esto, así que un cambio de email futuro
-- no rompe nada.
--
-- 2026-09-22: se agregan también los emails reales de producción
-- (avriljerushalmi@vimetsalud.com.ar / geronimogallardo@vimetsalud.com.ar) —
-- distintos de las cuentas de dev (codetloncordoba+avril/+gero@gmail.com).
-- Esta migración nunca corrió contra prod (gap destapado en KNOWN_ISSUES.md
-- #1), así que agregar el email real no reescribe nada ya aplicado en
-- ningún entorno: en dev sigue matcheando exactamente lo mismo que antes
-- (esos emails no existen ahí), y en prod ahora matchea de verdad.
update public.profiles set slot_publico = 'avril'
  where email in ('codetloncordoba+avril@gmail.com', 'avriljerushalmi@vimetsalud.com.ar');
update public.profiles set slot_publico = 'gero'
  where email in ('codetloncordoba+gero@gmail.com', 'geronimogallardo@vimetsalud.com.ar');
