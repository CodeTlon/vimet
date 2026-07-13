# VIMET

Plataforma web para VIMET — Nutrición y entrenamiento especializado en alteraciones metabólicas (Córdoba, Argentina).

**Stack:** Next.js 14 · TypeScript · Tailwind CSS · Shadcn/UI · Supabase · Resend · Vercel

## Setup

```bash
npm install
cp .env.example .env.local   # completar variables
npm run dev
```

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Dev server (localhost:3000) |
| `npm run build` | Build producción |
| `npm start` | Serve producción |
| `npx playwright test` | Tests E2E |

## Variables de entorno

Ver `.env.example` para el listado completo. Obligatorias:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
RESEND_FROM_EMAIL
COMPANY_EMAIL
NEXT_PUBLIC_SITE_URL
```

## Deploy

Vercel + Supabase. Configurar las variables de entorno en el panel de Vercel.

---

## Changelog

| Versión | Fecha | Cambios |
|---------|-------|---------|
| v0.8.0 | 2026-07-13 | Chat de feedback semanal (tabla `feedback_mensajes`, migración `0009`): reemplaza el par fijo dudas/respuesta por un hilo de mensajes abierto solo durante la semana en curso, con edición del último mensaje propio. Turnos: al borrar una franja horaria, el staff ve la lista de turnos cancelados con link directo a WhatsApp por paciente (la cancelación + email por Resend ya existían). Fix del flash de "no logueado" ~1s en el navbar al cargar el home. Fotos de usuario (perfil, recursos, adjuntos de feedback) se comprimen a webp con `sharp` antes de subir a Storage; tope de video bajado a 40MB (sin transcodificación server-side, no viable sin ffmpeg en Vercel); 2 imágenes estáticas del home comprimidas ~83%. Fix de storage huérfano: la foto de perfil anterior se borra del bucket `sitio` al reemplazarla. Colores por tipo de servicio: entrenamiento en azul, plan integral en verde. |
| v0.7.0 | 2026-07-11 | Baseline de seguridad + performance percibida. Headers de seguridad en `next.config.mjs` (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS). Auditoría de RLS/IDOR sobre las tablas del módulo seguimiento + `turnos`/`profiles`: sin gaps, ya endurecidas en migraciones previas. Fix de **open redirect** en `app/auth/callback/route.ts` (`next` param ahora pasa por un allowlist de paths relativos). Progresivo: `loading.tsx` con skeletons (shadcn) en las páginas públicas (incluido el wizard de turno), login, registro y el flujo de auth por link; `error.tsx`/`global-error.tsx` con fallback de marca para fallas de render. |
| v0.6.1 | 2026-07-06 | Hero: clips nuevos (desktop 1280×720/24fps CRF23, 5.2MB; mobile 540×960/24fps CRF28, 3.3MB) reemplazan los placeholders en `hero-training.mp4`/`hero-training-mobile.mp4` + poster regenerado. Contraste: scrim mobile pasa de gradiente lateral a negro sólido `/90` (el texto ocupa todo el ancho ahí) y el degradé superior es más oscuro/alto en desktop para legibilidad del navbar. Contenido del hero ahora corre dentro de `.container-vimet` (max-w 1280px) en vez de padding suelto, alineado con el resto de las secciones. |
| v0.6.0 | 2026-07-05 | Contenido editable desde `/admin/contenido` (servicios, metodología, ubicación/contacto) y perfil personal de cada profesional desde `/admin/configuracion` — migración `0007_contenido_editable.sql` (tabla `contenido_sitio`, columnas de perfil público en `profiles`, bucket `sitio`). Hero video con fuente mobile aparte (`hero-training-mobile.mp4`, 854×480 CRF27, 314KB vs 12MB) vía `<source media>` nativo. `next.config.mjs` acota `qualities` de imágenes. |
| v0.5.0 | 2026-07-04 | Hero home: panel derecho pasa de foto estática a video autoplay (`<video autoPlay muted loop playsInline>`), clip de 10s recortado (720p, CRF18 libx264, sin audio, faststart, 9MB) + poster del primer frame para evitar flash negro mientras carga. |
| v0.4.0 | 2026-06-21 | Limpieza: se quita el parche `NODE_OPTIONS=--max-http-header-size=65536` de los scripts `dev`/`start`. Verificado que sobra: la sesión de auth (~3-6KB aun chunked por `@supabase/ssr`) está muy por debajo del default de Node de 16KB (probado con `next start` sin el flag: cookies hasta 15KB → 200, 431 recién a ≥16KB) y el flag solo aplicaba a dev/start local, **nunca a Vercel** (que no corre `next start`). Era cruft mal aplicado, sumado junto al `bodySizeLimit:16mb` de uploads en `d246650`. Build verde. |
| v0.3.0 | 2026-06-14 | Seguridad/upgrade: Next 14.2.35 → 15.5.19 (codemod `next-async-request-api`: `params` como Promise + `cookies()` con `UnsafeUnwrappedCookies`). Smoke E2E nuevo con Playwright (login staff + rutas `/admin` + ruta `[id]` inexistente → notFound). `npm audit` 5 (4 high) → 2 moderate (postcss-en-Next). `npm run test:e2e` |
| v0.2.0 | 2026-06-02 | Flujo de invitación para staff: `/auth/confirmar` (implicit + PKCE), `/auth/nueva-contrasena`, `nuevaContrasenaAction`. `HashInviteHandler` detecta tokens de invite en el hash y redirige automáticamente. Layout refactorizado: route group `(public)` con Navbar/Footer; admin y auth sin navbar pública. |
| v0.1.0 | 2026-06-02 | Página `/admin/configuracion`: configurar profesional (asigna rol + linkea servicios/horarios), cambiar contraseña. Registro de pacientes deja cuenta inactiva hasta activación manual desde listado de pacientes admin. |

## Licencia

© 2026 CodeTlon. Todos los derechos reservados. Software propietario del cliente/CodeTlon.
Prohibida su copia, redistribución o reuso sin autorización escrita. Ver [LICENSE](./LICENSE).
