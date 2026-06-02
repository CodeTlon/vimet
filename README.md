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
| v0.2.0 | 2026-06-02 | Flujo de invitación para staff: `/auth/confirmar` (implicit + PKCE), `/auth/nueva-contrasena`, `nuevaContrasenaAction`. `HashInviteHandler` detecta tokens de invite en el hash y redirige automáticamente. Layout refactorizado: route group `(public)` con Navbar/Footer; admin y auth sin navbar pública. |
| v0.1.0 | 2026-06-02 | Página `/admin/configuracion`: configurar profesional (asigna rol + linkea servicios/horarios), cambiar contraseña. Registro de pacientes deja cuenta inactiva hasta activación manual desde listado de pacientes admin. |
