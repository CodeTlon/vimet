// Helper compartido entre el admin (editar plan) y el paciente (ver plan):
// trae las secciones modulares de un plan con sus momentos/imágenes anidados
// y resuelve las URLs firmadas del bucket privado 'planes' en un solo batch.

import type { Seccion } from '@/components/seguimiento/plan-seccion-form'
import { createClient } from '@/lib/supabase/server'

type SupabaseServer = Awaited<ReturnType<typeof createClient>>

type SeccionRow = {
  id: number
  tipo: Seccion['tipo']
  titulo: string
  contenido: string | null
  orden: number
  plan_seccion_comidas: { id: number; nombre_momento: string; contenido: string; orden: number }[]
  plan_seccion_imagenes: { id: number; storage_path: string; orden: number }[]
}

export async function obtenerSeccionesPlan(
  supabase: SupabaseServer,
  planId: number,
): Promise<Seccion[]> {
  const { data: raw } = await supabase
    .from('plan_secciones')
    .select(
      'id, tipo, titulo, contenido, orden, ' +
        'plan_seccion_comidas(id, nombre_momento, contenido, orden), ' +
        'plan_seccion_imagenes(id, storage_path, orden)',
    )
    .eq('plan_id', planId)
    .order('orden', { ascending: true })

  const secciones = raw as unknown as SeccionRow[] | null
  if (!secciones || secciones.length === 0) return []

  const paths = secciones.flatMap((s) => (s.plan_seccion_imagenes ?? []).map((i) => i.storage_path as string))
  const urlByPath = new Map<string, string>()
  if (paths.length > 0) {
    const { data: signed } = await supabase.storage.from('planes').createSignedUrls(paths, 60 * 60)
    for (const s of signed ?? []) {
      if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl)
    }
  }

  return secciones.map((s) => ({
    id: s.id,
    tipo: s.tipo,
    titulo: s.titulo,
    contenido: s.contenido,
    momentos: [...(s.plan_seccion_comidas ?? [])]
      .sort((a, b) => a.orden - b.orden)
      .map((m) => ({ id: m.id, nombre_momento: m.nombre_momento, contenido: m.contenido })),
    imagenes: [...(s.plan_seccion_imagenes ?? [])]
      .sort((a, b) => a.orden - b.orden)
      .map((img) => ({ id: img.id, url: urlByPath.get(img.storage_path) ?? '' })),
  }))
}
