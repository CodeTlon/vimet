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

export type TipoSeccionPlan = 'pautas_generales' | 'receta' | 'comidas_dia' | 'imagenes' | 'recomendaciones'

// "Pautas generales" NO está acá: sigue siendo el bloque fijo de siempre en
// planes (columnas de texto), no una sección modular más — ver Quirks.
// "imagenes" tampoco: se retiró en favor de "recomendaciones" (mismo texto +
// imágenes opcionales grandes que "receta"), ver Quirks.
export const TIPO_SECCION_PLAN = [
  {
    value: 'receta' as const,
    label: 'Receta',
    descripcion: 'Ingredientes y preparación, con imágenes opcionales',
  },
  {
    value: 'comidas_dia' as const,
    label: 'Comidas del día',
    descripcion: 'Un bloque por cada momento (desayuno, almuerzo, merienda...)',
  },
  {
    value: 'recomendaciones' as const,
    label: 'Recomendaciones',
    descripcion: 'Texto libre + imágenes opcionales, se muestran grandes',
  },
]

export const TIPO_SECCION_PLAN_LABEL: Record<TipoSeccionPlan, string> = {
  pautas_generales: 'Pautas generales',
  receta: 'Receta',
  comidas_dia: 'Comidas del día',
  imagenes: 'Imágenes',
  recomendaciones: 'Recomendaciones',
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

export const DIA_LABEL: Record<string, string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  domingo: 'Domingo',
}
export const ORDEN_DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo', '']

export function resumenFuerza(r: { series: number | null; repeticiones: string | null; descanso_seg: number | null }) {
  return (
    [
      r.series ? `${r.series} series` : null,
      r.repeticiones ? `${r.repeticiones} reps` : null,
      r.descanso_seg ? `${r.descanso_seg}s descanso` : null,
    ]
      .filter(Boolean)
      .join(' · ') || '—'
  )
}

export const UNIDAD_CARDIO_LABEL: Record<string, string> = {
  minutos: 'min',
  horas: 'hs',
  km: 'km',
}

export function formatearFaseCardio(valor: number | null, unidad: string | null) {
  if (valor == null || !unidad) return null
  return `${valor} ${UNIDAD_CARDIO_LABEL[unidad] ?? unidad}`
}

export function resumenCardio(item: {
  cardio_entrada_calor_valor: number | null
  cardio_entrada_calor_unidad: string | null
  cardio_trabajo_principal_valor: number | null
  cardio_trabajo_principal_unidad: string | null
  cardio_vuelta_calma_valor: number | null
  cardio_vuelta_calma_unidad: string | null
}) {
  const fases: [string, string | null][] = [
    ['Entrada en calor', formatearFaseCardio(item.cardio_entrada_calor_valor, item.cardio_entrada_calor_unidad)],
    ['Trabajo principal', formatearFaseCardio(item.cardio_trabajo_principal_valor, item.cardio_trabajo_principal_unidad)],
    ['Vuelta a la calma', formatearFaseCardio(item.cardio_vuelta_calma_valor, item.cardio_vuelta_calma_unidad)],
  ]
  const partes = fases.filter(([, v]) => v).map(([label, v]) => `${label}: ${v}`)
  return partes.length ? partes.join(' · ') : null
}

// ─────────────────────────────────────────────────────────
// Antropometría ISAK: IMO, Adiposidad (Σ pliegues), Muscularidad
// (perímetros corregidos) — fórmulas verificadas contra un reporte real de
// ISAKmetry. Ninguno de estos valores se persiste: se calculan on-the-fly a
// partir de los campos crudos (mismo criterio que categoriaCondicionFisica).
// ─────────────────────────────────────────────────────────
export type MedicionIsakRaw = {
  pliegue_triceps_mm: number | null
  pliegue_subescapular_mm: number | null
  pliegue_supraespinal_mm: number | null
  pliegue_abdominal_mm: number | null
  pliegue_muslo_mm: number | null
  pliegue_pierna_mm: number | null
  pliegue_biceps_mm: number | null
  pliegue_cresta_iliaca_mm: number | null
  perimetro_brazo_cm: number | null
  perimetro_muslo_cm: number | null
  perimetro_pierna_cm: number | null
  kg_tejido_muscular: number | null
  kg_tejido_oseo: number | null
}

const round = (n: number, decimales: number) => {
  const f = 10 ** decimales
  return Math.round(n * f) / f
}

const ISAK_KEYS = [
  'pliegue_triceps_mm',
  'pliegue_subescapular_mm',
  'pliegue_supraespinal_mm',
  'pliegue_abdominal_mm',
  'pliegue_muslo_mm',
  'pliegue_pierna_mm',
  'pliegue_biceps_mm',
  'pliegue_cresta_iliaca_mm',
  'perimetro_brazo_cm',
  'perimetro_muslo_cm',
  'perimetro_pierna_cm',
  'kg_tejido_muscular',
  'kg_tejido_oseo',
] as const satisfies readonly (keyof MedicionIsakRaw)[]

// true solo si están los 13 campos — un ISAK a medias no sirve para calcular
// nada (Σ6/Σ8/IMO exigen su propio subconjunto completo cada uno). Ojo:
// quienes llaman a esto suelen pasar el objeto medición COMPLETO (con
// peso_kg/dx_antropometrico/observaciones/etc., no solo los 13 de ISAK) —
// por eso se chequean las 13 claves explícitas y no Object.values(m), que
// daría false ante cualquier otro campo ajeno a ISAK que esté vacío (bug
// real: rompía el badge del histórico con evaluaciones ISAK 100% completas
// solo porque, por ejemplo, "observaciones" había quedado sin cargar).
export function isakCompleto(m: MedicionIsakRaw): boolean {
  return ISAK_KEYS.every((k) => m[k] !== null && m[k] !== undefined)
}

// Σ6: no incluye bíceps ni cresta ilíaca (a diferencia de Σ8). Da null si
// falta cualquiera de los 6 sitios — un sumatorio parcial no es comparable
// contra las tablas de referencia ISAK, sería un dato engañoso.
export function sumaPliegues6(m: MedicionIsakRaw): number | null {
  const sitios = [
    m.pliegue_triceps_mm,
    m.pliegue_subescapular_mm,
    m.pliegue_supraespinal_mm,
    m.pliegue_abdominal_mm,
    m.pliegue_muslo_mm,
    m.pliegue_pierna_mm,
  ]
  if (sitios.some((v) => v == null)) return null
  return round(
    sitios.reduce<number>((a, v) => a + (v as number), 0),
    1,
  )
}

export function sumaPliegues8(m: MedicionIsakRaw): number | null {
  const s6 = sumaPliegues6(m)
  if (s6 == null || m.pliegue_biceps_mm == null || m.pliegue_cresta_iliaca_mm == null) return null
  return round(s6 + m.pliegue_biceps_mm + m.pliegue_cresta_iliaca_mm, 1)
}

function perimetroCorregido(perimetroCm: number | null, pliegueMm: number | null): number | null {
  if (perimetroCm == null || pliegueMm == null) return null
  return round(perimetroCm - Math.PI * (pliegueMm / 10), 2)
}

export function perimetrosCorregidos(m: MedicionIsakRaw) {
  return {
    brazo: perimetroCorregido(m.perimetro_brazo_cm, m.pliegue_triceps_mm),
    muslo: perimetroCorregido(m.perimetro_muslo_cm, m.pliegue_muslo_mm),
    pierna: perimetroCorregido(m.perimetro_pierna_cm, m.pliegue_pierna_mm),
  }
}

export function imo(kgTejidoMuscular: number | null, kgTejidoOseo: number | null): number | null {
  if (kgTejidoMuscular == null || kgTejidoOseo == null || kgTejidoOseo <= 0) return null
  return round(kgTejidoMuscular / kgTejidoOseo, 2)
}

export function clasificarImo(valor: number | null): { label: string; color: string } | null {
  if (valor == null) return null
  if (valor < 2.01) return { label: 'Muy bajo', color: 'bg-red-100 text-red-800' }
  if (valor < 2.11) return { label: 'Bajo', color: 'bg-yellow-100 text-yellow-800' }
  if (valor < 2.78) return { label: 'Medio', color: 'bg-blue-100 text-blue-800' }
  if (valor < 2.96) return { label: 'Alto', color: 'bg-emerald-100 text-emerald-800' }
  return { label: 'Muy alto', color: 'bg-green-100 text-green-800' }
}
