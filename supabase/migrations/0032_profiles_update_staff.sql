-- profiles UPDATE seguía en is_admin() pese a que 0010_contenido_staff.sql
-- relajó servicios/contenido_sitio/storage a is_staff() con el mismo criterio
-- (hoy el único staff son Avril y Gero y ambos deben poder editarse el perfil
-- público mutuamente, no solo el propio). Esa migración dejó afuera profiles
-- a propósito; ahora sí hace falta para que cualquier staff pueda cambiar la
-- foto/teléfono de CUALQUIER profesional desde /admin/configuracion.
--
-- Seguro: el trigger profiles_block_privilege_self_update (0004) sigue
-- exigiendo is_admin() para tocar rol/activo en cualquier fila, así que esto
-- no abre auto-escalación. Las acciones que tocan profiles de otros usuarios
-- en actions/staff.ts ya usan el cliente admin (bypassa RLS), así que no
-- dependen de esta policy.

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own"
  on public.profiles for update
  using (auth.uid() = id or public.is_staff())
  with check (auth.uid() = id or public.is_staff());
