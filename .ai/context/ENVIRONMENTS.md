# ENVIRONMENTS

Vigente al 2026-10-16. Fuente completa: `docs/environments.md`, `docs/FLUJO-ENTORNOS.md` y `docs/migracion/ENTORNO.md`.

| Rama | Entorno | Base | Archivos | Correo |
|---|---|---|---|---|
| `dev` | local (`npm run dev`) | Postgres en Docker (`docker-compose.yml`) | `./storage` | sandbox |
| `test` | Coolify, recurso aparte (aun sin crear), apagado salvo que se pruebe | Postgres 17 del compose, red interna | volumen `storage`, servido por `/media` | sandbox (`APP_ENV=test`, `MAIL_SANDBOX_TO`) |
| `main` | produccion actual en **Supabase** hasta el corte; luego Coolify con `docker-compose.coolify.yml` | Postgres del compose + backup diario a B2 | volumen `storage` (en el backup) | dominio verificado `vimetsalud.com.ar` |

- Flujo de ramas: `feature/*` -> `dev` -> `test` (merge directo) -> PR a `main` con checks verdes y OK de Mateo.
- Variables que el compose exige: `DATABASE_URL` (la arma el compose), `BETTER_AUTH_SECRET` (distinta por entorno), `CLINICAL_DATA_ENCRYPTION_KEY` (**obligatoria**; la misma que usa produccion hoy, con backup fuera de Coolify), `STORAGE_DIR`, `STORAGE_PUBLIC_URL`, `APP_ENV`, `TRANSCODE_API_KEY`. Los valores no van en el repo.
- Versiones: Node 22, Postgres 17, resto en `codetlon-cloud/.claude/modules/stack-versions.md`.
