# Entornos — Vimet

> ⚠️ **Desactualizado (09/09):** este documento describe un esquema Vercel
> Preview/Production que no es como corre el proyecto en la práctica — la
> producción real (`vimetsalud.com.ar`) la sirve **Coolify**, no Vercel; ver
> el quirk "Deploy real es Coolify, no Vercel" en `.claude/CLAUDE.md`. No se
> confirmó todavía cómo Coolify maneja sus propios entornos/ramas ni si usa
> el mismo proyecto de Supabase que dev — hasta que se audite y reescriba
> esta guía, no asumir que lo de abajo refleja la infra real.

App con **Supabase** (auth + roles + área de pacientes/staff). Trabaja con **dos entornos**
separados para probar el flujo de invitaciones, activación y roles sin tocar datos reales.

| Rama  | Vercel Environment | URL                                  | Supabase project |
|-------|--------------------|--------------------------------------|------------------|
| `main`| **Production**     | https://vimet.com (o dominio prod)   | `vimet-prod`     |
| `dev` | **Preview**        | `vimet-git-dev-<team>.vercel.app`    | `vimet-dev`      |

**Flujo:** desarrollás en `dev` → Vercel autodeploya a Preview (Supabase `vimet-dev`) →
probás invitaciones/altas/roles con usuarios de prueba → merge `dev` → `main` → Production.

> Toda la infra (Vercel/Supabase) la configurás vos manualmente.
> El código, las migraciones y esta guía ya están listos.

---

## Setup inicial (una sola vez)

### 1. Segundo proyecto Supabase (DEV)
1. New Project `vimet-dev`, región **South America (São Paulo)**.
2. **SQL Editor** → correr en orden [`supabase/migrations/`](../supabase/migrations/)
   (`0001_init.sql` → `0002_seed.sql` → … → `0006_invited_role.sql`).
3. **Settings → API** → copiar URL + anon + service_role del proyecto DEV.
4. **Auth**: configurar el SMTP (Resend) y las **redirect/site URLs** apuntando a la **Preview**
   (clave para que los links de invitación de dev no apunten a producción).

### 2. Variables en Vercel, por entorno
Vercel → **Settings → Environment Variables**, eligiendo el **Environment** en cada una:

| Variable                        | ¿Difiere? | Production (`main`)     | Preview (`dev`)          |
|---------------------------------|-----------|-------------------------|--------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`      | **sí**    | `vimet-prod`            | `vimet-dev`              |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **sí**    | anon prod               | anon dev                 |
| `SUPABASE_SERVICE_ROLE_KEY`     | **sí**    | service_role prod       | service_role dev         |
| `NEXT_PUBLIC_SITE_URL`          | **sí**    | dominio prod            | URL de la Preview        |
| `RESEND_API_KEY`                | no        | misma                   | misma                    |
| `RESEND_FROM_EMAIL`             | no        | mismo                   | mismo (o `[DEV]`)        |
| `COMPANY_EMAIL`                 | recom.    | `hola@vimet.com`        | tu mail de prueba        |

> `NEXT_PUBLIC_SITE_URL` y las redirect URLs de Supabase Auth deben coincidir con el dominio del
> entorno; si no, los links de invitación/recuperación se rompen.

### 3. Confirmar la rama de producción
Vercel → **Settings → Git → Production Branch = `main`**. Cualquier otra rama (incl. `dev`) → Preview.

---

## Desarrollo local
`.env.local` apunta **siempre a `vimet-dev`**, nunca a prod. Partir de [`.env.example`](../.env.example).
NUNCA committear `.env.local`.
