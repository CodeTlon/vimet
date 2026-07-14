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
- **Deploy:** Vercel (auto-deploy on push a `main`). Supabase aparte.

## Origen del proyecto
Migración desde sitio PHP MVC propio (en `client-assets/vimet/vimet/`) que corría sobre Laragon + MySQL. Ver `docs/migration-report.md` para mapeo legacy → nuevo stack.

## Stack
- Next.js 14 (App Router), TypeScript, Tailwind CSS, Shadcn/UI, Lucide React
- Supabase: sí — tablas: `profiles`, `servicios`, `horarios_disponibles`, `turnos`, `bloqueos_horario`, `fichas_paciente`, `mediciones_antropometricas`, `evaluaciones_funcionales`, `planes`, `feedback_semanal`, `feedback_mensajes`, `evolucion_entradas`, `objetivos`, `recursos_paciente`, `contenido_sitio`. Bucket Storage: `planes` (privado, PDFs) + `recursos` (privado, multimedia + adjuntos de feedback) + `sitio` (público, fotos de perfil + contenido).
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
| `app/admin/pacientes/[id]/feedback/page.tsx` | Feedback recibido + chat con el paciente (`FeedbackChat`) |
| `app/admin/pacientes/[id]/evolucion/page.tsx` | Notas timeline (visible/interna) |
| `app/admin/pacientes/[id]/objetivos/page.tsx` | CRUD objetivos por categoría |
| `app/admin/pacientes/[id]/recursos/page.tsx` | CRUD recursos multimedia del paciente (admin) |
| `app/(paciente)/mis-recursos/page.tsx` | Vista de recursos visibles para el paciente |
| `actions/recursos.ts` | CRUD recursos: crear (link/pdf/imagen/video), eliminar, toggle visibilidad |
| `actions/staff.ts` | Server Actions admin: `configurarProfesionalAction` (rol + servicios + horarios), `toggleActivoAction`, `cambiarPasswordAction` |
| `actions/horarios.ts` | Server Actions: `agregarHorarioAction` / `actualizarHorarioAction` / `eliminarHorarioAction` — el profesional gestiona SU propia agenda (profesional_id = usuario logueado). Tras agregar/editar/borrar, `turnosSinCobertura` recalcula qué turnos futuros ya no están contenidos en NINGUNA franja activa del día (no solo la tocada) y `cancelarYNotificar` los cancela, avisa por mail (Resend) y devuelve la lista de afectados (con teléfono) para mostrar en el UI con links de WhatsApp — así editar un horario (ej. correrlo 1 hora) no cancela turnos que el nuevo rango sigue cubriendo |
| `app/admin/configuracion/page.tsx` | Configuración admin: configurar profesional + cambiar contraseña |
| `app/admin/horarios/page.tsx` | "Mis horarios": el profesional logueado edita sus franjas de atención por día |
| `components/horarios-editor.tsx` | Editor de agenda (lista por día + form para agregar/editar/eliminar franjas). El botón de editar precarga el mismo form de abajo en modo edición (mismo patrón que `PlanForm`: action dinámica + `key` por id para remount de `defaultValue`). Al eliminar o editar una franja muestra debajo la lista de turnos cancelados con link de WhatsApp por paciente |
| `lib/supabase/admin.ts` | Cliente Supabase con service role key (bypass RLS, Admin Auth API) |
| `components/seguimiento/recurso-form.tsx` | Form admin para subir/linkear recursos (tipo selector dinámico) |
| `app/api/slots/route.ts` | GET slots disponibles (lo consume el wizard) |
| `components/navbar.tsx` | Navbar pública (transparente en home). `user` es three-state (`undefined` mientras resuelve la sesión client-side, `null` deslogueado) para no mostrar "Ingresar" un instante antes de corregir a "Salir" |
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
| `components/seguimiento/feedback-chat.tsx` | Chat de feedback semanal (paciente izquierda, staff derecha), cada burbuja muestra el nombre del autor (`profiles!feedback_mensajes_autor_id_fkey`, resuelto en el select de las páginas que lo consumen). Solo admite mensajes nuevos mientras `feedback_semanal.semana_inicio` es la semana en curso; solo se puede editar el último mensaje propio del hilo |
| `lib/storage/optimize-image.ts` | `optimizeImage(buf)` — resize + reencode a webp (`sharp`) antes de subir fotos de usuario a Storage (foto de perfil, recursos tipo imagen, adjuntos de feedback) |
| `components/page-header.tsx` | Hero/header genérico de páginas internas |
| `components/whatsapp-fab.tsx` | FAB flotante de WhatsApp en páginas públicas |
| `components/lazy-map.tsx` | Mapa de Google que solo monta el iframe on-click (perf en home/contacto) |
| `components/section-skeleton.tsx` | Skeleton genérico para los `loading.tsx` de paciente/admin |
| `components/seguimiento/use-reset-on-success.ts` | Hooks: `useResetOnSuccess` resetea el form cuando la Server Action devuelve `ok`; `useAutoHideMessage` (4s) oculta el cartel de éxito/error tras un tiempo en vez de dejarlo pegado hasta el próximo submit |
| `app/(paciente)/loading.tsx` · `app/admin/loading.tsx` · `app/admin/pacientes/[id]/loading.tsx` · `app/(public)/loading.tsx` · `app/login/loading.tsx` · `app/registro/loading.tsx` · `app/auth/loading.tsx` | Loading UI (Suspense) al navegar entre secciones. `(public)/loading.tsx` cubre también el wizard `turnos/nuevo` (anidado en el grupo) |
| `components/ui/skeleton.tsx` | Primitivo Skeleton (shadcn/ui, adaptado a los colores directos del proyecto — sin tokens `--muted`) |
| `app/error.tsx` | Error boundary dentro del root layout (navbar/footer siguen en pie) — fallback con marca VIMET |
| `app/global-error.tsx` | Error boundary del root layout mismo — trae su propio `<html>/<body>`, no depende de `next/font` |
| `components/footer.tsx` | Footer + CodeTlonBadge |
| `components/codetlon-badge.tsx` | Badge de marca CodeTlon en footer |
| `components/admin-sidebar.tsx` | Sidebar del admin |
| `lib/seguimiento.ts` | Helpers: scoring funcional, labels, lunesDeSemana, formatFecha |
| `lib/datetime.ts` | Helpers de fecha en zona Argentina (`hoyArgentina`, `horaArgentina`, `lunesDeSemanaArgentina`, `turnoVencidoDesde` para el barrido de no-show) |
| `lib/booking/slots.ts` | Cálculo de slots disponibles (horarios − turnos − bloqueos − filtro de hoy), en bloques de 15 min. `getProfesionalesCombo` resuelve nutricionista + entrenador activos por rol; `getSlotsDisponiblesCombo` intersecta la disponibilidad real de ambos para servicios tipo combo |
| `lib/config/team.ts` | Datos estáticos del equipo + ubicación + redes |
| `lib/config/servicios.ts` | Catálogo estático para la página de servicios pública |
| `lib/supabase/server.ts` | Cliente Supabase server-side |
| `lib/supabase/client.ts` | Cliente Supabase browser |
| `lib/supabase/middleware.ts` | Helper para refresh de session en middleware |
| `lib/supabase/auth-helpers.ts` | `getUserAndProfile` / `requireAuth` / `requireStaff` |
| `middleware.ts` | Auth middleware: protege /mis-*, /feedback-semanal, /turnos/*, /admin/* |
| `actions/auth.ts` | Server Actions: login, register, logout, nuevaContrasena, recuperarContrasena |
| `actions/turnos.ts` | Server Actions: crear, cancelar, actualizar estado. Para servicio tipo combo, `crearTurnoAction` inserta un turno por profesional vinculados vía `turno_par_id`; `cancelarTurnoAction` y `actualizarTurnoStaffAction` propagan el cambio al turno vinculado (esta última con cliente admin, porque RLS no deja a un profesional escribir el turno del otro). `marcarNoAsistioVencidos` — barrido perezoso (sin cron) que pasa a `no_asistio` los turnos `pendiente` cuyo horario + 15min de gracia ya pasó; se llama al principio de las páginas que listan/muestran turnos (mis-turnos, admin dashboard/calendario/turno detalle) |
| `actions/contacto.ts` | Server Action: enviar email contacto |
| `actions/ficha.ts` | Upsert de ficha clínica |
| `actions/mediciones.ts` | CRUD mediciones antropométricas (crear + editar in-place) |
| `actions/evaluaciones.ts` | CRUD evaluaciones funcionales (crear + editar in-place), carga limitada a las últimas 2 semanas |
| `components/seguimiento/mediciones-panel.tsx` | Panel client: lista de mediciones + edición inline (botón Pencil) + mensaje de eliminar con auto-hide |
| `components/seguimiento/evaluaciones-panel.tsx` | Panel client: lista de evaluaciones + edición inline (botón Pencil) + mensaje de eliminar con auto-hide |
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
| `supabase/migrations/0007_contenido_editable.sql` | Tabla `contenido_sitio` singleton (RLS admin-write/public-read) + columnas de perfil público en `profiles` + bucket `sitio` |
| `supabase/migrations/0008_turnos_no_solapado.sql` | Exclusion constraint (`btree_gist` + `tsrange`) que impide dos turnos activos solapados del mismo profesional a nivel Postgres |
| `supabase/migrations/0009_feedback_chat.sql` | Tabla `feedback_mensajes` (hilo de chat del feedback semanal) + RLS |
| `supabase/migrations/0010_contenido_staff.sql` | Relaja las policies de `servicios`, `contenido_sitio` y el bucket `sitio` de `is_admin()` a `is_staff()` — cualquier staff (no solo admin) administra servicios, ubicación, metodología y perfiles públicos |
| `supabase/migrations/0011_turnos_combo.sql` | `turnos.turno_par_id` (FK a `turnos.id`) vincula el par de turnos que genera una reserva de servicio combo, uno por profesional |
| `emails/contacto.tsx` | Template Resend del formulario contacto |

## Base de Datos (Supabase)
| Tabla | Campos relevantes | RLS |
|-------|-------------------|-----|
| `profiles` | id (=auth.users.id), nombre, apellido, telefono, rol | select propio + admin all |
| `servicios` | id, nombre, descripcion, duracion_minutos, tipo, icono, profesional_id | select público |
| `horarios_disponibles` | id, profesional_id, dia_semana, hora_inicio, hora_fin, modalidad | select público |
| `turnos` | id, paciente_id, profesional_id, servicio_id, fecha, hora_inicio, hora_fin, modalidad, estado, notas_paciente, notas_profesional, turno_par_id | paciente ve sus propios + profesional ve los suyos + admin all |
| `bloqueos_horario` | id, profesional_id, fecha_inicio, fecha_fin, motivo | select público |
| `fichas_paciente` | 1:1 con paciente — datos personales, hábitos, salud, lab, motivos | paciente lee la suya + staff todo |
| `mediciones_antropometricas` | histórico: peso, talla, IMC (calculado), %grasa, %músc, kg grasa/músc, dx | paciente lee + staff escribe |
| `evaluaciones_funcionales` | 8 tests (4×10 + 1×10 + 2×15 + 1×20 = 100) + `puntaje_total` generated | paciente lee + staff escribe |
| `planes` | tipo (nutri/entreno/combo), título, estado, fecha_desde/hasta, archivo_path, campos estructurados nutri + entreno | paciente lee los suyos + staff escribe |
| `feedback_semanal` | unique(paciente,semana_inicio): estado físico, ánimo, energía, adherencias, peso. `dudas`/`respuesta_profesional`/`respondido_*` quedan legacy (el Q&A nuevo vive en `feedback_mensajes`) | paciente CRUD propio + staff lee/responde |
| `feedback_mensajes` | Chat de la semana: `feedback_id`, `autor_id`, `contenido`, `created_at`, `edited_at`. Solo se escribe mientras `feedback_semanal.semana_inicio` es la semana actual (chequeo en la Server Action, no en RLS); solo se edita el último mensaje propio | select/insert propio o staff (ownership vía `feedback_semanal`); update solo `autor_id = auth.uid()` |
| `evolucion_entradas` | timeline: origen, tipo, contenido, `visible_paciente` | staff CRUD + paciente lee solo las visibles |
| `objetivos` | categoría (5), descripción, estado (4), fecha_objetivo | paciente lee + staff escribe |
| `recursos_paciente` | tipo (link/pdf/imagen/video), categoria (5), titulo, descripcion, url, storage_path, `visible_paciente`, plan_id | staff CRUD + paciente lee solo los visibles |

**Roles** (campo `rol` en `profiles`): `paciente` (default), `nutricionista`, `entrenador`, `admin`. `admin` ya no es un nivel de permiso distinto para el contenido del sitio: desde la migración `0010`, cualquier staff (`nutricionista`/`entrenador`/`admin`, vía `is_staff()`) puede crear/editar servicios, ubicación, metodología y perfiles públicos — `admin` sigue siendo el único que puede reasignar el `rol` de otro usuario (trigger de `0006`, sigue en `is_admin()`).
**Trigger:** `on_auth_user_created` → inserta fila en `profiles`. Rol por defecto `paciente`; si el usuario fue **invitado** (`auth.users.invited_at` no null) y trae `rol` válido en `user_metadata`, respeta ese rol (registro público siempre cae en `paciente`). El dashboard de Supabase no expone metadata al invitar → para staff, invitar y luego setear `rol` en `profiles` desde el Table/SQL editor.
**Storage bucket** `planes` (privado): paths `{paciente_id}/{filename}`. Staff todo, paciente solo lee su propia carpeta. Acceso vía signed URL (5 min TTL).
**Storage bucket** `recursos` (privado): paths `{paciente_id}/r/{ts}_{file}` (staff) y `{paciente_id}/f/{semana}_{ts}_{file}` (adjuntos de feedback, subidos por el paciente). Signed URLs con TTL 1 hora. Paciente puede insertar/borrar solo en subcarpeta `f/`; staff full access.
**`feedback_semanal.adjunto_path`**: columna opcional (text) para el archivo que el paciente adjunta a su feedback semanal. Se sube al bucket `recursos` desde `enviarFeedbackAction`. Al re-subir se borra el anterior del bucket antes de sobrescribir la columna.
**Storage bucket** `sitio` (público): paths `staff/{profileId}/{ts}.webp`. `actualizarPerfilPublicoAction` borra la foto de perfil anterior del bucket al reemplazarla (parsea el path desde la `foto_url` guardada).
**Optimización de imágenes**: toda foto que sube un usuario (foto de perfil, recursos tipo imagen, adjuntos de feedback que sean imagen) pasa por `optimizeImage()` (`lib/storage/optimize-image.ts`, `sharp`) antes de ir a Storage — resize a max 1600px + reencode a webp calidad 80. Video de recursos NO se transcodifica server-side (sin ffmpeg en el proyecto) — solo se bajó el tope de subida a 40MB.

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
- ⚠️ **Migración `0011_turnos_combo.sql` pendiente de aplicar a mano en el proyecto Supabase real** (a fecha 2026-07-14). El repo la tiene commiteada desde v0.10.0 pero nadie la corrió contra la base — verificado con una query directa (`42703 column turnos.turno_par_id does not exist`). Mientras siga así, todo `/admin/turno/[id]` da 404. Si en algún momento el detalle de turno vuelve a 404 sin razón aparente, lo primero a chequear es si esta migración (o cualquier migración más nueva) sigue sin aplicarse — el código asume que las migraciones de `supabase/migrations/` están sincronizadas con la base, y no hay CI que lo garantice.
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
- `app/auth/callback/route.ts`: el query param `next` pasa por `safeNextPath()` antes de redirigir — solo acepta paths relativos internos (`/algo`), nunca una URL absoluta. Si se toca este route handler, no volver a hacer `new URL(next, origin)` directo con el param crudo (era un open redirect).
- `lib/supabase/server.ts` → `createClient()` es **async** y hace `await cookies()` (forma soportada por Next 15). No volver a leer `cookies()` de forma sincrónica con el cast `UnsafeUnwrappedCookies` (quedó de un codemod viejo de la migración a Next 15 y causó un crash real de Server Action — no un simple warning — en confirmar/cancelar/crear turnos). Todo call site server-side debe hacer `await createClient()`; los 3 call sites de *browser* (`lib/supabase/client.ts`, sincrónico) — `navbar.tsx`, `logout-button.tsx`, `auth/confirmar/page.tsx` — no aplican.

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
| 2026-07-14 | fix/turnos-badge-noshow-chat | v0.11.0 — No-show automático: `marcarNoAsistioVencidos()` en `actions/turnos.ts` (barrido perezoso, sin cron) pasa a `no_asistio` los turnos `pendiente` cuyo horario + 15min de gracia ya pasó (`turnoVencidoDesde()` nuevo en `lib/datetime.ts`); se llama al principio de mis-turnos, admin dashboard, admin calendario y admin turno detalle — si nadie visita esas pantallas el turno no cambia de estado hasta que alguien entre (trade-off aceptado a cambio de no sumar infraestructura de cron). Chat de feedback: `feedback-chat.tsx` ahora muestra el nombre del autor arriba de cada burbuja, resuelto vía `profiles!feedback_mensajes_autor_id_fkey(nombre, apellido)` en el select de `feedback-semanal/page.tsx` y `admin/pacientes/[id]/feedback/page.tsx` (antes solo alineaba izquierda/derecha por rol, sin identificar quién escribió si había más de un miembro de staff). Home: sacada la etiqueta de tipo (Nutrición/Entrenamiento/Plan Integral) de las cards de "Nuestros servicios" (`app/(public)/page.tsx`) — esas cards nunca mostraron duración tampoco, así que quedan solo con ícono/nombre/descripción; no toca `/servicios`, que es una implementación separada con su propio `TIPO_LABEL`. **Bug crítico diagnosticado, pendiente de aplicar a mano**: la migración `0011_turnos_combo.sql` (mergeada en v0.10.0) nunca corrió contra el proyecto Supabase real — confirmado con una query directa (`42703 column turnos.turno_par_id does not exist`). Mientras no se aplique, **cualquier** visita a `/admin/turno/[id]` tira 404 (el select de la página pide `turno_par_id` y falla entero, no solo esa columna), y quedan rotos en silencio la vinculación de turnos combo al crearlos, la cancelación en par y `actualizarTurnoStaffAction` (devuelve "turno ya cerrado" siempre). `admin/turno/[id]/page.tsx` ahora loguea el `error` real del select antes del `notFound()` para que este tipo de drift de schema no vuelva a pasar desapercibido como un 404 mudo. |
| 2026-07-14 | feat/turnos-combo-y-fixes | v0.10.0 — Servicios combo reservan turno vinculado con ambos profesionales: migración `0011_turnos_combo.sql` (`turnos.turno_par_id`), `getProfesionalesCombo`/`getSlotsDisponiblesCombo` en `lib/booking/slots.ts` intersectan la agenda real de nutricionista y entrenador (antes `servicios.profesional_id` quedaba `null` y solo se chequeaba un profesional), `app/api/slots/route.ts` detecta `tipo=combo` y usa la intersección, `crearTurnoAction` inserta un turno por profesional, `cancelarTurnoAction`/`actualizarTurnoStaffAction` propagan el cambio al par (con cliente admin por RLS), `admin/turno/[id]` muestra badge "Plan integral" + el otro profesional. **Fix crítico**: `lib/supabase/server.ts` usaba el cast síncrono `UnsafeUnwrappedCookies` (residuo del codemod de Next 15) — causaba un crash real de Server Action ('An unexpected response was received from the server') al confirmar/cancelar/completar o crear un turno, no un simple warning; pasa a `await cookies()` en sus ~50 call sites (se excluyen a propósito los 3 call sites del cliente *browser*, sincrónico). Módulo seguimiento: mediciones y evaluaciones funcionales ahora se editan in-place (`actualizarMedicionAction`/`actualizarEvaluacionAction` nuevas, paneles client `mediciones-panel.tsx`/`evaluaciones-panel.tsx` con botón Pencil); `useAutoHideMessage` (4s, en `use-reset-on-success.ts`) reemplaza los carteles de éxito/error que quedaban pegados en pantalla en plan/ficha/objetivo/feedback/recurso/turno/evolución/medición/evaluación-form. Fixes: slots en bloques de 15 min (antes 30 dejaba huecos con turnos de 45), `lib/` sumado al content-scan de Tailwind (badges de estado sin color por purga de clases), objetivos vencidos en rojo, estado de turno capitalizado y centralizado (`ESTADO_TURNO_LABEL`/`BADGE` en `lib/seguimiento.ts`), 2 decimales en % grasa/músculo, `resize-none` en todos los textareas, `heroDarkness` del navbar resincroniza en cada cambio de ruta (deps `pathname`). |
| 2026-07-13 | fix/navbar-auth-horarios-permisos | v0.9.0 — Navbar: `heroDarkness` deja de tener lazy initializer (arrancaba distinto a SSR) y arranca en `0` igual que el servidor; la corrección real del scroll pasa de `useEffect` a `useLayoutEffect` con una llamada síncrona a `onScroll()` al montar, eliminando el hydration mismatch que dejaba el header con fondo blanco pero links en estilo "transparente". `AuthShell` (login/registro): el layout partido pasa de activarse en `lg` a `md`, la imagen lateral varía de 40% (`md:w-2/5`) a 50% (`lg:w-1/2`) en vez de desaparecer en tablet, y la tarjeta del form suma `mx-auto md:mx-0` (le faltaba, por eso quedaba pegada a la izquierda en anchos medianos). Horarios: `actualizarHorarioAction` nueva en `actions/horarios.ts` (mismo patrón crear/editar que `PlanForm`); `cancelarTurnosSinHorario` se generaliza en `turnosSinCobertura` (chequea contra **todas** las franjas activas del día, no solo la tocada) + `cancelarYNotificar`, reusado por `eliminarHorarioAction` y la nueva `actualizarHorarioAction` — editar una franja (ej. correrla 1 hora) ya no cancela turnos que el nuevo rango sigue cubriendo; `horarios-editor.tsx` agrega botón de editar por franja que precarga el form de abajo. Permisos: `actions/contenido.ts` reemplaza el `requireAdmin()` local (exigía `rol==='admin'` exacto) por `requireStaffAction()` (`nutricionista`/`entrenador`/`admin`) en `crearServicioAction`/`actualizarServicioAction`/`toggleServicioActivoAction`/`actualizarUbicacionAction`/`actualizarMetodologiaAction`/`requireSelfOrAdmin` — era la causa del "No autorizado" que veía Avril al crear un servicio pese a que `requireStaff()` ya la dejaba entrar al panel. Migración `0010_contenido_staff.sql` relaja las policies RLS de `servicios`, `contenido_sitio` y el bucket `sitio` de `is_admin()` a `is_staff()` en consecuencia (si no, Supabase igual rechazaba el insert). Favicon: `public/icons/favicon-{light,dark}.svg` — ícono corredor-en-latido recortado del logo, monoline, wireado en `app/layout.tsx` vía `metadata.icons` con `media: '(prefers-color-scheme: …)'` (soporte nativo del browser, sin JS); `app/favicon.ico` sigue de fallback (convención de archivo de Next, no se lista aparte para no duplicar el `<link>`). |
| 2026-07-13 | feat/feedback-chat-y-mejoras | v0.8.0 — Chat de feedback semanal: migración `0009_feedback_chat.sql` (tabla `feedback_mensajes`, RLS ownership vía `feedback_semanal` + `autor_id = auth.uid()` para update), `enviarMensajeFeedbackAction`/`editarMensajeFeedbackAction` en `actions/feedback.ts` (el chequeo de "semana abierta" y "solo el último mensaje" vive en la Server Action, no en RLS), `components/seguimiento/feedback-chat.tsx`. `dudas`/`respuesta_profesional`/`respondido_*` de `feedback_semanal` quedan legacy (se leen para semanas viejas, no se escriben más); se borró `responder-feedback-form.tsx`/`responderFeedbackAction`. Turnos: `cancelarTurnosSinHorario` (`actions/horarios.ts`) ahora devuelve la lista de afectados con teléfono; `eliminarHorarioAction` pasa a `useFormState` y `horarios-editor.tsx` muestra esa lista con links `wa.me`. Navbar: `user` pasa a three-state (`undefined`/`null`/perfil) para no mostrar "Ingresar" antes de resolver la sesión. `lib/storage/optimize-image.ts` (resize + webp vía `sharp`) aplicado a foto de perfil, recursos tipo imagen y adjuntos de feedback; tope de video en `actions/recursos.ts` baja de 100MB a 40MB (sin transcodificación server-side). `actualizarPerfilPublicoAction` borra la foto de perfil anterior del bucket `sitio` al reemplazarla. Colores por tipo de servicio: entrenamiento pasa de `vimet-red` a `info` (azul), combo/integral de `gray-900`/`vimet-tint5` a `success` (verde), reusando los tokens ya definidos en `tailwind.config.ts`. |
| 2026-07-11 | chore/security-headers-loading-states | Baseline de seguridad + perf percibida: `next.config.mjs` agrega `headers()` (X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy, HSTS). Auditoría de RLS sobre las 7 tablas del módulo seguimiento + `turnos`/`profiles`: sin gaps (RLS habilitado + policy por operación en todas, sin IDOR — `cancelarTurnoAction`/`obtenerUrlPlanAction` ya escopeaban por `paciente_id`/`user.id`). Único hallazgo: **open redirect** en `app/auth/callback/route.ts` (`next` param pasaba directo a `new URL(next, origin)`, una URL absoluta pisaba el origin) — fix con allowlist (`safeNextPath`, solo paths relativos). CORS: única API route (`app/api/slots`) no seteaba headers CORS — sin cambios, default same-origin ya es seguro. Progresivo: `components/ui/skeleton.tsx` (shadcn) + `loading.tsx` en `(public)` (incl. wizard turno), `login`, `registro`, `auth` + `app/error.tsx`/`app/global-error.tsx` con fallback de marca. |
| 2026-07-06 | main | v0.6.1 — Hero: clips nuevos (desktop 1280×720/24fps CRF23 5.2MB, mobile 540×960/24fps CRF28 3.3MB) reemplazan `hero-training.mp4`/`hero-training-mobile.mp4` + poster regenerado. Scrim mobile pasa a negro sólido `/90` (antes gradiente lateral, insuficiente porque el texto ocupa todo el ancho en mobile); degradé superior más oscuro/alto en desktop para legibilidad del navbar sobre el nuevo clip. Contenido del hero pasa a vivir dentro de `.container-vimet` (max-w 1280px) en vez de padding propio, para alinear con el resto de las secciones del sitio. |
| 2026-07-04 | feat/hero-video | v0.5.0 — Panel derecho del hero (`app/(public)/page.tsx`) pasa de foto estática a `<video autoPlay muted loop playsInline>`. Clip de 10s (720p, CRF18 libx264, sin audio, faststart, 9MB) en `public/videos/hero-training.mp4` + poster (`public/images/hero/training-video-poster.jpg`) para evitar flash negro mientras carga. |
| 2026-07-05 | main | v0.6.0 — Módulo de contenido editable: migración `0007_contenido_editable.sql` (tabla `contenido_sitio` singleton con RLS admin-write/public-read, columnas de perfil público en `profiles`, bucket `sitio`). `lib/config/contenido.ts` (`getContenidoSitio`/`getProfesionales`, fallback a `lib/config/team.ts` si la DB no tiene fila) + `actions/contenido.ts` (server actions con `requireAdmin`/`requireSelfOrAdmin`). Nuevas pantallas `/admin/contenido/{servicios,metodologia,ubicacion}` (admin) y form de perfil propio en `/admin/configuracion` (self-or-admin) para que Avril y Gero editen su bio/foto/redes. Páginas públicas `contacto`, `metodologia`, `nosotros` ahora leen de `getContenidoSitio`/`getProfesionales` en vez de `lib/config/team.ts` hardcodeado. Hero video: fuente mobile separada (`public/videos/hero-training-mobile.mp4`, 854×480 CRF27, 314KB) servida vía `<source media="(max-width: 767px)">` nativo — evita bajar el clip de 12MB/1080p en celular. `next.config.mjs`: `qualities: [75, 80]` para acotar la salida de `next/image`. |
| 2026-06-21 | fix/remove-header-size-bandaid | v0.4.0 — Quitado el parche `NODE_OPTIONS=--max-http-header-size=65536` de `dev`/`start` (innecesario y **verificado**: sesión de auth ~3-6KB << default 16KB de Node; probado con `next start` sin el flag → cookies hasta 15KB dan 200, 431 recién a ≥16KB; además el flag nunca aplicaba en Vercel, solo en `next start` local). Era cruft sumado junto al `bodySizeLimit:16mb` de uploads en `d246650`. ⚠️ El Supabase **dev** (`qwzlhbecpgysgophpbyf.supabase.co`) ya **no resuelve** (DNS ENOTFOUND) → el e2e no puede correr hasta reapuntar a un dev vivo. |
| 2026-06-14 | chore/next15-upgrade | v0.3.0 — Next 14.2.35→15.5.19 (codemod params Promise + cookies UnsafeUnwrap) + smoke E2E Playwright (`e2e/global-setup.ts` crea staff efímero por service role, `e2e/smoke.spec.ts`). audit 5(4 high)→2 moderate (postcss-en-Next) |
| 2026-05-09 | dev | Bootstrap proyecto + repo CodeTlon/vimet + .claude/ |
| 2026-05-10 | dev | Módulo seguimiento integral: 7 tablas nuevas + bucket `planes` + áreas paciente/admin (ficha, antrop, eval funcional, planes PDF+estructurados, feedback semanal, evolución, objetivos) |
| 2026-05-15 | dev | Fix timezone (`lib/datetime.ts` con `hoyArgentina`/`lunesDeSemanaArgentina`) en dashboards, calendario, booking, slots y forms de seguimiento + slot mínimo de hoy ahora usa hora local Córdoba + cancelar-turno bloquea fechas pasadas + plan update borra PDF previo automáticamente |
| 2026-05-15 | dev | Endurecimiento de seguridad: migración `0004` con triggers que cierran auto-escalación de rol, modificación arbitraria de turnos por el paciente y falsificación de respuesta de feedback. SELECT de profiles ahora requiere sesión. `crearTurnoAction` revalida `fecha >= hoyArgentina()`. Register form valida match de password en cliente. CLAUDE.md actualizado con archivos faltantes. |
| 2026-05-23 | dev | Módulo de recursos multimedia: migración `0005` + bucket `recursos` (privado) + tabla `recursos_paciente` (link/pdf/imagen/video con categoría y visibilidad) + tab "Recursos" en admin + sección "Mis recursos" en área paciente + adjunto opcional en feedback semanal (imagen/PDF, 15 MB, signed URLs 1h). |
| 2026-06-02 | feat/configuracion-staff | `/admin/configuracion`: `configurarProfesionalAction` (asigna rol + linkea servicios/horarios en un paso), `cambiarPasswordAction`, `toggleActivoAction`. Registro deja `activo=false`; admin activa desde listado de pacientes. `lib/supabase/admin.ts` (service role client). |
| 2026-06-02 | feat/invite-flow | Flujo de invitación staff: `app/auth/confirmar/page.tsx` (implicit + PKCE), `app/auth/nueva-contrasena/page.tsx`, `nuevaContrasenaAction`, `app/auth/callback/route.ts`. `components/hash-invite-handler.tsx` detecta `#access_token&type=invite` en cualquier página y llama `setSession` manualmente (@supabase/ssr no procesa hash automático). Layout refactorizado: route group `app/(public)/` con Navbar+Footer; admin y auth sin navbar pública. `app/(paciente)/layout.tsx` incluye ahora Navbar+Footer propio. |
---

## Módulos de la fábrica — consultar en `/cambio` según lo que toques

Estos módulos viven en `codetlon-cloud/.claude/modules/` (desde este repo: `../../codetlon-cloud/.claude/modules/`). NO están copiados acá: leé el que aplique al iniciar una sesión de mantenimiento que toque cada tema.

| Si el `/cambio` toca… | Módulo a leer |
|---|---|
| deps / vulnerabilidades (`npm audit`, actualizar libs, upgrade de major) | `security-maintenance.md` |
| auth / DB / RLS / route handler / form / env / secrets (seguridad de **código**) | `security-owasp.md` |
| UI / componentes / forms / páginas (accesibilidad WCAG, Lighthouse a11y > 90) | `accessibility.md` |
| pipeline / `.github/workflows` / Dockerfile / env vars (CI = gate de calidad) | `ci-cd.md` |
| dejar el proyecto live / incidente en producción (monitoreo) | `observability.md` |

Regla: leer SOLO el módulo que la tarea pide (disciplina de tokens), no todos por las dudas.
