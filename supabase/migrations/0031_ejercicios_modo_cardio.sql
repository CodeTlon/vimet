-- VIMET — modo de ejercicio (fuerza | cardio) en el catálogo, + fases
-- estructuradas (valor + unidad) en plan_ejercicios para cardio: entrada en
-- calor, trabajo principal, vuelta a la calma. El modo es propiedad del
-- ejercicio del catálogo (ej. "Salir a correr" siempre es cardio), no del
-- plan_ejercicios — así un mismo ejercicio se comporta igual en todos los
-- planes donde se use.

alter table public.ejercicios add column if not exists modo text not null default 'fuerza';
alter table public.ejercicios add constraint ejercicios_modo_check check (modo in ('fuerza', 'cardio'));
create index if not exists ejercicios_modo_idx on public.ejercicios(modo);

alter table public.plan_ejercicios
  add column if not exists cardio_entrada_calor_valor numeric,
  add column if not exists cardio_entrada_calor_unidad text,
  add column if not exists cardio_trabajo_principal_valor numeric,
  add column if not exists cardio_trabajo_principal_unidad text,
  add column if not exists cardio_vuelta_calma_valor numeric,
  add column if not exists cardio_vuelta_calma_unidad text;

-- Unidad solo puede ser una de las tres permitidas (o null).
alter table public.plan_ejercicios add constraint plan_ejercicios_cardio_unidad_valida check (
  (cardio_entrada_calor_unidad is null or cardio_entrada_calor_unidad in ('minutos', 'horas', 'km'))
  and (cardio_trabajo_principal_unidad is null or cardio_trabajo_principal_unidad in ('minutos', 'horas', 'km'))
  and (cardio_vuelta_calma_unidad is null or cardio_vuelta_calma_unidad in ('minutos', 'horas', 'km'))
);

-- Cada fase es valor+unidad completo o vacío, nunca a medias.
alter table public.plan_ejercicios add constraint plan_ejercicios_cardio_pares_completos check (
  (cardio_entrada_calor_valor is null) = (cardio_entrada_calor_unidad is null)
  and (cardio_trabajo_principal_valor is null) = (cardio_trabajo_principal_unidad is null)
  and (cardio_vuelta_calma_valor is null) = (cardio_vuelta_calma_unidad is null)
);

alter table public.plan_ejercicios add constraint plan_ejercicios_cardio_valor_positivo check (
  (cardio_entrada_calor_valor is null or cardio_entrada_calor_valor > 0)
  and (cardio_trabajo_principal_valor is null or cardio_trabajo_principal_valor > 0)
  and (cardio_vuelta_calma_valor is null or cardio_vuelta_calma_valor > 0)
);
