# DECISIONS — VIMET (web)

Decisiones de diseño reales con su porqué — no solo "qué se hizo". Extraídas del código y del historial de commits/CLAUDE.md (FACT salvo etiqueta distinta).

**Superficie mobile como rutas API en este mismo repo, no un backend separado.** `../vimet-app` no tiene backend propio — reusa `app/api/mobile/*` de este repo para todo lo que necesita lógica de servidor (slots, turnos combo, uploads con `sharp`, acciones con service role), y llama a Supabase directo para el resto. Evita duplicar reglas de negocio (cálculo de slots, validaciones, triggers) en dos lenguajes/repos. Costo real de esta decisión: cuando una ruta mobile no reusa la función compartida de la Server Action web, hay que sincronizar el chequeo de permisos a mano — y eso ya generó bugs reales (ver `KNOWN_ISSUES.md`).

**`profiles.slot_publico` en vez de matchear por email para identificar "quién es Avril"/"quién es Gero".** El email de las cuentas reales de staff nunca coincidió con el placeholder que usaba `lib/config/team.ts`, así que la búsqueda por email nunca encontraba nada (bug real, no detectado durante meses). Se optó por un identificador explícito en la fila del perfil, desacoplado del email de login — si el email cambia en el futuro no rompe la feature.

**`toggleActivoAction`/gestión de pacientes abierta a cualquier staff, no solo admin.** Reflejando que Avril y Gero operan el día a día del consultorio por igual — `admin` como rol separado solo aplica a la reasignación de roles de otros usuarios (superficie de escalación de privilegios), no a la operación normal.

**Pacientes "gestionados" por staff, con cuenta real en `auth.users` pero sin credenciales comunicadas.** Necesario porque `profiles.id` tiene FK a `auth.users(id)` y todo el resto del modelo (turnos, ficha, planes) depende de esa fila — no había forma de modelar "paciente sin login" sin de todas formas crear el registro de Auth. Password aleatoria, nunca comunicada; si no hay email real se genera uno sintético no enviable.

**Scope del cifrado clínico limitado a `fichas_paciente`, `evolucion_entradas.contenido`, `planes.notas`.** No cubre `plan_secciones` — decisión no documentada explícitamente en ningún commit/comentario (ver `KNOWN_ISSUES.md` #3, es un ASSUMPTION que fue deliberado vs. un olvido).

**Audit log de escrituras vía trigger de Postgres (no vía código de la app).** Garantiza cobertura incluso para deletes en cascada o escrituras hechas con el cliente admin — a costa de que esas escrituras admin queden con `actor_id = null` (no hay `auth.uid()` bajo service role), reduciendo trazabilidad en esos casos puntuales. Decisión documentada explícitamente en el comentario de la migración `0039`.

**Deploy real en Coolify self-hosted, con Vercel como proyecto aparte de preview.** No hay comentario/commit que explique el porqué de mantener ambas plataformas — es un dato de infraestructura, no una decisión de arquitectura de código. Ver `OPEN_QUESTIONS.md` sobre si vale la pena decomisionar Vercel.

**Barridos perezosos en vez de cron** (no-show de turnos, cancelación de pendientes sin confirmar). Se ejecutan cuando alguien visita una pantalla que lista turnos, no en background — trade-off explícito para no sumar infraestructura de cron; el costo es que un turno vencido no cambia de estado hasta que alguien entra a una pantalla relevante.
