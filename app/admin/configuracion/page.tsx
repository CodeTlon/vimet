import { CambiarPasswordForm, ConfigurarProfesionalForm } from '@/components/configuracion-staff'
import { PerfilPublicoForm } from '@/components/admin/perfil-publico-form'
import { getProfesionales } from '@/lib/config/contenido'
import { requireStaff } from '@/lib/supabase/auth-helpers'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Configuración · VIMET' }

export default async function ConfiguracionPage() {
  await requireStaff()

  const supabase = await createClient()
  const [profesionales, { data: profiles }] = await Promise.all([
    getProfesionales(),
    supabase.from('profiles').select('id, email').in('email', ['avril@vimet.com', 'gero@vimet.com']),
  ])
  const idByEmail = new Map(profiles?.map((p) => [p.email, p.id] as const))

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
      <ConfigurarProfesionalForm />
      <CambiarPasswordForm />

      {(['avril', 'gero'] as const).map((key) => {
        const p = profesionales[key]
        const profileId = idByEmail.get(p.dbEmail)
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
