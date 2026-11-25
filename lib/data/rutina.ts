import { asc, eq } from 'drizzle-orm'

import type { RutinaEjercicio } from '@/components/seguimiento/rutina-viewer'
import { ejercicios, plan_ejercicios } from '@/db/schema'
import { db as dbGlobal, type Db } from '@/lib/db'

/**
 * Rutina de un plan con el ejercicio embebido. NO autoriza: el llamador ya verifico que el
 * usuario es el paciente dueño del plan o staff (reemplaza la policy `plan_ejercicios paciente read`).
 */
export async function obtenerRutinaPlan(planId: number, db: Db = dbGlobal): Promise<RutinaEjercicio[]> {
  const filas = await db
    .select({
      id: plan_ejercicios.id,
      dia_semana: plan_ejercicios.dia_semana,
      series: plan_ejercicios.series,
      repeticiones: plan_ejercicios.repeticiones,
      descanso_seg: plan_ejercicios.descanso_seg,
      notas: plan_ejercicios.notas,
      cardio_entrada_calor_valor: plan_ejercicios.cardio_entrada_calor_valor,
      cardio_entrada_calor_unidad: plan_ejercicios.cardio_entrada_calor_unidad,
      cardio_trabajo_principal_valor: plan_ejercicios.cardio_trabajo_principal_valor,
      cardio_trabajo_principal_unidad: plan_ejercicios.cardio_trabajo_principal_unidad,
      cardio_vuelta_calma_valor: plan_ejercicios.cardio_vuelta_calma_valor,
      cardio_vuelta_calma_unidad: plan_ejercicios.cardio_vuelta_calma_unidad,
      ejercicio: {
        nombre: ejercicios.nombre,
        gif_url: ejercicios.gif_url,
        imagen_url: ejercicios.imagen_url,
        youtube_url: ejercicios.youtube_url,
        atribucion: ejercicios.atribucion,
        instrucciones: ejercicios.instrucciones,
        modo: ejercicios.modo,
      },
    })
    .from(plan_ejercicios)
    .leftJoin(ejercicios, eq(ejercicios.id, plan_ejercicios.ejercicio_id))
    .where(eq(plan_ejercicios.plan_id, planId))
    .orderBy(asc(plan_ejercicios.orden))
  return filas as RutinaEjercicio[]
}
