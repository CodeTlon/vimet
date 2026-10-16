# KNOWN_ISSUES — VIMET (web)

## Vigente (2026-10-16)
- `npm audit` completo conserva 5 altas de herramientas de desarrollo: `braces` <= 3.0.3 via `eslint-config-next` -> `fast-glob` -> `micromatch`. Sin version corregida publicada; no entra al runtime (`npm audit --omit=dev` = 0). No usar `npm audit fix --force`.
- Se retiro `overrides.tinypool`: con Vitest 5 ya no hace falta (el audit de runtime sigue en 0). Si reaparece una alta de `tinypool`, reponerlo.
- 20 avisos de lint (`set-state-in-effect`, variables sin uso). Deuda existente.
- El texto de las paginas legales ahora respeta `max-w-3xl` (con Tailwind 3 quedaba mas ancho por el orden entre `container-vimet` y la utilidad).

## Estado tras la migración a backend propio (2026-10-13)

Los items 1-11 de abajo describen producción con Supabase (`main`). En la rama `feature/dev1-backend-propio`:

| # | Tema | Estado en la rama |
|---|---|---|
| 1 | Gap de migraciones aplicadas a mano | **Obsoleto**: el esquema sale de `drizzle/` y se verifica con `npm run db:paridad`. Al corte la base nueva nace completa. |
| 2 | Cifrado clínico sin cubrir `plan_secciones` | **Sigue abierto** (decisión de producto, ver `OPEN_QUESTIONS.md`). Además no se cifran: `fichas_paciente` (lesiones, molestias, suplementación, motivos, hábitos), `feedback_*`, mediciones. |
| 3 | Audit log de lecturas con un solo call site | **Sigue abierto** (`logAuditView` solo en la ficha de admin). El actor de las escrituras ahora sale de `app.user_id` (`conActor`). |
| 4 | Backfill de cifrado | `scripts/migrar-cifrado-clinico.mjs` reescrito con `pg`; las columnas planas siguen existiendo (rollback). Hoy 0 filas clínicas en prod. |
| 5-9 | Next/sharp, rate limit y `activo` mobile, validación de turnos | **Resueltos** y preservados (`requireMobileUser` chequea `activo`; `crearSchema` en `lib/validation/turnos.ts`). |
| 10 | README/`docs/environments.md` hablan de Vercel | README actualizado; `docs/environments.md` sigue desactualizado. |
| 11 | `recursos` mobile con validación laxa | **Resuelto**: web y app comparten `lib/services/recursos.ts` (uuid validado, mismos tipos y tamaños). |

### Nuevos (abiertos)
- **N1 — Sin verificar contra infra real** (Postgres/volumen/correo/dispositivo): ver `CURRENT_STATE.md`. Severidad ALTA para el corte, no para producción actual.
- **N2 — `.env.example` desactualizado** (lista Supabase); está protegido en el sandbox de dev1. Fuente vigente: `docs/migracion/ENTORNO.md`.
- **N3 — Falta cobertura automática de las acciones web y páginas de admin** (la protección es `requireStaff()` + filtros explícitos). Hace falta una pasada manual con un paciente y un staff no admin.
- **N4 — Rate limit en memoria** (`lib/rate-limit.ts`): no se comparte entre instancias; ya era así.
- **N5 — Contraseñas vacías importadas** (invitados que nunca eligieron): quedan sin hash y deben usar "recuperar contraseña".
- **N6 — La app publicada (Supabase directo) deja de funcionar al apagar Supabase**: coordinar update forzado antes de la baja.
- **N7 — Lint**: 20 errores `react-hooks/set-state-in-effect` preexistentes sin limpiar.
Corregidos en la migración (detalle en `docs/migracion/HALLAZGOS.md`): `activarPerfilConfirmado` expuesta como Server Action, reglas con `userId` exportadas desde `'use server'`, desactivación de cuentas del equipo por cualquier staff, ficha/evolución escritas en texto plano por la app, borrado de paciente roto por la FK de `audit_log`.


Severidad explícita, evidencia con archivo:línea donde aplica, escenario de falla concreto, fix propuesto **sin aplicar** salvo que se indique lo contrario. Generado el 2026-09-22 combinando verificación directa (`npm audit`, DNS/curl, GitHub Apps, **API de Coolify**, lectura directa de la DB de producción real) y dos auditorías de subagente de solo lectura (cifrado clínico + Quirks; paridad auth web/mobile).

**Identidad de producción confirmada con evidencia dura (no por inferencia)**: se consultó la API de Coolify (`GET /api/v1/applications/{uuid}/envs` sobre la app `vimet`, `fqdn=https://vimetsalud.com.ar`) — `NEXT_PUBLIC_SUPABASE_URL` real de producción es `https://ayjzcxvtylvsjacgjxgh.supabase.co`. Ya no es una hipótesis por emails de staff: es el valor configurado de verdad. De paso, `RESEND_FROM_EMAIL` en ese mismo entorno ya está en `no-reply@vimetsalud.com.ar` (dominio verificado) — cierra `OPEN_QUESTIONS.md` #4.

## ✅ RESUELTO (era CRÍTICA)

### 1. Gap de migraciones en producción — 14 migraciones de código ya deployado nunca habían corrido contra la DB real
**✅ RESUELTO en esta sesión (2026-09-22), aplicado contra producción con autorización explícita del usuario, verificado con evidencia funcional real.**

**Hallazgo original** (confirmado por lectura directa contra `https://ayjzcxvtylvsjacgjxgh.supabase.co`, identidad confirmada vía Coolify): el chequeo inicial contra una lista curada de 6 migraciones (`0019`, `0029`, `0030`, `0031`, `0033`, `0034`) mostró que ninguna existía en prod, mientras que `0037`-`0039` sí. Un mapeo exhaustivo posterior de **las 18 migraciones entre `0019` y `0036`** (no solo las 6 originales) reveló que la tabla de tracking (`supabase_migrations.schema_migrations`) solo cubre hasta `0018` — de ahí en más, cada migración se aplicó (o no) a mano, de forma irregular:
- **4 ya estaban aplicadas** sin quedar registradas en el tracking (`0020`, `0021`, `0022`, `0023` — RLS de agenda por profesional, fix de 3 policies con gap tipo IDOR, constraint de no-solapamiento de horarios, tabla `mediciones_wearable`).
- **14 realmente faltaban**: `0019`, `0024`, `0025`, `0026`, `0027`, `0028`, `0029`, `0030`, `0031`, `0032`, `0033`, `0034`, `0035`, `0036`.

**Escenario de falla que esto causaba**: confirmación de email → activación automática de cuenta, alta de paciente gestionado por staff, ejercicios con YouTube/cardio, **cualquier staff editando el perfil público de OTRO profesional** (la policy `0032` es la que habilita eso — sin ella solo `is_admin()` podía, pese a que el código ya asume `is_staff()`), antropometría ISAK, y los motivos de cancelación/reprogramación de turnos — todos rompían con 500 (columna/policy/tabla inexistente) apenas alguien real los tocara.

**Fix del backfill de `0033`** (antes de aplicar nada): el `.sql` original buscaba `codetloncordoba+avril@gmail.com`/`+gero@gmail.com` (los emails reales de **dev**) — no existen en prod. Se corrigió el archivo para matchear ambos sets de emails (`IN (...)`, dev y prod), en vez de un swap directo, para no dejar de funcionar si alguna vez se corre de cero contra un dev fresco.

**Aplicación, 14 de 14 sin error, en orden, vía la Management API de Supabase (`POST /v1/projects/{ref}/database/query`, con el access token — scripteado, no pegado a mano en el navegador, mismo mecanismo con el que ya se habían aplicado `0037`-`0039`):**

`0019` → `0024` → `0025` → `0026` → `0027` → `0028` → `0029` → `0030` → `0031` → `0032` → `0033` (corregida) → `0034` → `0035` → `0036`. Cada una devolvió `HTTP 201` y se verificó por separado contra el schema real antes de pasar a la siguiente. La saga `0024`-`0028` (agrega un enum + agrega y revierte una columna, por un cambio de decisión de producto ya documentado en el propio `0028`) se corrió completa para llegar limpio al estado que `0036` espera — el neto es un valor de enum inerte, sin columna extra.

**Verificación funcional post-migración, contra prod real, replicando el código exacto (no datos de prueba nuevos):**
- `slot_publico`: el backfill corregido matcheó de verdad — `avriljerushalmi@vimetsalud.com.ar → 'avril'`, `geronimogallardo@vimetsalud.com.ar → 'gero'` (antes hubiera quedado `null` con el archivo original).
- El `select` exacto de `app/admin/pacientes/page.tsx` (`activado_en`, `gestionado_por_staff`, etc.) corre sin error contra los pacientes reales de prod.
- El `select` exacto de `getProfesionales()` (`lib/config/contenido.ts`, filtro `slot_publico in ('avril','gero')`) devuelve las filas de Avril y Gero con datos reales.
- Columnas/policy/enum de las 14 migraciones confirmadas una por una contra `information_schema`/`pg_policies`/`pg_enum`/`pg_proc` tras aplicar.

**Nada de esto tocó datos de pacientes existentes** más allá del backfill de 2 filas de `slot_publico` (Avril/Gero) — todas las demás tablas afectadas tenían 0 filas al momento de aplicar.

## 🟠 ALTA

### 2. Cifrado clínico con scope incompleto — `plan_secciones` queda en texto plano
**No aplica hoy, con la razón concreta (no "nunca va a aplicar")**: verificado por lectura directa contra prod que `plan_secciones`/`plan_seccion_comidas` **tienen 0 filas** — nadie creó todavía una sección modular de plan en producción real (consistente con el hallazgo #1: casi no hay uso real todavía). Hoy no hay ningún dato clínico en texto plano expuesto en esas tablas, simplemente porque no hay dato.

**Por qué sigue siendo un hallazgo real y no se cierra**: `actions/plan-secciones.ts` no importa `lib/crypto/clinical.ts` en ningún punto — confirmado contra el schema (`supabase/migrations/0037_plan_secciones.sql`) que `plan_secciones.contenido`/`plan_seccion_comidas.contenido` son el texto libre de pautas nutricionales/recetas/comidas reales, mismo nivel de sensibilidad que `planes.notas` (que sí se cifra). **Apenas el gap de migraciones (#1) se resuelva y el sistema empiece a recibir uso real, el primer profesional que cree una sección de plan va a estar guardando dato clínico real sin cifrar** — hay que resolver esto ANTES de que eso pase, no después.
**Alcance de un fix futuro (no aplicado)**: nueva migración con columnas `_enc`, tocar `actions/plan-secciones.ts` (crear/actualizar) y `lib/plan-secciones.ts` (lectura), decidir si el backfill se suma al script existente o va aparte.

### 3. Audit log de lecturas prácticamente sin implementar
**FACT, confirmado exhaustivamente en esta sesión.** `grep -rln "logAuditView" app actions lib` da exactamente 2 resultados en todo el repo: `lib/audit.ts` (la definición) y `app/admin/pacientes/[id]/ficha/page.tsx` (el único call site). Confirmado además, leyendo cada archivo, que estas 3 pantallas leen campos clínicos cifrados (`readClinicalField`) sin loguear el acceso: `app/admin/pacientes/[id]/page.tsx` (resumen, lee `dx_medico`/`dx_nutricional`), `app/(paciente)/mi-ficha/page.tsx` (lee `dx_medico`/`dx_nutricional`/`medicacion`/`datos_laboratorio`), `app/admin/pacientes/[id]/evolucion/page.tsx` (lee `contenido` de evolución) — y por extensión las otras superficies que Agent A ya había señalado (`mi-progreso`, `admin/.../planes/[planId]`, `mis-planes/[id]`, `planes/[id]/imprimir`). Igual que el hallazgo #2: en prod hoy no hay dato clínico real todavía (0 filas en `fichas_paciente`/`evolucion_entradas`/`planes.notas`, ver #4), así que no hay accesos reales sin loguear — pero el gap de implementación es real y hay que resolverlo antes de que haya pacientes de verdad usando el sistema.
**Por qué falta (no "se implementó mal", nunca se agregó)**: el patrón (`import logAuditView` + la llamada) se escribió una sola vez, en la página de ficha admin, dentro del mismo commit que introdujo el cifrado (`6af5db6`) — y nunca se replicó a las otras 7 superficies antes de que esa sesión terminara. Las ESCRITURAS sí quedan cubiertas por triggers de Postgres en 5 tablas, independiente del código de la app.
**Fix propuesto (no aplicado)**: extender `logAuditView()` a las 7 superficies que faltan, mismo patrón de 3 líneas que ya existe en `ficha/page.tsx`.

### 4. Backfill de cifrado clínico — verificado con datos reales: no hace falta hoy, pero por falta de dato, no por haber corrido
**Confirmado por lectura directa (solo lectura) contra ambos entornos, ya no es UNKNOWN:**
- **Producción real** (`ayjzcxvtylvsjacgjxgh`): `fichas_paciente`, `evolucion_entradas.contenido` y `planes.notas` tienen **0 filas con cualquier valor, plano o cifrado**. No hay nada que backfillear porque no hay ficha clínica cargada todavía para ninguno de los 2 pacientes reales que existen hoy.
- **Dev** (`qwzlhbecpgysgophpbyf`): estas mismas columnas están 100% en `_enc` (cero valores en las columnas viejas de texto plano) — pero esto es **inconcluso sobre si el backfill corrió**: la data de dev es de test/smoke, muy probablemente creada DESPUÉS de que el código de cifrado ya existiera, así que nunca tuvo dato viejo que backfillear en primer lugar.
- El script `scripts/migrar-cifrado-clinico.mjs` sigue sin tener evidencia documental de haber corrido nunca (ninguna entrada en el Historial de Cambios, a diferencia de toda migración anterior del proyecto) — pero como no hay dato viejo en ningún lado que necesite backfill, es un punto moot hoy.
**Por qué sigue en la lista, no se cierra**: en cuanto se resuelva el gap de migraciones (#1) y el cifrado (#2) y empiece a entrar dato clínico real a producción, este script es el que hay que tener listo y confirmado para cualquier fila histórica que se acumule antes de una futura extensión del cifrado (ej. a `plan_secciones`). No aplica **hoy**, por ausencia de dato — no es una garantía permanente.

## ✅ RESUELTO EN ESTA SESIÓN (2026-09-22)

### 5. `next@16.0.0-16.3.2` — RCE no autenticado
Bump a `next@16.3.5` (mismo minor). Resuelve GHSA-p293-qw3h-jr36 (Windows-hosted) y GHSA-2xp9-vwfh-vxw4 (Image Optimization API + AVIF, no depende del OS del host). `npm audit --omit=dev` → 0 vulnerabilidades; build/tsc limpios. **Pendiente de deploy a Coolify** — el fix vive en la rama `fix/seguridad-mobile-y-deps`, no en producción hasta el próximo deploy.

### 6. `sharp<0.35.4` — vulnerabilidades altas en libheif
Bump a `sharp@^0.35.4`. Mismo commit que #5.

### 7. `app/api/mobile/auth/registro` sin rate limiting
Se agregó `rateLimit('registro:${ip}', 5, 15*60*1000)` (mismo límite que `registerAction` web) en `app/api/mobile/auth/registro/route.ts`.

### 8. Gate de `profiles.activo` para mobile: era solo client-side
Se agregó el chequeo dentro de `requireMobileUser()` (`lib/supabase/bearer.ts`) — cubre las 14 rutas mobile autenticadas. **Verificado end-to-end real** contra el Supabase de dev (reactivado para la prueba): usuario con `activo=false` → `403`; con `activo=true` (control positivo) → pasa el gate, sin tocar datos reales.

### 9. `turnos/crear` mobile omitía la validación de formato del wrapper web
`crearSchema` movido a `lib/validation/turnos.ts` (mismo patrón que `crearPacienteSchema`) y reusado desde ambos lados.

## 🟡 MEDIA / 🔵 BAJA

### 10. `README.md`/`docs/environments.md` describen un esquema Vercel que no refleja la infra real
`README.md` sigue diciendo "Deploy: Vercel + Supabase"; `docs/environments.md` tiene aviso de desactualizado pero no está reescrito. Ahora que la identidad de Coolify/Supabase de prod está confirmada con evidencia dura (ver el encabezado de este archivo), reescribir estos documentos ya no depende de ninguna confirmación pendiente — queda como trabajo de documentación, no de investigación.

### 11. `recursos` (POST) mobile con validación de datos algo más laxa que su equivalente web
Sin `enum`/`.uuid()`/tope de longitud del lado mobile. Falla controlada contra el `CHECK` de la tabla, no es bypass de permisos.

- **N-lint — Deuda de lint (2026-10-15):** 19 usos de `setState` dentro de `useEffect` (`react-hooks/set-state-in-effect`) en componentes viejos (`booking-wizard`, `reprogramar-turno-form`, `rutina-panel`, `use-reset-on-success`, etc.). La regla pasó de `error` a `warn` en `eslint.config.mjs` para no trabar el CI; refactorizar de a uno y volver a `error`. Severidad baja.
- **N-storage — Archivos de prod sin migrar:** el código lee del volumen; los objetos de producción (hoy en Supabase Storage) se copian con `scripts/migracion/copiar-storage.mjs --apply` en el corte.

## Actualización 2026-10-15
- **Lint:** `react-hooks/set-state-in-effect` pasó de `error` a `warn` en `eslint.config.mjs` (19 usos de `setState` dentro de `useEffect` en componentes viejos: `booking-wizard`, `reprogramar-turno-form`, `rutina-panel`, `use-reset-on-success`, etc.). Refactorizar de a uno y volver a `error`. Severidad baja.
- **Archivos de producción sin migrar:** el código lee del volumen; los objetos de Supabase Storage se copian en el corte con `scripts/migracion/copiar-storage.mjs --apply`.
- **Audit:** `npm audit` solo marca 2 moderadas de herramientas de desarrollo (`esbuild` anidado de `drizzle-kit`, `@vitest/mocker`); el gate de alta/crítica de runtime pasa.
