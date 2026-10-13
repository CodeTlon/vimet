# Flujo de entornos: dev / test / main

Modelo de la fabrica (`codetlon-cloud/.claude/modules/entornos.md`) aplicado a VIMET.

| Rama | Entorno | Estado | Datos |
|------|---------|--------|-------|
| `dev` | Desarrollo. Hoy: `npm run dev` contra el Supabase `vimet-dev`. Tras la migracion a backend propio: Docker Compose local | siempre disponible | descartables |
| `test` | App `vimet-test` en Coolify (espejo de `main`) | **apagada**; se enciende antes del PR a `main` | Supabase `vimet-dev` (hoy), Postgres `vimet-test` (despues). Nunca produccion |
| `main` | Produccion: app `vimet` en Coolify, `vimetsalud.com.ar` | siempre prendida | reales |

## Flujo

1. Trabajo en `feature/<origen>-<tarea>` (origen `dev1`, `dev2` o `local`) y PR hacia `dev`. CI (`ci.yml`): lint + typecheck + build + `npm audit`.
2. Cuando `dev` esta listo: PR de `dev` a `main`. `entornos.yml` enciende `vimet-test`, la deploya, corre el smoke E2E contra su URL y la apaga al cerrar o mergear el PR.
3. Se mergea. Coolify publica produccion. Cuando exista `produccion.yml` habilitado, el release pasa por el Environment `production` (aprobacion manual) y por el gate de backup.
4. Promover `dev -> test -> main` lo hace Mateo. Ningun agente pushea a `dev`, `test` ni `main`.

## Correo en test

`test` nunca escribe a clientes reales. Variables de la app `vimet-test` (cargar SIN comillas):

```
APP_ENV=test
RESEND_FROM_EMAIL=onboarding@resend.dev
MAIL_SANDBOX_TO=codetloncordoba+prueba@gmail.com
COMPANY_EMAIL=codetloncordoba+prueba@gmail.com
```

`lib/email/sandbox.ts` redirige todo mail a `MAIL_SANDBOX_TO` (el destinatario original queda en el asunto) y no envia nada si `APP_ENV=test` y falta `MAIL_SANDBOX_TO`. En produccion definir `APP_ENV=production`: el guard se niega a enviar si ve `MAIL_SANDBOX_TO` o el remitente `onboarding@resend.dev`. Sin `APP_ENV` el comportamiento es el de siempre (pasa tal cual).

## Puesta en marcha (pasos manuales, los hace Mateo)

### 0. Workflows de GitHub Actions

Los tres YAML viven en `docs/workflows/` y hay que copiarlos a `.github/workflows/` con una credencial que tenga permiso `workflow` (el token de la cuenta `dev1` no lo tiene, por eso no estan activos):

```bash
mkdir -p .github/workflows
cp docs/workflows/{ci,entornos,produccion}.yml .github/workflows/
git add .github/workflows && git commit -m "ci: activar workflows de entornos" && git push
```

### 1. Ramas

`origin/dev` esta abandonada (quedo en julio, con commits de Dokku). Se archiva y se recrea desde `main`:

```bash
git fetch --all --prune
git push origin origin/dev:refs/heads/archive/dev-dokku-2026-07   # respaldo
git push origin --delete dev
git push origin main:dev
git push origin main:test
```

Luego en GitHub: proteger `main`, `test` y `dev` (PR obligatorio, CI verde).

### 2. Coolify

1. Crear la app `vimet-test` (mismo repo, rama `test`, buildpack igual que `vimet`), con su propio dominio de prueba. Variables: las de `vimet` **apuntando al Supabase `vimet-dev`** (`qwzlhbecpgysgophpbyf`), mas las de correo de arriba. Dejarla **apagada**.
2. Desactivar el auto-deploy por push de la app `vimet` solo si se va a habilitar `produccion.yml`; mientras tanto Coolify sigue desplegando `main` como hoy.
3. Crear un token de API de Coolify (con la API habilitada) para GitHub.

### 3. GitHub

Secrets del repo: `COOLIFY_URL`, `COOLIFY_TOKEN`, `TEST_APP_UUID`, `TEST_URL`, `TEST_SUPABASE_URL`, `TEST_SUPABASE_SERVICE_ROLE_KEY`.
`TEST_SUPABASE_*` es el proyecto `vimet-dev`. `e2e/global-setup.ts` crea un usuario staff de smoke y **se niega a correr** si la URL contiene el ref de produccion (`ayjzcxvtylvsjacgjxgh`).

Para `produccion.yml` (deshabilitado por defecto): Environment `production` con required reviewers, variables `PROD_APP_UUID`, `PROD_URL`, y la variable de repo `PRODUCCION_HABILITADA=true` cuando se quiera activar. El gate de backup (`BACKUP_GATE=true`) se enciende cuando exista el backup a B2.

## Estado de verificacion

- `ci.yml`, `entornos.yml` y `produccion.yml` (en `docs/workflows/`) **no se ejecutaron todavia** (no hay runner ni secrets en esta maquina). El esqueleto viene del template de la fabrica, que tambien esta marcado como "validar con una corrida real". Primera corrida real: abrir un PR de prueba hacia `dev` y otro `dev -> main`.
- `lib/email/sandbox.ts` y los 3 call sites de Resend (`lib/email/resend.ts`, `actions/contacto.ts`, `actions/horarios.ts`) compilan; el guard no se probo con un envio real.
