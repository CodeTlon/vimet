# Ensayo y corte: Supabase -> Coolify (Postgres propio)

Actualizado 2026-11-25. **El corte se hizo el 2026-11-25** (22:04-22:12 UTC): produccion corre en `vimet-produccion` con Postgres propio; la app vieja `vimet` (Supabase) se borro. Este documento queda como registro y receta (rollback ya no aplica: Supabase solo conserva el estado previo al corte).

## Recursos (Coolify `https://coolify.codetlon.com.ar`, proyecto "Vimet")
| Recurso | UUID | Rama | Dominio | Estado |
|---|---|---|---|---|
| `vimet-test` | `eenyumu5fmauotsd3d3fdmk8` | `test` | `https://test.vimetsalud.com.ar` | Corriendo. Datos importados de prod el 2026-11-25. Correo en sandbox. |
| `vimet-produccion` | `2qb26vmqtsxvwfojdpcv0yz8` | `main` | (se asigna en el corte) | Variables cargadas, **auto-deploy apagado**, nunca deployado. |
| `vimet` (viejo) | `ukzph5jqj5fxsl96xzyffeh7` | `main` | `https://vimetsalud.com.ar` | Nixpacks + Supabase `ayjzcxvtylvsjacgjxgh`. Auto-deploy desde `main`. |

Los dos recursos nuevos son Docker Compose (`/docker-compose.coolify.yml`): app + Postgres 17 + volumen `storage`, sin puerto publico en la base. DNS en Cloudflare: `test` A `51.91.253.54` (Proxied), igual que la raiz.
Secretos de prod (clave de cifrado clinico incluida) respaldados fuera de Coolify por Mateo.

## 1. Ensayo en `test` (hecho 2026-11-25)
- Esquema: lo crea la app al arrancar (`scripts/migrate.mjs`, falla cerrado).
- Datos: `importar.mjs --apply` desde Supabase prod (solo lectura) -> 8 usuarios, 4 servicios, 15 horarios, contenido del sitio; conteos y checksums OK en todas las tablas.
- Storage: prod tiene 0 objetos; no hubo nada que copiar.
- Catalogo de ejercicios: 1324 ejercicios + GIF/imagen cargados en el volumen y traducidos (seed + `traducir-ejercicios.mjs`).
- **Falta**: pasada manual (login de Avril y Gero con su contrasena de siempre, registro + mail, turno, ficha, plan).

### Seed de ejercicios en un recurso de Coolify (en el VPS, no desde la PC: baja ~140 MB)
Copiar `scripts/seed-ejercicios.mjs`, `scripts/traducir-ejercicios.mjs` y un `package.json` (`{"type":"module","dependencies":{"pg":"8.16.3"}}`) a una carpeta del VPS y:
```sh
docker run --rm --user 100:101 --network <uuid-recurso> -v <uuid-recurso>_storage:/data/storage -v $PWD:/s -w /s -e HOME=/tmp   -e DATABASE_URL='postgres://vimet:<SERVICE_PASSWORD_POSTGRES>@db:5432/vimet' -e STORAGE_DIR=/data/storage   -e STORAGE_PUBLIC_URL=https://<dominio>/media node:22-alpine   sh -c 'npm i --silent --cache /tmp/npm && node seed-ejercicios.mjs && node traducir-ejercicios.mjs'
```
`--user 100:101` es el usuario `app` de la imagen (los archivos quedan a su nombre). Las URLs se guardan absolutas: usar el dominio definitivo del entorno.

### Como conectarse a una base de Coolify (no tiene puerto publico)
```powershell
# IP del contenedor db (cambia en cada deploy)
C:\Windows\System32\OpenSSH\ssh.exe codetlon-vps 'docker inspect -f "{{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}" <nombre-del-contenedor-db>'
C:\Windows\System32\OpenSSH\ssh.exe -N -L 41432:<ip>:5432 codetlon-vps
```
`DATABASE_URL=postgres://vimet:<SERVICE_PASSWORD_POSTGRES del recurso>@127.0.0.1:41432/vimet`.

### Origen Supabase
El host directo `db.ayjzcxvtylvsjacgjxgh.supabase.co` es **solo IPv6**. Desde IPv4 usar el pooler:
`SOURCE_DATABASE_URL=postgresql://postgres.ayjzcxvtylvsjacgjxgh:<password>@aws-1-us-west-2.pooler.supabase.com:5432/postgres`.
`importar.mjs` abre el origen con TLS y `default_transaction_read_only=on`.

## 2. Corte (ventana de bajo trafico; avisar a Avril y Gero)
**Mergear `test` -> `main` ES el corte**: la app vieja `vimet` auto-deploya `main` con Nixpacks y el codigo nuevo no arranca sin Postgres. Orden:
1. Apagar el auto-deploy de la app vieja `vimet` (Coolify -> Configuration -> Advanced) para que el merge no la rompa.
2. Mergear el PR `test` -> `main`.
3. En `vimet-produccion`: Reload compose (ahora `main` tiene `docker-compose.coolify.yml`), dominio temporal `https://vimet-prod.51.91.253.54.sslip.io` en el servicio `app`, Deploy. Esperar `/api/health` en 200.
4. Modo mantenimiento: Stop de la app vieja `vimet`. Desde aca no entran datos nuevos a Supabase.
5. Tunel a la base de `vimet-produccion` e `importar.mjs --apply` (dry-run antes). Debe terminar en `VERIFICACION OK`.
6. Cambiar el dominio de `vimet-produccion` a `https://vimetsalud.com.ar,https://www.vimetsalud.com.ar`, actualizar `SERVICE_URL_APP`/`SERVICE_FQDN_APP` y redeploy. DNS no cambia (ya apunta al VPS).
6b. Seed de ejercicios en `vimet-produccion` (ver seccion 1) con `STORAGE_PUBLIC_URL=https://vimetsalud.com.ar/media`.
7. Smoke: health, home, login de Avril y Gero, registro con mail real, reservar/cancelar turno, ficha (cifrado), robots.txt con `Allow` y sitemap con el dominio real.
8. Encender el auto-deploy de `vimet-produccion`. Supabase queda en solo lectura con fecha de baja (sugerido: 2 semanas).
9. Backup B2 (`docs/BACKUPS.md` de codetlon-cloud, `FILES_MODE=volume`) + simulacro de restauracion fechado en `.claude/CLAUDE.md`. Sin esto no se da el corte por terminado.
10. Rotar las credenciales de Supabase usadas para el import (secret key y password de la base) y el token de Coolify.

## 3. Rollback
Hasta el paso 8: Start de la app vieja `vimet` (Supabase intacto) y devolverle el dominio. Despues, las filas nuevas
creadas en Postgres hay que llevarlas a mano: decidir antes del corte.

## 4. Cierre
Borrar la app vieja `vimet`, `supabase/` y las variables de Supabase; actualizar README/ARCHITECTURE; app mobile
apuntando a la API nueva (la version de las stores habla con Supabase: forzar update antes de la baja).
