# Fase 2 - Esquema Drizzle

Estado: hecho y verificado con PGlite (Postgres 17 en WASM, sin Docker). **No se aplico todavia a un Postgres real**
(el daemon de Docker no es accesible desde la sesion de dev1); falta correr `npm run db:migrate` contra el compose local.

## Contenido
| Archivo | Rol |
|---|---|
| `db/schema.ts` | 24 tablas y 14 enums. Columnas en snake_case (las filas conservan la forma que hoy consume el codigo); `numeric` como number; `timestamp`/`date` como string, igual que PostgREST. |
| `drizzle/0000_esquema_base.sql` | Tablas, enums, indices, FK y checks (generado con `drizzle-kit generate`). |
| `drizzle/0001_extras_manuales.sql` | Lo que Drizzle no modela: `btree_gist`, 2 exclusion constraints (turnos y horarios solapados), `set_updated_at()` y `log_audit_change()` con sus triggers. |
| `drizzle.config.ts` | `DATABASE_URL`, por defecto el compose local. |
| `scripts/migracion/paridad-esquema.mjs` | `npm run db:paridad`: reproduce las 39 migraciones de Supabase (con shim) y compara columnas, constraints, indices, enums y triggers contra `drizzle/`. Hoy: **0 diferencias** (303 columnas, 237 constraints, 62 indices). |

## Que se quito a proposito (y a donde va)
| Objeto de Supabase | Destino |
|---|---|
| 60 policies RLS y `enable row level security` | Guards server-side + tests IDOR (Fase 4, ver `inventario.md`) |
| `is_staff()`, `is_admin()`, `current_user_rol()` | `requireStaff()` / `requireAdmin()` |
| Triggers `profiles_block_privilege_self_update`, `turnos_restrict_patient_update`, `feedback_restrict_patient_update` | Validacion en las acciones/rutas (Fase 4): solo admin cambia `rol`/`activo`; el paciente solo cancela/confirma su turno; el paciente no escribe `respuesta_profesional` |
| `handle_new_user` + trigger en `auth.users` | Hook de Better Auth que crea la fila de `profiles` (Fase 3) |
| FK `profiles.id -> auth.users` | Se elimina; Better Auth conserva el UUID como `user.id` (Fase 3) |
| FK `ejercicios.creado_por -> auth.users` | Ahora apunta a `profiles(id)` (`on delete set null`) |
| `log_audit_change` con `auth.uid()` | El actor sale de `set_config('app.user_id', ..., true)` dentro de la transaccion |

## Bugs de `drizzle-kit pull` 0.31.11 encontrados y corregidos a mano
1. `default('')` salia como `default(')` (string vacio).
2. Identidades con `maxValue: 9223372036854775807` (no representable en JS) generaban un `MAXVALUE` fuera de rango.
3. Opclasses cruzadas en indices compuestos (`.op("uuid_ops")` sobre columnas timestamptz).
4. El orden de columnas de un `unique` compuesto no se respeto (`mediciones_wearable`).

## Notas para la Fase 7
- Las columnas `id` son `GENERATED ALWAYS AS IDENTITY`: al importar filas con id explicito usar
  `OVERRIDING SYSTEM VALUE` y despues `setval` de cada secuencia.
- Datos de referencia (`servicios`, `horarios_disponibles`, `contenido_sitio`, roles de Avril y Gero) no se siembran:
  vienen del export de produccion. Sin fila en `contenido_sitio` la app usa el fallback de `lib/config/team.ts`.
- El catalogo `ejercicios` esta vacio en produccion; se carga con `npm run seed:ejercicios` (hoy usa supabase-js, Fase 4).
