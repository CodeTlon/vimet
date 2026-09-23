# Entornos — Vimet

> ⚠️ **Desactualizado (última confirmación 22/09):** este documento describe un
> esquema Vercel Preview/Production que no es como corre el proyecto en la
> práctica — la producción real (`vimetsalud.com.ar`) la sirve **Coolify**, no
> Vercel. **Confirmado con evidencia dura vía la API de Coolify** (no por
> inferencia): el Supabase de producción real es `ayjzcxvtylvsjacgjxgh`,
> **distinto** de `vimet-dev` (`qwzlhbecpgysgophpbyf`, el que usa este repo en
> local) — ver el quirk correspondiente en `.claude/CLAUDE.md` y el detalle en
> `.ai/context/ARCHITECTURE.md`. Sigue sin confirmarse cómo Coolify maneja sus
> propios entornos/ramas (auto-deploy en push vs. trigger manual) — hasta que
> se audite eso y se reescriba esta guía entera, no asumir que el resto de este
> documento refleja la infra real.

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
