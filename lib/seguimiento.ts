// Helpers compartidos del módulo de seguimiento

import { lunesDeSemanaArgentina } from '@/lib/datetime'

export function categoriaCondicionFisica(puntajeTotal: number, puntajeMax = 100) {
  const pct = puntajeMax === 0 ? 0 : (puntajeTotal / puntajeMax) * 100
  if (pct >= 90) return { label: 'Excelente', color: 'bg-green-100 text-green-800', pct }
  if (pct >= 80) return { label: 'Muy buena', color: 'bg-emerald-100 text-emerald-800', pct }
  if (pct >= 60) return { label: 'Buena', color: 'bg-blue-100 text-blue-800', pct }
  if (pct >= 40) return { label: 'Regular', color: 'bg-yellow-100 text-yellow-800', pct }
  return { label: 'Mala', color: 'bg-red-100 text-red-800', pct }
}

export const TESTS_FUNCIONALES = [
  { key: 'test_wells_adams', label: 'Test de Wells - Adams', max: 10 },
  { key: 'test_thomas', label: 'Test de Thomas', max: 10 },
  { key: 'test_dorsiflexion', label: 'Dorsiflexión de tobillo', max: 10 },
  { key: 'test_sentadilla', label: 'Sentadilla de arranque', max: 10 },
  { key: 'test_estabilidad', label: 'Estabilidad (3 puntos + salto)', max: 10 },
  { key: 'fuerza_inferior', label: 'Fuerza miembro inferior', max: 15 },
  { key: 'fuerza_superior', label: 'Fuerza miembro superior', max: 15 },
  { key: 'resistencia_metabolica', label: 'Resistencia metabólica', max: 20 },
] as const

export const PUNTAJE_MAX_FUNCIONAL = TESTS_FUNCIONALES.reduce((a, t) => a + t.max, 0)

export const CATEGORIA_OBJETIVO_LABEL: Record<string, string> = {
  nutricional: 'Nutricional',
  antropometrico: 'Antropométrico',
  clinico: 'Clínico',
  entrenamiento: 'Entrenamiento',
  rendimiento: 'Rendimiento',
}

export const ESTADO_TURNO_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  cancelado: 'Cancelado',
  completado: 'Completado',
  no_asistio: 'No asistió',
}

export const ESTADO_TURNO_BADGE: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  confirmado: 'bg-green-100 text-green-800',
  cancelado: 'bg-red-100 text-red-800',
  completado: 'bg-blue-100 text-blue-800',
  no_asistio: 'bg-gray-200 text-gray-700',
}

export const ESTADO_OBJETIVO_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  en_progreso: 'En progreso',
  cumplido: 'Cumplido',
  descartado: 'Descartado',
}

export const ESTADO_OBJETIVO_BADGE: Record<string, string> = {
  pendiente: 'bg-gray-100 text-gray-700',
  en_progreso: 'bg-blue-100 text-blue-800',
  cumplido: 'bg-green-100 text-green-800',
  descartado: 'bg-gray-100 text-gray-500',
}

export const ESTADO_PLAN_LABEL: Record<string, string> = {
  vigente: 'Vigente',
  archivado: 'Archivado',
  borrador: 'Borrador',
}

export const ESTADO_PLAN_BADGE: Record<string, string> = {
  vigente: 'bg-green-100 text-green-800',
  archivado: 'bg-vimet-tint1 text-vimet-tint5',
  borrador: 'bg-vimet-tint2 text-vimet-tint6',
}

export const TIPO_PLAN_LABEL: Record<string, string> = {
  nutricion: 'Nutrición',
  entrenamiento: 'Entrenamiento',
  combo: 'Combo',
}

export const SEXO_LABEL: Record<string, string> = {
  femenino: 'Femenino',
  masculino: 'Masculino',
  otro: 'Otro',
}

export const ACTIVIDAD_DIARIA_LABEL: Record<string, string> = {
  poca: 'Poca',
  normal: 'Normal',
  mucha: 'Mucha',
}

// Lunes de la semana calendario de Argentina — formato YYYY-MM-DD
export function lunesDeSemana(date: Date = new Date()): string {
  return lunesDeSemanaArgentina(date)
}

export function formatearFechaCorta(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(`${iso}T00:00:00`).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
