# DECISIONS — VIMET (web)

Decisiones de diseño reales con su porqué — no solo "qué se hizo". Extraídas del código y del historial de commits/CLAUDE.md (FACT salvo etiqueta distinta).

**Superficie mobile como rutas API en este mismo repo, no un backend separado.** `../vimet-app` no tiene backend propio — reusa `app/api/mobile/*` de este repo para todo lo que necesita lógica de servidor (slots, turnos combo, uploads con `sharp`, acciones con service role), y llama a Supabase directo para el resto. Evita duplicar reglas de negocio (cálculo de slots, validaciones, triggers) en dos lenguajes/repos. Costo real de esta decisión: cuando una ruta mobile no reusa la función compartida de la Server Action web, hay que sincronizar el chequeo de permisos a mano — y eso ya generó bugs reales (ver `KNOWN_ISSUES.md`).

**`profiles.slot_publico` en vez de matchear por email para identificar "quién es Avril"/"quién es Gero".** El email de las cuentas reales de staff nunca coincidió con el placeholder que usaba `lib/config/team.ts`, así que la búsqueda por email nunca encontraba nada (bug real, no detectado durante meses). Se optó por un identificador explícito en la fila del perfil, desacoplado del email de login — si el email cambia en el futuro no rompe la feature.

**`toggleActivoAction`/gestión de pacientes abierta a cualquier staff, no solo admin.** Reflejando que Avril y Gero operan el día a día del consultorio por igual — `admin` como rol separado solo aplica a la reasignación de roles de otros usuarios (superficie de escalación de privilegios), no a la operación normal.

**Pacientes "gestionados" por staff, con cuenta real en `auth.users` pero sin credenciales comunicadas.** Necesario porque `profiles.id` tiene FK a `auth.users(id)` y todo el resto del modelo (turnos, ficha, planes) depende de esa fila — no había forma de modelar "paciente sin login" sin de todas formas crear el registro de Auth. Password aleatoria, nunca comunicada; si no hay email real se genera uno sintético no enviable.

**Scope del cifrado clínico limitado a `fichas_paciente`, `evolucion_entradas.contenido`, `planes.notas`.** No cubre `plan_secciones` — decisión no documentada explícitamente en ningún commit/comentario (ver `KNOWN_ISSUES.md` #3, es un ASSUMPTION que fue deliberado vs. un olvido).

**Audit log de escrituras vía trigger de Postgres (no vía código de la app).** Garantiza cobertura incluso para deletes en cascada o escrituras hechas con el cliente admin — a costa de que esas escrituras admin queden con `actor_id = null` (no hay `auth.uid()` bajo service role), reduciendo trazabilidad en esos casos puntuales. Decisión documentada explícitamente en el comentario de la migración `0039`.

**Deploy real en Coolify self-hosted, con Vercel como proyecto aparte de preview.** No hay comentario/commit que explique el porqué de mantener ambas plataformas — es un dato de infraestructura, no una decisión de arquitectura de código. Ver `OPEN_QUESTIONS.md` sobre si vale la pena decomisionar Vercel.

**Barridos perezosos en vez de cron** (no-show de turnos, cancelación de pendientes sin confirmar). Se ejecutan cuando alguien visita una pantalla que lista turnos, no en background — trade-off explícito para no sumar infraestructura de cron; el costo es que un turno vencido no cambia de estado hasta que alguien entra a una pantalla relevante.

## Decisiones de la migración a backend propio (2026-10-13)

**Sin RLS: autorización explícita en el servidor, con tests.** La doctrina de la fábrica elige Postgres propio + Drizzle + Better Auth; sin PostgREST no hay RLS, así que cada policy (60 vigentes) se reemplazó por una regla en `lib/data|services` y un test (`docs/migracion/AUTORIZACION.md`). Costo: la corrección depende del código y de los tests, no del motor.

**Servicios compartidos web/mobile (`lib/services/*`), no duplicados.** La paridad de permisos pasa a ser estructural. Un archivo `'use server'` solo exporta `*Action` (todo export es invocable desde el cliente).

**La app mobile usa un catálogo cerrado de operaciones (`POST /api/mobile/data`), no un proxy genérico de tablas.** Más código, pero cada operación declara su `acceso` y se puede auditar/testear. Se descartó un cliente tipo PostgREST en el servidor por superficie de ataque.

**Auth mobile por HTTP plano con token bearer, sin `@better-auth/expo`.** Menos piezas sin probar en dispositivo (la doctrina nota que el cliente Expo no está validado); solo `fetch` + SecureStore.

**Importar hashes bcrypt de Supabase** en vez de forzar un reset masivo: Better Auth acepta un `verify` propio; los nuevos hashes son scrypt.

**`audit_log` sin FK a `profiles`.** El rastro debe sobrevivir al borrado del paciente (con FK, el borrado en cascada fallaba).

**Tests sobre PGlite en vez de Docker.** Corren en cualquier cuenta (VPS, PC, CI) con las migraciones reales; no reemplazan una prueba contra Postgres real.

**Esquema editado a mano, no regenerado con `drizzle-kit pull`** (5 bugs conocidos); `npm run db:paridad` es la red de seguridad.

**Flujo de ramas**: `feature/*` → `dev` (merge directo) → `test` (merge directo) → PR `test` → `main` (lo mergea Mateo). La app (`vimet-app`) usa el mismo flujo.

**`toggleActivoAction` ya no es "cualquier staff sobre cualquiera"**: staff sobre pacientes; solo admin sobre cuentas del equipo (corrige la decisión histórica de arriba, que en la práctica permitía desactivar al admin).

## 2026-10-15 — Estándar de Coolify y video
- **Archivos en volumen servido por `/media`, sin MinIO.** Mismos nombres de bucket y paths que S3 (las columnas `*_path` siguen válidas). Privados por URL firmada HMAC (secreto `MEDIA_SIGNING_SECRET`, o `BETTER_AUTH_SECRET` si falta) con vencimiento; públicos directos. Implementación de referencia de la fábrica (`codetlon-cloud/.claude/modules/coolify-compose.md`).
- **Video de recursos por el servicio global de compresión**, con soft-fail y una sola key (`TRANSCODE_API_KEY`, solo en Coolify). Se corrigió además la ayuda del formulario (decía «máx 100 MB»; el servidor limita a 40 MB).
- **`overrides.tinypool`:** la copia vulnerable llega por el peer opcional de `better-auth`; el override evita subir `vitest` a un major incompatible con ese peer.
