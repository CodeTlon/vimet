# VIMET — Project Context

> **Contexto de sesión para Claude Code.**
> Al iniciar: leer este archivo + `ARCHITECTURE.md` + `TASKS.md`. Ir directo al cambio (leé SOLO lo que indica ARCHITECTURE.md, no el repo entero).
> Sesión de mantenimiento: `/cambio "<tema>"` abre la rama; cada prompt commitea ahí (sin coautor, sin tocar main); `/cerrar` mergea/pushea/tagea cuando lo pidas.
> Al cerrar: fila(s) en el **Changelog del README.md (raíz)** + fila en Historial de Cambios acá. Si hubo cambios estructurales → editar la sección + ARCHITECTURE.md.

---

## Identidad del Proyecto
- **Cliente:** VIMET — Vida y Metabolismo (Avril Jerushalmi + Gerónimo Gallardo)
- **Tipo:** L3 — Web app con auth + booking + dashboard admin (migración desde stack PHP MVC + MySQL)
- **Generado:** 2026-05-09
- **URL Producción:** pendiente
- **Repo GitHub:** CodeTlon/vimet
- **Deploy:** Vercel + Supabase

## Origen del proyecto
Migración desde sitio PHP MVC propio (en `client-assets/vimet/vimet/`) que corría sobre Laragon + MySQL. Ver `docs/migration-report.md` para mapeo legacy → nuevo stack.

## Stack
- Next.js 14 (App Router), TypeScript, Tailwind CSS, Shadcn/UI, Lucide React
- Supabase: sí — tablas: `profiles`, `servicios`, `horarios_disponibles`, `turnos`, `bloqueos_horario`, `fichas_paciente`, `mediciones_antropometricas`, `evaluaciones_funcionales`, `planes`, `feedback_semanal`, `evolucion_entradas`, `objetivos`, `recursos_paciente`. Bucket Storage: `planes` (privado, PDFs) + `recursos` (privado, multimedia + adjuntos de feedback).
- Resend: sí — solo formulario de contacto público (sin almacenamiento en DB)
- Fuentes: Outfit (headings) + DM Sans (body) — vía `next/font`

## Identidad de Marca
- **Brand:** VIMET — slogan "Nutrición y entrenamiento especializado en alteraciones metabólicas"
- **Ciudad:** Córdoba, Argentina (Instituto VIANETT, Av. Pedro Simón Laplace 5573)
- **Equipo:** Avril (nutricionista) + Gero (entrenador)

## Mapa de Archivos Clave
| Archivo | Rol |
|---------|-----|
| `app/layout.tsx` | Root layout — Navbar, Footer, fuentes, viewport |
| `app/page.tsx` | Home — Hero → Pilares → Servicios → Equipo → CTA → Ubicación |
| `app/nosotros/page.tsx` | Bio detallada de Avril + Gero |
| `app/metodologia/page.tsx` | Pasos + Pilares + ¿A quién va dirigido? |
| `app/servicios/page.tsx` | Catálogo de servicios por tipo (nutrición/entrenamiento/combo) |
| `app/faq/page.tsx` | 10 preguntas frecuentes con accordion |
| `app/contacto/page.tsx` | Form Resend + WhatsApp + ubicación con map |
| `app/(public)/layout.tsx` | Layout páginas públicas: Navbar + Footer |
| `app/login/page.tsx` | Login con Supabase Auth |
| `app/registro/page.tsx` | Registro paciente (signUp) |
| `app/auth/callback/route.ts` | Callback auth: intercambia `code` (PKCE) o `token_hash` (OTP), redirige a `next` |
| `app/auth/confirmar/page.tsx` | Confirma invite via `token_hash` o implicit flow; redirige a nueva-contrasena |
| `app/auth/nueva-contrasena/page.tsx` | Form para crear contraseña (invite + reset) |
| `app/auth/recuperar/page.tsx` | "Olvidé mi contraseña": pide email y dispara `resetPasswordForEmail` |
| `components/hash-invite-handler.tsx` | Client component global: detecta hash invite/recovery y llama `setSession` + redirige |
| `app/terminos/page.tsx` | Términos de servicio |
| `app/privacidad/page.tsx` | Política de privacidad |
| `app/(paciente)/layout.tsx` | Layout área paciente: auth gating + subnav |
| `app/(paciente)/mis-turnos/page.tsx` | Lista de turnos del paciente con cancelar |
| `app/(paciente)/mi-ficha/page.tsx` | Ficha clínica del paciente (read-only) |
| `app/(paciente)/mi-progreso/page.tsx` | Mediciones + condición física + notas visibles |
| `app/(paciente)/mis-planes/page.tsx` | Listado de planes con descarga PDF |
| `app/(paciente)/mis-planes/[id]/page.tsx` | Detalle de un plan (PDF + campos estructurados) |
| `app/(paciente)/feedback-semanal/page.tsx` | Form semanal + histórico con respuestas |
| `app/(paciente)/mis-objetivos/page.tsx` | Objetivos por categoría agrupados por estado |
| `app/turnos/nuevo/page.tsx` | Wizard reservar turno (fuera del grupo paciente) |
| `app/admin/dashboard/page.tsx` | KPIs + turnos hoy + próximos |
| `app/admin/calendario/page.tsx` | Vista mensual con turnos |
| `app/admin/turno/[id]/page.tsx` | Detalle + cambiar estado/notas |
| `app/admin/pacientes/page.tsx` | Listado de pacientes |
| `app/admin/pacientes/[id]/layout.tsx` | Layout paciente con tabs (8 secciones) |
| `app/admin/pacientes/[id]/page.tsx` | Resumen del paciente (cards) |
| `app/admin/pacientes/[id]/ficha/page.tsx` | Editor de ficha clínica |
| `app/admin/pacientes/[id]/antropometria/page.tsx` | Mediciones + gráficos de evolución |
| `app/admin/pacientes/[id]/evaluacion-funcional/page.tsx` | Tests + score + categoría |
| `app/admin/pacientes/[id]/planes/* ` | CRUD planes (PDF + campos estructurados) |
| `app/admin/pacientes/[id]/feedback/page.tsx` | Feedback recibido + responder dudas |
| `app/admin/pacientes/[id]/evolucion/page.tsx` | Notas timeline (visible/interna) |
| `app/admin/pacientes/[id]/objetivos/page.tsx` | CRUD objetivos por categoría |
| `app/admin/pacientes/[id]/recursos/page.tsx` | CRUD recursos multimedia del paciente (admin) |
| `app/(paciente)/mis-recursos/page.tsx` | Vista de recursos visibles para el paciente |
| `actions/recursos.ts` | CRUD recursos: crear (link/pdf/imagen/video), eliminar, toggle visibilidad |
| `actions/staff.ts` | Server Actions admin: `configurarProfesionalAction` (rol + servicios + horarios), `toggleActivoAction`, `cambiarPasswordAction` |
| `actions/horarios.ts` | Server Actions: `agregarHorarioAction` / `eliminarHorarioAction` — el profesional gestiona SU propia agenda (profesional_id = usuario logueado) |
| `app/admin/configuracion/page.tsx` | Configuración admin: configurar profesional + cambiar contraseña |
| `app/admin/horarios/page.tsx` | "Mis horarios": el profesional logueado edita sus franjas de atención por día |
| `components/horarios-editor.tsx` | Editor de agenda (lista por día + form para agregar/eliminar franjas) |
| `lib/supabase/admin.ts` | Cliente Supabase con service role key (bypass RLS, Admin Auth API) |
| `components/seguimiento/recurso-form.tsx` | Form admin para subir/linkear recursos (tipo selector dinámico) |
| `app/api/slots/route.ts` | GET slots disponibles (lo consume el wizard) |
| `components/navbar.tsx` | Navbar pública (transparente en home) |
| `components/auth-shell.tsx` | Shell visual de las pantallas login/registro |
| `components/login-form.tsx` | Form cliente del login (useFormState) |
| `components/register-form.tsx` | Form cliente del registro (incluye chequeo de password match) |
| `components/booking-wizard.tsx` | Wizard cliente de reserva — consume `/api/slots` |
| `components/contacto-form.tsx` | Form cliente del contacto público (Resend) |
| `components/faq-list.tsx` | Accordion de FAQ |
| `components/turno-detalle-form.tsx` | Form de cambio de estado/notas del turno (admin) |
| `components/paciente-subnav.tsx` | Subnav de tabs del área paciente |
| `components/tabs.tsx` | Tabs underline para admin paciente |
| `components/evolution-chart.tsx` | Gráfico SVG nativo (multi-serie) |
| `components/seguimiento/*.tsx` | Forms del módulo (ficha, medición, eval, plan, feedback, evolución, objetivo) |
| `components/page-header.tsx` | Hero/header genérico de páginas internas |
| `components/whatsapp-fab.tsx` | FAB flotante de WhatsApp en páginas públicas |
| `components/lazy-map.tsx` | Mapa de Google que solo monta el iframe on-click (perf en home/contacto) |
| `components/section-skeleton.tsx` | Skeleton genérico para los `loading.tsx` de paciente/admin |
| `components/seguimiento/use-reset-on-success.ts` | Hook: resetea el form cuando la Server Action devuelve `ok` |
| `app/(paciente)/loading.tsx` · `app/admin/loading.tsx` · `app/admin/pacientes/[id]/loading.tsx` | Loading UI (Suspense) al navegar entre secciones |
| `components/footer.tsx` | Footer + CodeTlonBadge |
| `components/codetlon-badge.tsx` | Badge de marca CodeTlon en footer |
| `components/admin-sidebar.tsx` | Sidebar del admin |
| `lib/seguimiento.ts` | Helpers: scoring funcional, labels, lunesDeSemana, formatFecha |
| `lib/datetime.ts` | Helpers de fecha en zona Argentina (`hoyArgentina`, `horaArgentina`, `lunesDeSemanaArgentina`) |
| `lib/booking/slots.ts` | Cálculo de slots disponibles (horarios − turnos − bloqueos − filtro de hoy) |
| `lib/config/team.ts` | Datos estáticos del equipo + ubicación + redes |
| `lib/config/servicios.ts` | Catálogo estático para la página de servicios pública |
| `lib/supabase/server.ts` | Cliente Supabase server-side |
| `lib/supabase/client.ts` | Cliente Supabase browser |
| `lib/supabase/middleware.ts` | Helper para refresh de session en middleware |
| `lib/supabase/auth-helpers.ts` | `getUserAndProfile` / `requireAuth` / `requireStaff` |
| `middleware.ts` | Auth middleware: protege /mis-*, /feedback-semanal, /turnos/*, /admin/* |
| `actions/auth.ts` | Server Actions: login, register, logout, nuevaContrasena, recuperarContrasena |
| `actions/turnos.ts` | Server Actions: crear, cancelar, actualizar estado |
| `actions/contacto.ts` | Server Action: enviar email contacto |
| `actions/ficha.ts` | Upsert de ficha clínica |
| `actions/mediciones.ts` | CRUD mediciones antropométricas |
| `actions/evaluaciones.ts` | CRUD evaluaciones funcionales |
| `actions/planes.ts` | CRUD planes + Storage (upload/delete + signed URL) |
| `actions/feedback.ts` | Upsert feedback semanal + responder dudas |
| `actions/evolucion.ts` | CRUD entradas de evolución |
| `actions/objetivos.ts` | CRUD objetivos + cambio de estado |
| `supabase/migrations/0001_init.sql` | Schema inicial |
| `supabase/migrations/0002_seed.sql` | Seed servicios + horarios |
| `supabase/migrations/0003_seguimiento.sql` | Tablas seguimiento + RLS + bucket `planes` |
| `supabase/migrations/0004_security_hardening.sql` | Triggers que bloquean cambios sensibles por parte del paciente (rol/activo, fecha/hora del turno, respuesta de feedback) + SELECT de profiles requiere auth |
| `supabase/migrations/0005_recursos.sql` | Tabla `recursos_paciente` + bucket `recursos` + `adjunto_path` en feedback |
| `supabase/migrations/0006_invited_role.sql` | `handle_new_user` respeta `rol` del metadata para invitados (`invited_at`) + relaja trigger de profiles para permitir asignar rol desde service role / SQL editor |
| `emails/contacto.tsx` | Template Resend del formulario contacto |

## Base de Datos (Supabase)
| Tabla | Campos relevantes | RLS |
|-------|-------------------|-----|
| `profiles` | id (=auth.users.id), nombre, apellido, telefono, rol | select propio + admin all |
| `servicios` | id, nombre, descripcion, duracion_minutos, tipo, icono, profesional_id | select público |
| `horarios_disponibles` | id, profesional_id, dia_semana, hora_inicio, hora_fin, modalidad | select público |
| `turnos` | id, paciente_id, profesional_id, servicio_id, fecha, hora_inicio, hora_fin, modalidad, estado, notas_paciente, notas_profesional | paciente ve sus propios + profesional ve los suyos + admin all |
| `bloqueos_horario` | id, profesional_id, fecha_inicio, fecha_fin, motivo | select público |
| `fichas_paciente` | 1:1 con paciente — datos personales, hábitos, salud, lab, motivos | paciente lee la suya + staff todo |
| `mediciones_antropometricas` | histórico: peso, talla, IMC (calculado), %grasa, %músc, kg grasa/músc, dx | paciente lee + staff escribe |
| `evaluaciones_funcionales` | 8 tests (4×10 + 1×10 + 2×15 + 1×20 = 100) + `puntaje_total` generated | paciente lee + staff escribe |
| `planes` | tipo (nutri/entreno/combo), título, estado, fecha_desde/hasta, archivo_path, campos estructurados nutri + entreno | paciente lee los suyos + staff escribe |
| `feedback_semanal` | unique(paciente,semana_inicio): estado físico, ánimo, energía, adherencias, peso, dudas, respuesta profesional | paciente CRUD propio + staff lee/responde |
| `evolucion_entradas` | timeline: origen, tipo, contenido, `visible_paciente` | staff CRUD + paciente lee solo las visibles |
| `objetivos` | categoría (5), descripción, estado (4), fecha_objetivo | paciente lee + staff escribe |
| `recursos_paciente` | tipo (link/pdf/imagen/video), categoria (5), titulo, descripcion, url, storage_path, `visible_paciente`, plan_id | staff CRUD + paciente lee solo los visibles |

**Roles** (campo `rol` en `profiles`): `paciente` (default), `nutricionista`, `entrenador`, `admin`.
**Trigger:** `on_auth_user_created` → inserta fila en `profiles`. Rol por defecto `paciente`; si el usuario fue **invitado** (`auth.users.invited_at` no null) y trae `rol` válido en `user_metadata`, respeta ese rol (registro público siempre cae en `paciente`). El dashboard de Supabase no expone metadata al invitar → para staff, invitar y luego setear `rol` en `profiles` desde el Table/SQL editor.
**Storage bucket** `planes` (privado): paths `{paciente_id}/{filename}`. Staff todo, paciente solo lee su propia carpeta. Acceso vía signed URL (5 min TTL).
**Storage bucket** `recursos` (privado): paths `{paciente_id}/r/{ts}_{file}` (staff) y `{paciente_id}/f/{semana}_{ts}_{file}` (adjuntos de feedback, subidos por el paciente). Signed URLs con TTL 1 hora. Paciente puede insertar/borrar solo en subcarpeta `f/`; staff full access.
**`feedback_semanal.adjunto_path`**: columna opcional (text) para el archivo que el paciente adjunta a su feedback semanal. Se sube al bucket `recursos` desde `enviarFeedbackAction`. Al re-subir se borra el anterior del bucket antes de sobrescribir la columna.

## Variables de Entorno
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
COMPANY_EMAIL=
NEXT_PUBLIC_SITE_URL=
```
Ver `.env.example` para el listado completo.

## Diseño — Decisiones Clave
- **Paleta:**
  - primary `#E8611A` (vimet-orange)
  - accent `#C4391C` (vimet-red, deep)
  - dark `#1A1A1A`
  - gray-900 `#2D2D2D` · gray-700 `#4A4A4A` · gray-500 `#7A7A7A` · gray-300 `#B8B8B8` · gray-100 `#F0F0F0`
  - background `#FAFAFA` · cream `#FFF8F5`
  - gradient `linear-gradient(135deg, #E8611A, #C4391C)` para títulos destacados (`.text-gradient`)
- **Tipografía:** Outfit (headings, weights 400-800) / DM Sans (body, weights 400-700)
- **Border radius:** sm 6px / md 10px / lg 16px / xl 24px / full 9999px
- **Estilo general:** cálido, orgánico, confiable. Hero con imagen llena. Cards generosas. Image bands con título sobre imagen.
- **Iconos:** Lucide React. El proyecto legacy usa FontAwesome (fa-X), mapear cada ícono a su equivalente Lucide al migrar.

## Quirks y Advertencias
- Reglas FOS: Tailwind only (no styled-jsx), `useFormState` de `react-dom`, Server Actions con `(prevState, formData)`, fuentes via `next/font`, viewport separado de metadata, `<Image>` con `sizes`, hero con `priority`.
- Calendario admin: implementación nativa SSR (sin FullCalendar). El legacy usa una grilla simple de divs mes-by-mes con turnos del día.
- El wizard de reservar turno (`/turnos/nuevo`) hace fetch a `/api/slots` desde el cliente — implementar como Route Handler GET, no como Server Action.
- Servicios y horarios son data semi-estática (cambia rara vez) → se cargan server-side directo desde DB sin SWR.
- Telegram no está en el legacy. Notificaciones por email del booking → opcional vía Resend (se evalúa en FASE 6c).
- Map embed: el iframe del legacy apunta a un mapa genérico de Córdoba sin coordenadas exactas. Se mantiene igual.
- Schema MySQL → PostgreSQL: `INT AUTO_INCREMENT` → `BIGINT GENERATED ALWAYS AS IDENTITY`. `ENUM` → `CHECK` constraint o tipo enum nativo. `TINYINT(1)` → `BOOLEAN`. Foreign key a `auth.users` en `profiles.id`.
- Módulo seguimiento: el IMC se calcula al guardar la medición (no como columna generada porque depende de talla y peso conjuntos). El `puntaje_total` de evaluación funcional sí es columna `GENERATED ALWAYS … STORED` (max 100).
- Subnav del paciente vive en `app/(paciente)/layout.tsx`. El wizard de turno está fuera del grupo (`app/turnos/nuevo`) para no heredar el subnav.
- Para abrir un PDF del bucket `planes` se usa `obtenerUrlPlanAction` (server action) que genera signed URL de 5 min y verifica permisos. No exponer paths directamente.
- Excels legacy de origen del módulo: `documentos/FICHA DEL ALUMNO (no cambiar nombre).xlsx`, `documentos/PROYECTO (no cambiar nombre).xlsx`, `documentos/SERVICIO_ ENTRENAMIENTO Y NUTRICIÓN.docx`. Sirven de referencia al modificar el modelo.
- Fechas: **nunca usar `new Date().toISOString().slice(0,10)` para representar "hoy"**, devuelve fecha en UTC y se corre un día cuando son >21:00 en Córdoba (server en Vercel es UTC). Usar siempre `hoyArgentina()` / `lunesDeSemanaArgentina()` de `lib/datetime.ts`. Mismo principio para `lib/booking/slots.ts` al calcular el mínimo de hora de hoy. Aplica server y client.
- Invite flow de Supabase usa implicit flow (hash fragment `#access_token=...&type=invite`). `@supabase/ssr`'s `createBrowserClient` **no** procesa el hash automáticamente — hay que parsear con `URLSearchParams` y llamar `setSession` explícitamente. Ver `components/hash-invite-handler.tsx`. Para PKCE invite (token_hash), ver `app/auth/confirmar/page.tsx`.
- Al actualizar un plan con nuevo PDF: la action borra automáticamente el PDF previo del bucket *después* de subir el nuevo (si falla el upload conservamos el viejo). No hay checkbox de "reemplazar"; cualquier upload reemplaza.
- Endurecimiento de RLS (migración `0004`): además de las policies, hay triggers BEFORE UPDATE que impiden al paciente (a) cambiar su `rol`/`activo` en `profiles`, (b) modificar fecha/hora/profesional/notas del profesional o cambiar `estado` a algo distinto de `cancelado` en `turnos`, (c) falsificar `respuesta_profesional` / `respondido_*` en `feedback_semanal`. `is_staff()` cortocircuita los tres triggers. Si se agregan columnas sensibles nuevas hay que sumarlas explícitamente al chequeo. El trigger de `profiles` (migración `0006`) también cortocircuita cuando `auth.uid()` es null (service role / SQL editor) para permitir asignar rol desde el backend; un paciente por la API siempre tiene `auth.uid()` seteado, así que el bloqueo de auto-escalación sigue intacto.
- `crearTurnoAction` revalida en el servidor que la fecha sea >= hoy en zona Córdoba: el `min` del input es defensa en profundidad, pero no se confía en él.
- `configurarProfesionalAction` (staff): además de asignar rol + linkear servicios, **activa la cuenta** (`activo=true`) y, si el profesional no tiene horarios (setup inicial sin profesional previo del que heredarlos), **siembra una agenda Lun–Vie 09–13/14–18 por defecto**. Sin esto el wizard de reserva no mostraba slots para ninguna fecha. El profesional puede después editar sus franjas desde `/admin/horarios` (cada uno gestiona su propia agenda; `actions/horarios.ts` filtra por `profesional_id = auth.uid()`).
- Pantallas de auth (`AuthShell`): link "Volver al sitio" arriba. El registro bloquea el submit si las contraseñas no coinciden (botón disabled + `onSubmit` preventDefault). `nueva-contrasena` (invite/reset) pide nombre/apellido/teléfono opcionales y `nuevaContrasenaAction` actualiza el perfil solo con los campos cargados.
- Logout (`LogoutButton`): `signOut({ scope: 'local' })` para no esperar el round-trip de revocación global (evita cuelgues con conexión lenta a Supabase).
- Forms de "agregar" del módulo seguimiento usan `useResetOnSuccess(state)` → limpian inputs al guardar. Los de edición (ficha, plan, feedback semanal, responder feedback) no resetean porque muestran datos existentes.

## Comandos Rápidos
```bash
npm run dev          # Dev server
npm run build        # Build producción
npm start            # Serve producción (para Lighthouse)
npx playwright test  # Tests E2E
```

## Historial de Cambios
| Fecha | Rama | Cambio |
|-------|------|--------|
| 2026-06-14 | chore/next15-upgrade | v0.3.0 — Next 14.2.35→15.5.19 (codemod params Promise + cookies UnsafeUnwrap) + smoke E2E Playwright (`e2e/global-setup.ts` crea staff efímero por service role, `e2e/smoke.spec.ts`). audit 5(4 high)→2 moderate (postcss-en-Next) |
| 2026-05-09 | dev | Bootstrap proyecto + repo CodeTlon/vimet + .claude/ |
| 2026-05-10 | dev | Módulo seguimiento integral: 7 tablas nuevas + bucket `planes` + áreas paciente/admin (ficha, antrop, eval funcional, planes PDF+estructurados, feedback semanal, evolución, objetivos) |
| 2026-05-15 | dev | Fix timezone (`lib/datetime.ts` con `hoyArgentina`/`lunesDeSemanaArgentina`) en dashboards, calendario, booking, slots y forms de seguimiento + slot mínimo de hoy ahora usa hora local Córdoba + cancelar-turno bloquea fechas pasadas + plan update borra PDF previo automáticamente |
| 2026-05-15 | dev | Endurecimiento de seguridad: migración `0004` con triggers que cierran auto-escalación de rol, modificación arbitraria de turnos por el paciente y falsificación de respuesta de feedback. SELECT de profiles ahora requiere sesión. `crearTurnoAction` revalida `fecha >= hoyArgentina()`. Register form valida match de password en cliente. CLAUDE.md actualizado con archivos faltantes. |
| 2026-05-23 | dev | Módulo de recursos multimedia: migración `0005` + bucket `recursos` (privado) + tabla `recursos_paciente` (link/pdf/imagen/video con categoría y visibilidad) + tab "Recursos" en admin + sección "Mis recursos" en área paciente + adjunto opcional en feedback semanal (imagen/PDF, 15 MB, signed URLs 1h). |
| 2026-06-02 | feat/configuracion-staff | `/admin/configuracion`: `configurarProfesionalAction` (asigna rol + linkea servicios/horarios en un paso), `cambiarPasswordAction`, `toggleActivoAction`. Registro deja `activo=false`; admin activa desde listado de pacientes. `lib/supabase/admin.ts` (service role client). |
| 2026-06-02 | feat/invite-flow | Flujo de invitación staff: `app/auth/confirmar/page.tsx` (implicit + PKCE), `app/auth/nueva-contrasena/page.tsx`, `nuevaContrasenaAction`, `app/auth/callback/route.ts`. `components/hash-invite-handler.tsx` detecta `#access_token&type=invite` en cualquier página y llama `setSession` manualmente (@supabase/ssr no procesa hash automático). Layout refactorizado: route group `app/(public)/` con Navbar+Footer; admin y auth sin navbar pública. `app/(paciente)/layout.tsx` incluye ahora Navbar+Footer propio. |
