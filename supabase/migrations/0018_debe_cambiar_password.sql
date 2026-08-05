-- Fuerza a cambiar la contraseña en el primer login (cuentas creadas a mano
-- por admin con password temporal, sin pasar por el flujo de invite/email).
alter table public.profiles
  add column if not exists debe_cambiar_password boolean not null default false;
