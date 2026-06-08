-- VIMET — rol desde metadata para usuarios invitados (staff)
--
-- El trigger handle_new_user hardcodeaba rol = 'paciente'. Ahora, si el usuario
-- fue creado por invitación (auth.users.invited_at no es null), respeta el rol
-- indicado en user_metadata.rol (validado contra el enum rol_usuario).
--
-- Seguridad: los registros públicos (signUp desde el cliente) controlan
-- raw_user_meta_data pero NO pueden setear invited_at — eso solo lo hace un
-- admin vía service role / dashboard (inviteUserByEmail). Por eso el gate por
-- invited_at evita auto-escalación: un signUp normal siempre cae en 'paciente'
-- aunque mande {"rol":"admin"} en el metadata.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_rol  text := new.raw_user_meta_data->>'rol';
  rol_final rol_usuario := 'paciente';
begin
  if new.invited_at is not null
     and meta_rol in ('admin', 'nutricionista', 'entrenador', 'paciente') then
    rol_final := meta_rol::rol_usuario;
  end if;

  insert into public.profiles (id, email, nombre, apellido, telefono, rol)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nombre', ''),
    coalesce(new.raw_user_meta_data->>'apellido', ''),
    nullif(new.raw_user_meta_data->>'telefono', ''),
    rol_final
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────
-- Permitir asignación de rol desde contexto backend (service role / SQL editor)
--
-- El trigger profiles_block_privilege_self_update (migration 0004) bloquea todo
-- cambio de rol salvo is_admin(). Eso impedía corregir el rol desde el Table/SQL
-- Editor de Supabase, donde auth.uid() es null (sesión service role) y por ende
-- is_admin() = false. Agregamos un short-circuit para auth.uid() null: ese
-- contexto solo lo alcanza el service role (que de todos modos saltea RLS); un
-- paciente operando por la API SIEMPRE tiene auth.uid() seteado, así que el
-- bloqueo de auto-escalación sigue intacto para él.
-- ─────────────────────────────────────────────────────────
create or replace function public.profiles_block_privilege_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if new.rol is distinct from old.rol then
    raise exception 'No autorizado a cambiar el rol del perfil';
  end if;
  if new.activo is distinct from old.activo then
    raise exception 'No autorizado a cambiar el estado activo del perfil';
  end if;
  return new;
end;
$$;

-- Nota: para corregir un usuario YA creado que quedó como 'paciente' por error,
-- correr manualmente en el SQL editor (reemplazando email y rol):
--   update public.profiles set rol = 'nutricionista'
--   where email = 'persona@ejemplo.com';
