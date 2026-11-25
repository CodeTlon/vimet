# Variables de entorno del backend propio

`.env.example` del repo todavia lista las de Supabase (el archivo esta protegido en el sandbox de `dev1`: reducirlo a
esta tabla al integrar). Sin comillas en Coolify.

| Variable | Obligatoria | Para que | Notas |
|---|---|---|---|
| `DATABASE_URL` | si | Postgres (Drizzle + Better Auth) | Red interna de Coolify; sin puerto publico. |
| `STORAGE_DIR` | no | Carpeta de archivos (en Docker `/data/storage`, local `./storage`) | Volumen `storage` del compose. |
| `STORAGE_PUBLIC_URL` | si | `https://<dominio>/media` | Argumento de build y de runtime (entra en la CSP y `next/image`). En Coolify: `${SERVICE_URL_APP}/media`. |
| `MEDIA_SIGNING_SECRET` | no | Firma de URLs de `planes`/`recursos` | Si falta se usa `BETTER_AUTH_SECRET`. |
| `TRANSCODE_API_KEY` | no | Key del servicio global de compresión de video | Solo si se sube video propio. Ver `codetlon-cloud/.claude/modules/video-transcode.md`. |
| `BETTER_AUTH_SECRET` | si (prod) | Firma de sesiones/tokens | `openssl rand -base64 32`. Sin ella `auth` lanza en produccion. **No rotar sin invalidar sesiones.** |
| `BETTER_AUTH_URL` | no | Origen publico de la API de auth | Por defecto `NEXT_PUBLIC_SITE_URL`. |
| `NEXT_PUBLIC_SITE_URL` | si | Links de los mails (confirmar cuenta, invitacion) | `https://vimetsalud.com.ar`. |
| `CLINICAL_DATA_ENCRYPTION_KEY` | si | Cifrado AES-256-GCM de datos clinicos | **La misma de hoy**: sin ella los campos `_enc` no se leen. Respaldar fuera de Coolify. |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | si | Mails (auth, turnos, contacto) | Remitente `@vimetsalud.com.ar`. |
| `COMPANY_EMAIL` | si | Destino del formulario de contacto | |
| `APP_ENV` | test/prod | `test` fuerza sandbox de correo; `production` lo prohibe | Ver `lib/email/auth.ts`. |
| `MAIL_SANDBOX_TO` | solo test | Todo mail de test va a esta casilla | `codetloncordoba+prueba@gmail.com`. |

App mobile: solo `EXPO_PUBLIC_API_URL`.

Scripts de migracion (no son parte del runtime): `SOURCE_DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`SUPABASE_ACCESS_TOKEN` (solo `conteos-prod.mjs`).

Se quitan al cerrar la migracion: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
