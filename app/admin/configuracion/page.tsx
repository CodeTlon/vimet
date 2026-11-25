import { CambiarPasswordForm, ConfigurarProfesionalForm } from '@/components/configuracion-staff'
import { PerfilPublicoForm } from '@/components/admin/perfil-publico-form'
import { getProfesionales } from '@/lib/config/contenido'
import { inArray } from 'drizzle-orm'

import { profiles as tablaProfiles } from '@/db/schema'
import { requireStaff } from '@/lib/auth/session'
import { db } from '@/lib/db'
export const metadata = { title: 'Configuración · VIMET' }

export default async function ConfiguracionPage() {
  await requireStaff()

  const [profesionales, profiles] = await Promise.all([
    getProfesionales(),
    db
      .select({ id: tablaProfiles.id, slot_publico: tablaProfiles.slot_publico })
      .from(tablaProfiles)
      .where(inArray(tablaProfiles.slot_publico, ['avril', 'gero'])),
  ])

  const idBySlot = new Map(profiles.map((p) => [p.slot_publico, p.id] as const))

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
      <ConfigurarProfesionalForm />
      <CambiarPasswordForm />

      {(['avril', 'gero'] as const).map((key) => {
        const p = profesionales[key]
        const profileId = idBySlot.get(key)
        if (!profileId) return null
        return (
          <PerfilPublicoForm
            key={key}
            profileId={profileId}
            nombre={p.nombre}
            titulo={p.titulo}
            matricula={p.matricula ?? ''}
            fotoUrl={p.avatar}
            instagramHandle={p.instagram}
            instagramUrl={p.instagramUrl}
            whatsappUrl={p.whatsappUrl}
            bioCorta={p.bioCorta}
            bio={p.bio}
            especialidades={p.especialidades}
            areasTrabajo={p.areasTrabajo}
          />
        )
      })}
    </main>
  )
}
