# Paridad de seguridad: de RLS a guards del servidor

Cada policy de `supabase/migrations` (60 vigentes, `inventario.md` seccion 1) tiene su reemplazo explicito. Los tests
son la prueba: `tests/*.authz.test.ts` y `tests/mobile.authz.test.ts` (PGlite con las migraciones reales).

| Tabla / recurso | Regla que aplicaba RLS | Donde vive ahora | Test |
|---|---|---|---|
| `turnos` (select/update paciente, profesional, admin) | dueño, profesional del turno o admin | `puedeGestionarTurno`, `condicionTurnosVisibles` (`lib/data/turnos.ts`) | `turnos.authz`, `mobile.authz` |
| `turnos` insert / trigger de paciente | solo para si mismo; solo confirmar/cancelar | `lib/services/turnos.ts` (`userId` de la sesion; consultas con `paciente_id = userId`) | `turnos.authz` (IDOR) |
| `turnos` exclusion | sin solapes del profesional | constraint `turnos_no_solapado` + `profesionalDisponible` | `turnos.authz` |
| `horarios_disponibles`, `bloqueos_horario` write | `profesional_id = yo` (o admin) | `lib/services/horarios.ts` (`franjaPropia` filtra por profesional) | via acciones/rutas |
| `profiles` select/update | propio o staff; `rol`/`activo` solo admin | `cambiarActivo` (staff sobre pacientes, admin sobre equipo), `configurarProfesional` y `cambiarPasswordDe` solo admin | `mobile.authz` |
| `fichas_paciente`, `mediciones*`, `evaluaciones*`, `planes`, `plan_*`, `objetivos`, `evolucion_entradas` write | solo staff | `authStaff`/`requireStaff` en acciones; `acceso: 'staff'` en operaciones mobile | `mobile.authz` |
| Las mismas, lectura de paciente | `paciente_id = yo` | consultas filtradas por la sesion; `ficha.ver` sin `observaciones_internas` | `mobile.authz` |
| `evolucion_entradas`, `recursos_paciente` lectura paciente | solo `visible_paciente` | `recursos.ver`, `recursos.url`; la evolucion no se expone al paciente salvo `visible` | `mobile.authz` |
| `feedback_semanal` / `feedback_mensajes` | dueño o staff; el paciente no escribe `respuesta_*` | `lib/services/feedback.ts` (semana fijada por el servidor) | `mobile.authz` |
| `sesiones_entrenamiento`, `sets_completados` | sesion propia y plan propio | `lib/services/entrenamiento.ts` | `mobile.authz` |
| `mediciones_wearable` | `paciente_id = yo` | `guardarMedicionesWearable` ignora `paciente_id` del cliente | `mobile.authz` |
| `ejercicios`, `servicios`, `contenido_sitio` | lectura autenticada/publica; escritura staff | `authStaff` en acciones; `/api/ejercicios` exige sesion | build + revision |
| `audit_log` | lectura admin; insert propio | actor por `set_config('app.user_id')` (`conActor`) | `mobile.authz` |
| Storage `planes`, `recursos` | carpeta = id del paciente; `f/` escribible | URL firmada solo tras verificar dueño/staff (`urlArchivoPlan`, `recursos.url`) | `mobile.authz` |
| Storage `sitio`, `ejercicios-media` | lectura publica; escritura staff | bucket publico; subida solo desde acciones de staff | revision |

## Cambios de comportamiento deliberados
- `/api/slots` y `/api/ejercicios` exigen sesion.
- El staff no admin solo ve/gestiona SUS turnos (como la policy), y solo un admin cambia el estado de otra cuenta del equipo
  (antes cualquier staff podia, via cliente de servicio).
- El feedback semanal no se puede sobrescribir ni cargar a una semana arbitraria.
- La app deja de escribir datos clinicos en texto plano: ficha y evolucion pasan por el servidor y se cifran.
- `GET`/`POST` de datos del paciente nunca reciben el `paciente_id` del cliente como autoridad para el paciente logueado.

## Lo que NO esta cubierto por tests automaticos
Acciones web que solo envuelven servicios (`actions/*.ts`) y paginas de admin: la proteccion es `requireStaff()` en la
pagina/layout y filtros explicitos en cada consulta. Una pasada manual en `test` con un paciente y un staff no admin
(`MANUAL-PRUEBAS.md`) sigue siendo necesaria.
