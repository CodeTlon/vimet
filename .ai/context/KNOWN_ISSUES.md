# KNOWN_ISSUES — VIMET (web)

Severidad explícita, evidencia con archivo:línea donde aplica, escenario de falla concreto, fix propuesto **sin aplicar**. Generado el 2026-09-22 combinando verificación directa (`npm audit`, DNS/curl, GitHub Apps) y dos auditorías de subagente de solo lectura (cifrado clínico + Quirks; paridad auth web/mobile).

## 🔴 CRÍTICA

### 1. `next@16.0.0-16.3.2` — RCE no autenticado sin parchear
**✅ RESUELTO en esta sesión (2026-09-22).** Bump a `next@16.3.5` (mismo minor, sin salto de major) — resuelve ambos advisories:
- RCE no autenticado en servers hosteados en Windows (GHSA-p293-qw3h-jr36).
- RCE no autenticado en la Image Optimization API cuando se usan archivos AVIF (GHSA-2xp9-vwfh-vxw4) — este no dependía de que el host fuera Windows, aplicaba igual.

Verificado: `npm audit --omit=dev` → 0 vulnerabilidades; `npm run build` y `npx tsc --noEmit` limpios tras el bump. Commit separado (`fix: bump next/sharp — RCE crítico + libheif alto`). Pendiente de deployar a Coolify — el fix está en el código, no en producción hasta el próximo deploy.

### 2. `sharp<0.35.4` — vulnerabilidades altas en libheif
**✅ RESUELTO en esta sesión (2026-09-22).** Bump a `sharp@^0.35.4`. `npm audit` confirma 0 vulnerabilidades tras el cambio. Mismo commit que el fix de Next.js.

## 🟠 ALTA

### 3. Cifrado clínico con scope incompleto — `plan_secciones` queda en texto plano
**FACT, investigado a fondo en esta sesión (no aplicado fix — es delicado, dato de salud real).** Confirmado contra el schema real (`supabase/migrations/0037_plan_secciones.sql`): `plan_secciones.contenido` (text) es el texto libre de una sección `pautas_generales`/`receta` — pautas nutricionales y recetas reales, no metadata. `plan_seccion_comidas.contenido` (text, `not null`) es el contenido real de cada "momento" de comida de un plan. **Esto NO es metadata como título/orden/tipo — es el contenido clínico-nutricional sustantivo del plan de un paciente específico**, con el mismo nivel de sensibilidad que `planes.notas` (que sí se cifra). `actions/plan-secciones.ts` no importa `lib/crypto/clinical.ts` en ningún punto — confirmado que el gap es real y con datos sensibles de verdad, no un tecnicismo.
**Alcance real, no un fix**: extender `lib/crypto/clinical.ts` a `plan_secciones.contenido` y `plan_seccion_comidas.contenido` requiere (a) nueva migración con columnas `_enc`, (b) tocar `actions/plan-secciones.ts` (crear/actualizar), (c) tocar `lib/plan-secciones.ts` (lectura, usado tanto por admin como por `mis-planes/[id]`), (d) decidir si el backfill de esta tabla se suma al script existente o va aparte. Pendiente de decisión — no se tocó código en esta sesión para este punto.

### 4. Audit log de lecturas prácticamente sin implementar
**FACT, confirmado exhaustivamente en esta sesión.** `grep -rln "logAuditView" app actions lib` da exactamente 2 resultados en todo el repo: `lib/audit.ts` (la definición) y `app/admin/pacientes/[id]/ficha/page.tsx` (el único call site). Confirmado además, leyendo cada archivo, que estas 3 pantallas leen campos clínicos cifrados (`readClinicalField`) sin loguear el acceso: `app/admin/pacientes/[id]/page.tsx` (resumen, lee `dx_medico`/`dx_nutricional`), `app/(paciente)/mi-ficha/page.tsx` (lee `dx_medico`/`dx_nutricional`/`medicacion`/`datos_laboratorio`), `app/admin/pacientes/[id]/evolucion/page.tsx` (lee `contenido` de evolución) — y por extensión las otras superficies que Agent A ya había señalado (`mi-progreso`, `admin/.../planes/[planId]`, `mis-planes/[id]`, `planes/[id]/imprimir`).
**Por qué falta (no "se implementó mal", nunca se agregó)**: el patrón (`import logAuditView` + la llamada) se escribió una sola vez, en la página de ficha admin, dentro del mismo commit que introdujo el cifrado (`6af5db6`) — y nunca se replicó a las otras 7 superficies antes de que esa sesión terminara (coherente con el propio mensaje del commit, "sin verificar end-to-end"). Las ESCRITURAS sí quedan cubiertas por triggers de Postgres en 5 tablas, independiente del código de la app — el gap es específico de LECTURAS.
**Fix propuesto (no aplicado)**: extender `logAuditView()` a las 7 superficies que faltan, mismo patrón de 3 líneas que ya existe en `ficha/page.tsx`.

### 5. Backfill de cifrado clínico — existe, sin evidencia de haber corrido
**FACT, confirmado leyendo el script completo en esta sesión.** `scripts/migrar-cifrado-clinico.mjs` **sí se escribió** (no es que "nunca se hizo") — está bien diseñado: dry-run por default, requiere `--apply` explícito, idempotente (solo toca filas con `_enc` null y columna vieja con datos), con un comentario de cabecera que exige (1) confirmar que la migración `0038` ya corrió contra el destino, (2) usar la MISMA `CLINICAL_DATA_ENCRYPTION_KEY` que usa la app en ese entorno, (3) sacar backup antes de correr contra prod. El script de verificación de solo lectura que menciona (`supabase/scripts/verificar_migraciones_aplicadas.sql`) también existe. Lo que falta es evidencia de que alguno de los dos se ejecutó: a diferencia de cada migración anterior del proyecto (`0007` en adelante), que tiene una nota explícita en el Historial de Cambios de `.claude/CLAUDE.md` tipo "aplicada contra el Supabase real/dev durante la sesión", `0038`/`0039` no tienen esa nota, y no hay ningún otro rastro (issue, comentario, changelog) de una corrida real.
**Estado real (UNKNOWN, no verificable sin acceso de lectura autorizado a la DB)**: no se puede afirmar si los datos clínicos históricos (fichas/evoluciones/notas de planes que ya existían antes del commit `6af5db6`) siguen en texto plano hoy. **Fix propuesto (no aplicado)**: correr `verificar_migraciones_aplicadas.sql` (solo lectura) contra dev y prod para saber en qué estado está cada entorno, antes de decidir si hace falta correr el backfill.

### 6. `app/api/mobile/auth/registro` sin rate limiting
**✅ RESUELTO en esta sesión (2026-09-22).** Se agregó `rateLimit('registro:${ip}', 5, 15*60*1000)` (mismo límite y helper que usa `registerAction` del lado web) al inicio de `app/api/mobile/auth/registro/route.ts`. Verificado con `npx tsc --noEmit` + `npm run build` limpios.

### 7. Gate de `profiles.activo` para mobile: solo client-side, nunca server-side
**✅ RESUELTO en esta sesión (2026-09-22), con verificación end-to-end real.** Se agregó el chequeo de `profiles.activo` dentro de `requireMobileUser()` (`lib/supabase/bearer.ts`) — cubre automáticamente las 14 rutas que pasan por ahí (directo o vía `requireMobileStaff`/`requireMobileAdmin`, que llaman a `requireMobileUser` primero); la 15ª (`auth/registro`) no necesita el chequeo porque no pasa por este helper (crea la cuenta, todavía no tiene `activo=true`).

**Verificación real, no solo build/tsc**: se reactivó el proyecto Supabase de dev (estaba pausado, `qwzlhbecpgysgophpbyf` — ver nota abajo), se creó un usuario de prueba real vía Admin API, y se hizo la prueba de dos casos contra el dev server corriendo local:
- `profiles.activo = false` → `POST /api/mobile/turnos/cancelar` con bearer token real → **`403 { error: 'Cuenta pendiente de activación.' }`** (antes del fix hubiera llegado a `cancelarTurno()`).
- `profiles.activo = true` (control positivo, mismo usuario) → mismo request → `400 { error: 'No se pudo cancelar el turno.' }` — pasa el gate y falla más abajo por el id de turno inexistente usado a propósito para la prueba (nunca tocó un turno real), confirmando que el fix no bloquea usuarios activos legítimos.
- Usuario de prueba borrado al final.

**Nota de infraestructura destapada en el camino**: la cuenta de Supabase tiene DOS proyectos, no uno — `vimet-dev` (el de `.env.local`, el que estaba pausado) y otro llamado `vimet` (`ayjzcxvtylvsjacgjxgh`, creado 2026-08-05, `ACTIVE_HEALTHY`, sin ningún `.env*` local apuntándole) que no se tocó ni se identificó en esta sesión — ver `OPEN_QUESTIONS.md`, podría ser el Supabase real de producción (respondería la pregunta abierta de si Coolify comparte DB con dev).

### 8. `turnos/crear` mobile omite la validación de formato que sí tiene el wrapper web
**✅ RESUELTO en esta sesión (2026-09-22).** `crearSchema` se movió de `actions/turnos.ts` a `lib/validation/turnos.ts` (mismo patrón ya usado en el repo para `crearPacienteSchema`, necesario porque un archivo `'use server'` no puede exportar un valor no-función) y se importa desde ambos lados — `app/api/mobile/turnos/crear/route.ts` ahora corre `crearSchema.safeParse(...)` antes de llamar a `crearTurno()`, igual que el wrapper web. Verificado con `npx tsc --noEmit` + `npm run build` limpios.

## 🟡 MEDIA / 🔵 BAJA

### 9. `README.md`/`docs/environments.md` describen un esquema Vercel Preview/Production que no refleja la infra real
**FACT**. `README.md` (raíz) sigue diciendo "Deploy: Vercel + Supabase". `docs/environments.md` describe branch `main`→Production/`dev`→Preview en Vercel — tiene un aviso de "desactualizado (09/09)" agregado, pero el resto del documento no está reescrito. Riesgo real: alguien nuevo en el proyecto sigue esas instrucciones y configura el entorno equivocado. Severidad baja (no es una vulnerabilidad), impacto real si alguien las sigue al pie de la letra.
**Fix propuesto**: reescribir ambos documentos una vez confirmado en Coolify cómo maneja sus propios entornos/ramas (ver `OPEN_QUESTIONS.md`) — no se hizo en esta sesión porque no estaba en el scope de entregables acordado y requiere esa confirmación primero.

### 10. `recursos` (POST) mobile con validación de datos algo más laxa que su equivalente web
**FACT**, severidad baja. `categoria`/`paciente_id`/longitudes sin `enum`/`.uuid()`/tope del lado mobile (sí los tiene el lado web). El permiso (`requireMobileStaff`) y el resto de la lógica (mimetype, tamaño, sniff de PDF/video, optimización de imagen) coinciden exacto. Un valor fuera de rango rompe contra el `CHECK` constraint de la tabla — falla controlada, no es un bypass de permisos.
