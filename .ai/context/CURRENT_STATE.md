# CURRENT_STATE — VIMET (web)

Al **2026-10-13**. Ramas: `main` = producción (Supabase, `186829d`); `dev` y `test` = `feature/dev1-backend-propio` (`d047bb3`, backend propio); `archive/dev-dokku-2026-07` = la `dev` vieja.

## Backend propio (rama `feature/dev1-backend-propio`, en `dev`/`test`, SIN desplegar a producción)

**Verificado (con evidencia, sandbox sin Docker):**
- `npx tsc --noEmit` y `npm run build` limpios; `npm test`: 43 tests verdes (Vitest + PGlite con las migraciones reales): flujo de auth (registro → confirmar activa → login; hash bcrypt de Supabase; recuperación por código; bearer), invitaciones, IDOR de turnos, matriz de autorización de toda la capa mobile, borrado de paciente, importador con checksum.
- `npm run db:paridad`: esquema Drizzle == esquema final de `supabase/migrations` (columnas, defaults, constraints, índices, enums, triggers), con la única diferencia deliberada de `audit_log` sin FK a `profiles`.
- `npm run lint`: 20 errores preexistentes (`react-hooks/set-state-in-effect`) y 4 warnings; ninguno nuevo.
- La web ya no importa nada de Supabase (`lib/supabase` eliminado, dependencias `@supabase/*` quitadas). Los scripts de mantenimiento usan `pg`.
- `vimet-app` (rama `feature/dev1-backend-propio`, en `dev`/`test` del repo de la app): sin supabase-js; `tsc` con solo 2 errores preexistentes de `components/ui.tsx`.

**NO verificado (requiere infra real):**
- Ejecución contra un Postgres y un MinIO reales (el daemon de Docker no es accesible desde la cuenta dev1); `drizzle-kit migrate` real.
- El importador contra el Supabase de producción (probado solo contra una réplica PGlite del esquema legado), y `copiar-storage.mjs` (no hay objetos hoy).
- Correo real (Resend) de confirmación/recuperación; cookies de Better Auth tras el proxy de Coolify.
- La app mobile en dispositivo (login, recuperación, subida de PDF/imágenes, sesión de entrenamiento).
- Backups a B2 y simulacro de restauración (`scripts/backup/*` solo con `bash -n`).
- Ensayo completo en `test`; el runbook está en `docs/migracion/CORTE.md`.

**Datos de producción medidos (2026-10-13, solo lectura):** 8 usuarios (5 bcrypt, 3 sin contraseña), 28 filas en `public`, 0 datos clínicos, 0 objetos de Storage; faltan en prod las tablas de `0037` (`plan_secciones*`). El corte es barato hoy; conviene antes de que carguen pacientes reales.

## Pendiente (lo ejecuta Mateo o requiere infra)
1. Postgres + MinIO de `test`/`prod` en Coolify; variables de `docs/migracion/ENTORNO.md`.
2. `db:migrate` + `importar.mjs` + pruebas manuales en `test`; luego PR `test` → `main` (lo mergea Mateo).
3. Copiar `docs/workflows/*.yml` a `.github/workflows/` (token de dev1 sin scope `workflow`); reducir `.env.example`.
4. Build de la app en dispositivo contra `test`; forzar update de la app publicada tras el corte.
5. Revocar el token de Supabase compartido en el chat (vencía a las 24 h).

---

# Histórico — 2026-09-22 (producción con Supabase; sigue vigente para `main` hasta el corte)

## Verificado end-to-end (FACT, con evidencia)

- Sitio en producción real, `vimetsalud.com.ar` responde 200 (verificado con `curl`/`nslookup` en esta sesión, independiente de lo ya documentado).
- Sistema de 8 emails transaccionales (confirmar cuenta, recuperar contraseña, invitación de staff, 3 de turnos al profesional, 2 al paciente) — verificados uno por uno en dev el 09/09 tras el fix de dominio Resend.
- Activación automática de cuenta de paciente al confirmar el email (sin paso manual de staff) — v0.25.0, con fallo-cerrado si Supabase no requiere confirmación.
- Restaurado exportar/imprimir plan (se había revertido por accidente en el mismo commit que introdujo el cifrado clínico) — v0.24.0.
- Cifrado AES-256-GCM de `fichas_paciente`/`evolucion_entradas`/`planes.notas`: implementación correcta y todos los call sites de lectura/escritura confirmados uno por uno por auditoría de subagente (ver `KNOWN_ISSUES.md` para lo que NO está verificado de esta misma feature).
- Vigencia de los Quirks históricos de seguridad (triggers RLS `is_staff()`, open redirect corregido, `activado_en`, cliente Supabase async) — reconfirmados contra el código real de HOY, sin discrepancias.

## Arreglado en esta sesión (2026-09-22, ver `KNOWN_ISSUES.md` para el detalle completo)

- `next@16.0.0-16.3.2` → `16.3.5` (RCE crítico) + `sharp` → `^0.35.4` (libheif alto). `npm audit` → 0 vulnerabilidades, build/tsc limpios.
- Gate de `profiles.activo` agregado server-side en `requireMobileUser()` — cubre las 14 rutas `app/api/mobile/*` autenticadas. **Verificado end-to-end contra un dev real** (no solo build): usuario de prueba con `activo=false` → 403; con `activo=true` → pasa el gate.
- Rate limiting agregado a `app/api/mobile/auth/registro` (mismo límite que el registro web).
- Validación de formato (`crearSchema`, movido a `lib/validation/turnos.ts`) agregada a `app/api/mobile/turnos/crear` — antes no validaba nada del body.

Estos 4 fixes están en el working tree / commits locales de esta sesión — **pendientes de deploy a Coolify** hasta que se pusheen y se confirme el mecanismo de deploy (ver `OPEN_QUESTIONS.md`).

## ✅ El hallazgo más grave de esta sesión — resuelto contra prod real

**Producción real (`https://ayjzcxvtylvsjacgjxgh.supabase.co`, confirmado vía API de Coolify) tenía un gap de 14 migraciones** (`0019`, `0024`-`0028`, `0029`-`0036`) — no solo las 6 detectadas en el primer chequeo — respecto al código ya deployado. Las 14 se aplicaron en orden el 2026-09-22 con autorización explícita del usuario, sin errores, y se verificaron funcionalmente contra prod (perfil público de Avril/Gero, listado de pacientes, todas las columnas/policies/enum de las 14). Detalle completo, comando por comando, en `KNOWN_ISSUES.md` #1.

Esto también explica por qué el cifrado clínico y el gap de `plan_secciones` siguen sin ser urgentes (ver abajo): producción tiene apenas 6 `profiles`, 2 pacientes, 1 turno, y **0 filas** en `ejercicios`, `plan_ejercicios`, `mediciones_antropometricas`, `fichas_paciente`, `evolucion_entradas` y `plan_secciones` — el sistema todavía no tuvo uso real más allá de una prueba inicial. Con el gap de migraciones resuelto, el próximo paciente/staff real que use esas features ya no debería toparse con un 500.

## A medias / "wip" declarado por el propio equipo — investigado con datos reales de prod, sin aplicar fix

- **Cifrado clínico + audit log** (commit `6af5db6`): el algoritmo está bien implementado. Verificado por lectura directa contra prod real: **0 filas** en `fichas_paciente`/`evolucion_entradas`/`planes.notas` — no hay backfill pendiente porque no hay dato clínico cargado todavía. Sigue habiendo 2 gaps reales de cara al futuro (`KNOWN_ISSUES.md` #2-#3): `plan_secciones`/`plan_seccion_comidas` fuera del scope de cifrado (y también con 0 filas en prod hoy), y el audit log de lecturas con 1 solo call site en todo el repo. Ninguno es urgente **hoy** por falta de uso real — sí lo será en cuanto el gap de migraciones se resuelva y entre el primer paciente de verdad.
- **Secciones modulares de plan** (v0.22.0): migración aplicada contra dev (y contra prod — 0037 sí está), build/tsc/lint limpios, pero sin pasada manual en el navegador confirmada, y sin datos reales todavía en prod para haberla probado con uso real.

## Sin verificar en esta sesión (UNKNOWN, no ASSUMPTION — no se intentó adivinar)

- Mecanismo exacto de auto-deploy de Coolify (push automático vs. manual) — se confirmó la app/proyecto correctos, no el trigger de deploy en sí.
- Si el código YA deployado en Coolify (no el de esta rama) queda 100% conforme con el nuevo schema — las migraciones están aplicadas, pero no se re-deployó la app en esta sesión.
