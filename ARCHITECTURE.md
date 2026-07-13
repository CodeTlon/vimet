# ARCHITECTURE — VIMET

Mapa para mantenimiento. **No releas el repo entero**: buscá tu tipo de cambio acá y abrí solo esos archivos. El mapa de archivos completo + DB + quirks vive en `.claude/CLAUDE.md`.

## Stack
**Next.js 14** (App Router) · React 18 · TS · Tailwind · Shadcn/UI · Lucide · Supabase (Postgres + RLS + Auth + Storage) · Resend · Vercel. Migración de un sitio PHP MVC + MySQL. Web app con auth + booking + dashboard admin + módulo de seguimiento de pacientes.

## Route Groups / áreas
- Público: home, nosotros, metodologia, servicios, faq, contacto, login, registro, legales
- `app/(paciente)/` — área paciente (turnos, ficha, progreso, planes, feedback, objetivos, recursos)
- `app/admin/` — dashboard, calendario, turnos, pacientes (ficha/antropometría/eval/planes/feedback/evolución/objetivos/recursos)
- `app/(public)/turnos/nuevo/` — wizard de reserva (dentro del grupo público, fuera del grupo paciente — sin subnav; hereda `(public)/loading.tsx`)
- `app/api/slots/` — Route Handler GET de disponibilidad (lo consume el wizard)

## Para cambios comunes, leé solo esto

| Querés cambiar… | Abrí |
|-----------------|------|
| Cálculo de slots / disponibilidad | `lib/booking/slots.ts` + `app/api/slots/route.ts` |
| Fechas / zona horaria Argentina | `lib/datetime.ts` (`hoyArgentina`, `horaArgentina`, `lunesDeSemanaArgentina`) — **nunca** `new Date().toISOString().slice(0,10)` |
| Crear / cancelar / actualizar turno | `actions/turnos.ts` |
| Auth (login/registro/logout) + gating | `actions/auth.ts` + `lib/supabase/auth-helpers.ts` + `middleware.ts` |
| Módulo seguimiento (ficha, mediciones, eval, planes, feedback, evolución, objetivos, recursos) | `actions/<modulo>.ts` + `components/seguimiento/<form>.tsx` + página admin correspondiente |
| Chat de feedback semanal (mensajes ida y vuelta, se cierra el lunes siguiente) | `actions/feedback.ts` (`enviarMensajeFeedbackAction`/`editarMensajeFeedbackAction`) + `components/seguimiento/feedback-chat.tsx` + tabla `feedback_mensajes` |
| Planes PDF (subida / signed URL) | `actions/planes.ts` (borra PDF previo al reemplazar) + bucket `planes` |
| Recursos multimedia del paciente | `actions/recursos.ts` + bucket `recursos` |
| Horarios de atención del profesional (agregar/editar/eliminar franjas) | `actions/horarios.ts` (`turnosSinCobertura` decide qué turnos se cancelan) + `components/horarios-editor.tsx` |
| Contenido del sitio (servicios, ubicación, metodología, perfil público) — cualquier staff puede editarlo, no solo admin | `actions/contenido.ts` (`requireStaffAction`) |
| Imágenes subidas por usuarios (foto perfil, recursos, adjuntos) | `lib/storage/optimize-image.ts` (resize + webp vía `sharp`) antes de subir |
| Formulario de contacto | `components/contacto-form.tsx` + `actions/contacto.ts` (Resend, sin DB) |
| Catálogo de servicios / equipo (estático) | `lib/config/servicios.ts` / `lib/config/team.ts` |
| Schema / columna / tabla / RLS | **nueva** migración numerada en `supabase/migrations/` (última: `0010_contenido_staff.sql`) |

## Dónde NO meterse sin pensar
- **`lib/datetime.ts`** — el server (Vercel) es UTC; representar "hoy" con UTC corre un día. Usar siempre los helpers AR (server y client).
- **RLS / migración `0004`** — triggers BEFORE UPDATE bloquean que el paciente cambie su rol, modifique turnos arbitrariamente o falsifique respuestas de feedback. `is_staff()` cortocircuita. Si agregás columnas sensibles, sumalas al chequeo.
- **`supabase/migrations/`** — nunca editar una aplicada. Crear nueva (última: `0010`).
- **Storage** buckets `planes` y `recursos` son privados → acceso solo vía signed URL (server actions con verificación de permisos). No exponer paths.
- `crearTurnoAction` revalida `fecha >= hoyArgentina()` server-side (el `min` del input es solo defensa en profundidad).
- IMC se calcula al guardar la medición; `puntaje_total` de eval funcional es columna `GENERATED ... STORED`.

## Patrones clave
- Server Components por defecto; interactivos `'use client'` con `useFormState` de `react-dom`.
- El wizard de reserva hace fetch a `/api/slots` (Route Handler GET), no Server Action.
- Subnav del paciente vive en `app/(paciente)/layout.tsx`.
- Headers de seguridad (`X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS) van centralizados en `next.config.mjs` → `headers()`, no por ruta.
- Redirects post-auth con `next`/`token` en query: siempre pasar por un allowlist de paths relativos (ver `safeNextPath` en `app/auth/callback/route.ts`) — nunca `new URL(paramCrudo, origin)`.
- `error.tsx` (dentro del layout) vs `global-error.tsx` (reemplaza el layout raíz, trae su propio `<html>/<body>`) — ambos con fallback de marca VIMET.
