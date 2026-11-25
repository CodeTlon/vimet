// Helper compartido entre el admin (editar plan) y el paciente (ver plan):
// trae las secciones modulares de un plan con sus momentos/imágenes anidados
// y resuelve las URLs firmadas del bucket privado 'planes' en un solo batch.

import { asc, eq, inArray } from 'drizzle-orm'

import type { Seccion } from '@/components/seguimiento/plan-seccion-form'
import { plan_seccion_comidas, plan_seccion_imagenes, plan_secciones } from '@/db/schema'
import { db as dbGlobal, type Db } from '@/lib/db'
import { urlsFirmadas } from '@/lib/storage/disk'

export async function obtenerSeccionesPlan(planId: number, db: Db = dbGlobal): Promise<Seccion[]> {
  const secciones = await db
    .select()
    .from(plan_secciones)
    .where(eq(plan_secciones.plan_id, planId))
    .orderBy(asc(plan_secciones.orden))
  if (secciones.length === 0) return []

  const ids = secciones.map((s) => s.id)
  const [momentos, imagenes] = await Promise.all([
    db.select().from(plan_seccion_comidas).where(inArray(plan_seccion_comidas.seccion_id, ids)).orderBy(asc(plan_seccion_comidas.orden)),
    db.select().from(plan_seccion_imagenes).where(inArray(plan_seccion_imagenes.seccion_id, ids)).orderBy(asc(plan_seccion_imagenes.orden)),
  ])

  const urlByPath = await urlsFirmadas('planes', imagenes.map((i) => i.storage_path), 60 * 60)

  return secciones.map((s) => ({
    id: s.id,
    tipo: s.tipo,
    titulo: s.titulo,
    contenido: s.contenido,
    momentos: momentos
      .filter((m) => m.seccion_id === s.id)
      .map((m) => ({ id: m.id, nombre_momento: m.nombre_momento, contenido: m.contenido })),
    imagenes: imagenes
      .filter((i) => i.seccion_id === s.id)
      .map((img) => ({ id: img.id, url: urlByPath.get(img.storage_path) ?? '' })),
  }))
}
