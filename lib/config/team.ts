// Información descriptiva del equipo VIMET — fuente única
// Equivalente a config/team.php del legacy

export const brand = {
  name: 'VIMET',
  fullName: 'Vida y Metabolismo',
  slogan: 'Nutrición y entrenamiento especializado en alteraciones metabólicas',
  description:
    'Somos un equipo interdisciplinario que combina nutrición basada en evidencia y entrenamiento personalizado para mejorar tu salud, composición corporal y calidad de vida.',
  founded: 2024,
  city: 'Córdoba',
} as const

export const location = {
  address: 'Av. Pedro Simón Laplace 5573',
  place: 'Instituto VIANETT',
  city: 'Córdoba, Argentina',
  mapEmbed:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3404.8!2d-64.26!3d-31.38!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzHCsDIyJzQ4LjAiUyA2NMKwMTUnMzYuMCJX!5e0!3m2!1ses!2sar!4v1',
} as const

export const social = {
  instagram: 'https://instagram.com/vimet_salud',
  instagramHandle: '@vimet_salud',
  whatsapp: 'https://wa.me/543513752818',
} as const

export type AreaTrabajo = { icon: string; title: string; desc: string }

export type Profesional = {
  key: 'avril' | 'gero'
  dbEmail: string
  nombre: string
  titulo: string
  matricula: string | null
  avatar: string
  instagram: string
  instagramUrl: string
  whatsappUrl: string
  bioCorta: string
  bio: string
  especialidades: string[]
  areasTrabajo: AreaTrabajo[]
}

export const team: Record<'avril' | 'gero', Profesional> = {
  avril: {
    key: 'avril',
    dbEmail: 'avril@vimet.com',
    nombre: 'Avril Jerushalmi',
    titulo: 'Lic. en Nutrición · Antropometrista ISAK',
    matricula: null,
    avatar: '/images/team/avril.jpg',
    instagram: '@avriljer.nutricion',
    instagramUrl: 'https://instagram.com/avriljer.nutricion',
    whatsappUrl: 'https://wa.me/543513752818',
    bioCorta:
      'Licenciada en Nutrición y Antropometrista ISAK, especializada en el abordaje de alteraciones metabólicas y nutrición deportiva en Instituto VIANETT.',
    bio: 'Licenciada en Nutrición (UNC) y Antropometrista certificada ISAK. Especializada en el abordaje interdisciplinario de patologías metabólicas como resistencia a la insulina, hipertensión, diabetes tipo 2 y dislipidemias. Trabaja en el Instituto VIANETT utilizando la alimentación como herramienta terapéutica para mejorar la composición corporal y la salud a largo plazo.',
    especialidades: [
      'Nutrición deportiva',
      'Composición corporal',
      'Patologías metabólicas',
      'Suplementación basada en evidencia',
      'Hábitos saludables',
    ],
    areasTrabajo: [
      { icon: 'Activity', title: 'Nutrición Deportiva', desc: 'Optimización del rendimiento para atletas en VIANETT.' },
      { icon: 'Scale', title: 'Composición corporal', desc: 'Evaluación antropométrica ISAK: peso, perímetros, % grasa y % músculo.' },
      { icon: 'Pill', title: 'Suplementación', desc: 'Uso estratégico y seguro según objetivos y evidencia.' },
      { icon: 'HeartPulse', title: 'Salud Metabólica', desc: 'Tratamiento de IR, HTA, DM2 y dislipidemias.' },
    ],
  },
  gero: {
    key: 'gero',
    dbEmail: 'gero@vimet.com',
    nombre: 'Gerónimo Gallardo',
    titulo: 'Entrenador · Atleta de Resistencia',
    matricula: null,
    avatar: '/images/team/gero.jpg',
    instagram: '@gero_gallardoo',
    instagramUrl: 'https://instagram.com/gero_gallardoo',
    whatsappUrl: 'https://wa.me/543544405114',
    bioCorta:
      'Entrenador y atleta especializado en deportes de resistencia y entrenamiento para la salud, con foco en readaptación deportiva y planificación personalizada.',
    bio: 'Entrenador y atleta especializado en deportes de resistencia y entrenamiento para la salud. Diseña planificaciones personalizadas de fuerza y resistencia adaptadas al nivel, los objetivos y la disponibilidad de cada persona. Se especializa en evaluar la condición física mediante baterías funcionales y en la readaptación deportiva post-lesión.',
    especialidades: ['Entrenamiento personalizado', 'Deportes de resistencia', 'Readaptación deportiva', 'Evaluación funcional'],
    areasTrabajo: [
      { icon: 'Dumbbell', title: 'Entrenamiento adaptado', desc: 'Planificación de fuerza y resistencia según tu nivel y objetivos.' },
      { icon: 'Activity', title: 'Deportes de resistencia', desc: 'Especialista en entrenamiento para atletas de resistencia.' },
      { icon: 'Stethoscope', title: 'Readaptación deportiva', desc: 'Vuelta al deporte post-lesión paso a paso.' },
      { icon: 'Shield', title: 'Evaluación funcional', desc: 'Batería de tests de movilidad, fuerza y resistencia con score.' },
    ],
  },
}

export const metodologia = {
  pasos: [
    { titulo: 'Contacto inicial', desc: 'Primer contacto para conocer tu situación, coordinar lugar, horarios y formato de trabajo.', icon: 'Users' },
    { titulo: 'Entrevista de admisión', desc: 'Revisamos tu historia clínica, hábitos, objetivos y antecedentes relevantes.', icon: 'ClipboardCheck' },
    { titulo: 'Evaluación nutricional', desc: 'Evaluación alimentaria completa con antropometría ISAK: peso, perímetros, % grasa y % músculo.', icon: 'Scale' },
    { titulo: 'Evaluación funcional', desc: 'Batería de tests de movilidad, estabilidad, fuerza y resistencia con score de condición física.', icon: 'Activity' },
    { titulo: 'Planificación', desc: 'Diseñamos el plan nutricional y de entrenamiento personalizado según tus objetivos y disponibilidad.', icon: 'PencilRuler' },
    { titulo: 'Entrega de planes', desc: 'Presentación de los planes con explicación y entrega digital para que puedas consultarlos en cualquier momento.', icon: 'ClipboardCheck' },
    { titulo: 'Seguimiento', desc: 'Controles periódicos (semanal, quincenal o mensual) para evaluar adherencia, evolución y dudas.', icon: 'RefreshCw' },
    { titulo: 'Revisión y ajustes', desc: 'Cada 2–3 meses revisamos el proceso en conjunto y ajustamos los planes según los resultados obtenidos.', icon: 'TrendingUp' },
  ],
  pilares: [
    { titulo: 'Interdisciplina', desc: 'La nutrición y el entrenamiento no funcionan por separado. Nuestro abordaje integra ambas disciplinas.', icon: 'Users' },
    { titulo: 'Evidencia científica', desc: 'Cada recomendación está respaldada por literatura científica actualizada.', icon: 'Microscope' },
    { titulo: 'Personalización', desc: 'No hay planes genéricos. Diseñamos todo adaptado a tu estilo de vida, nivel y objetivos.', icon: 'SlidersHorizontal' },
    { titulo: 'Sostenibilidad', desc: 'Buscamos generar hábitos reales que puedas mantener a largo plazo, sin restricciones extremas.', icon: 'Leaf' },
  ],
  dirigidoA: [
    { text: 'Personas mayores de 14 años con alteraciones metabólicas: resistencia a la insulina, hipertensión, diabetes tipo 2 o dislipidemias.', icon: 'HeartPulse' },
    { text: 'Personas con sobrepeso que buscan mejorar su composición corporal y salud de forma guiada y profesional.', icon: 'Scale' },
    { text: 'Deportistas que quieren optimizar su rendimiento combinando nutrición y entrenamiento.', icon: 'Activity' },
    { text: 'Cualquier persona que busque mejorar su calidad de vida a través de hábitos sostenibles.', icon: 'Stethoscope' },
  ],
} as const

export const faq = [
  {
    q: '¿Cómo funciona la primera consulta?',
    a: 'Es una evaluación integral de aproximadamente una hora. Conocemos tu historia clínica, tus objetivos, evaluamos tus hábitos actuales y, en el caso de entrenamiento, tu nivel físico y posibles lesiones.',
  },
  {
    q: '¿Atienden de forma virtual?',
    a: 'Sí, ofrecemos atención 100% online por videollamada para cualquier parte del mundo, y atención presencial en nuestro consultorio en el Instituto VIANETT (Córdoba).',
  },
  {
    q: '¿Tengo que contratar nutrición y entrenamiento juntos?',
    a: 'No es obligatorio. Podés tomar consultas solo de nutrición o solo de entrenamiento. Sin embargo, recomendamos el Plan Integral porque el trabajo conjunto potencia enormemente los resultados.',
  },
  {
    q: 'Nunca pisé un gimnasio, ¿puedo empezar a entrenar con ustedes?',
    a: '¡Totalmente! Diseñamos los planes de entrenamiento adaptados a tu nivel inicial. Te enseñamos la técnica correcta desde cero para asegurar una progresión segura y evitar lesiones.',
  },
  {
    q: '¿Me van a dar una dieta estricta o prohibir alimentos?',
    a: 'No. En VIMET no creemos en las dietas restrictivas de corto plazo. Buscamos educarte para generar hábitos sostenibles, incluyendo los alimentos que te gustan dentro de un esquema equilibrado.',
  },
  {
    q: 'Tengo resistencia a la insulina / diabetes / colesterol, ¿pueden ayudarme?',
    a: 'Sí, somos especialistas en el abordaje de patologías metabólicas. Utilizamos la nutrición y el ejercicio físico como herramientas terapéuticas respaldadas por evidencia científica para mejorar tus marcadores de salud.',
  },
  {
    q: '¿Necesito ir a un gimnasio para hacer el plan de entrenamiento?',
    a: 'No necesariamente. Adaptamos tu rutina al lugar donde prefieras entrenar: puede ser en un gimnasio convencional, en tu casa o al aire libre, utilizando el equipamiento que tengas disponible.',
  },
  {
    q: '¿Trabajan con obras sociales o prepagas?',
    a: 'Trabajamos de forma particular, pero emitimos la factura correspondiente para que puedas gestionar el reintegro con tu prepaga u obra social si tu plan lo permite.',
  },
  {
    q: '¿Cada cuánto tiempo se hacen los controles?',
    a: 'Depende de cada persona y sus objetivos, pero por lo general recomendamos controles cada 3 o 4 semanas. Esto nos permite evaluar tu progreso, mantener la motivación y hacer los ajustes necesarios al plan.',
  },
  {
    q: '¿Es obligatorio comprar suplementos?',
    a: 'De ninguna manera. La base de los resultados siempre será la alimentación real y el entrenamiento constante. Solo recomendamos suplementación (con evidencia científica comprobada) si tu contexto específico lo justifica.',
  },
] as const
