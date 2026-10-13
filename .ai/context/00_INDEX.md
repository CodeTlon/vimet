# Índice — `.ai/context/`

Capa de contexto estable para agentes de IA. Coexiste con `.claude/CLAUDE.md` (memoria de sesión mutable de `/cambio`-`/cerrar`) sin duplicarla — acá va lo que no cambia sesión a sesión: arquitectura real, dominio de negocio, decisiones y por qué, estado verificado, e issues con severidad explícita.

| Si necesitás... | Leé |
|---|---|
| Entender qué es el proyecto, para quién, qué resuelve | `PROJECT.md` |
| La arquitectura real (capas, deploy real vs documentado, la superficie dual web/mobile) | `ARCHITECTURE.md` |
| Reglas de negocio y modelo de dominio (roles, turnos, seguimiento clínico, planes) | `DOMAIN.md` |
| Convenciones de código que hay que respetar al escribir código nuevo | `CONVENTIONS.md` |
| Por qué se tomó una decisión de diseño (no solo qué se hizo) | `DECISIONS.md` |
| Qué está completo, qué a medias, qué mockeado — con evidencia | `CURRENT_STATE.md` |
| Vulnerabilidades y gaps de seguridad/correctness reales, con severidad | `KNOWN_ISSUES.md` — **leer antes de tocar auth, cifrado clínico, o deploy** |
| Qué no se pudo verificar y quién tiene que confirmarlo | `OPEN_QUESTIONS.md` |
| El mapa de archivos exhaustivo + esquema de DB completo + Quirks día a día | `../../.claude/CLAUDE.md` (memoria de sesión, se actualiza con `/cerrar`) |
| Qué archivo abrir para un tipo de cambio puntual | `../../ARCHITECTURE.md` (raíz) |
| La migración Supabase → backend propio: estado, runbook de corte, paridad de seguridad, hallazgos, variables | `../../docs/migracion/` (`CORTE.md`, `AUTORIZACION.md`, `HALLAZGOS.md`, `ENTORNO.md`, `inventario.md`) |
| Flujo de ramas y entornos (feature → dev → test → PR a main) | `../../docs/FLUJO-ENTORNOS.md` |

Última actualización de esta capa: **2026-10-13** (migración a backend propio, rama `feature/dev1-backend-propio`, hoy en `dev` y `test`). Las secciones fechadas 2026-09-22 describen producción con Supabase y se conservan como histórico: aplican a `main` hasta el corte. Regla del proyecto: **al terminar cualquier tarea se actualiza toda esta capa** (ver `CURRENT_STATE.md`).

Auditoría anterior (2026-09-22, contra `origin/main` `dcdb7bf`): dos subagentes de solo lectura (cifrado clínico + vigencia de Quirks; paridad de auth web/mobile) más verificación directa de deploy — nada mutó datos de producción.
