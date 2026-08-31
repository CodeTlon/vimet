-- VIMET — revierte "pautas_generales" como tipo de sección modular: vuelve a
-- ser el bloque fijo de siempre en `planes` (6 columnas de texto), no algo
-- que el profesional agregue a voluntad como Receta / Comidas del día /
-- Imágenes. Corrección sobre la 0037: esa migración había fusionado las 6
-- columnas en 6 secciones sueltas, pero el bloque tiene que seguir siendo
-- una sola unidad con sus 6 sub-campos, como antes.

alter table public.planes
  add column if not exists pautas_generales text,
  add column if not exists pautas_hidratacion text,
  add column if not exists pre_entreno text,
  add column if not exists intra_entreno text,
  add column if not exists post_entreno text,
  add column if not exists suplementacion text;

-- Recupera los datos migrados por la 0037 (una sección `pautas_generales`
-- por columna vieja, con el título fijo que le puso esa migración) de vuelta
-- a su columna original en `planes`.
update public.planes p set pautas_generales = s.contenido
from public.plan_secciones s
where s.plan_id = p.id and s.tipo = 'pautas_generales' and s.titulo = 'Pautas generales';

update public.planes p set pautas_hidratacion = s.contenido
from public.plan_secciones s
where s.plan_id = p.id and s.tipo = 'pautas_generales' and s.titulo = 'Hidratación';

update public.planes p set pre_entreno = s.contenido
from public.plan_secciones s
where s.plan_id = p.id and s.tipo = 'pautas_generales' and s.titulo = 'Pre-entreno';

update public.planes p set intra_entreno = s.contenido
from public.plan_secciones s
where s.plan_id = p.id and s.tipo = 'pautas_generales' and s.titulo = 'Intra-entreno';

update public.planes p set post_entreno = s.contenido
from public.plan_secciones s
where s.plan_id = p.id and s.tipo = 'pautas_generales' and s.titulo = 'Post-entreno';

update public.planes p set suplementacion = s.contenido
from public.plan_secciones s
where s.plan_id = p.id and s.tipo = 'pautas_generales' and s.titulo = 'Suplementación';

-- Cualquier sección `pautas_generales` con un título distinto a los 6 fijos
-- de arriba (por si algún staff llegó a crear una manualmente durante la
-- ventana en que existió como tipo elegible) se vuelca al campo general
-- `pautas_generales`, concatenada, para no perder contenido.
with sueltas as (
  select plan_id, string_agg(coalesce(titulo, '') || E':\n' || coalesce(contenido, ''), E'\n\n' order by orden) as texto
  from public.plan_secciones
  where tipo = 'pautas_generales'
    and titulo not in ('Pautas generales', 'Hidratación', 'Pre-entreno', 'Intra-entreno', 'Post-entreno', 'Suplementación')
  group by plan_id
)
update public.planes p
set pautas_generales = trim(both E'\n' from coalesce(p.pautas_generales, '') || E'\n\n' || sueltas.texto)
from sueltas
where sueltas.plan_id = p.id;

-- Borra las secciones `pautas_generales` ya migradas de vuelta (cascada se
-- encarga de sus `plan_seccion_imagenes`, si alguna llegó a tener).
delete from public.plan_secciones where tipo = 'pautas_generales';
