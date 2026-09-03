-- VIMET — cifrado a nivel aplicación de campos clínicos sensibles.
--
-- La clave de cifrado (AES-256-GCM) vive SOLO en la app (env var
-- `CLINICAL_DATA_ENCRYPTION_KEY`, ver lib/crypto/clinical.ts) — nunca en
-- Postgres, ni siquiera de paso en una query. Por eso esta migración NO usa
-- pgcrypto/pgp_sym_encrypt: agrega columnas `_enc` (text) donde la app
-- guarda el valor ya cifrado en Node antes de mandarlo a Supabase.
--
-- Rollout seguro en 3 pasos (esta migración es solo el paso 1):
--   1. (acá) columnas `_enc` nuevas, en paralelo a las de texto plano
--      existentes — no se borra ni se toca el dato viejo.
--   2. El código de la app (deployado junto con esta migración) escribe
--      SIEMPRE en la columna `_enc` cifrada y limpia (null) la columna
--      vieja en la misma escritura. Lecturas: `_enc` si tiene valor, si no
--      cae a la columna vieja (fila todavía no tocada desde el deploy) —
--      ver `readClinicalField()` en lib/crypto/clinical.ts.
--   3. `scripts/migrar-cifrado-clinico.mjs` (correr una sola vez a mano,
--      documentado en el reporte de la sesión que agregó esto) cifra el
--      HISTÓRICO: toda fila que ya tenía datos en la columna plana antes
--      del deploy y todavía no fue editada desde entonces.
--
-- Una migración FUTURA (no esta) puede dropear las columnas de texto plano
-- una vez confirmado en prod que todo lee/escribe bien desde `_enc` — son
-- el mecanismo de rollback mientras tanto, no borrarlas antes de tiempo.

alter table public.fichas_paciente
  add column if not exists dx_medico_enc text,
  add column if not exists dx_nutricional_enc text,
  add column if not exists medicacion_enc text,
  add column if not exists datos_laboratorio_enc text,
  add column if not exists observaciones_internas_enc text;

-- `contenido` es NOT NULL desde 0003_seguimiento.sql. A partir de esta
-- migración el contenido real de una entrada nueva/editada vive cifrado en
-- `contenido_enc`; la columna vieja pasa a opcional para que la app pueda
-- guardarla en null en vez de tener que inventar un valor no vacío.
alter table public.evolucion_entradas
  add column if not exists contenido_enc text;
alter table public.evolucion_entradas
  alter column contenido drop not null;

alter table public.planes
  add column if not exists notas_enc text;

comment on column public.fichas_paciente.dx_medico is
  'DEPRECATED tras cifrado de campos clínicos — el valor real de filas nuevas/editadas vive en dx_medico_enc. No leer/escribir directo desde código nuevo, usar lib/crypto/clinical.ts (readClinicalField/encryptClinical).';
comment on column public.fichas_paciente.dx_nutricional is
  'DEPRECATED tras cifrado — ver dx_nutricional_enc. Ídem lib/crypto/clinical.ts.';
comment on column public.fichas_paciente.medicacion is
  'DEPRECATED tras cifrado — ver medicacion_enc. Ídem lib/crypto/clinical.ts.';
comment on column public.fichas_paciente.datos_laboratorio is
  'DEPRECATED tras cifrado — ver datos_laboratorio_enc. Ídem lib/crypto/clinical.ts.';
comment on column public.fichas_paciente.observaciones_internas is
  'DEPRECATED tras cifrado — ver observaciones_internas_enc. Ídem lib/crypto/clinical.ts.';
comment on column public.evolucion_entradas.contenido is
  'DEPRECATED tras cifrado — ver contenido_enc. Ídem lib/crypto/clinical.ts.';
comment on column public.planes.notas is
  'DEPRECATED tras cifrado — ver notas_enc. Ídem lib/crypto/clinical.ts.';
