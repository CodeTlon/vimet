# Conteos de produccion (ayjzcxvtylvsjacgjxgh) - 2026-10-13

Solo lectura. Cantidades, sin datos personales.

## auth.users

| Total | Email confirmado | Invitados | Con login alguna vez | Emails sinteticos (gestionados) |
|---|---|---|---|---|
| 8 | 4 | 4 | 3 | 0 |

Proveedor: email=8
Formato de hash: bcrypt=5, vacio=3
Roles en profiles: paciente=4, nutricionista=2, admin=1, entrenador=1

## Tablas de `public`

| Tabla | Filas | RLS |
|---|---|---|
| `audit_log` | 0 | si |
| `bloqueos_horario` | 0 | si |
| `contenido_sitio` | 1 | si |
| `ejercicios` | 0 | si |
| `evaluaciones_funcionales` | 0 | si |
| `evolucion_entradas` | 0 | si |
| `feedback_mensajes` | 0 | si |
| `feedback_semanal` | 0 | si |
| `fichas_paciente` | 0 | si |
| `horarios_disponibles` | 15 | si |
| `mediciones_antropometricas` | 0 | si |
| `mediciones_wearable` | 0 | si |
| `objetivos` | 0 | si |
| `plan_ejercicios` | 0 | si |
| `planes` | 0 | si |
| `profiles` | 8 | si |
| `recursos_paciente` | 0 | si |
| `servicios` | 4 | si |
| `sesiones_entrenamiento` | 0 | si |
| `sets_completados` | 0 | si |
| `turnos` | 0 | si |

Total de filas: 28

## Buckets de Storage

| Bucket | Publico | Objetos | MB |
|---|---|---|---|
| `ejercicios-media` | si | 0 | 0.0 |
| `planes` | no | 0 | 0.0 |
| `recursos` | no | 0 | 0.0 |
| `sitio` | si | 0 | 0.0 |

Migraciones registradas en schema_migrations: 18 (ultima 0018); recordar que solo es confiable hasta 0018.

## audit_log

| Accion | Tabla | Filas | Sin actor |
|---|---|---|---|

## Cifrado clinico (filas)

| Tabla | Total | Con alguna columna cifrada | Con texto plano pendiente de backfill |
|---|---|---|---|
| `fichas_paciente` | 0 | 0 | 0 |
| `evolucion_entradas` | 0 | 0 | 0 |
| `planes` | 0 | 0 | 0 |
