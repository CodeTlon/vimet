#!/usr/bin/env bash
# Backup de un recurso de Coolify: base Postgres (+ volumen de archivos, opcional). Se corre en el VPS.
# Estándar de CodeTlon, derivado del script probado de recoveryparts (v2: ver "Cambios" abajo).
# Guía completa: codetlon-cloud/docs/BACKUPS.md
#
# Variables OBLIGATORIAS
#   UUID          UUID del recurso en Coolify
#   PROJECT       nombre del proyecto (ej. masiphone)
#   ENVIRONMENT   prod | staging | demo
# Opcionales
#   POSTGRES_DB / POSTGRES_USER   base y usuario de pg_dump. Si faltan se leen del entorno del contenedor (su configuración real);
#                 si la base no se puede determinar, el script falla (no hay default inventado).
#   DB_CONTAINER    nombre exacto del contenedor de la base. Si falta se DESCUBRE, en este orden:
#                   "db-<UUID>*" (servicio "db" de un compose), "postgresql-<UUID>" (Postgres de Coolify) y por último "<UUID>".
#                   Si no hay uno único, el script falla y lista los candidatos: no adivina.
#   FILES_MODE      volume (default) | none.  volume = tar.gz del volumen FILES_VOLUME; none = proyecto sin archivos locales
#   FILES_VOLUME    volumen de archivos (default: "<UUID>_storage"). Si FILES_MODE=volume y no existe, falla.
#   REMOTE          destino rclone, ej. b2:backups-codetlon (si falta, solo copia local)
#   ENV_FILE        archivo chmod 600 con RCLONE_CONFIG_B2_TYPE/ACCOUNT/KEY (nunca secretos en el crontab)
#   DEST            carpeta local (default ~/backups)      DIAS  retención LOCAL en días (default 14)
#
# Estructura remota: <entorno>/<proyecto>/{postgres,files}/<AAAA-MM-DD>/<proyecto>_<entorno>_<tipo>_<AAAAMMDDTHHMMSSZ>.<ext>
# Cada archivo lleva su .sha256. Fechas en UTC (3 h de diferencia con Argentina). La retención REMOTA la aplica el bucket
# (reglas de ciclo de vida por prefijo: prod 30 d, staging 7, demo 3), no este script.
#
# Cambios respecto a la v1 de recoveryparts (a validar en el VPS antes de reemplazar la que ya corre):
#   - Base y usuario tomados del entorno del contenedor si no se pasan (v1: default fijo "recoveryparts"; se mantiene SOLO para PROJECT=recoveryparts).
#   - Contenedor descubierto/parametrizable; FILES_MODE=none; volumen parametrizable.
#   - El tar se crea como root dentro de Docker: se hace chown al usuario actual para que el "find -delete" local funcione sin sudo.
#   - Temporales con nombre por proyecto/entorno (dos crons simultáneos no se pisan).
set -euo pipefail
: "${UUID:?Falta UUID (el del recurso en Coolify)}"
: "${PROJECT:?Falta PROJECT (ej. masiphone)}"
: "${ENVIRONMENT:?Falta ENVIRONMENT (prod | staging | demo)}"
case "$ENVIRONMENT" in prod|staging|demo) ;; *) echo "ENVIRONMENT debe ser prod, staging o demo" >&2; exit 1 ;; esac

FILES_MODE="${FILES_MODE:-volume}"
case "$FILES_MODE" in volume|none) ;; *) echo "FILES_MODE debe ser volume o none" >&2; exit 1 ;; esac

if [ -n "${ENV_FILE:-}" ]; then set -a; . "$ENV_FILE"; set +a; fi

DEST="${DEST:-$HOME/backups}"
DIAS="${DIAS:-14}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
DIA="$(date -u +%F)"
mkdir -p "$DEST"

# --- Descubrir el contenedor de la base (no asumir) ---
if [ -n "${DB_CONTAINER:-}" ]; then
  DB="$DB_CONTAINER"
  docker ps --format '{{.Names}}' | grep -qx "$DB" || { echo "No existe el contenedor $DB (¿recurso detenido?)" >&2; exit 1; }
else
  # Nombres reales en Coolify (verificado en codetlon-vps): servicio "db" de un compose => db-<UUID>-<n>;
  # recurso/servicio Postgres de Coolify => postgresql-<UUID>.
  mapfile -t CAND < <(docker ps --format '{{.Names}}' | grep -E "^(db|postgresql)-${UUID}" || true)
  if [ "${#CAND[@]}" -eq 0 ]; then mapfile -t CAND < <(docker ps --format '{{.Names}}' | grep -x "$UUID" || true); fi
  if [ "${#CAND[@]}" -ne 1 ]; then
    echo "No pude determinar UNA base para UUID=$UUID (candidatos: ${CAND[*]:-ninguno})." >&2
    echo "Contenedores que contienen el UUID: $(docker ps --format '{{.Names}}' | grep "$UUID" | tr '\n' ' ')" >&2
    echo "Pasá DB_CONTAINER=<nombre exacto>." >&2
    exit 1
  fi
  DB="${CAND[0]}"
fi
# Usuario y base: lo que pasó el cron; si no, la configuración REAL del contenedor (POSTGRES_USER/POSTGRES_DB de su entorno).
# Nunca un default inventado: si no se puede determinar la base, falla (recoveryparts conserva su valor histórico).
PGU="${POSTGRES_USER:-$(docker exec "$DB" printenv POSTGRES_USER 2>/dev/null || true)}"; PGU="${PGU:-postgres}"
PGD="${POSTGRES_DB:-$(docker exec "$DB" printenv POSTGRES_DB 2>/dev/null || true)}"
if [ -z "$PGD" ] && [ "$PROJECT" = "recoveryparts" ]; then PGD="recoveryparts"; fi
[ -n "$PGD" ] || { echo "No pude determinar la base: el contenedor $DB no define POSTGRES_DB. Pasá POSTGRES_DB=<base>." >&2; exit 1; }
echo "Base: contenedor $DB  (base=$PGD, usuario=$PGU)"

DUMP="${PROJECT}_${ENVIRONMENT}_postgres_${TS}.dump"
TMPDB=".tmp-db-${PROJECT}-${ENVIRONMENT}"
TMPF=".tmp-files-${PROJECT}-${ENVIRONMENT}"

# Se escribe a un temporal y recién al terminar se renombra: un corte no deja un backup a medias con nombre válido.
docker exec "$DB" pg_dump -U "$PGU" -Fc "$PGD" > "$DEST/$TMPDB"
# Un dump vacío es un backup roto: mejor fallar fuerte que guardar basura.
[ -s "$DEST/$TMPDB" ] || { rm -f "$DEST/$TMPDB"; echo "El dump salió vacío" >&2; exit 1; }
mv "$DEST/$TMPDB" "$DEST/$DUMP"
( cd "$DEST" && sha256sum "$DUMP" > "$DUMP.sha256" )

TARF=""
if [ "$FILES_MODE" = "volume" ]; then
  VOL="${FILES_VOLUME:-${UUID}_storage}"
  docker volume inspect "$VOL" >/dev/null 2>&1 || { echo "No existe el volumen $VOL (usá FILES_VOLUME=<nombre> o FILES_MODE=none)" >&2; exit 1; }
  TARF="${PROJECT}_${ENVIRONMENT}_files_${TS}.tar.gz"
  # El tar corre como root dentro del contenedor: chown para que los archivos queden del usuario actual.
  docker run --rm -v "$VOL":/data:ro -v "$DEST":/out alpine \
    sh -c "tar czf /out/$TMPF -C /data . && chown $(id -u):$(id -g) /out/$TMPF"
  [ -s "$DEST/$TMPF" ] || { rm -f "$DEST/$TMPF"; echo "El tar de archivos salió vacío" >&2; exit 1; }
  mv "$DEST/$TMPF" "$DEST/$TARF"
  ( cd "$DEST" && sha256sum "$TARF" > "$TARF.sha256" )
fi

if [ -n "${REMOTE:-}" ]; then
  command -v rclone >/dev/null || { echo "REMOTE definido pero rclone no está instalado" >&2; exit 1; }
  BASE="$REMOTE/$ENVIRONMENT/$PROJECT"
  rclone copyto "$DEST/$DUMP"        "$BASE/postgres/$DIA/$DUMP"
  rclone copyto "$DEST/$DUMP.sha256" "$BASE/postgres/$DIA/$DUMP.sha256"
  if [ -n "$TARF" ]; then
    rclone copyto "$DEST/$TARF"        "$BASE/files/$DIA/$TARF"
    rclone copyto "$DEST/$TARF.sha256" "$BASE/files/$DIA/$TARF.sha256"
  fi
  echo "Subido a $BASE"
fi

find "$DEST" -maxdepth 1 -name "${PROJECT}_${ENVIRONMENT}_*" -mtime "+$DIAS" -delete
echo "OK $(date -u +%F-%H:%M)Z → $DEST"; ls -lh "$DEST" | tail -n 5
