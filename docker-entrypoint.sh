#!/bin/sh
set -e
# Sin estas variables la app arrancaria mal (cookies sin firma segura, links a localhost, URLs de archivos rotas).
[ "${#BETTER_AUTH_SECRET}" -ge 32 ] || { echo "Falta BETTER_AUTH_SECRET (minimo 32 caracteres)"; exit 1; }
[ -n "$BETTER_AUTH_URL" ] || { echo "Falta BETTER_AUTH_URL"; exit 1; }
[ -n "$DATABASE_URL" ] || { echo "Falta DATABASE_URL"; exit 1; }
# Aplica las migraciones pendientes (idempotente; si falla, no arranca) y levanta el servidor.
node scripts/migrate.mjs
exec node server.js
