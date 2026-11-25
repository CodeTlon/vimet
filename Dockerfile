# syntax=docker/dockerfile:1
# Imagen de produccion/test para Coolify (app + Postgres en la misma red interna; ver docker-compose.coolify.yml).
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Sin DATABASE_URL en el build: las paginas con datos se renderizan por request.
# STORAGE_PUBLIC_URL entra a la CSP y a images.remotePatterns en el build; NEXT_PUBLIC_* se incrustan en el bundle.
ARG STORAGE_PUBLIC_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_GA_ID
ENV NEXT_TELEMETRY_DISABLED=1 STORAGE_PUBLIC_URL=$STORAGE_PUBLIC_URL NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL NEXT_PUBLIC_GA_ID=$NEXT_PUBLIC_GA_ID
RUN npm run build
# El script de migraciones se empaqueta en un solo archivo (el standalone de Next no trae drizzle ni su migrador).
RUN npx esbuild scripts/migrate.mts --bundle --platform=node --format=esm --external:pg-native --outfile=dist/migrate.mjs \
    --banner:js="import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);"

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 STORAGE_DIR=/data/storage
RUN addgroup -S app && adduser -S app -G app && mkdir -p /data/storage && chown app:app /data/storage
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
COPY --from=build --chown=app:app /app/drizzle ./drizzle
COPY --from=build --chown=app:app /app/dist/migrate.mjs ./scripts/migrate.mjs
COPY --chown=app:app docker-entrypoint.sh ./
USER app
VOLUME /data/storage
EXPOSE 3000
ENTRYPOINT ["sh", "docker-entrypoint.sh"]
