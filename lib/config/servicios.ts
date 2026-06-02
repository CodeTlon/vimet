import {
  Activity,
  Apple,
  Dumbbell,
  HandHeart,
  HeartPulse,
  Sprout,
  Stethoscope,
  type LucideIcon,
} from 'lucide-react'

export type TipoServicio = 'nutricion' | 'entrenamiento' | 'combo'

export type ServicioStatic = {
  nombre: string
  descripcion: string
  duracion_minutos: number
  tipo: TipoServicio
  icono: string
  profesional: 'avril' | 'gero' | null
}

// Catálogo de fallback usado cuando la DB no está disponible (build sin credenciales)
// y como referencia para las migrations.
export const SERVICIOS_FALLBACK: ServicioStatic[] = [
  {
    nombre: 'Consulta nutricional',
    descripcion: 'Evaluación inicial + plan nutricional personalizado.',
    duracion_minutos: 60,
    tipo: 'nutricion',
    icono: 'Apple',
    profesional: 'avril',
  },
  {
    nombre: 'Nutrición deportiva',
    descripcion: 'Plan alimentario enfocado en rendimiento deportivo.',
    duracion_minutos: 60,
    tipo: 'nutricion',
    icono: 'Activity',
    profesional: 'avril',
  },
  {
    nombre: 'Abordaje metabólico',
    descripcion: 'Para sobrepeso, resistencia a la insulina o hipertensión.',
    duracion_minutos: 60,
    tipo: 'nutricion',
    icono: 'HeartPulse',
    profesional: 'avril',
  },
  {
    nombre: 'Cambio de hábitos',
    descripcion: 'Transformá tu relación con la alimentación.',
    duracion_minutos: 45,
    tipo: 'nutricion',
    icono: 'Sprout',
    profesional: 'avril',
  },
  {
    nombre: 'Plan de entrenamiento',
    descripcion: 'Entrenamiento adaptado a tu nivel y objetivos.',
    duracion_minutos: 60,
    tipo: 'entrenamiento',
    icono: 'Dumbbell',
    profesional: 'gero',
  },
  {
    nombre: 'Readaptación deportiva',
    descripcion: 'Vuelta al deporte post-lesión.',
    duracion_minutos: 60,
    tipo: 'entrenamiento',
    icono: 'Stethoscope',
    profesional: 'gero',
  },
  {
    nombre: 'Plan integral VIMET',
    descripcion: 'Nutrición + Entrenamiento interdisciplinario.',
    duracion_minutos: 90,
    tipo: 'combo',
    icono: 'HandHeart',
    profesional: null,
  },
]

export const SERVICIO_ICONS: Record<string, LucideIcon> = {
  Apple,
  Activity,
  HeartPulse,
  Sprout,
  Dumbbell,
  Stethoscope,
  HandHeart,
}

export const TIPO_LABEL: Record<TipoServicio, string> = {
  nutricion: 'Nutrición',
  entrenamiento: 'Entrenamiento',
  combo: 'Plan Integral',
}
