#!/usr/bin/env bash
# Prueba de restauración de un backup de Postgres en un contenedor DESCARTABLE. Un backup que nunca se restauró no es un backup.
# Guía: codetlon-cloud/docs/BACKUPS.md
#
# Uso:
#   restore-test.sh /ruta/proyecto_prod_postgres_20260101T033000Z.dump          # archivo local (con su .sha256 al lado)
#   FROM_REMOTE=b2:backups-codetlon/prod/masiphone/postgres/2026-01-01 restore-test.sh   # baja el último dump de esa carpeta
#
# Variables opcionales
#   ENV_FILE      archivo chmod 600 con las credenciales de rclone (solo si usás FROM_REMOTE)
#   PG_IMAGE      imagen del Postgres descartable (default postgres:17-alpine; debe ser >= la versión que generó el dump)
#   EXTRA_ROLES   roles a crear ANTES de restaurar, separados por coma. Proyectos que vienen de Supabase:
#                 EXTRA_ROLES=anon,authenticated,service_role  (si no, pg_restore falla en los GRANT/policies)
#   KEEP=1        no borrar el contenedor al terminar (para inspeccionarlo a mano)
# Sale con código distinto de 0 si el sha256 no coincide, si pg_restore falla o si la base restaurada no tiene tablas.
set -euo pipefail
PG_IMAGE="${PG_IMAGE:-postgres:17-alpine}"
WORK="$(mktemp -d)"
NAME="restore-test-$$"
cleanup() { [ "${KEEP:-0}" = "1" ] || docker rm -f "$NAME" >/dev/null 2>&1 || true; rm -rf "$WORK"; }
trap cleanup EXIT

if [ -n "${FROM_REMOTE:-}" ]; then
  [ -z "${ENV_FILE:-}" ] || { set -a; . "$ENV_FILE"; set +a; }
  command -v rclone >/dev/null || { echo "FROM_REMOTE requiere rclone" >&2; exit 1; }
  ULTIMO="$(rclone lsf "$FROM_REMOTE" | grep -E '\.dump$' | sort | tail -n1)"
  [ -n "$ULTIMO" ] || { echo "No hay .dump en $FROM_REMOTE" >&2; exit 1; }
  rclone copyto "$FROM_REMOTE/$ULTIMO"        "$WORK/$ULTIMO"
  rclone copyto "$FROM_REMOTE/$ULTIMO.sha256" "$WORK/$ULTIMO.sha256"
  DUMP="$WORK/$ULTIMO"
else
  DUMP="${1:?Uso: restore-test.sh <archivo.dump>  (o FROM_REMOTE=...)}"
  [ -f "$DUMP" ] || { echo "No existe $DUMP" >&2; exit 1; }
fi

if [ -f "$DUMP.sha256" ]; then
  ( cd "$(dirname "$DUMP")" && sha256sum -c "$(basename "$DUMP").sha256" ) || { echo "sha256 NO coincide: backup corrupto" >&2; exit 1; }
else
  echo "AVISO: no hay .sha256 junto al dump; no se verificó la integridad del archivo." >&2
fi

docker run -d --name "$NAME" -e POSTGRES_PASSWORD=restore -e POSTGRES_DB=restore_test "$PG_IMAGE" >/dev/null
for i in $(seq 1 30); do docker exec "$NAME" pg_isready -U postgres -d restore_test >/dev/null 2>&1 && break; sleep 2; done
docker exec "$NAME" pg_isready -U postgres -d restore_test >/dev/null || { echo "El Postgres descartable no levantó" >&2; exit 1; }

if [ -n "${EXTRA_ROLES:-}" ]; then
  IFS=',' read -ra ROLES <<< "$EXTRA_ROLES"
  for r in "${ROLES[@]}"; do docker exec "$NAME" psql -U postgres -d restore_test -qc "create role \"$r\" nologin"; done
fi

docker cp "$DUMP" "$NAME:/tmp/backup.dump"
# --no-owner: los dueños originales no existen en el contenedor descartable. Los errores no se silencian.
docker exec "$NAME" pg_restore -U postgres -d restore_test --no-owner --exit-on-error /tmp/backup.dump

TABLAS="$(docker exec "$NAME" psql -U postgres -d restore_test -At -c "select count(*) from information_schema.tables where table_schema not in ('pg_catalog','information_schema')")"
[ "${TABLAS:-0}" -gt 0 ] || { echo "La base restaurada no tiene tablas" >&2; exit 1; }
echo "RESTAURACIÓN OK: $TABLAS tablas/vistas. Filas por tabla (las 12 más pobladas):"
docker exec "$NAME" psql -U postgres -d restore_test -At -F ' | ' -c "select relname, n_live_tup from pg_stat_user_tables order by n_live_tup desc limit 12" || true
echo "(estadísticas aproximadas; para conteos exactos: KEEP=1 y consultar el contenedor $NAME)"
