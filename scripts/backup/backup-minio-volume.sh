#!/usr/bin/env bash
# Backup del volumen de datos de MinIO (archivos de pacientes: planes, recursos, sitio, ejercicios-media).
# Complementa a backup-coolify.sh: ese hace el dump de Postgres; este empaqueta el volumen del recurso MinIO,
# que en Coolify es OTRO recurso (otro UUID). Se corre en el VPS de Coolify (codetlon-vps).
#
# Variables OBLIGATORIAS
#   VOLUME        nombre exacto del volumen de MinIO (descubrirlo: docker volume ls | grep <UUID-de-minio>)
#   PROJECT       nombre del proyecto (vimet)
#   ENVIRONMENT   prod | staging | demo
# Opcionales
#   REMOTE        destino rclone, ej. b2:backups-codetlon (si falta, solo copia local)
#   ENV_FILE      archivo chmod 600 con RCLONE_CONFIG_B2_TYPE/ACCOUNT/KEY
#   DEST          carpeta local (default ~/backups)     DIAS  retencion LOCAL en dias (default 14)
#
# Misma estructura remota y convenciones que backup-coolify.sh: <entorno>/<proyecto>/files/<AAAA-MM-DD>/...
# El volumen se monta de solo lectura; un tar vacio falla (un backup vacio es un backup roto).
set -euo pipefail
: "${VOLUME:?Falta VOLUME (nombre del volumen de MinIO)}"
: "${PROJECT:?Falta PROJECT}"
: "${ENVIRONMENT:?Falta ENVIRONMENT (prod | staging | demo)}"
case "$ENVIRONMENT" in prod|staging|demo) ;; *) echo "ENVIRONMENT debe ser prod, staging o demo" >&2; exit 1 ;; esac

if [ -n "${ENV_FILE:-}" ]; then set -a; . "$ENV_FILE"; set +a; fi

DEST="${DEST:-$HOME/backups}"
DIAS="${DIAS:-14}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
DIA="$(date -u +%F)"
mkdir -p "$DEST"

docker volume inspect "$VOLUME" >/dev/null 2>&1 || { echo "No existe el volumen $VOLUME" >&2; exit 1; }

TARF="${PROJECT}_${ENVIRONMENT}_files_${TS}.tar.gz"
TMPF=".tmp-files-${PROJECT}-${ENVIRONMENT}"
docker run --rm -v "$VOLUME":/data:ro -v "$DEST":/out alpine \
  sh -c "tar czf /out/$TMPF -C /data . && chown $(id -u):$(id -g) /out/$TMPF"
[ -s "$DEST/$TMPF" ] || { rm -f "$DEST/$TMPF"; echo "El tar salio vacio" >&2; exit 1; }
mv "$DEST/$TMPF" "$DEST/$TARF"
( cd "$DEST" && sha256sum "$TARF" > "$TARF.sha256" )

if [ -n "${REMOTE:-}" ]; then
  command -v rclone >/dev/null || { echo "REMOTE definido pero rclone no esta instalado" >&2; exit 1; }
  BASE="$REMOTE/$ENVIRONMENT/$PROJECT"
  rclone copyto "$DEST/$TARF"        "$BASE/files/$DIA/$TARF"
  rclone copyto "$DEST/$TARF.sha256" "$BASE/files/$DIA/$TARF.sha256"
  echo "Subido a $BASE/files/$DIA"
fi

find "$DEST" -maxdepth 1 -name "${PROJECT}_${ENVIRONMENT}_files_*" -mtime "+$DIAS" -delete
echo "OK $(date -u +%F-%H:%M)Z -> $DEST/$TARF"
