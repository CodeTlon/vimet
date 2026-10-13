# Inventario de migracion Supabase -> backend propio (Fase 0, repo `vimet/`)

Alcance: solo este repo. `vimet-app` (mobile) se inventaria despues. Las secciones entre
marcadores se regeneran con `node scripts/migracion/generar-inventario.mjs`; el resto es manual.

## 1. Policies RLS -> guard server-side -> test IDOR

<!-- BEGIN:policies -->
Sentencias `create policy` en `supabase/migrations`: **71**. Vigentes tras aplicar todos los `drop policy`: **60** (11 fueron reemplazadas por migraciones posteriores).

Resumen por tipo de guard: admin: 2 · dueno-o-staff: 25 · publico: 4 · staff: 19 · dueno: 9 · publico-bucket: 1

> Guard y test IDOR son **sugeridos por heuristica** sobre la expresion SQL; hay que revisarlos uno por uno al implementar la Fase 4. La columna "Estado" se completa a mano (pendiente / guard hecho / test verde).

| # | Tabla / bucket | Policy | Op | Migracion | Expresion (resumida) | Guard server-side | Test IDOR | Estado |
|---|---|---|---|---|---|---|---|---|
| 1 | `public.audit_log` | audit_log admin read | select | 0039_audit_log | `USING public.is_admin()` | requireAdmin() | staff no-admin y paciente reciben 403 al select en audit_log | pendiente |
| 2 | `public.audit_log` | audit_log staff insert propio | insert | 0039_audit_log | `CHECK public.is_staff() and (actor_id = auth.uid() or actor_id is null)` | requireAuth() + (dueno \|\| isStaff) | paciente B no puede insert fila de paciente A en audit_log; staff si | pendiente |
| 3 | `public.bloqueos_horario` | bloqueos read all | select | 0001_init | `USING true` | sin guard (lectura publica) | anonimo puede select en bloqueos_horario; escritura anonima rechazada | pendiente |
| 4 | `public.bloqueos_horario` | bloqueos staff write | all | 0020_scope_agenda_por_profesional | `USING public.is_admin() or (public.is_staff() and profesional_id = auth.uid()) / CHECK public.is_admin() or (…` | requireAuth() + (dueno \|\| isStaff) | paciente B no puede cualquier operacion fila de paciente A en bloqueos_horario; staff si | pendiente |
| 5 | `public.contenido_sitio` | contenido_sitio admin write | all | 0010_contenido_staff | `USING public.is_staff() / CHECK public.is_staff()` | requireStaff() | paciente recibe 403 al cualquier operacion en contenido_sitio | pendiente |
| 6 | `public.contenido_sitio` | contenido_sitio select publico | select | 0007_contenido_editable | `USING true` | sin guard (lectura publica) | anonimo puede select en contenido_sitio; escritura anonima rechazada | pendiente |
| 7 | `public.ejercicios` | ejercicios read auth | select | 0012_ejercicios | `USING auth.uid() is not null` | requireAuth() + filtro de dueno (id/paciente_id = user.id) | paciente B no puede select fila/objeto de paciente A en ejercicios | pendiente |
| 8 | `public.ejercicios` | ejercicios staff write | all | 0012_ejercicios | `USING public.is_staff() / CHECK public.is_staff()` | requireStaff() | paciente recibe 403 al cualquier operacion en ejercicios | pendiente |
| 9 | `public.evaluaciones_funcionales` | evals read | select | 0003_seguimiento | `USING auth.uid() = paciente_id or public.is_staff()` | requireAuth() + (dueno \|\| isStaff) | paciente B no puede select fila de paciente A en evaluaciones_funcionales; staff si | pendiente |
| 10 | `public.evaluaciones_funcionales` | evals staff write | all | 0003_seguimiento | `USING public.is_staff() / CHECK public.is_staff()` | requireStaff() | paciente recibe 403 al cualquier operacion en evaluaciones_funcionales | pendiente |
| 11 | `public.evolucion_entradas` | evolucion paciente read visible | select | 0003_seguimiento | `USING auth.uid() = paciente_id and visible_paciente = true` | requireAuth() + filtro de dueno (id/paciente_id = user.id) | paciente B no puede select fila/objeto de paciente A en evolucion_entradas | pendiente |
| 12 | `public.evolucion_entradas` | evolucion staff all | all | 0003_seguimiento | `USING public.is_staff() / CHECK public.is_staff()` | requireStaff() | paciente recibe 403 al cualquier operacion en evolucion_entradas | pendiente |
| 13 | `public.feedback_mensajes` | feedback_mensajes insert propio o staff | insert | 0009_feedback_chat | `CHECK autor_id = auth.uid() and exists ( select 1 from public.feedback_semanal f where f.id = feedback_id and…` | requireAuth() + (dueno \|\| isStaff) | paciente B no puede insert fila de paciente A en feedback_mensajes; staff si | pendiente |
| 14 | `public.feedback_mensajes` | feedback_mensajes select propio o staff | select | 0009_feedback_chat | `USING exists ( select 1 from public.feedback_semanal f where f.id = feedback_id and (f.paciente_id = auth.uid…` | requireAuth() + (dueno \|\| isStaff) | paciente B no puede select fila de paciente A en feedback_mensajes; staff si | pendiente |
| 15 | `public.feedback_mensajes` | feedback_mensajes update propio | update | 0021_rls_check_pertenencia | `USING autor_id = auth.uid() / CHECK autor_id = auth.uid() and exists ( select 1 from public.feedback_semanal …` | requireAuth() + (dueno \|\| isStaff) | paciente B no puede update fila de paciente A en feedback_mensajes; staff si | pendiente |
| 16 | `public.feedback_semanal` | feedback paciente own insert | insert | 0003_seguimiento | `CHECK auth.uid() = paciente_id` | requireAuth() + filtro de dueno (id/paciente_id = user.id) | paciente B no puede insert fila/objeto de paciente A en feedback_semanal | pendiente |
| 17 | `public.feedback_semanal` | feedback paciente own select | select | 0003_seguimiento | `USING auth.uid() = paciente_id or public.is_staff()` | requireAuth() + (dueno \|\| isStaff) | paciente B no puede select fila de paciente A en feedback_semanal; staff si | pendiente |
| 18 | `public.feedback_semanal` | feedback paciente own update | update | 0003_seguimiento | `USING auth.uid() = paciente_id or public.is_staff() / CHECK auth.uid() = paciente_id or public.is_staff()` | requireAuth() + (dueno \|\| isStaff) | paciente B no puede update fila de paciente A en feedback_semanal; staff si | pendiente |
| 19 | `public.feedback_semanal` | feedback staff delete | delete | 0003_seguimiento | `USING public.is_staff()` | requireStaff() | paciente recibe 403 al delete en feedback_semanal | pendiente |
| 20 | `public.fichas_paciente` | fichas paciente read | select | 0003_seguimiento | `USING auth.uid() = paciente_id or public.is_staff()` | requireAuth() + (dueno \|\| isStaff) | paciente B no puede select fila de paciente A en fichas_paciente; staff si | pendiente |
| 21 | `public.fichas_paciente` | fichas staff write | all | 0003_seguimiento | `USING public.is_staff() / CHECK public.is_staff()` | requireStaff() | paciente recibe 403 al cualquier operacion en fichas_paciente | pendiente |
| 22 | `public.horarios_disponibles` | horarios read all | select | 0001_init | `USING true` | sin guard (lectura publica) | anonimo puede select en horarios_disponibles; escritura anonima rechazada | pendiente |
| 23 | `public.horarios_disponibles` | horarios staff write | all | 0020_scope_agenda_por_profesional | `USING public.is_admin() or (public.is_staff() and profesional_id = auth.uid()) / CHECK public.is_admin() or (…` | requireAuth() + (dueno \|\| isStaff) | paciente B no puede cualquier operacion fila de paciente A en horarios_disponibles; staff si | pendiente |
| 24 | `public.mediciones_antropometricas` | mediciones read | select | 0003_seguimiento | `USING auth.uid() = paciente_id or public.is_staff()` | requireAuth() + (dueno \|\| isStaff) | paciente B no puede select fila de paciente A en mediciones_antropometricas; staff si | pendiente |
| 25 | `public.mediciones_antropometricas` | mediciones staff write | all | 0003_seguimiento | `USING public.is_staff() / CHECK public.is_staff()` | requireStaff() | paciente recibe 403 al cualquier operacion en mediciones_antropometricas | pendiente |
| 26 | `public.mediciones_wearable` | mediciones_wearable paciente rw | all | 0023_mediciones_wearable | `USING paciente_id = auth.uid() or public.is_staff() / CHECK paciente_id = auth.uid() or public.is_staff()` | requireAuth() + (dueno \|\| isStaff) | paciente B no puede cualquier operacion fila de paciente A en mediciones_wearable; staff si | pendiente |
| 27 | `public.objetivos` | objetivos read | select | 0003_seguimiento | `USING auth.uid() = paciente_id or public.is_staff()` | requireAuth() + (dueno \|\| isStaff) | paciente B no puede select fila de paciente A en objetivos; staff si | pendiente |
| 28 | `public.objetivos` | objetivos staff write | all | 0003_seguimiento | `USING public.is_staff() / CHECK public.is_staff()` | requireStaff() | paciente recibe 403 al cualquier operacion en objetivos | pendiente |
| 29 | `public.plan_ejercicios` | plan_ejercicios paciente read | select | 0012_ejercicios | `USING exists ( select 1 from public.planes p where p.id = plan_ejercicios.plan_id and p.paciente_id = auth.ui…` | requireAuth() + (dueno \|\| isStaff) | paciente B no puede select fila de paciente A en plan_ejercicios; staff si | pendiente |
| 30 | `public.plan_ejercicios` | plan_ejercicios staff write | all | 0012_ejercicios | `USING public.is_staff() / CHECK public.is_staff()` | requireStaff() | paciente recibe 403 al cualquier operacion en plan_ejercicios | pendiente |
| 31 | `public.plan_seccion_comidas` | plan_seccion_comidas paciente read | select | 0037_plan_secciones | `USING exists ( select 1 from public.plan_secciones s join public.planes p on p.id = s.plan_id where s.id = pl…` | requireAuth() + (dueno \|\| isStaff) | paciente B no puede select fila de paciente A en plan_seccion_comidas; staff si | pendiente |
| 32 | `public.plan_seccion_comidas` | plan_seccion_comidas staff write | all | 0037_plan_secciones | `USING public.is_staff() / CHECK public.is_staff()` | requireStaff() | paciente recibe 403 al cualquier operacion en plan_seccion_comidas | pendiente |
| 33 | `public.plan_seccion_imagenes` | plan_seccion_imagenes paciente read | select | 0037_plan_secciones | `USING exists ( select 1 from public.plan_secciones s join public.planes p on p.id = s.plan_id where s.id = pl…` | requireAuth() + (dueno \|\| isStaff) | paciente B no puede select fila de paciente A en plan_seccion_imagenes; staff si | pendiente |
| 34 | `public.plan_seccion_imagenes` | plan_seccion_imagenes staff write | all | 0037_plan_secciones | `USING public.is_staff() / CHECK public.is_staff()` | requireStaff() | paciente recibe 403 al cualquier operacion en plan_seccion_imagenes | pendiente |
| 35 | `public.plan_secciones` | plan_secciones paciente read | select | 0037_plan_secciones | `USING exists ( select 1 from public.planes p where p.id = plan_secciones.plan_id and p.paciente_id = auth.uid…` | requireAuth() + (dueno \|\| isStaff) | paciente B no puede select fila de paciente A en plan_secciones; staff si | pendiente |
| 36 | `public.plan_secciones` | plan_secciones staff write | all | 0037_plan_secciones | `USING public.is_staff() / CHECK public.is_staff()` | requireStaff() | paciente recibe 403 al cualquier operacion en plan_secciones | pendiente |
| 37 | `public.planes` | planes read | select | 0003_seguimiento | `USING auth.uid() = paciente_id or public.is_staff()` | requireAuth() + (dueno \|\| isStaff) | paciente B no puede select fila de paciente A en planes; staff si | pendiente |
| 38 | `public.planes` | planes staff write | all | 0003_seguimiento | `USING public.is_staff() / CHECK public.is_staff()` | requireStaff() | paciente recibe 403 al cualquier operacion en planes | pendiente |
| 39 | `public.profiles` | profiles admin all | all | 0001_init | `USING public.is_admin() / CHECK public.is_admin()` | requireAdmin() | staff no-admin y paciente reciben 403 al cualquier operacion en profiles | pendiente |
| 40 | `public.profiles` | profiles select staff public | select | 0004_security_hardening | `USING auth.uid() is not null and ( auth.uid() = id or public.is_staff() or rol in ('nutricionista', 'entrenad…` | requireAuth() + (dueno \|\| isStaff) | paciente B no puede select fila de paciente A en profiles; staff si | pendiente |
| 41 | `public.profiles` | profiles update own | update | 0032_profiles_update_staff | `USING auth.uid() = id or public.is_staff() / CHECK auth.uid() = id or public.is_staff()` | requireAuth() + (dueno \|\| isStaff) | paciente B no puede update fila de paciente A en profiles; staff si | pendiente |
| 42 | `public.recursos_paciente` | recursos paciente read visible | select | 0005_recursos | `USING auth.uid() = paciente_id and visible_paciente = true` | requireAuth() + filtro de dueno (id/paciente_id = user.id) | paciente B no puede select fila/objeto de paciente A en recursos_paciente | pendiente |
| 43 | `public.recursos_paciente` | recursos staff all | all | 0005_recursos | `USING public.is_staff() / CHECK public.is_staff()` | requireStaff() | paciente recibe 403 al cualquier operacion en recursos_paciente | pendiente |
| 44 | `public.servicios` | servicios admin write | all | 0010_contenido_staff | `USING public.is_staff() / CHECK public.is_staff()` | requireStaff() | paciente recibe 403 al cualquier operacion en servicios | pendiente |
| 45 | `public.servicios` | servicios read all | select | 0001_init | `USING true` | sin guard (lectura publica) | anonimo puede select en servicios; escritura anonima rechazada | pendiente |
| 46 | `public.sesiones_entrenamiento` | sesiones_entrenamiento paciente rw | all | 0021_rls_check_pertenencia | `USING paciente_id = auth.uid() or public.is_staff() / CHECK public.is_staff() or ( paciente_id = auth.uid() a…` | requireAuth() + (dueno \|\| isStaff) | paciente B no puede cualquier operacion fila de paciente A en sesiones_entrenamiento; staff si | pendiente |
| 47 | `public.sets_completados` | sets_completados paciente rw | all | 0021_rls_check_pertenencia | `USING exists ( select 1 from public.sesiones_entrenamiento s where s.id = sets_completados.sesion_id and (s.p…` | requireAuth() + (dueno \|\| isStaff) | paciente B no puede cualquier operacion fila de paciente A en sets_completados; staff si | pendiente |
| 48 | `public.turnos` | turnos paciente own insert | insert | 0001_init | `CHECK auth.uid() = paciente_id` | requireAuth() + filtro de dueno (id/paciente_id = user.id) | paciente B no puede insert fila/objeto de paciente A en turnos | pendiente |
| 49 | `public.turnos` | turnos paciente own select | select | 0001_init | `USING auth.uid() = paciente_id or auth.uid() = profesional_id or public.is_admin()` | requireAuth() + (dueno \|\| isStaff) | paciente B no puede select fila de paciente A en turnos; staff si | pendiente |
| 50 | `public.turnos` | turnos paciente own update | update | 0001_init | `USING auth.uid() = paciente_id or auth.uid() = profesional_id or public.is_admin() / CHECK auth.uid() = pacie…` | requireAuth() + (dueno \|\| isStaff) | paciente B no puede update fila de paciente A en turnos; staff si | pendiente |
| 51 | `public.turnos` | turnos staff delete | delete | 0020_scope_agenda_por_profesional | `USING public.is_admin() or (public.is_staff() and profesional_id = auth.uid())` | requireAuth() + (dueno \|\| isStaff) | paciente B no puede delete fila de paciente A en turnos; staff si | pendiente |
| 52 | `storage.objects` | ejercicios media public read | select | 0012_ejercicios | `USING bucket_id = 'ejercicios-media'` | sin guard (objeto publico del bucket) | anonimo lee objeto de storage:ejercicios-media; no puede escribir | pendiente |
| 53 | `storage.objects` | ejercicios media staff write | all | 0012_ejercicios | `USING bucket_id = 'ejercicios-media' and public.is_staff() / CHECK bucket_id = 'ejercicios-media' and public.…` | requireStaff() | paciente recibe 403 al cualquier operacion en storage:ejercicios-media | pendiente |
| 54 | `storage.objects` | planes storage paciente read own | select | 0003_seguimiento | `USING bucket_id = 'planes' and (storage.foldername(name))[1] = auth.uid()::text` | guard de dueno por prefijo de path | paciente B no puede select fila/objeto de paciente A en storage:planes | pendiente |
| 55 | `storage.objects` | planes storage staff all | all | 0003_seguimiento | `USING bucket_id = 'planes' and public.is_staff() / CHECK bucket_id = 'planes' and public.is_staff()` | requireStaff() | paciente recibe 403 al cualquier operacion en storage:planes | pendiente |
| 56 | `storage.objects` | recursos storage paciente feedback delete | delete | 0005_recursos | `USING bucket_id = 'recursos' and (storage.foldername(name))[1] = auth.uid()::text and (storage.foldername(nam…` | guard de dueno por prefijo de path (solo subcarpeta f/) | paciente B no puede delete fila/objeto de paciente A en storage:recursos | pendiente |
| 57 | `storage.objects` | recursos storage paciente feedback insert | insert | 0005_recursos | `CHECK bucket_id = 'recursos' and (storage.foldername(name))[1] = auth.uid()::text and (storage.foldername(nam…` | guard de dueno por prefijo de path (solo subcarpeta f/) | paciente B no puede insert fila/objeto de paciente A en storage:recursos | pendiente |
| 58 | `storage.objects` | recursos storage paciente read | select | 0005_recursos | `USING bucket_id = 'recursos' and (storage.foldername(name))[1] = auth.uid()::text` | guard de dueno por prefijo de path | paciente B no puede select fila/objeto de paciente A en storage:recursos | pendiente |
| 59 | `storage.objects` | recursos storage staff all | all | 0005_recursos | `USING bucket_id = 'recursos' and public.is_staff() / CHECK bucket_id = 'recursos' and public.is_staff()` | requireStaff() | paciente recibe 403 al cualquier operacion en storage:recursos | pendiente |
| 60 | `storage.objects` | sitio storage admin write | all | 0010_contenido_staff | `USING bucket_id = 'sitio' and public.is_staff() / CHECK bucket_id = 'sitio' and public.is_staff()` | requireStaff() | paciente recibe 403 al cualquier operacion en storage:sitio | pendiente |

Policies creadas y reemplazadas despues (ya no vigentes, solo informativo):

- `public.profiles` · profiles select staff public (borrada en 0004_security_hardening)
- `public.servicios` · servicios admin write (borrada en 0010_contenido_staff)
- `public.contenido_sitio` · contenido_sitio admin write (borrada en 0010_contenido_staff)
- `storage.objects` · sitio storage admin write (borrada en 0010_contenido_staff)
- `public.horarios_disponibles` · horarios staff write (borrada en 0020_scope_agenda_por_profesional)
- `public.bloqueos_horario` · bloqueos staff write (borrada en 0020_scope_agenda_por_profesional)
- `public.turnos` · turnos staff delete (borrada en 0020_scope_agenda_por_profesional)
- `public.feedback_mensajes` · feedback_mensajes update propio (borrada en 0021_rls_check_pertenencia)
- `public.sesiones_entrenamiento` · sesiones_entrenamiento paciente rw (borrada en 0021_rls_check_pertenencia)
- `public.sets_completados` · sets_completados paciente rw (borrada en 0021_rls_check_pertenencia)
- `public.profiles` · profiles update own (borrada en 0032_profiles_update_staff)
<!-- END:policies -->

## 2. Huella de `@supabase/*` por capa

<!-- BEGIN:huella -->
Archivos de codigo que referencian `@supabase/*` o `lib/supabase/*`: **89**.

### Por ubicacion

| Ubicacion | Archivos |
|---|---|
| app (paginas/rutas) | 36 |
| actions | 16 |
| api-mobile | 15 |
| lib | 10 |
| scripts | 5 |
| components | 3 |
| api | 2 |
| e2e | 1 |
| raiz/otros | 1 |

### Por capa (un archivo puede estar en mas de una)

<details><summary><b>auth</b> (62)</summary>

- `actions/auth.ts`
- `actions/contenido.ts`
- `actions/ejercicios.ts`
- `actions/evaluaciones.ts`
- `actions/evolucion.ts`
- `actions/feedback.ts`
- `actions/ficha.ts`
- `actions/horarios.ts`
- `actions/mediciones.ts`
- `actions/objetivos.ts`
- `actions/plan-ejercicios.ts`
- `actions/plan-secciones.ts`
- `actions/planes.ts`
- `actions/recursos.ts`
- `actions/staff.ts`
- `actions/turnos.ts`
- `app/(paciente)/feedback-semanal/page.tsx`
- `app/(paciente)/layout.tsx`
- `app/(paciente)/mi-ficha/page.tsx`
- `app/(paciente)/mi-progreso/page.tsx`
- `app/(paciente)/mis-objetivos/page.tsx`
- `app/(paciente)/mis-planes/[id]/page.tsx`
- `app/(paciente)/mis-planes/page.tsx`
- `app/(paciente)/mis-recursos/page.tsx`
- `app/(paciente)/mis-turnos/page.tsx`
- `app/(public)/turnos/nuevo/page.tsx`
- `app/admin/configuracion/page.tsx`
- `app/admin/contenido/layout.tsx`
- `app/admin/ejercicios/page.tsx`
- `app/admin/horarios/page.tsx`
- `app/admin/layout.tsx`
- `app/admin/pacientes/[id]/feedback/page.tsx`
- `app/admin/pacientes/[id]/ficha/page.tsx`
- `app/api/mobile/auth/registro/route.ts`
- `app/api/mobile/horarios/actualizar/route.ts`
- `app/api/mobile/horarios/eliminar/route.ts`
- `app/api/mobile/recursos/route.ts`
- `app/api/mobile/staff/cambiar-password/route.ts`
- `app/api/mobile/staff/configurar-profesional/route.ts`
- `app/api/mobile/staff/crear-paciente/route.ts`
- `app/api/mobile/staff/eliminar-paciente/route.ts`
- `app/api/mobile/staff/toggle-activo/route.ts`
- `app/api/mobile/turnos/cancelar/route.ts`
- `app/api/mobile/turnos/confirmar/route.ts`
- `app/api/mobile/turnos/crear/route.ts`
- `app/api/mobile/turnos/reprogramar/route.ts`
- `app/api/mobile/turnos/staff-actualizar/route.ts`
- `app/api/mobile/turnos/sweep/route.ts`
- `app/auth/callback/route.ts`
- `app/auth/confirmar/page.tsx`
- `app/planes/[id]/imprimir/page.tsx`
- `components/hash-invite-handler.tsx`
- `components/logout-button.tsx`
- `components/navbar.tsx`
- `e2e/global-setup.ts`
- `lib/auth/email-exists.ts`
- `lib/supabase/bearer.ts`
- `lib/supabase/client.ts`
- `lib/supabase/middleware.ts`
- `lib/supabase/server.ts`
- `scripts/migracion/generar-inventario.mjs`
- `scripts/seed-demo-pacientes.mjs`

</details>

<details><summary><b>storage</b> (15)</summary>

- `actions/contenido.ts`
- `actions/ejercicios.ts`
- `actions/feedback.ts`
- `actions/plan-secciones.ts`
- `actions/planes.ts`
- `actions/recursos.ts`
- `actions/staff.ts`
- `app/(paciente)/feedback-semanal/page.tsx`
- `app/(paciente)/mis-recursos/page.tsx`
- `app/admin/pacientes/[id]/feedback/page.tsx`
- `app/admin/pacientes/[id]/recursos/page.tsx`
- `app/api/mobile/recursos/route.ts`
- `lib/plan-secciones.ts`
- `scripts/migracion/generar-inventario.mjs`
- `scripts/seed-ejercicios.mjs`

</details>

<details><summary><b>datos</b> (73)</summary>

- `actions/auth.ts`
- `actions/contenido.ts`
- `actions/ejercicios.ts`
- `actions/evaluaciones.ts`
- `actions/evolucion.ts`
- `actions/feedback.ts`
- `actions/ficha.ts`
- `actions/horarios.ts`
- `actions/mediciones.ts`
- `actions/objetivos.ts`
- `actions/plan-ejercicios.ts`
- `actions/plan-secciones.ts`
- `actions/planes.ts`
- `actions/recursos.ts`
- `actions/staff.ts`
- `actions/turnos.ts`
- `app/(paciente)/feedback-semanal/page.tsx`
- `app/(paciente)/layout.tsx`
- `app/(paciente)/mi-ficha/page.tsx`
- `app/(paciente)/mi-progreso/page.tsx`
- `app/(paciente)/mis-objetivos/page.tsx`
- `app/(paciente)/mis-planes/[id]/page.tsx`
- `app/(paciente)/mis-planes/page.tsx`
- `app/(paciente)/mis-recursos/page.tsx`
- `app/(paciente)/mis-turnos/page.tsx`
- `app/(public)/servicios/page.tsx`
- `app/(public)/turnos/nuevo/page.tsx`
- `app/admin/calendario/page.tsx`
- `app/admin/configuracion/page.tsx`
- `app/admin/contenido/servicios/page.tsx`
- `app/admin/dashboard/page.tsx`
- `app/admin/ejercicios/page.tsx`
- `app/admin/horarios/page.tsx`
- `app/admin/layout.tsx`
- `app/admin/pacientes/[id]/antropometria/page.tsx`
- `app/admin/pacientes/[id]/evaluacion-funcional/page.tsx`
- `app/admin/pacientes/[id]/evolucion/page.tsx`
- `app/admin/pacientes/[id]/feedback/page.tsx`
- `app/admin/pacientes/[id]/ficha/page.tsx`
- `app/admin/pacientes/[id]/layout.tsx`
- `app/admin/pacientes/[id]/objetivos/page.tsx`
- `app/admin/pacientes/[id]/page.tsx`
- `app/admin/pacientes/[id]/planes/[planId]/page.tsx`
- `app/admin/pacientes/[id]/planes/page.tsx`
- `app/admin/pacientes/[id]/recursos/page.tsx`
- `app/admin/pacientes/[id]/wearable/page.tsx`
- `app/admin/pacientes/page.tsx`
- `app/admin/turno/[id]/page.tsx`
- `app/api/ejercicios/route.ts`
- `app/api/mobile/auth/registro/route.ts`
- `app/api/mobile/horarios/actualizar/route.ts`
- `app/api/mobile/horarios/eliminar/route.ts`
- `app/api/mobile/recursos/route.ts`
- `app/api/mobile/staff/cambiar-password/route.ts`
- `app/api/mobile/staff/configurar-profesional/route.ts`
- `app/api/mobile/staff/crear-paciente/route.ts`
- `app/api/mobile/staff/eliminar-paciente/route.ts`
- `app/api/mobile/staff/toggle-activo/route.ts`
- `app/api/slots/route.ts`
- `app/planes/[id]/imprimir/page.tsx`
- `components/navbar.tsx`
- `e2e/global-setup.ts`
- `lib/audit.ts`
- `lib/auth/email-exists.ts`
- `lib/booking/slots.ts`
- `lib/config/contenido.ts`
- `lib/plan-secciones.ts`
- `lib/supabase/bearer.ts`
- `lib/supabase/middleware.ts`
- `scripts/migracion/generar-inventario.mjs`
- `scripts/seed-demo-pacientes.mjs`
- `scripts/seed-ejercicios.mjs`
- `scripts/traducir-ejercicios.mjs`

</details>

<details><summary><b>cliente/otros</b> (3)</summary>

- `lib/supabase/admin.ts`
- `proxy.ts`
- `scripts/migrar-cifrado-clinico.mjs`

</details>

### Llamadas `.from()` a tablas

Total con tabla literal: **270** en 72 archivos (+ 10 `.from(<variable>)` no resolubles estaticamente).

| Tabla | `.from()` | Archivos |
|---|---|---|
| `profiles` | 75 | 40 |
| `turnos` | 36 | 8 |
| `horarios_disponibles` | 23 | 9 |
| `planes` | 17 | 11 |
| `ejercicios` | 12 | 7 |
| `servicios` | 11 | 9 |
| `feedback_semanal` | 10 | 5 |
| `recursos_paciente` | 9 | 4 |
| `evaluaciones_funcionales` | 8 | 5 |
| `feedback_mensajes` | 8 | 4 |
| `fichas_paciente` | 8 | 8 |
| `mediciones_antropometricas` | 8 | 5 |
| `plan_ejercicios` | 8 | 5 |
| `plan_secciones` | 8 | 2 |
| `objetivos` | 7 | 5 |
| `evolucion_entradas` | 6 | 4 |
| `plan_seccion_imagenes` | 5 | 1 |
| `contenido_sitio` | 3 | 2 |
| `plan_seccion_comidas` | 3 | 1 |
| `audit_log` | 1 | 1 |
| `bloqueos_horario` | 1 | 1 |
| `mediciones_wearable` | 1 | 1 |
| `sesiones_entrenamiento` | 1 | 1 |
| `sets_completados` | 1 | 1 |

### Storage (`storage.from(<bucket>)`)

| Bucket | Llamadas |
|---|---|
| `recursos` | 13 |
| `planes` | 9 |
| `ejercicios-media` | 6 |
| `sitio` | 3 |
<!-- END:huella -->

## 3. Conteos de produccion (Supabase `ayjzcxvtylvsjacgjxgh`)

**Pendiente.** El token de la Management API no esta disponible en el entorno de la sesion `dev1`
(los `.env*` estan enmascarados y no hay variable `SUPABASE_*`), asi que no se pudo consultar produccion.
El script de solo lectura ya esta listo y solo emite cantidades, sin datos personales:

```bash
SUPABASE_ACCESS_TOKEN=... node scripts/migracion/conteos-prod.mjs > docs/migracion/conteos-prod.md
```

Cubre: usuarios de `auth.users` (confirmados, invitados, sinteticos, formato de hash bcrypt/otro),
filas por tabla de `public` con estado de RLS, objetos y MB por bucket, `audit_log` por accion/tabla
y filas clinicas todavia en texto plano. Con eso se decide la opcion A/B de contrasenas (Fase 3).

## 4. Auditoria de `audit_log` (migracion `0039`, `lib/audit.ts`)

**Que existe**
- Tabla `audit_log` append-only (sin policy de update/delete), lectura solo `is_admin()`, insert de staff solo como si mismo.
- Escrituras: trigger `log_audit_change()` (security definer) en 5 tablas: `fichas_paciente`, `planes`,
  `evolucion_entradas`, `mediciones_antropometricas`, `evaluaciones_funcionales`. Guarda solo los *nombres* de columna
  modificados, no los valores.
- Lecturas: `logAuditView()` a nivel app, accion `ver`.

**Hallazgos**
1. **Cobertura de lecturas minima.** `logAuditView` tiene un unico call site: `app/admin/pacientes/[id]/ficha/page.tsx`.
   No se registran lecturas de evolucion, planes, antropometria, evaluaciones ni resumen del paciente, ni el acceso del propio paciente.
2. **El actor depende de `auth.uid()`.** En el trigger, `actor_id = auth.uid()`. Con service role (`createAdminClient()`) queda `null`.
   En el backend propio `auth.uid()` no existe: hay que pasar el actor por `set_config('app.user_id', ..., true)` dentro de la
   transaccion o registrar desde la capa de datos (ya previsto en la Fase 2 del plan). Sin eso, todo el log queda sin actor.
3. **Nadie lee el log.** Ninguna pantalla consulta `audit_log` (solo existe el insert); solo es accesible por SQL. Cumple como
   registro, no como control operativo.
4. **Sin retencion definida.** No hay politica de purga; la migracion lo deja como accion manual de DBA.
5. **`on delete set null` en `paciente_id`/`actor_id`.** Al eliminar un paciente (`eliminarPacienteAction`) sus filas de
   auditoria quedan huerfanas (sin `paciente_id`). Ademas, el borrado en cascada de `fichas_paciente` dispara el trigger
   mientras el perfil se esta borrando: **no verificado** si el insert de auditoria choca con la FK; probarlo en el ensayo en `test`.
6. **Dependencia de Supabase.** `lib/audit.ts` tipa su parametro con `createClient` de `lib/supabase/server`; se reescribe en la Fase 4.
   Los triggers migran como SQL manual (no hay policies que portar, pero si la referencia a `auth.uid()`).

**Para migrar:** conservar tabla y triggers, cambiar el origen del actor, extender `logAuditView` a las vistas clinicas
que faltan (decision de producto, no tecnica), y ver el conteo real de filas en el punto 3.

## 5. Auditoria del cifrado clinico (migracion `0038`, `lib/crypto/clinical.ts`)

**Que existe**
- AES-256-GCM con `node:crypto`, clave `CLINICAL_DATA_ENCRYPTION_KEY` (32 bytes en base64) solo en el entorno de la app.
- Formato `v1.<iv>.<tag>.<ciphertext>` en columnas `_enc`. IV aleatorio de 12 bytes por valor, authTag validado al leer.
- 7 campos: `fichas_paciente.{dx_medico, dx_nutricional, medicacion, datos_laboratorio, observaciones_internas}`,
  `evolucion_entradas.contenido`, `planes.notas`.
- Escritura: `actions/ficha.ts`, `actions/evolucion.ts`, `actions/planes.ts`. Lectura: `readClinicalField()` en 8 vistas
  (`mi-ficha`, `mi-progreso`, `mis-planes/[id]`, `planes/[id]/imprimir`, y las de admin de ficha, evolucion, resumen y plan).

**Hallazgos**
1. **Portable tal cual.** El modulo solo depende de `node:crypto`; no cambia en la migracion. El `pg_dump` copia los
   ciphertexts como texto.
2. **La clave es el unico punto de falla.** Perderla = perder los 7 campos. Los backups a B2 contienen los ciphertexts
   pero **no** la clave: debe respaldarse por separado (gestor de secretos), y viajar a Coolify antes del primer arranque.
   No hay rotacion ni identificador de clave en el formato (solo el prefijo `v1`).
3. **Siguen existiendo las columnas planas.** Estan marcadas `DEPRECATED` pero no se dropearon (son el rollback).
   Si el backfill `scripts/migrar-cifrado-clinico.mjs` no corrio completo en produccion, hay texto plano real en la base.
   El conteo exacto esta en el script de produccion (seccion 3). Decidir si el esquema nuevo las arrastra o no.
4. **Sin AAD.** El ciphertext no esta ligado a fila ni columna: un valor copiado a otra fila o columna descifra bien.
   Mejora de bajo costo para el formato `v2` si se quiere, no bloquea la migracion.
5. **`readClinicalField` cae a la columna plana** si `_enc` es null: correcto durante la transicion, pero oculta filas sin
   migrar. Tras el backfill, pasar a leer solo `_enc`.
6. **Datos de salud que NO se cifran:** `fichas_paciente` (`lesiones`, `molestias`, `suplementacion`, `motivos_consulta`,
   `fuma`, `bebe`, `drogas`), `feedback_semanal` y `feedback_mensajes` (dudas y chat), `plan_secciones.contenido` y
   `plan_seccion_comidas` (ya documentado como pendiente), mediciones antropometricas, evaluaciones y adjuntos. Es una
   decision de alcance, no un bug; queda anotado para la revision de seguridad.
7. **El script de backfill usa `supabase-js`** y duplica el algoritmo (corre standalone); se reescribe sobre Drizzle en la Fase 4.
8. **Pendiente de `vimet-app`:** ninguna ruta `app/api/mobile/*` lee campos clinicos, pero si la app lee `fichas_paciente`
   o `evolucion_entradas` directo con `supabase-js` recibiria `_enc` o texto plano sin descifrar. Confirmar en el inventario de la app.
