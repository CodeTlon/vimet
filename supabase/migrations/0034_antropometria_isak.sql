-- Datos crudos de una evaluación ISAK (pliegues cutáneos, perímetros, tejido
-- óseo) para calcular IMO, Adiposidad (Σ6/Σ8 pliegues) y Muscularidad
-- (perímetros corregidos) — ver lib/seguimiento.ts para las fórmulas.
--
-- kg_tejido_muscular/kg_tejido_oseo son columnas nuevas y explícitas, no se
-- reusa kg_musculo/kg_grasa: esas ya existían con un método ambiguo (probable
-- bioimpedancia), mientras que estas dos siguen el modelo tisular ISAK
-- (Lee 2000 / Rocha 1974) — fusionarlas contaminaría el gráfico "Composición
-- corporal" existente y perdería trazabilidad histórica.
--
-- Todas nullable: una evaluación ISAK es un evento distinto de la pesada
-- habitual, no todas las mediciones la van a tener cargada.

alter table public.mediciones_antropometricas
  add column if not exists pliegue_triceps_mm       numeric(4,1),
  add column if not exists pliegue_subescapular_mm  numeric(4,1),
  add column if not exists pliegue_supraespinal_mm  numeric(4,1),
  add column if not exists pliegue_abdominal_mm     numeric(4,1),
  add column if not exists pliegue_muslo_mm         numeric(4,1),
  add column if not exists pliegue_pierna_mm        numeric(4,1),
  add column if not exists pliegue_biceps_mm        numeric(4,1),
  add column if not exists pliegue_cresta_iliaca_mm numeric(4,1),
  add column if not exists perimetro_brazo_cm  numeric(5,2),
  add column if not exists perimetro_muslo_cm  numeric(5,2),
  add column if not exists perimetro_pierna_cm numeric(5,2),
  add column if not exists kg_tejido_muscular numeric(5,2),
  add column if not exists kg_tejido_oseo     numeric(5,2);

comment on column public.mediciones_antropometricas.kg_tejido_muscular is
  'Masa muscular esquelética (kg), método Lee 2000. No confundir con kg_musculo (otro método, ver 0003).';
comment on column public.mediciones_antropometricas.kg_tejido_oseo is
  'Masa ósea (kg), método Rocha 1974. Usado junto a kg_tejido_muscular para el Índice músculo/óseo (IMO).';
