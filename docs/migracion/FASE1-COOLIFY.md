# Fase 1 - Base nueva, MinIO y backups (pasos del usuario en Coolify / VPS)

Yo dejo scripts y compose en el repo; crear recursos y pasar credenciales lo hace Mateo.
Estado de validacion al 2026-10-13: scripts con `bash -n` y compose con `docker compose config`;
**no se probaron en ejecucion** (el daemon de Docker no es accesible desde la sesion de dev1).

## 1. Recursos en Coolify
| Recurso | Notas |
|---|---|
| Postgres `vimet-prod` | Version 16, **sin puerto publico**, misma red que la app `vimet`. Anotar el UUID del recurso. |
| Postgres `vimet-test` | Igual. Se enciende junto a la app `vimet-test` (apagada por defecto). |
| MinIO `vimet-minio` (prod) | Sin exponer la consola publicamente. Anotar UUID y nombre del volumen de datos. |
| MinIO test | Puede ser el mismo servidor con buckets prefijados `test-*` o un recurso aparte; recomendado aparte. |

Buckets (los mismos nombres que hoy en Supabase, para conservar los paths):
`planes` (privado), `recursos` (privado), `ejercicios-media` (lectura publica), `sitio` (lectura publica).
Una access key por entorno con permisos solo sobre sus buckets.

Variables que la app va a necesitar (Fase 3 y 5; los nombres definitivos se fijan en el codigo):
`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`,
`S3_SECRET_ACCESS_KEY`, `S3_BUCKET_*`, `CLINICAL_DATA_ENCRYPTION_KEY` (**la misma de hoy**, ver abajo).

**Clave de cifrado clinico:** guardarla tambien fuera de Coolify (gestor de secretos). Los backups contienen
ciphertexts pero no la clave; sin ella los 7 campos clinicos son irrecuperables.

## 2. Backups en `codetlon-vps`
1. Descubrir nombres reales: `docker ps --format '{{.Names}}' | grep <UUID-postgres>` y `docker volume ls | grep <UUID-minio>`.
2. Copiar scripts: `scp scripts/backup/*.sh codetlon-vps:~/bin/` y `chmod +x`; verificar con `wc -l`.
3. Credenciales B2 en `/etc/backup/vimet.env` (chmod 600): `RCLONE_CONFIG_B2_TYPE=b2`, `..._ACCOUNT`, `..._KEY`.
   Una clave por proyecto, restringida al bucket, **sin permiso de borrado**.
4. Cron (03:30 UTC), una linea para la base y otra para los archivos:
   ```
   30 3 * * * UUID=<uuid-postgres> PROJECT=vimet ENVIRONMENT=prod FILES_MODE=none REMOTE=b2:backups-codetlon ENV_FILE=/etc/backup/vimet.env $HOME/bin/backup-coolify.sh >> $HOME/backups/backup.log 2>&1
   40 3 * * * VOLUME=<volumen-minio> PROJECT=vimet ENVIRONMENT=prod REMOTE=b2:backups-codetlon ENV_FILE=/etc/backup/vimet.env $HOME/bin/backup-minio-volume.sh >> $HOME/backups/backup.log 2>&1
   ```
   `FILES_MODE=none` en la primera porque los archivos viven en el recurso MinIO, que es otro UUID.
5. Probar con entorno minimo de cron: `env -i HOME=$HOME PATH=/usr/bin:/bin <variables> $HOME/bin/backup-coolify.sh`.
6. **Simulacro de restauracion** y anotar la fecha en `.claude/CLAUDE.md`:
   `FROM_REMOTE=b2:backups-codetlon/prod/vimet/postgres/<fecha> ENV_FILE=/etc/backup/vimet.env ~/bin/restore-test.sh`
   (no hace falta `EXTRA_ROLES`: el esquema nuevo no usa roles de Supabase).
7. Habilitar el gate de `produccion.yml` (hoy deshabilitado) cuando exista un `.dump` de menos de 24 h en B2.

## 3. Entorno local (dev)
```bash
VIMET_DB_PORT=41432 VIMET_S3_PORT=41900 VIMET_S3_CONSOLE_PORT=41901 docker compose up -d
```
Postgres: `postgres://vimet:vimet@127.0.0.1:41432/vimet`. MinIO API `http://127.0.0.1:41900`
(usuario `vimet-dev`, clave `vimet-dev-secret`, solo local). El servicio `minio-init` crea los 4 buckets.
Los tags de imagen de MinIO/mc estan fijados pero **no se pudieron verificar contra el registry**: si alguno no existe, ajustar.

## 4. Nota de alcance
Produccion tiene 0 objetos en Storage y 0 filas clinicas (ver `inventario.md`, seccion 3), asi que el backup de
archivos hoy respalda un volumen casi vacio; igual se deja listo antes del corte.
