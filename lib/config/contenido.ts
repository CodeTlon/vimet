// Contenido editable desde /admin — lee de Supabase con fallback a lib/config/team.ts
// (mismo patrón que loadServicios() en app/(public)/servicios/page.tsx)

import { eq, inArray } from "drizzle-orm";

import { contenido_sitio, profiles } from "@/db/schema";
import { db } from "@/lib/db";
import {
  team as TEAM_FALLBACK,
  location as LOCATION_FALLBACK,
  social as SOCIAL_FALLBACK,
  metodologia as METODOLOGIA_FALLBACK,
  type Profesional,
  type AreaTrabajo,
} from "./team";

export type ContenidoSitio = {
  direccion: string;
  lugar: string;
  ciudad: string;
  mapEmbed: string;
  emailContacto: string;
  whatsappGeneral: string;
  instagramHandle: string;
  instagramUrl: string;
  metodologia: typeof METODOLOGIA_FALLBACK;
};

export async function getContenidoSitio(): Promise<ContenidoSitio> {
  // El sitio publico no debe caerse si la base no responde (ni romper el build sin base): cae al
  // contenido estatico de lib/config/team.ts, igual que cuando todavia no hay fila.
  let data: typeof contenido_sitio.$inferSelect | undefined;
  try {
    [data] = await db
      .select()
      .from(contenido_sitio)
      .where(eq(contenido_sitio.id, 1))
      .limit(1);
  } catch (err) {
    console.error(
      "getContenidoSitio: usando contenido estatico:",
      err instanceof Error ? err.message : err,
    );
  }

  return {
    direccion: data?.direccion ?? LOCATION_FALLBACK.address,
    lugar: data?.lugar ?? LOCATION_FALLBACK.place,
    ciudad: data?.ciudad ?? LOCATION_FALLBACK.city,
    mapEmbed: data?.map_embed_url ?? LOCATION_FALLBACK.mapEmbed,
    emailContacto: data?.email_contacto ?? "hola@vimet.com",
    whatsappGeneral: data?.whatsapp_general ?? SOCIAL_FALLBACK.whatsapp,
    instagramHandle: data?.instagram_handle ?? SOCIAL_FALLBACK.instagramHandle,
    instagramUrl: data?.instagram_url ?? SOCIAL_FALLBACK.instagram,
    metodologia: {
      pasos: data?.metodologia_pasos?.length
        ? data.metodologia_pasos
        : METODOLOGIA_FALLBACK.pasos,
      pilares: data?.metodologia_pilares?.length
        ? data.metodologia_pilares
        : METODOLOGIA_FALLBACK.pilares,
      dirigidoA: data?.metodologia_dirigido_a?.length
        ? data.metodologia_dirigido_a
        : METODOLOGIA_FALLBACK.dirigidoA,
    } as typeof METODOLOGIA_FALLBACK,
  };
}

type PerfilPublico = {
  slot_publico: string | null;
  nombre: string;
  titulo: string | null;
  matricula: string | null;
  foto_url: string | null;
  instagram_handle: string | null;
  instagram_url: string | null;
  whatsapp_url: string | null;
  bio_corta: string | null;
  bio: string | null;
  especialidades: string[];
  areas_trabajo: unknown[];
};

export async function getProfesionales(): Promise<
  Record<"avril" | "gero", Profesional>
> {
  let data: PerfilPublico[] = [];
  try {
    data = await db
      .select({
        slot_publico: profiles.slot_publico,
        nombre: profiles.nombre,
        titulo: profiles.titulo,
        matricula: profiles.matricula,
        foto_url: profiles.foto_url,
        instagram_handle: profiles.instagram_handle,
        instagram_url: profiles.instagram_url,
        whatsapp_url: profiles.whatsapp_url,
        bio_corta: profiles.bio_corta,
        bio: profiles.bio,
        especialidades: profiles.especialidades,
        areas_trabajo: profiles.areas_trabajo,
      })
      .from(profiles)
      .where(inArray(profiles.slot_publico, ["avril", "gero"]));
  } catch (err) {
    console.error(
      "getProfesionales: usando datos estaticos:",
      err instanceof Error ? err.message : err,
    );
  }

  const bySlot = new Map(data.map((p) => [p.slot_publico, p]));

  function build(key: "avril" | "gero"): Profesional {
    const fallback = TEAM_FALLBACK[key];
    const row = bySlot.get(key);
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
      especialidades: row?.especialidades?.length
        ? row.especialidades
        : fallback.especialidades,
      areasTrabajo: (row?.areas_trabajo?.length
        ? row.areas_trabajo
        : fallback.areasTrabajo) as AreaTrabajo[],
    };
  }

  return { avril: build("avril"), gero: build("gero") };
}
