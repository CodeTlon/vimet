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
