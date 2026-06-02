import { requireStaff } from '@/lib/supabase/auth-helpers'
import { AsignarRolForm, CambiarPasswordForm, ReasignarServiciosForm } from '@/components/configuracion-staff'

export const metadata = { title: 'Configuración · VIMET' }

export default async function ConfiguracionPage() {
  await requireStaff()

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
      <AsignarRolForm />
      <ReasignarServiciosForm />
      <CambiarPasswordForm />
    </main>
  )
}
