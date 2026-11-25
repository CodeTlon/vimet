# ARCHITECTURE — VIMET (web)

Para la tabla "qué archivo abrir para tal cambio", ver `/ARCHITECTURE.md` (raíz) — este documento es el nivel de sistema, no el de archivo.

## Capas (backend propio — rama `feature/dev1-backend-propio`, en `dev`/`test`)

- **UI**: App Router de Next.js, Server Components por defecto, `'use client'` solo donde hay interactividad. Tailwind + Shadcn/UI + Lucide.
- **Acciones web**: `actions/*.ts` exponen únicamente `*Action` delgadas: toman la identidad de la sesión, parsean el `FormData` y llaman a un servicio. **Todo export de un archivo `'use server'` es invocable desde el cliente**; por eso ahí nunca hay funciones que reciban un `userId`.
- **Servicios**: `lib/services/*` (turnos, horarios, staff, recursos, ficha, mediciones, evaluaciones, evolución, objetivos, planes, plan-secciones, feedback, entrenamiento, wearable) — reglas de negocio, cifrado y auditoría, SIN `'use server'`. Los usan la web y la app mobile, así que la paridad de permisos es estructural, no manual.
- **Datos**: Postgres con Drizzle (`db/schema.ts`, `drizzle/*.sql`), pool `pg` en `lib/db.ts`. **Sin RLS**: cada consulta filtra por la sesión y los permisos viven en `lib/data/*` y `lib/services/*` (ver `docs/migracion/AUTORIZACION.md`, con la tabla policy → guard → test). Exclusion constraints de turnos/horarios y triggers de `updated_at`/auditoría en `drizzle/0001`.
- **Auth**: Better Auth (`lib/auth.ts`): email+password, confirmación de email que activa la cuenta, recuperación por código de 8 dígitos (emailOTP), plugin bearer para la app. Hashes bcrypt de Supabase verificables. `proxy.ts` es solo un redirect optimista por cookie.
- **Storage**: Volumen del servidor vía `lib/storage/disk.ts` (ruta pública `/media/<bucket>/...`; los privados con URL firmada HMAC): `planes` y `recursos` privados (URL firmada tras verificar permiso), `sitio` y `ejercicios-media` públicos.
- **Email**: Resend, dominio verificado (`vimetsalud.com.ar`), política por entorno en `lib/email/sandbox.ts` (`APP_ENV`, `MAIL_SANDBOX_TO`). Los de autenticación (`lib/email/auth.ts`) lanzan si fallan; los de turnos son best-effort.

## Superficie dual: web (cookie) vs mobile (bearer)

1. **Web**: páginas y acciones resuelven la sesión con `lib/auth/session.ts` (cookie) y llaman a servicios/consultas.
2. **Mobile**: `POST /api/mobile/data` recibe `{op, args}` (JSON o multipart con archivos) y despacha a un **catálogo cerrado** (`lib/mobile/registry.ts`, `ops-lectura.ts`, `ops-escritura.ts`). Cada operación declara `acceso: usuario|staff|admin`, valida argumentos con Zod y delega en los mismos servicios que la web. Auth: `lib/auth/mobile.ts` (`requireMobileUser/Staff/Admin`, chequea `profiles.activo` en el servidor). Lo que necesita lógica propia (slots, turnos, horarios, staff, recursos con sharp) sigue en rutas `app/api/mobile/*`.

No hay acceso genérico a tablas desde el cliente: lo que no está en el catálogo no existe.

## Cifrado de datos clínicos + audit log

`lib/crypto/clinical.ts` (AES-256-GCM, `v1.<iv>.<tag>.<ciphertext>`, clave `CLINICAL_DATA_ENCRYPTION_KEY`) cifra `fichas_paciente` (5 campos), `evolucion_entradas.contenido` y `planes.notas`. Se cifra en `lib/services/*`; el cliente (web o app) nunca manda ni recibe columnas `_enc`. El audit log de escrituras es un trigger (`log_audit_change`) que lee el actor de `app.user_id` (`conActor`); las lecturas se registran con `logAuditView` solo en la ficha de admin. `audit_log` no tiene FK a `profiles`. Gaps conocidos y severidad: `KNOWN_ISSUES.md`.

## Deploy real — Coolify, no Vercel (histórico verificado 2026-09-22; aplica a `main`)

**Verificado de forma independiente en esta sesión** (no solo tomado de la documentación existente):
- `nslookup`/`curl -I https://vimetsalud.com.ar` → resuelve, responde `200`, headers `Server: cloudflare` + `x-powered-by: Next.js` — el dominio real está en pie y corre esta app.
- `gh api repos/CodeTlon/vimet/hooks` → `[]` (sin webhooks clásicos). `gh api orgs/CodeTlon/installations` → 5 GitHub Apps instaladas (`vercel`, un bot interno `codetlon-git-hub-app`, `netlify`, `cloudflare-workers-and-pages`, `expo`) — **ninguna es Coolify**. Esto no contradice que Coolify sea la producción real (el dominio responde, es evidencia directa), pero sí significa que el mecanismo de auto-deploy en push a `main` **no es verificable desde GitHub** — Coolify puede: (a) usar un deploy key + webhook configurado del lado de Coolify sin registrar una GitHub App, (b) hacer polling, o (c) requerir un trigger manual desde su dashboard. Ver `OPEN_QUESTIONS.md`.
- `Procfile` (`web: npm run start`) es consistente con un deploy tipo buildpack (Nixpacks/Heroku-style), que es como Coolify suele correr apps Next.js self-hosted.
- Vercel (`.vercel/project.json` local) existe como proyecto aparte — usado para preview/pruebas, no sirve el dominio real.
- El propio `.claude/CLAUDE.md` documenta esto (quirk "Deploy real es Coolify, no Vercel", 09/09) — la verificación de esta sesión lo corrobora de forma independiente en vez de asumirlo.
- **Confirmado con evidencia dura (2026-09-22), no por inferencia**: con el token de la API de Coolify (`http://51.91.253.54:8000/`) se listó `GET /api/v1/applications` → la app `vimet` (uuid `ukzph5jqj5fxsl96xzyffeh7`, `fqdn=https://vimetsalud.com.ar`) es la que sirve el dominio real. `GET /api/v1/applications/{uuid}/envs` sobre esa app confirma `NEXT_PUBLIC_SUPABASE_URL=https://ayjzcxvtylvsjacgjxgh.supabase.co` — un proyecto Supabase separado de `vimet-dev` (`qwzlhbecpgysgophpbyf`). Ese proyecto de prod tiene un gap real de 6 migraciones respecto al código deployado — ver `KNOWN_ISSUES.md` #1 (CRÍTICA). `RESEND_FROM_EMAIL` en ese mismo entorno ya está bien (`no-reply@vimetsalud.com.ar`).
- `README.md` (raíz) y `docs/environments.md` **todavía dicen "Vercel + Supabase"** y describen un esquema de Preview/Production que no refleja la infra real — `docs/environments.md` ya tiene un aviso de "desactualizado" agregado el 09/09, pero no está reescrito. `README.md` no tiene ese aviso. No se tocó ninguno de los dos en esta sesión (fuera del scope de los entregables acordados) — queda anotado en `KNOWN_ISSUES.md` como fix de documentación pendiente, de severidad baja pero con impacto real (alguien puede seguir esas instrucciones y configurar el entorno equivocado).

## Mobile app cliente (`../vimet-app`)

Expo Router (React Native). En la rama `feature/dev1-backend-propio` **no usa supabase-js**: login/logout/recuperación por HTTP plano contra `/api/auth/*` de este repo con token bearer guardado en SecureStore (`lib/auth.ts`, `lib/secure-store.ts`), y datos por `datos(op, args, archivos?)` de `lib/api.ts`. Variables: solo `EXPO_PUBLIC_API_URL`. **No probada en dispositivo.** En `main` (producción) sigue con Supabase directo hasta el corte.
