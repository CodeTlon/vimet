# ARCHITECTURE — VIMET (web)

Para la tabla "qué archivo abrir para tal cambio", ver `/ARCHITECTURE.md` (raíz) — este documento es el nivel de sistema, no el de archivo.

## Capas

- **UI**: App Router de Next.js, Server Components por defecto, `'use client'` solo donde hay interactividad. Tailwind + Shadcn/UI + Lucide.
- **Lógica de negocio**: Server Actions en `actions/*.ts`, casi todas con el patrón `(prevState, formData)` + `useActionState`. Varias exponen además una función "pelada" (ej. `crearTurno()`, `cancelarTurno()`, `actualizarTurnoStaff()` en `actions/turnos.ts`) que la Server Action web envuelve con validación Zod + auth de cookies, y que las rutas mobile importan directo pasando la identidad resuelta por bearer — es el mecanismo real de paridad de permisos entre web y mobile (ver más abajo).
- **Datos**: Supabase Postgres, RLS en todas las tablas de negocio + triggers `BEFORE UPDATE` que bloquean auto-escalación (rol, turnos ajenos, respuestas de feedback falsificadas). Migraciones numeradas en `supabase/migrations/`, nunca editadas una vez aplicadas.
- **Storage**: dos buckets privados (`planes`, `recursos`) + uno público (`sitio`), acceso a los privados solo vía signed URL generada en una Server Action que ya verificó permiso.
- **Email**: Resend, dominio propio verificado (`vimetsalud.com.ar`) desde el 09/09 — antes corría en modo sandbox con hard-block 403 a cualquier destinatario que no fuera el email de la cuenta.

## Superficie dual: web (cookies) vs mobile (bearer)

Dos formas de llegar a la misma lógica de negocio:

1. **Web**: componentes de `app/` invocan Server Actions que usan `lib/supabase/server.ts` (cliente con cookies, sujeto a RLS) o `lib/supabase/admin.ts` (service role, bypassea RLS — usado para operaciones cross-tabla como eliminar un paciente).
2. **Mobile**: 15 rutas en `app/api/mobile/*`, auth vía `Authorization: Bearer <token>` validado en `lib/supabase/bearer.ts` (`requireMobileUser`/`requireMobileStaff`/`requireMobileAdmin`). Consumidas por `../vimet-app`.

**Patrón de paridad por diseño**: cuando una ruta mobile llama a la misma función exportada que usa la Server Action web (ej. `turnos/cancelar` → `cancelarTurno()`, igual que `cancelarTurnoAction`), el chequeo de rol/ownership vive una sola vez dentro de esa función y ambas superficies quedan sincronizadas automáticamente. Cuando la ruta mobile **reimplementa** su propio chequeo en vez de reusar la función compartida, la paridad depende de que alguien la mantenga sincronizada a mano — y ahí es donde ya hubo al menos un bug real (`toggleActivoAction` se relajó de admin-only a cualquier staff sin actualizar el endpoint mobile al mismo tiempo) y donde una auditoría reciente encontró más gaps (ver `KNOWN_ISSUES.md`).

`lib/supabase/bearer.ts` valida el token contra Supabase Auth y resuelve el `profile`, pero — igual que su equivalente web `requireAuth`/`requireStaff` — **no** chequea `profile.activo`. Ese gate vive hoy solo en `actions/auth.ts` (`loginAction`, servidor) y, del lado mobile, solo dentro de la app `../vimet-app` (`store/session.ts`, client-side) — ningún punto server-side de la superficie mobile lo re-verifica. Detalle y severidad en `KNOWN_ISSUES.md`.

## Cifrado de datos clínicos + audit log (`lib/crypto/clinical.ts`, migraciones `0038`/`0039`)

Introducido para cifrar campos sensibles de `fichas_paciente`, `evolucion_entradas.contenido` y `planes.notas` con AES-256-GCM (IV random por registro, autenticado, columna versionada `v1.<iv>.<tag>.<ciphertext>`). La implementación en sí es sólida — pero el commit que lo introdujo (`6af5db6`) se documentó a sí mismo como "sin verificar end-to-end", y una auditoría posterior confirmó por qué: el scope de qué se cifra quedó incompleto y el audit log de lecturas está wireado en un solo lugar de ocho. Detalle completo, con archivo:línea, en `KNOWN_ISSUES.md`.

## Deploy real — Coolify, no Vercel

**Verificado de forma independiente en esta sesión** (no solo tomado de la documentación existente):
- `nslookup`/`curl -I https://vimetsalud.com.ar` → resuelve, responde `200`, headers `Server: cloudflare` + `x-powered-by: Next.js` — el dominio real está en pie y corre esta app.
- `gh api repos/CodeTlon/vimet/hooks` → `[]` (sin webhooks clásicos). `gh api orgs/CodeTlon/installations` → 5 GitHub Apps instaladas (`vercel`, un bot interno `codetlon-git-hub-app`, `netlify`, `cloudflare-workers-and-pages`, `expo`) — **ninguna es Coolify**. Esto no contradice que Coolify sea la producción real (el dominio responde, es evidencia directa), pero sí significa que el mecanismo de auto-deploy en push a `main` **no es verificable desde GitHub** — Coolify puede: (a) usar un deploy key + webhook configurado del lado de Coolify sin registrar una GitHub App, (b) hacer polling, o (c) requerir un trigger manual desde su dashboard. Ver `OPEN_QUESTIONS.md`.
- `Procfile` (`web: npm run start`) es consistente con un deploy tipo buildpack (Nixpacks/Heroku-style), que es como Coolify suele correr apps Next.js self-hosted.
- Vercel (`.vercel/project.json` local) existe como proyecto aparte — usado para preview/pruebas, no sirve el dominio real.
- El propio `.claude/CLAUDE.md` documenta esto (quirk "Deploy real es Coolify, no Vercel", 09/09) — la verificación de esta sesión lo corrobora de forma independiente en vez de asumirlo.
- **Confirmado con evidencia dura (2026-09-22), no por inferencia**: con el token de la API de Coolify (`http://51.91.253.54:8000/`) se listó `GET /api/v1/applications` → la app `vimet` (uuid `ukzph5jqj5fxsl96xzyffeh7`, `fqdn=https://vimetsalud.com.ar`) es la que sirve el dominio real. `GET /api/v1/applications/{uuid}/envs` sobre esa app confirma `NEXT_PUBLIC_SUPABASE_URL=https://ayjzcxvtylvsjacgjxgh.supabase.co` — un proyecto Supabase separado de `vimet-dev` (`qwzlhbecpgysgophpbyf`). Ese proyecto de prod tiene un gap real de 6 migraciones respecto al código deployado — ver `KNOWN_ISSUES.md` #1 (CRÍTICA). `RESEND_FROM_EMAIL` en ese mismo entorno ya está bien (`no-reply@vimetsalud.com.ar`).
- `README.md` (raíz) y `docs/environments.md` **todavía dicen "Vercel + Supabase"** y describen un esquema de Preview/Production que no refleja la infra real — `docs/environments.md` ya tiene un aviso de "desactualizado" agregado el 09/09, pero no está reescrito. `README.md` no tiene ese aviso. No se tocó ninguno de los dos en esta sesión (fuera del scope de los entregables acordados) — queda anotado en `KNOWN_ISSUES.md` como fix de documentación pendiente, de severidad baja pero con impacto real (alguien puede seguir esas instrucciones y configurar el entorno equivocado).

## Mobile app cliente (`../vimet-app`)

Expo Router (React Native), consume este backend de dos formas: SDK de Supabase directo (`@supabase/supabase-js`, sesión persistida con un wrapper de cifrado propio sobre `AsyncStorage`+`expo-secure-store`) para la mayoría de las lecturas/escrituras sujetas a RLS, y `apiFetch()` hacia `app/api/mobile/*` solo para lo que necesita lógica de servidor (slots, turnos combo, uploads con `sharp`, acciones con service role). El login mobile **no pasa por ninguna ruta de este repo** — llama a `supabase.auth.signInWithPassword` directo desde la app. Ver `.ai/context/ARCHITECTURE.md` de `vimet-app` para el detalle de esa app.
