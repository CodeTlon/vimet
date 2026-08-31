-- VIMET — migra las secciones existentes de tipo 'imagenes' a
-- 'recomendaciones' (ver 0039). Las imágenes en plan_seccion_imagenes quedan
-- intactas (mismo seccion_id); el título no se toca.
update public.plan_secciones set tipo = 'recomendaciones' where tipo = 'imagenes';
