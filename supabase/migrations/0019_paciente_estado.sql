-- Distingue "pendiente" (nunca activado, típico de un registro nuevo sin
-- revisar por staff) de "inactivo" (fue activo y luego se desactivó). Antes
-- ambos casos compartían el mismo booleano `activo=false` y se mostraban
-- igual en /admin/pacientes.
alter table public.profiles
  add column if not exists activado_en timestamptz;
