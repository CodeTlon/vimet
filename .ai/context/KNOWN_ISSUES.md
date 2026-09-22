# KNOWN_ISSUES — VIMET (web)

Severidad explícita, evidencia con archivo:línea donde aplica, escenario de falla concreto, fix propuesto **sin aplicar** salvo que se indique lo contrario. Generado el 2026-09-22 combinando verificación directa (`npm audit`, DNS/curl, GitHub Apps, **API de Coolify**, lectura directa de la DB de producción real) y dos auditorías de subagente de solo lectura (cifrado clínico + Quirks; paridad auth web/mobile).

**Identidad de producción confirmada con evidencia dura (no por inferencia)**: se consultó la API de Coolify (`GET /api/v1/applications/{uuid}/envs` sobre la app `vimet`, `fqdn=https://vimetsalud.com.ar`) — `NEXT_PUBLIC_SUPABASE_URL` real de producción es `https://ayjzcxvtylvsjacgjxgh.supabase.co`. Ya no es una hipótesis por emails de staff: es el valor configurado de verdad. De paso, `RESEND_FROM_EMAIL` en ese mismo entorno ya está en `no-reply@vimetsalud.com.ar` (dominio verificado) — cierra `OPEN_QUESTIONS.md` #4.

## 🔴 CRÍTICA

### 1. Gap de migraciones en producción — 6 migraciones de código ya deployado nunca corrieron contra la DB real
**FACT, confirmado por lectura directa (solo lectura) contra `https://ayjzcxvtylvsjacgjxgh.supabase.co`, el Supabase real de producción (confirmado vía Coolify, ver arriba).** Mapeando qué migraciones existen realmente contra el HEAD del código (que ya asume todas aplicadas):

| Migración | En producción real |
|---|---|
| 0001–0011 (init, seguimiento, recursos, contenido editable, feedback chat, turnos combo) | ✅ existen |
| **`0019_paciente_estado.sql`** (`profiles.activado_en`) | ❌ **no existe** |
| **`0029_paciente_gestionado_staff.sql`** (`profiles.gestionado_por_staff`) | ❌ **no existe** |
| **`0030_ejercicios_youtube.sql`** (`ejercicios.youtube_url` + constraint) | ❌ **no existe** |
| **`0031_ejercicios_modo_cardio.sql`** (`ejercicios.modo` + campos cardio en `plan_ejercicios`) | ❌ **no existe** |
| **`0033_profiles_slot_publico.sql`** (`profiles.slot_publico`) | ❌ **no existe** |
| **`0034_antropometria_isak.sql`** (13 columnas ISAK en `mediciones_antropometricas`) | ❌ **no existe** |
| 0037–0039 (secciones de plan, cifrado clínico, audit log) | ✅ existen |

No es un simple atraso lineal — alguien aplicó `0037`-`0039` (las más recientes) sin pasar antes por el bloque `0019`-`0034`. El código deployado en Coolify asume que TODAS estas columnas/tablas existen.

**Escenario de falla concreto, por feature**: cualquier paciente/staff real que hoy toque en producción (a) confirmación de email → activación automática de cuenta (necesita `activado_en`), (b) alta de paciente gestionado por staff, (c) cargar un ejercicio con link de YouTube o modo cardio, (d) ver/editar el perfil público de Avril o Gero (necesita `slot_publico`), o (e) cargar una evaluación ISAK de antropometría — **muy probablemente rompe con error 500** (columna/tabla inexistente), no en silencio.

**Mitigado por la falta de uso real, no por el gap**: `ejercicios` (0 filas), `plan_ejercicios` (0 filas) y `mediciones_antropometricas` (0 filas) están vacías en prod hoy — así que (c) y (e) todavía no le rompieron a nadie porque nadie las usó, no porque el gap no exista. `profiles` tiene 6 filas reales — (a), (b) y (d) sí son riesgo activo cada vez que alguien las toque.

**Análisis de riesgo de aplicar cada una — leído el `.sql` completo de las 6, sin correr nada:**

| Migración | ¿Destructiva / pisa datos? | Riesgo real contra los datos de prod hoy | Veredicto |
|---|---|---|---|
| `0019` | No — `add column if not exists activado_en timestamptz`, nullable, sin default | Ninguno | Segura tal cual |
| `0029` | No — `add column ... not null default false` | Metadata-only en Postgres moderno; `false` es semánticamente correcto para las 6 filas existentes (ninguna vino del flujo "gestionado", que no existía) | Segura tal cual |
| `0030` | No — columna nullable + `CHECK` que valida contra filas existentes | **Verificado con una query real**: `ejercicios` tiene 0 filas con `origen='staff'` (de hecho 0 filas en total) → el `CHECK` no tiene nada que violar | Segura tal cual |
| `0031` | No — columnas nullable + 3 `CHECK` que son trivialmente ciertos cuando los valores son `null` | **Verificado**: `plan_ejercicios` tiene 0 filas | Segura tal cual |
| `0033` | No estructuralmente, pero **el backfill queda inefectivo** | La migración incluye 2 `UPDATE` hardcodeados contra `codetloncordoba+avril@gmail.com`/`codetloncordoba+gero@gmail.com` — **verificado que NINGUNO de esos emails existe en prod**; los reales son `avriljerushalmi@vimetsalud.com.ar` / `geronimogallardo@vimetsalud.com.ar`. Aplicarla tal cual agrega la columna sin romper nada, pero deja `slot_publico` en `null` para ambas — el problema que la migración dice resolver seguiría sin resolverse, en silencio | Segura de aplicar, pero **necesita el backfill corregido con los emails reales de prod** para tener efecto — no alcanza con correr el archivo tal cual |
| `0034` | No — 13 columnas nullable, sin `CHECK`, solo comentarios | **Verificado**: `mediciones_antropometricas` tiene 0 filas | Segura tal cual |

**No se aplicó ninguna de las 6** — queda pendiente de que el usuario lo autorice explícitamente, dado que es escritura contra producción real.

## 🟠 ALTA

### 2. Cifrado clínico con scope incompleto — `plan_secciones` queda en texto plano
**No aplica hoy, con la razón concreta (no "nunca va a aplicar")**: verificado por lectura directa contra prod que `plan_secciones`/`plan_seccion_comidas` **tienen 0 filas** — nadie creó todavía una sección modular de plan en producción real (consistente con el hallazgo #1: casi no hay uso real todavía). Hoy no hay ningún dato clínico en texto plano expuesto en esas tablas, simplemente porque no hay dato.

**Por qué sigue siendo un hallazgo real y no se cierra**: `actions/plan-secciones.ts` no importa `lib/crypto/clinical.ts` en ningún punto — confirmado contra el schema (`supabase/migrations/0037_plan_secciones.sql`) que `plan_secciones.contenido`/`plan_seccion_comidas.contenido` son el texto libre de pautas nutricionales/recetas/comidas reales, mismo nivel de sensibilidad que `planes.notas` (que sí se cifra). **Apenas el gap de migraciones (#1) se resuelva y el sistema empiece a recibir uso real, el primer profesional que cree una sección de plan va a estar guardando dato clínico real sin cifrar** — hay que resolver esto ANTES de que eso pase, no después.
**Alcance de un fix futuro (no aplicado)**: nueva migración con columnas `_enc`, tocar `actions/plan-secciones.ts` (crear/actualizar) y `lib/plan-secciones.ts` (lectura), decidir si el backfill se suma al script existente o va aparte.

### 3. Audit log de lecturas prácticamente sin implementar
**FACT, confirmado exhaustivamente en esta sesión.** `grep -rln "logAuditView" app actions lib` da exactamente 2 resultados en todo el repo: `lib/audit.ts` (la definición) y `app/admin/pacientes/[id]/ficha/page.tsx` (el único call site). Confirmado además, leyendo cada archivo, que estas 3 pantallas leen campos clínicos cifrados (`readClinicalField`) sin loguear el acceso: `app/admin/pacientes/[id]/page.tsx` (resumen, lee `dx_medico`/`dx_nutricional`), `app/(paciente)/mi-ficha/page.tsx` (lee `dx_medico`/`dx_nutricional`/`medicacion`/`datos_laboratorio`), `app/admin/pacientes/[id]/evolucion/page.tsx` (lee `contenido` de evolución) — y por extensión las otras superficies que Agent A ya había señalado (`mi-progreso`, `admin/.../planes/[planId]`, `mis-planes/[id]`, `planes/[id]/imprimir`). Igual que el hallazgo #2: en prod hoy no hay dato clínico real todavía (0 filas en `fichas_paciente`/`evolucion_entradas`/`planes.notas`, ver #4), así que no hay accesos reales sin loguear — pero el gap de implementación es real y hay que resolverlo antes de que haya pacientes de verdad usando el sistema.
**Por qué falta (no "se implementó mal", nunca se agregó)**: el patrón (`import logAuditView` + la llamada) se escribió una sola vez, en la página de ficha admin, dentro del mismo commit que introdujo el cifrado (`6af5db6`) — y nunca se replicó a las otras 7 superficies antes de que esa sesión terminara. Las ESCRITURAS sí quedan cubiertas por triggers de Postgres en 5 tablas, independiente del código de la app.
**Fix propuesto (no aplicado)**: extender `logAuditView()` a las 7 superficies que faltan, mismo patrón de 3 líneas que ya existe en `ficha/page.tsx`.

### 4. Backfill de cifrado clínico — verificado con datos reales: no hace falta hoy, pero por falta de dato, no por haber corrido
**Confirmado por lectura directa (solo lectura) contra ambos entornos, ya no es UNKNOWN:**
- **Producción real** (`ayjzcxvtylvsjacgjxgh`): `fichas_paciente`, `evolucion_entradas.contenido` y `planes.notas` tienen **0 filas con cualquier valor, plano o cifrado**. No hay nada que backfillear porque no hay ficha clínica cargada todavía para ninguno de los 2 pacientes reales que existen hoy.
- **Dev** (`qwzlhbecpgysgophpbyf`): estas mismas columnas están 100% en `_enc` (cero valores en las columnas viejas de texto plano) — pero esto es **inconcluso sobre si el backfill corrió**: la data de dev es de test/smoke, muy probablemente creada DESPUÉS de que el código de cifrado ya existiera, así que nunca tuvo dato viejo que backfillear en primer lugar.
- El script `scripts/migrar-cifrado-clinico.mjs` sigue sin tener evidencia documental de haber corrido nunca (ninguna entrada en el Historial de Cambios, a diferencia de toda migración anterior del proyecto) — pero como no hay dato viejo en ningún lado que necesite backfill, es un punto moot hoy.
**Por qué sigue en la lista, no se cierra**: en cuanto se resuelva el gap de migraciones (#1) y el cifrado (#2) y empiece a entrar dato clínico real a producción, este script es el que hay que tener listo y confirmado para cualquier fila histórica que se acumule antes de una futura extensión del cifrado (ej. a `plan_secciones`). No aplica **hoy**, por ausencia de dato — no es una garantía permanente.

## ✅ RESUELTO EN ESTA SESIÓN (2026-09-22)

### 5. `next@16.0.0-16.3.2` — RCE no autenticado
Bump a `next@16.3.5` (mismo minor). Resuelve GHSA-p293-qw3h-jr36 (Windows-hosted) y GHSA-2xp9-vwfh-vxw4 (Image Optimization API + AVIF, no depende del OS del host). `npm audit --omit=dev` → 0 vulnerabilidades; build/tsc limpios. **Pendiente de deploy a Coolify** — el fix vive en la rama `fix/seguridad-mobile-y-deps`, no en producción hasta el próximo deploy.

### 6. `sharp<0.35.4` — vulnerabilidades altas en libheif
Bump a `sharp@^0.35.4`. Mismo commit que #5.

### 7. `app/api/mobile/auth/registro` sin rate limiting
Se agregó `rateLimit('registro:${ip}', 5, 15*60*1000)` (mismo límite que `registerAction` web) en `app/api/mobile/auth/registro/route.ts`.

### 8. Gate de `profiles.activo` para mobile: era solo client-side
Se agregó el chequeo dentro de `requireMobileUser()` (`lib/supabase/bearer.ts`) — cubre las 14 rutas mobile autenticadas. **Verificado end-to-end real** contra el Supabase de dev (reactivado para la prueba): usuario con `activo=false` → `403`; con `activo=true` (control positivo) → pasa el gate, sin tocar datos reales.

### 9. `turnos/crear` mobile omitía la validación de formato del wrapper web
`crearSchema` movido a `lib/validation/turnos.ts` (mismo patrón que `crearPacienteSchema`) y reusado desde ambos lados.

## 🟡 MEDIA / 🔵 BAJA

### 10. `README.md`/`docs/environments.md` describen un esquema Vercel que no refleja la infra real
`README.md` sigue diciendo "Deploy: Vercel + Supabase"; `docs/environments.md` tiene aviso de desactualizado pero no está reescrito. Ahora que la identidad de Coolify/Supabase de prod está confirmada con evidencia dura (ver el encabezado de este archivo), reescribir estos documentos ya no depende de ninguna confirmación pendiente — queda como trabajo de documentación, no de investigación.

### 11. `recursos` (POST) mobile con validación de datos algo más laxa que su equivalente web
Sin `enum`/`.uuid()`/tope de longitud del lado mobile. Falla controlada contra el `CHECK` de la tabla, no es bypass de permisos.
