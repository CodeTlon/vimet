// Contenido editable desde /admin — lee de Supabase con fallback a lib/config/team.ts
// (mismo patrón que loadServicios() en app/(public)/servicios/page.tsx)

import { createClient } from '@/lib/supabase/server'
import {
  team as TEAM_FALLBACK,
  location as LOCATION_FALLBACK,
  social as SOCIAL_FALLBACK,
  metodologia as METODOLOGIA_FALLBACK,
  type Profesional,
  type AreaTrabajo,
} from './team'

export type ContenidoSitio = {
  direccion: string
  lugar: string
  ciudad: string
  mapEmbed: string
  emailContacto: string
  whatsappGeneral: string
  instagramHandle: string
  instagramUrl: string
  metodologia: typeof METODOLOGIA_FALLBACK
}

export async function getContenidoSitio(): Promise<ContenidoSitio> {
  const supabase = await createClient()
  const { data } = await supabase.from('contenido_sitio').select('*').eq('id', 1).maybeSingle()

  return {
    direccion: data?.direccion ?? LOCATION_FALLBACK.address,
    lugar: data?.lugar ?? LOCATION_FALLBACK.place,
    ciudad: data?.ciudad ?? LOCATION_FALLBACK.city,
    mapEmbed: data?.map_embed_url ?? LOCATION_FALLBACK.mapEmbed,
    emailContacto: data?.email_contacto ?? 'hola@vimet.com',
    whatsappGeneral: data?.whatsapp_general ?? SOCIAL_FALLBACK.whatsapp,
    instagramHandle: data?.instagram_handle ?? SOCIAL_FALLBACK.instagramHandle,
    instagramUrl: data?.instagram_url ?? SOCIAL_FALLBACK.instagram,
    metodologia: {
      pasos: data?.metodologia_pasos?.length ? data.metodologia_pasos : METODOLOGIA_FALLBACK.pasos,
      pilares: data?.metodologia_pilares?.length ? data.metodologia_pilares : METODOLOGIA_FALLBACK.pilares,
      dirigidoA: data?.metodologia_dirigido_a?.length
        ? data.metodologia_dirigido_a
        : METODOLOGIA_FALLBACK.dirigidoA,
    } as typeof METODOLOGIA_FALLBACK,
  }
}

export async function getProfesionales(): Promise<Record<'avril' | 'gero', Profesional>> {
  const supabase = await createClient()
  const emails = [TEAM_FALLBACK.avril.dbEmail, TEAM_FALLBACK.gero.dbEmail]
  const { data } = await supabase
    .from('profiles')
    .select(
      'email, nombre, titulo, matricula, foto_url, instagram_handle, instagram_url, whatsapp_url, bio_corta, bio, especialidades, areas_trabajo',
    )
    .in('email', emails)

  const byEmail = new Map(data?.map((p) => [p.email, p]))

  function build(key: 'avril' | 'gero'): Profesional {
    const fallback = TEAM_FALLBACK[key]
    const row = byEmail.get(fallback.dbEmail)
    return {
      key,
      dbEmail: fallback.dbEmail,
      nombre: row?.nombre || fallback.nombre,
      titulo: row?.titulo ?? fallback.titulo,
      matricula: row?.matricula ?? fallback.matricula,
      avatar: row?.foto_url ?? fallback.avatar,
      instagram: row?.instagram_handle ?? fallback.instagram,
      instagramUrl: row?.instagram_url ?? fallback.instagramUrl,
      whatsappUrl: row?.whatsapp_url ?? fallback.whatsappUrl,
      bioCorta: row?.bio_corta ?? fallback.bioCorta,
      bio: row?.bio ?? fallback.bio,
      especialidades: row?.especialidades?.length ? row.especialidades : fallback.especialidades,
      areasTrabajo: (row?.areas_trabajo?.length ? row.areas_trabajo : fallback.areasTrabajo) as AreaTrabajo[],
    }
  }

  return { avril: build('avril'), gero: build('gero') }
}
