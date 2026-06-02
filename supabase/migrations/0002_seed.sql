-- VIMET — seed de servicios y horarios
-- NOTA: los profesionales (Avril y Gero) deben crearse vía Supabase Auth (Auth → Users → Add user)
-- con los emails avril@vimet.com y gero@vimet.com. Después se ejecuta este seed para
-- promover sus profiles al rol correcto y crear los servicios/horarios asociados.

-- 1) Asignar roles a Avril y Gero por email
update public.profiles
   set rol = 'nutricionista',
       nombre = coalesce(nullif(nombre,''),'Avril'),
       apellido = coalesce(nullif(apellido,''),'Jerushalmi'),
       telefono = coalesce(telefono,'3513752818')
 where email = 'avril@vimet.com';

update public.profiles
   set rol = 'entrenador',
       nombre = coalesce(nullif(nombre,''),'Gerónimo'),
       apellido = coalesce(nullif(apellido,''),'Gallardo'),
       telefono = coalesce(telefono,'3544405114')
 where email = 'gero@vimet.com';

-- 2) Servicios — solo si no existen
do $$
declare
  avril_id uuid;
  gero_id uuid;
begin
  select id into avril_id from public.profiles where email = 'avril@vimet.com' limit 1;
  select id into gero_id  from public.profiles where email = 'gero@vimet.com'  limit 1;

  if avril_id is null or gero_id is null then
    raise notice 'Avril o Gero no encontrados en profiles. Crear users en Auth primero, después correr este seed.';
    return;
  end if;

  -- Limpiar servicios previos (idempotente para re-run)
  delete from public.servicios;

  insert into public.servicios (nombre, descripcion, duracion_minutos, tipo, icono, profesional_id) values
    ('Consulta nutricional','Evaluación inicial + plan nutricional personalizado.',60,'nutricion','Apple',avril_id),
    ('Nutrición deportiva','Plan alimentario enfocado en rendimiento deportivo.',60,'nutricion','Activity',avril_id),
    ('Abordaje metabólico','Para sobrepeso, resistencia a la insulina o hipertensión.',60,'nutricion','HeartPulse',avril_id),
    ('Cambio de hábitos','Transformá tu relación con la alimentación.',45,'nutricion','Sprout',avril_id),
    ('Plan de entrenamiento','Entrenamiento adaptado a tu nivel y objetivos.',60,'entrenamiento','Dumbbell',gero_id),
    ('Readaptación deportiva','Vuelta al deporte post-lesión.',60,'entrenamiento','Stethoscope',gero_id),
    ('Plan integral VIMET','Nutrición + Entrenamiento interdisciplinario.',90,'combo','HandHeart',null);

  -- 3) Horarios disponibles
  delete from public.horarios_disponibles;

  insert into public.horarios_disponibles (profesional_id, dia_semana, hora_inicio, hora_fin, modalidad) values
    (avril_id,1,'09:00','13:00','ambas'),
    (avril_id,2,'09:00','13:00','ambas'),
    (avril_id,3,'14:00','18:00','ambas'),
    (avril_id,4,'09:00','13:00','ambas'),
    (avril_id,5,'09:00','13:00','ambas'),
    (gero_id,1,'14:00','20:00','ambas'),
    (gero_id,2,'14:00','20:00','ambas'),
    (gero_id,3,'09:00','13:00','ambas'),
    (gero_id,4,'14:00','20:00','ambas'),
    (gero_id,5,'14:00','20:00','ambas');
end$$;
