-- ═══════════════════════════════════════════════════════════════════════
-- VIMET — Verificación de migraciones aplicadas contra la base real
-- ═══════════════════════════════════════════════════════════════════════
--
-- Por qué existe este script: el proyecto tiene un historial documentado de
-- migraciones mergeadas en `supabase/migrations/` que NO llegaron a correr
-- contra el Supabase real (pasó con 0011_turnos_combo.sql — semanas sin
-- aplicar, causaba 404 mudo en /admin/turno/[id] — y con 0019_paciente_estado.sql,
-- ver Historial de Cambios en .claude/CLAUDE.md). No hay CI que lo garantice,
-- así que este script es el chequeo manual de "¿qué corrió realmente?".
--
-- CÓMO CORRERLO CONTRA PROD
-- ─────────────────────────
-- Opción A (recomendada, sin exponer la connection string en la shell):
--   1. Ir a https://supabase.com/dashboard/project/<project-ref>/sql/new
--      (proyecto vimet-prod — confirmar cuál es antes de correr nada, hay
--      dos entornos: vimet-dev y vimet-prod, ver docs/environments.md).
--   2. Pegar TODO este archivo y ejecutar ("Run").
--   3. Revisar los resultados de las 3 queries de abajo (ver qué esperar en
--      cada una, comentado antes de cada bloque).
--
-- Opción B (con Supabase CLI, si está linkeado a prod):
--   supabase link --project-ref <project-ref-de-prod>
--   supabase db execute --file supabase/scripts/verificar_migraciones_aplicadas.sql
--
-- Este script es SOLO LECTURA (ningún INSERT/UPDATE/DDL) — es seguro de
-- correr contra prod en cualquier momento, no requiere ventana de mantenimiento.
--
-- QUÉ HACER CON EL RESULTADO
-- ─────────────────────────
-- La Query 2 (más importante) devuelve una fila por archivo de
-- `supabase/migrations/` con `aplicada = false` para cualquiera cuyo
-- artefacto de schema (tabla/columna/constraint que esa migración crea) NO
-- existe en la base. Si aparece alguna en `false`:
--   1. Abrir el archivo `supabase/migrations/000N_*.sql` correspondiente.
--   2. Pegar su contenido en el SQL Editor de prod y ejecutarlo (son
--      idempotentes: usan `create table if not exists`, `add column if not
--      exists`, `drop policy if exists` antes de `create policy`, etc. —
--      correr una migración ya aplicada por error no debería romper nada,
--      pero igual conviene ir de una en una y revisar el resultado).
--   3. Volver a correr este script para confirmar que ahora da `true`.
--
-- Si necesitás que se aplique el fix de una migración faltante y no tenés
-- vos las credenciales de prod en la sesión con Claude Code, pegá acá el
-- resultado de la Query 2 (o de las 3) para que se pueda diagnosticar qué
-- falta aplicar.

-- ───────────────────────────────────────────────────────────────────────
-- QUERY 1 — Lo que el CLI de Supabase tiene trackeado (si se usó
-- `supabase db push` / `supabase migration up` alguna vez contra este
-- proyecto). OJO: este proyecto históricamente aplicó migraciones pegando
-- el SQL a mano en el dashboard, no siempre vía CLI — así que esta tabla
-- puede estar vacía o incompleta aunque la migración SÍ haya corrido. Es
-- informativa, no la fuente de verdad — la Query 2 (chequeo de artefactos
-- reales de schema) es la que importa.
-- ───────────────────────────────────────────────────────────────────────
select version, name
from supabase_migrations.schema_migrations
order by version;

-- ───────────────────────────────────────────────────────────────────────
-- QUERY 2 — Chequeo real: ¿existe en la base el artefacto de schema
-- (tabla / columna / constraint) que cada migración de
-- `supabase/migrations/` introduce? Esta es la fuente de verdad, funciona
-- sin importar cómo se aplicó la migración (CLI o pegada a mano).
--
-- Migraciones que son solo cambios de policies RLS o de lógica de función
-- (sin tabla/columna/constraint nueva) no tienen un artefacto de schema
-- verificable acá — quedan listadas aparte en la Query 3, con la
-- instrucción de cómo confirmarlas a mano.
-- ───────────────────────────────────────────────────────────────────────
select migracion, aplicada
from (
  values
    ('0001_init.sql', exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'profiles'
    )),
    ('0003_seguimiento.sql', exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'fichas_paciente'
    )),
    ('0004_security_hardening.sql', exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'turnos_restrict_patient_update'
    )),
    ('0005_recursos.sql', exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'recursos_paciente'
    )),
    ('0007_contenido_editable.sql', exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'contenido_sitio'
    )),
    ('0008_turnos_no_solapado.sql', exists (
      select 1 from pg_constraint
      where conname = 'turnos_no_solapado'
    )),
    ('0009_feedback_chat.sql', exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'feedback_mensajes'
    )),
    ('0011_turnos_combo.sql', exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'turnos' and column_name = 'turno_par_id'
    )),
    ('0012_ejercicios.sql', exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'ejercicios'
    )),
    ('0013_plan_dias_descanso.sql', exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'planes' and column_name = 'dias_descanso'
    )),
    ('0016_ejercicios_custom.sql', exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'ejercicios' and column_name = 'origen'
    )),
    ('0017_sesiones_entrenamiento.sql', exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'sesiones_entrenamiento'
    )),
    ('0018_debe_cambiar_password.sql', exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles' and column_name = 'debe_cambiar_password'
    )),
    ('0019_paciente_estado.sql', exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles' and column_name = 'activado_en'
    )),
    ('0022_horarios_no_solapado.sql', exists (
      select 1 from pg_constraint
      where conname = 'horarios_disponibles_no_solapado'
    )),
    ('0023_mediciones_wearable.sql', exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'mediciones_wearable'
    )),
    ('0024_turno_reprogramacion_enum.sql', exists (
      select 1 from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      where t.typname = 'estado_turno' and e.enumlabel = 'pendiente_reprogramacion'
    )),
    ('0029_paciente_gestionado_staff.sql', exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles' and column_name = 'gestionado_por_staff'
    )),
    ('0030_ejercicios_youtube.sql', exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'ejercicios' and column_name = 'youtube_url'
    )),
    ('0031_ejercicios_modo_cardio.sql', exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'ejercicios' and column_name = 'modo'
    )),
    ('0033_profiles_slot_publico.sql', exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles' and column_name = 'slot_publico'
    )),
    ('0034_antropometria_isak.sql', exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'mediciones_antropometricas' and column_name = 'kg_tejido_muscular'
    )),
    ('0035_turno_motivo_cancelacion.sql', exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'turnos' and column_name = 'motivo_cancelacion'
    )),
    ('0036_turno_motivo_reprogramacion.sql', exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'turnos' and column_name = 'motivo_reprogramacion'
    )),
    ('0037_plan_secciones.sql', exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'plan_secciones'
    )),
    ('0038_cifrado_datos_clinicos.sql', exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'fichas_paciente' and column_name = 'dx_medico_enc'
    )),
    ('0039_audit_log.sql', exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'audit_log'
    ))
) as t(migracion, aplicada)
order by migracion;

-- ───────────────────────────────────────────────────────────────────────
-- QUERY 3 — Migraciones SIN artefacto de schema verificable (solo tocan
-- policies RLS o el cuerpo de una función/trigger ya existente). No se
-- pueden chequear con un `exists(...)` genérico porque no agregan nada
-- nuevo al information_schema. Verificación manual sugerida entre
-- paréntesis:
--
--   0002_seed.sql              → datos, no schema. Chequear con
--                                 `select count(*) from public.servicios;`
--                                 (>0 si el seed corrió).
--   0006_invited_role.sql      → relaja el trigger de `profiles` y el
--                                 handle_new_user. Chequear el cuerpo:
--                                 `select prosrc from pg_proc where proname
--                                 = 'handle_new_user';` — debe mencionar
--                                 `invited_at`.
--   0010_contenido_staff.sql   → cambia policies de is_admin() a is_staff().
--                                 Chequear: `select polname, pg_get_expr
--                                 (polqual, polrelid) from pg_policy where
--                                 polrelid = 'public.servicios'::regclass;`
--                                 — debe mencionar `is_staff`, no solo
--                                 `is_admin`.
--   0014_turno_confirmar_paciente.sql
--   0015_turno_trigger_service_role.sql
--                               → ambas reescriben el mismo trigger
--                                 `turnos_restrict_patient_update` (0004 lo
--                                 crea). Chequear la versión vigente:
--                                 `select prosrc from pg_proc where proname
--                                 = 'turnos_restrict_patient_update';` —
--                                 la de 0015 (la más nueva) debe empezar
--                                 con `if auth.uid() is null or
--                                 public.is_staff() then`. Si dice
--                                 `if public.is_staff() then` a secas (sin
--                                 el `auth.uid() is null`), es la versión
--                                 vieja de 0004/0014 y los barridos
--                                 automáticos (no-show, auto-cancelación)
--                                 están rotos en silencio.
--   0020_scope_agenda_por_profesional.sql
--   0021_rls_check_pertenencia.sql
--                               → policies nuevas con scope de ownership.
--                                 Chequear: `select polname, pg_get_expr
--                                 (polwithcheck, polrelid) from pg_policy
--                                 where polrelid =
--                                 'public.horarios_disponibles'::regclass
--                                 and polname = 'horarios staff write';`
--                                 — debe mencionar `profesional_id` (0020),
--                                 y análogamente para `sesiones_entrenamiento`
--                                 / `sets_completados` / `feedback_mensajes`
--                                 (0021, deben mencionar el `exists(select 1
--                                 from ...)` de pertenencia, no solo el
--                                 dueño directo).
--   0025_turno_reprogramacion_trigger.sql
--   0026_turno_motivo_reprogramacion.sql
--   0027_turno_motivo_reprogramacion_fix.sql
--   0028_turno_reprogramacion_revert.sql
--                               → saga completa de un flujo de reprogramación
--                                 que se probó, cambió de diseño a mitad de
--                                 camino y se revirtió (0028 vuelve el
--                                 trigger `turnos_restrict_patient_update` a
--                                 la versión EXACTA de 0015, y borra la
--                                 columna `motivo_reprogramacion` que 0026
--                                 había agregado — no confundir con la
--                                 columna del mismo nombre que reintroduce
--                                 0036, ya consolidada). El único resto vivo
--                                 de 0024-0028 es el valor de enum
--                                 `pendiente_reprogramacion` en
--                                 `estado_turno` (chequeado arriba, en
--                                 Query 2) — inerte, sin código que lo
--                                 escriba. Si el proyecto queda a mitad de
--                                 esta saga (ej. 0026 aplicada pero no 0028),
--                                 el síntoma es que `motivo_reprogramacion`
--                                 existe en `turnos` pero nada en el código
--                                 actual la usa así (el código vigente es el
--                                 de 0036) — chequear con `select prosrc from
--                                 pg_proc where proname =
--                                 'turnos_restrict_patient_update';`: la
--                                 versión final (post-0036) no debe mencionar
--                                 `pendiente_reprogramacion` en ninguna rama,
--                                 solo debe filtrar por
--                                 `motivo_cancelacion`/`motivo_reprogramacion`
--                                 en el bloque de columnas bloqueadas al
--                                 paciente.
--   0032_profiles_update_staff.sql
--                               → relaja UPDATE de `profiles` de is_admin()
--                                 a is_staff(). Chequear: `select polname,
--                                 pg_get_expr(polqual, polrelid) from
--                                 pg_policy where polrelid =
--                                 'public.profiles'::regclass and polcmd =
--                                 'w';` — debe mencionar `is_staff`, no solo
--                                 `is_admin`.
-- ───────────────────────────────────────────────────────────────────────
select 'ver comentario de la Query 3 arriba — sin artefacto de schema chequeable automáticamente' as nota;
