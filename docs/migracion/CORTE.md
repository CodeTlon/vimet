# Ensayo y corte: Supabase -> backend propio

Lo ejecuta Mateo (recursos de Coolify, secretos y corte son suyos). Cada paso indica que verifica.
Estado de lo automatizable: importador y verificacion probados con PGlite (`tests/importar.test.ts`);
**nada se probo contra un Postgres/MinIO reales ni contra el Supabase real** desde la sesion de `dev1`.

## 0. Pre-requisitos
1. `dev` y `test` recreadas desde `main` (`docs/FLUJO-ENTORNOS.md`); PR de `feature/dev1-entornos` y de `feature/dev1-backend-propio` mergeados a `dev`.
2. Postgres `vimet-test` y MinIO de test creados (`FASE1-COOLIFY.md`), con `docker-compose.yml` para dev.
3. Variables de `ENTORNO.md` cargadas en `vimet-test`. `CLINICAL_DATA_ENCRYPTION_KEY` **igual** a la de prod.
4. Backups: `scripts/backup/*.sh` en `codetlon-vps` y un simulacro de restauracion hecho.

## 1. Ensayo en `test`
```bash
export DATABASE_URL=<postgres vimet-test>          # base nueva, VACIA
npm ci && npm run db:migrate                        # aplica drizzle/0000 y 0001
npm run db:paridad                                  # esquema nuevo == supabase/migrations (PARIDAD OK)
SOURCE_DATABASE_URL=<supabase prod, conexion de solo lectura> node scripts/migracion/importar.mjs           # dry-run
SOURCE_DATABASE_URL=<...> node scripts/migracion/importar.mjs --apply                                       # copia + verifica
```
Verifica: usuarios, conteos y checksum md5 por tabla; secuencias reajustadas. Sale con codigo 1 si algo no coincide.

Archivos (hoy 0 objetos en prod, pero el script ya esta listo):
```bash
SUPABASE_URL=https://ayjzcxvtylvsjacgjxgh.supabase.co SUPABASE_SERVICE_ROLE_KEY=... \
S3_ENDPOINT=... S3_ACCESS_KEY_ID=... S3_SECRET_ACCESS_KEY=... S3_PUBLIC_URL=... DATABASE_URL=... \
  node scripts/migracion/copiar-storage.mjs --apply
```

Pruebas manuales en `test` (lista de `MANUAL-PRUEBAS.md`), minimo:
- Login de Avril y Gero con su contrasena actual (hash bcrypt importado). Si algun hash vacio: "recuperar contrasena".
- Registro de paciente nuevo: llega el mail, confirmar activa la cuenta.
- Reservar, confirmar y cancelar un turno; reprogramar como staff; agenda: editar una franja.
- Ficha clinica: guardar y releer (cifrado); ver un plan con secciones e imagenes; PDF de plan por URL firmada.
- App mobile contra `EXPO_PUBLIC_API_URL=<test>` en un build de desarrollo: login, turnos, plan, entrenamiento.
- `npm run test:e2e` (smoke) con `DATABASE_URL` de test.

## 2. Corte (ventana de bajo trafico; avisar a Avril y Gero)
1. Backup verificado del lado nuevo y **dump completo de Supabase guardado fuera** (`pg_dump` + export de buckets).
2. Modo mantenimiento (apagar la app `vimet` en Coolify).
3. Base de **prod** nueva vacia: `db:migrate` + `importar.mjs --apply` + `copiar-storage.mjs --apply`.
4. Variables de prod en Coolify (`ENTORNO.md`), redeploy desde `main`.
5. Smoke manual (login, ficha, turno, mail). Revisar `audit_log`.
6. Supabase en solo lectura; anotar la fecha de baja (sugerido: 2 semanas).
7. Publicar la app mobile nueva; mientras exista la anterior en las stores, sigue hablando con Supabase (solo lectura): forzar update.

## 3. Rollback
Hasta el paso 6 se vuelve al despliegue anterior de Coolify (Supabase intacto). Despues del paso 6 hay que
re-importar las filas creadas en la base nueva: no automatizado, decidir antes del corte.

## 4. Cierre
Quitar `supabase/` y las variables de Supabase, borrar `.env` viejos, actualizar README/ARCHITECTURE, `ERRORES.md`
con cada sorpresa del ensayo, simulacro de restauracion fechado en `.claude/CLAUDE.md`.
