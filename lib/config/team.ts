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
    titulo: 'Lic. en Nutrición',
    matricula: null,
    avatar: '/images/team/avril.jpg',
    instagram: '@avriljer.nutricion',
    instagramUrl: 'https://instagram.com/avriljer.nutricion',
    whatsappUrl: 'https://wa.me/543513752818',
    bioCorta:
      'Licenciada en Nutrición especializada en nutrición deportiva y abordaje integral de patologías metabólicas en Instituto VIANETT.',
    bio: 'Licenciada en Nutrición (UNC). Especializada en el abordaje interdisciplinario de la salud y el alto rendimiento. Actualmente desempeña su labor profesional en el Instituto VIANETT, donde utiliza la alimentación como una herramienta estratégica para potenciar el rendimiento deportivo y tratar alteraciones metabólicas.',
    especialidades: [
      'Nutrición deportiva',
      'Composición corporal',
      'Patologías metabólicas',
      'Suplementación basada en evidencia',
      'Hábitos saludables',
    ],
    areasTrabajo: [
      { icon: 'Activity', title: 'Nutrición Deportiva', desc: 'Optimización del rendimiento para atletas en VIANETT.' },
      { icon: 'Scale', title: 'Composición corporal', desc: 'Evaluación y mejora de la masa muscular y grasa.' },
      { icon: 'Pill', title: 'Suplementación', desc: 'Uso estratégico y seguro según objetivos.' },
      { icon: 'HeartPulse', title: 'Salud Metabólica', desc: 'Tratamiento de resistencia a la insulina e hipertensión.' },
    ],
  },
  gero: {
    key: 'gero',
    dbEmail: 'gero@vimet.com',
    nombre: 'Gerónimo Gallardo',
    titulo: 'Prof. de Educación Física',
    matricula: null,
    avatar: '/images/team/gero.jpg',
    instagram: '@gero_gallardoo',
    instagramUrl: 'https://instagram.com/gero_gallardoo',
    whatsappUrl: 'https://wa.me/543544405114',
    bioCorta:
      'Profesor de Educación Física especializado en entrenamiento adaptado, readaptación deportiva y preparación física.',
    bio: 'Profesor de Educación Física especializado en entrenamiento adaptado y readaptación deportiva. Trabaja con planes personalizados según el nivel, objetivos y disponibilidad de cada persona.',
    especialidades: ['Entrenamiento personalizado', 'Readaptación deportiva', 'Preparación física'],
    areasTrabajo: [
      { icon: 'Dumbbell', title: 'Entrenamiento adaptado', desc: 'Planes según tu nivel, objetivos y disponibilidad.' },
      { icon: 'Stethoscope', title: 'Readaptación deportiva', desc: 'Vuelta al deporte post-lesión paso a paso.' },
      { icon: 'Shield', title: 'Prevención de lesiones', desc: 'Educación y entrenamiento invisible.' },
    ],
  },
}

export const metodologia = {
  pasos: [
    { titulo: 'Evaluación inicial', desc: 'Conocemos tus objetivos, historia clínica, hábitos y estilo de vida actual.', icon: 'ClipboardCheck' },
    { titulo: 'Plan personalizado', desc: 'Diseñamos tu plan nutricional y de entrenamiento adaptado a vos.', icon: 'PencilRuler' },
    { titulo: 'Seguimiento continuo', desc: 'Ajustes periódicos para sostener resultados y mantener la motivación.', icon: 'RefreshCw' },
    { titulo: 'Resultados sostenibles', desc: 'Mejora de salud, composición corporal y calidad de vida a largo plazo.', icon: 'TrendingUp' },
  ],
  pilares: [
    { titulo: 'Interdisciplina', desc: 'La nutrición y el entrenamiento no funcionan por separado. Nuestro abordaje integra ambas disciplinas.', icon: 'Users' },
    { titulo: 'Evidencia científica', desc: 'Cada recomendación está respaldada por literatura científica actualizada.', icon: 'Microscope' },
    { titulo: 'Personalización', desc: 'No hay planes genéricos. Diseñamos todo adaptado a tu estilo de vida, nivel y objetivos.', icon: 'SlidersHorizontal' },
    { titulo: 'Sostenibilidad', desc: 'Buscamos generar hábitos reales que puedas mantener a largo plazo, sin restricciones extremas.', icon: 'Leaf' },
  ],
  dirigidoA: [
    { text: 'Personas que buscan mejorar su composición corporal.', icon: 'Scale' },
    { text: 'Deportistas que quieren optimizar su rendimiento.', icon: 'Activity' },
    { text: 'Pacientes con patologías metabólicas (diabetes, colesterol, etc).', icon: 'HeartPulse' },
    { text: 'Cualquiera que busque un cambio de hábitos integral y sostenible.', icon: 'Stethoscope' },
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
