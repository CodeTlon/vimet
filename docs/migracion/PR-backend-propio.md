# PR (borrador): feature/dev1-backend-propio -> dev

Crear cuando `dev` este recreada desde `main`:
`gh pr create --draft --base dev --head feature/dev1-backend-propio --title "feat: backend propio (Postgres + Drizzle + Better Auth + MinIO)" --body-file docs/migracion/PR-backend-propio.md`

## Objetivo
Sacar Supabase del runtime de VIMET (web y app mobile) sin cambiar el producto: Postgres + Drizzle, Better Auth, S3/MinIO,
autorizacion explicita en el servidor en lugar de RLS.

## Hecho
- Esquema Drizzle con paridad verificada contra las 39 migraciones (`npm run db:paridad`).
- Auth: login, registro con confirmacion que activa la cuenta, recuperacion por codigo, invitaciones, sesion bearer para la app, hashes bcrypt importables.
- 100% de las consultas y escrituras de la web migradas; servicios compartidos web/app (`lib/services/*`); `lib/supabase` eliminado.
- Storage sobre S3 con URLs firmadas tras verificar permisos.
- App mobile: `POST /api/mobile/data` (catalogo cerrado de ~60 operaciones) + auth por token; rama `feature/dev1-backend-propio` en `vimet-app`.
- Importador de datos con verificacion por checksum, copia de storage, backups a B2 y guias de ensayo/corte.
- 43 tests (Vitest + PGlite): auth, IDOR de turnos y de toda la capa mobile, importador, borrado de paciente.

## Falta / no verificado (ver `docs/migracion/CORTE.md`)
- Ejecucion contra Postgres y MinIO reales (el sandbox de `dev1` no puede levantar contenedores).
- Build y prueba en dispositivo de la app (login, recuperacion, uploads, entrenamiento).
- Correo real (Resend) de confirmacion y recuperacion.
- Ensayo completo en `test` con un dump de produccion y simulacro de restauracion de backups.
- `.env.example` (protegido en el sandbox) sigue listando variables de Supabase.
- Copiar `docs/workflows/*.yml` a `.github/workflows/` (rama `feature/dev1-entornos`).

## Como probarlo
`npm ci && npm test && npm run db:paridad && npm run build`. Flujo manual: `docs/migracion/CORTE.md` seccion 1.

## Decisiones
- Sin RLS: cada consulta filtra por la sesion; ver `AUTORIZACION.md`.
- Los datos de produccion hoy son minimos (8 usuarios, 28 filas, 0 archivos): el corte es barato; conviene hacerlo antes de que carguen pacientes reales.
- La app se habla con el backend por un catalogo cerrado de operaciones, no por un proxy generico de tablas.
