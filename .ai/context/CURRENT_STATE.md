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

## A medias / "wip" declarado por el propio equipo — investigado, sin aplicar fix (dato de salud, decisión pendiente del usuario)

- **Cifrado clínico + audit log** (commit `6af5db6`, explícitamente "sin verificar end-to-end"): el algoritmo está bien implementado, pero investigado a fondo en esta sesión confirma 3 gaps reales, no cosméticos — ver `KNOWN_ISSUES.md` #3-#5:
  - `plan_secciones`/`plan_seccion_comidas` contienen dato clínico-nutricional real (no metadata) y quedan sin cifrar.
  - El audit log de lecturas tiene exactamente 1 call site en todo el repo (`grep` exhaustivo) — 7 superficies que leen datos clínicos no lo llaman.
  - El script de backfill (`scripts/migrar-cifrado-clinico.mjs`) existe y está bien hecho, pero no hay evidencia de que se haya corrido contra ningún entorno — estado real de los datos históricos es UNKNOWN.
- **Secciones modulares de plan** (v0.22.0): migración aplicada contra dev, build/tsc/lint limpios, pero el propio Historial de Cambios registra que faltó una pasada manual en el navegador antes de confiar en la feature en producción — no hay evidencia posterior de que esa pasada se haya hecho.

## Nuevo hallazgo de infraestructura (destapado verificando el fix de `activo`)

La cuenta de Supabase tiene un segundo proyecto (`vimet`, `ayjzcxvtylvsjacgjxgh`, `ACTIVE_HEALTHY`, creado 2026-08-05) que ningún `.env*` local referencia y que no se identificó en esta sesión — ver `OPEN_QUESTIONS.md`.

## Sin verificar en esta sesión (UNKNOWN, no ASSUMPTION — no se intentó adivinar)

- Estado real de las migraciones `0038`/`0039` (y su backfill) contra Supabase de prod (el dev SÍ se pudo reactivar y usar en esta sesión, ver arriba).
- Mecanismo exacto de auto-deploy de Coolify (push automático vs. manual).
- Si `RESEND_FROM_EMAIL` en el entorno de Coolify ya quedó con el dominio verificado.
- Qué es el proyecto Supabase `vimet` (`ayjzcxvtylvsjacgjxgh`) — ver hallazgo de infraestructura arriba.
