# CURRENT_STATE — VIMET (web)

Al 2026-09-22, HEAD `dcdb7bf` (`origin/main`, recién sincronizado).

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
