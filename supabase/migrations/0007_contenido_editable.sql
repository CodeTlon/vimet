-- VIMET — contenido del sitio editable desde el admin (perfil profesional + config general)

-- ─────────────────────────────────────────────────────────
-- profiles: campos de perfil público (bio, foto, redes, etc)
-- ─────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists titulo text,
  add column if not exists matricula text,
  add column if not exists foto_url text,
  add column if not exists instagram_handle text,
  add column if not exists instagram_url text,
  add column if not exists whatsapp_url text,
  add column if not exists bio_corta text,
  add column if not exists bio text,
  add column if not exists especialidades text[] not null default '{}',
  add column if not exists areas_trabajo jsonb not null default '[]';

-- ─────────────────────────────────────────────────────────
-- contenido_sitio: fila única con ubicación, contacto y metodología
-- ─────────────────────────────────────────────────────────
create table if not exists public.contenido_sitio (
  id                     integer primary key default 1,
  direccion              text,
  lugar                  text,
  ciudad                 text,
  map_embed_url          text,
  email_contacto         text,
  whatsapp_general       text,
  instagram_handle       text,
  instagram_url          text,
  metodologia_pasos      jsonb not null default '[]',
  metodologia_pilares    jsonb not null default '[]',
  metodologia_dirigido_a jsonb not null default '[]',
  updated_at             timestamptz not null default now(),
  constraint contenido_sitio_singleton check (id = 1)
);

alter table public.contenido_sitio enable row level security;

drop policy if exists "contenido_sitio select publico" on public.contenido_sitio;
create policy "contenido_sitio select publico"
  on public.contenido_sitio for select
  using (true);

drop policy if exists "contenido_sitio admin write" on public.contenido_sitio;
create policy "contenido_sitio admin write"
  on public.contenido_sitio for all
  using (public.is_admin())
  with check (public.is_admin());

-- Seed con los valores actuales (antes hardcodeados en lib/config/team.ts) para no romper el sitio
insert into public.contenido_sitio (
  id, direccion, lugar, ciudad, map_embed_url, email_contacto, whatsapp_general,
  instagram_handle, instagram_url, metodologia_pasos, metodologia_pilares, metodologia_dirigido_a
) values (
  1,
  'Av. Pedro Simón Laplace 5573',
  'Instituto VIANETT',
  'Córdoba, Argentina',
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3404.8!2d-64.26!3d-31.38!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzHCsDIyJzQ4LjAiUyA2NMKwMTUnMzYuMCJX!5e0!3m2!1ses!2sar!4v1',
  'hola@vimet.com',
  'https://wa.me/543513752818',
  '@vimet_salud',
  'https://instagram.com/vimet_salud',
  '[
    {"titulo":"Contacto inicial","desc":"Primer contacto para conocer tu situación, coordinar lugar, horarios y formato de trabajo.","icon":"Users"},
    {"titulo":"Entrevista de admisión","desc":"Revisamos tu historia clínica, hábitos, objetivos y antecedentes relevantes.","icon":"ClipboardCheck"},
    {"titulo":"Evaluación nutricional","desc":"Evaluación alimentaria completa con antropometría ISAK: peso, perímetros, % grasa y % músculo.","icon":"Scale"},
    {"titulo":"Evaluación funcional","desc":"Batería de tests de movilidad, estabilidad, fuerza y resistencia con score de condición física.","icon":"Activity"},
    {"titulo":"Planificación","desc":"Diseñamos el plan nutricional y de entrenamiento personalizado según tus objetivos y disponibilidad.","icon":"PencilRuler"},
    {"titulo":"Entrega de planes","desc":"Presentación de los planes con explicación y entrega digital para que puedas consultarlos en cualquier momento.","icon":"ClipboardCheck"},
    {"titulo":"Seguimiento","desc":"Controles periódicos (semanal, quincenal o mensual) para evaluar adherencia, evolución y dudas.","icon":"RefreshCw"},
    {"titulo":"Revisión y ajustes","desc":"Cada 2–3 meses revisamos el proceso en conjunto y ajustamos los planes según los resultados obtenidos.","icon":"TrendingUp"}
  ]'::jsonb,
  '[
    {"titulo":"Interdisciplina","desc":"La nutrición y el entrenamiento no funcionan por separado. Nuestro abordaje integra ambas disciplinas.","icon":"Users"},
    {"titulo":"Evidencia científica","desc":"Cada recomendación está respaldada por literatura científica actualizada.","icon":"Microscope"},
    {"titulo":"Personalización","desc":"No hay planes genéricos. Diseñamos todo adaptado a tu estilo de vida, nivel y objetivos.","icon":"SlidersHorizontal"},
    {"titulo":"Sostenibilidad","desc":"Buscamos generar hábitos reales que puedas mantener a largo plazo, sin restricciones extremas.","icon":"Leaf"}
  ]'::jsonb,
  '[
    {"text":"Personas mayores de 14 años con alteraciones metabólicas: resistencia a la insulina, hipertensión, diabetes tipo 2 o dislipidemias.","icon":"HeartPulse"},
    {"text":"Personas con sobrepeso que buscan mejorar su composición corporal y salud de forma guiada y profesional.","icon":"Scale"},
    {"text":"Deportistas que quieren optimizar su rendimiento combinando nutrición y entrenamiento.","icon":"Activity"},
    {"text":"Cualquier persona que busque mejorar su calidad de vida a través de hábitos sostenibles.","icon":"Stethoscope"}
  ]'::jsonb
)
on conflict (id) do nothing;

-- Seed de perfil público de Avril y Gero con los valores actuales
update public.profiles set
  titulo = 'Lic. en Nutrición · Antropometrista ISAK',
  foto_url = '/images/team/avril.jpg',
  instagram_handle = '@avriljer.nutricion',
  instagram_url = 'https://instagram.com/avriljer.nutricion',
  whatsapp_url = 'https://wa.me/543513752818',
  bio_corta = 'Licenciada en Nutrición y Antropometrista ISAK, especializada en el abordaje de alteraciones metabólicas y nutrición deportiva en Instituto VIANETT.',
  bio = 'Licenciada en Nutrición (UNC) y Antropometrista certificada ISAK. Especializada en el abordaje interdisciplinario de patologías metabólicas como resistencia a la insulina, hipertensión, diabetes tipo 2 y dislipidemias. Trabaja en el Instituto VIANETT utilizando la alimentación como herramienta terapéutica para mejorar la composición corporal y la salud a largo plazo.',
  especialidades = array['Nutrición deportiva','Composición corporal','Patologías metabólicas','Suplementación basada en evidencia','Hábitos saludables'],
  areas_trabajo = '[
    {"icon":"Activity","title":"Nutrición Deportiva","desc":"Optimización del rendimiento para atletas en VIANETT."},
    {"icon":"Scale","title":"Composición corporal","desc":"Evaluación antropométrica ISAK: peso, perímetros, % grasa y % músculo."},
    {"icon":"Pill","title":"Suplementación","desc":"Uso estratégico y seguro según objetivos y evidencia."},
    {"icon":"HeartPulse","title":"Salud Metabólica","desc":"Tratamiento de IR, HTA, DM2 y dislipidemias."}
  ]'::jsonb
where email = 'avril@vimet.com';

update public.profiles set
  titulo = 'Entrenador · Atleta de Resistencia',
  foto_url = '/images/team/gero.jpg',
  instagram_handle = '@gero_gallardoo',
  instagram_url = 'https://instagram.com/gero_gallardoo',
  whatsapp_url = 'https://wa.me/543544405114',
  bio_corta = 'Entrenador y atleta especializado en deportes de resistencia y entrenamiento para la salud, con foco en readaptación deportiva y planificación personalizada.',
  bio = 'Entrenador y atleta especializado en deportes de resistencia y entrenamiento para la salud. Diseña planificaciones personalizadas de fuerza y resistencia adaptadas al nivel, los objetivos y la disponibilidad de cada persona. Se especializa en evaluar la condición física mediante baterías funcionales y en la readaptación deportiva post-lesión.',
  especialidades = array['Entrenamiento personalizado','Deportes de resistencia','Readaptación deportiva','Evaluación funcional'],
  areas_trabajo = '[
    {"icon":"Dumbbell","title":"Entrenamiento adaptado","desc":"Planificación de fuerza y resistencia según tu nivel y objetivos."},
    {"icon":"Activity","title":"Deportes de resistencia","desc":"Especialista en entrenamiento para atletas de resistencia."},
    {"icon":"Stethoscope","title":"Readaptación deportiva","desc":"Vuelta al deporte post-lesión paso a paso."},
    {"icon":"Shield","title":"Evaluación funcional","desc":"Batería de tests de movilidad, fuerza y resistencia con score."}
  ]'::jsonb
where email = 'gero@vimet.com';

-- ─────────────────────────────────────────────────────────
-- Storage bucket 'sitio' (público) — fotos de perfil de profesionales
-- Convención de path: staff/{profile_id}/{timestamp}_{filename}
-- ─────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('sitio', 'sitio', true)
on conflict (id) do nothing;

drop policy if exists "sitio storage admin write" on storage.objects;
create policy "sitio storage admin write"
  on storage.objects for all
  using (bucket_id = 'sitio' and public.is_admin())
  with check (bucket_id = 'sitio' and public.is_admin());
