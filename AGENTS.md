# VIMET (web)

App de nutrición/entrenamiento para VIMET (Avril + Gero, Córdoba). Next.js 16 (App Router) + Supabase (Postgres/RLS/Auth/Storage) + Resend. Migración de un sitio PHP MVC + MySQL. Sirve: sitio público, auth + booking de turnos, área paciente, dashboard admin/staff, y un módulo de seguimiento clínico-nutricional (ficha, mediciones, evaluación funcional, planes, feedback semanal, evolución, objetivos, recursos).

> ⚠️ **Este proyecto está en producción con datos reales de pacientes.** Nunca mutar datos de producción sin confirmación explícita del usuario. Nunca asumir el mecanismo de deploy o el estado de una migración — verificarlo (ver `.ai/context/ARCHITECTURE.md`). Cualquier hallazgo de seguridad real (credencial expuesta, falta de auth server-side, vulnerabilidad crítica) se documenta en `.ai/context/KNOWN_ISSUES.md`, no se "arregla de paso".

## Repo hermano

`../vimet-app` (Expo/React Native) es el cliente mobile — consume este backend vía 15 rutas `app/api/mobile/*` (auth Bearer) más el SDK de Supabase directo para el resto. Un cambio de contrato en esas rutas, o en las reglas de negocio que ambos lados deben respetar, rompe la app mobile en silencio si no se revisa `../vimet-app`.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind (utility-only, sin styled-jsx) · Shadcn/UI · Lucide React · Supabase (Postgres + RLS + Auth + Storage) · Resend · `sharp` (optimización de imágenes) · Zod + `useActionState` (React 19, no `useFormState`). Deploy real: **Coolify** (self-hosted, sirve `vimetsalud.com.ar`) — Vercel existe aparte, solo preview/pruebas (ver quirk "Deploy real es Coolify, no Vercel" en `.claude/CLAUDE.md` y el detalle en `.ai/context/ARCHITECTURE.md`).

## Comandos

```bash
npm run dev          # Dev server
npm run build        # Build producción
npm start            # Serve producción (Procfile: web: npm run start)
npx playwright test  # E2E (e2e/global-setup.ts crea staff efímero por service role)
npm audit            # Ver .ai/context/KNOWN_ISSUES.md — hay un CRÍTICO sin parchear hoy
```

## Mapa rápido

| Área | Dónde |
|---|---|
| Server Actions por módulo | `actions/*.ts` (uno por entidad: `turnos`, `horarios`, `staff`, `ficha`, `mediciones`, `evaluaciones`, `planes`, `plan-secciones`, `plan-ejercicios`, `feedback`, `evolucion`, `objetivos`, `recursos`, `ejercicios`, `contenido`, `auth`, `contacto`) |
| Rutas API mobile (Bearer, consumidas por `vimet-app`) | `app/api/mobile/*` |
| Rutas API web con soporte dual cookie/bearer | `app/api/slots`, `app/api/auth/check-email` |
| Cliente Supabase cookies / admin / bearer | `lib/supabase/{server,client,admin,bearer,auth-helpers}.ts` |
| Fechas en zona Argentina (nunca `Date().toISOString()` para "hoy") | `lib/datetime.ts` |
| Cifrado de campos clínicos sensibles | `lib/crypto/clinical.ts` — ver estado real (a medias) en `.ai/context/KNOWN_ISSUES.md` |
| Audit log de accesos | `lib/audit.ts` — prácticamente sin usar hoy, ver `KNOWN_ISSUES.md` |
| Migraciones (nunca editar una ya aplicada) | `supabase/migrations/*.sql` — última: `0039` |
| Mapa de archivos completo + DB + Quirks detallados (memoria de sesión mutable) | `.claude/CLAUDE.md` |
| Tabla "qué abrir para cada tipo de cambio" | `ARCHITECTURE.md` (raíz) |

## Convenciones críticas (ver `.ai/context/CONVENTIONS.md` para el resto)

- **Fechas**: siempre `lib/datetime.ts` (`hoyArgentina`, `lunesDeSemanaArgentina`) — el server corre en UTC y `new Date().toISOString().slice(0,10)` corre un día después de las 21:00 en Córdoba.
- **Inputs decimales** (peso, pliegues ISAK, etc.): `type="text" inputMode="decimal"`, nunca `type="number"` — el navegador vacía el campo en silencio si el usuario tipea coma (convención argentina).
- **Dropdowns**: siempre `components/ui/select.tsx`, nunca un `<select>` nativo nuevo.
- **Server Actions**: firma `(prevState, formData)` + `useActionState` de `react` (no `useFormState`, removido en React 19).
- **Redirects post-auth con param `next`/`token`**: siempre por un allowlist de paths relativos (`safeNextPath`) — nunca `new URL(paramCrudo, origin)` (fue un open redirect real, ya corregido).
- **RLS + triggers**: los triggers `BEFORE UPDATE` que bloquean auto-escalación de rol/turnos arbitrarios chequean `auth.uid() is null or is_staff()` — si agregás un trigger nuevo sobre una tabla que recibe writes del cliente admin (service role), sumale ese mismo bypass o vas a romper una Server Action en silencio.
- **Storage** (`planes`, `recursos`): privados, acceso solo vía signed URL con verificación de permisos en la Server Action — nunca exponer paths directo.

## Workflow de mantenimiento

Este repo usa los skills `/cambio` (abre rama de sesión) y `/cerrar` (build + changelog + merge + tag) — cada sesión de mantenimiento actualiza `.claude/CLAUDE.md` (Historial de Cambios + Quirks) y el Changelog de `README.md`. Esa memoria de sesión sigue viva igual que siempre; no la reemplaza lo de abajo.

## Para más contexto

- **`.ai/context/00_INDEX.md`** — qué leer según el tipo de tarea (arquitectura, dominio de negocio, decisiones tomadas y por qué, estado actual, issues conocidos con severidad, preguntas abiertas).
- **`.claude/CLAUDE.md`** — memoria de sesión mutable: mapa de archivos exhaustivo, esquema completo de DB, Quirks detallados, Historial de Cambios versionado. Se sigue actualizando con `/cerrar`.
- **`ARCHITECTURE.md`** (raíz) — tabla rápida "para este cambio, abrí esto".

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
