# Pendientes del corte a backend propio

Lista unica de lo que falta. Lo marca Mateo; Claude no toca infra de Coolify ni produccion.

## Infra y entorno (Coolify, Mateo)
- [ ] Crear Postgres y MinIO (S3) en Coolify; cargar variables segun `ENTORNO.md`.
- [ ] Correr `db:migrate` + importador en `test` y hacer el ensayo de `CORTE.md`.
- [ ] Configurar secretos/variables que esperan los workflows `entornos.yml` y `produccion.yml` (ya estan en `.github/workflows/`; verificar que corran en la pestaña Actions).
- [ ] Backups a B2: configurar y hacer un simulacro de restore (`scripts/backup/`).
- [ ] Correo real con Resend (dominio `vimetsalud.com.ar`, `RESEND_FROM_EMAIL`, `MAIL_SANDBOX_TO` en test).
- [ ] Reducir `.env.example` en `vimet` y `vimet-app` (protegido en el sandbox).
- [ ] Build de la app `vimet-app` en dispositivo y prueba contra `test`.
- [ ] Revocar el token de Supabase pegado en el chat.
- [ ] Commitear y pushear `~/claude-workflow/FLUJO-GIT.md` (regla global + seccion "Ramas").

## Dependencias (vulnerabilidades restantes, solo dev-tooling)
Corregido en `1ea3734`: next 16.4.0, sharp 0.35.5, vitest 3.2.7, transitivas. Quedan 16 en `npm audit`, todas de herramientas de desarrollo:
- [ ] `tinypool` (critica): requiere Vitest 4. Migracion aparte.
- [ ] `esbuild` via `drizzle-kit`: esperar version de drizzle-kit que lo actualice (no bajar a 0.18).
- [ ] `braces` / `postcss-selector-parser` via Tailwind 3: requiere Tailwind 4. Migracion aparte.
- [ ] Alertas de Dependabot en `main` (next 16.3.3, js-yaml, sharp): se cierran al llegar esta feature a `main`; si hay urgencia, parche en rama aparte desde `main`.

## Corte
- [ ] Decidir y ejecutar deploy a produccion y corte de Supabase (Mateo).
- [ ] PR `test` -> `main` cuando el ensayo en `test` este verde.
