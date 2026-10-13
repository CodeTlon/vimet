# Variables de entorno del backend propio

`.env.example` del repo todavia lista las de Supabase (el archivo esta protegido en el sandbox de `dev1`: reducirlo a
esta tabla al integrar). Sin comillas en Coolify.

| Variable | Obligatoria | Para que | Notas |
|---|---|---|---|
| `DATABASE_URL` | si | Postgres (Drizzle + Better Auth) | Red interna de Coolify; sin puerto publico. |
| `BETTER_AUTH_SECRET` | si (prod) | Firma de sesiones/tokens | `openssl rand -base64 32`. Sin ella `auth` lanza en produccion. **No rotar sin invalidar sesiones.** |
| `BETTER_AUTH_URL` | no | Origen publico de la API de auth | Por defecto `NEXT_PUBLIC_SITE_URL`. |
| `NEXT_PUBLIC_SITE_URL` | si | Links de los mails (confirmar cuenta, invitacion) | `https://vimetsalud.com.ar`. |
| `S3_ENDPOINT` | si | MinIO interno (`http://minio:9000`) | |
| `S3_REGION` | no | Por defecto `us-east-1` | |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | si | Credenciales del bucket, una por entorno | Solo sobre los 4 buckets. |
| `S3_PUBLIC_URL` | si | Host publico para `ejercicios-media` y `sitio` | Entra en la CSP y en `next/image`. |
| `S3_BUCKET_PREFIX` | no | Prefijo por entorno (`test-`) | Vacio en prod. |
| `CLINICAL_DATA_ENCRYPTION_KEY` | si | Cifrado AES-256-GCM de datos clinicos | **La misma de hoy**: sin ella los campos `_enc` no se leen. Respaldar fuera de Coolify. |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | si | Mails (auth, turnos, contacto) | Remitente `@vimetsalud.com.ar`. |
| `COMPANY_EMAIL` | si | Destino del formulario de contacto | |
| `APP_ENV` | test/prod | `test` fuerza sandbox de correo; `production` lo prohibe | Ver `lib/email/auth.ts`. |
| `MAIL_SANDBOX_TO` | solo test | Todo mail de test va a esta casilla | `codetloncordoba+prueba@gmail.com`. |

App mobile: solo `EXPO_PUBLIC_API_URL`.

Scripts de migracion (no son parte del runtime): `SOURCE_DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`SUPABASE_ACCESS_TOKEN` (solo `conteos-prod.mjs`).

Se quitan al cerrar la migracion: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
