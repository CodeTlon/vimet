import type { Metadata } from 'next'

import { AuthShell } from '@/components/auth-shell'
import { LoginForm } from '@/components/login-form'

export const metadata: Metadata = {
  title: 'Ingresar',
  description: 'Iniciá sesión en tu cuenta VIMET para gestionar tus turnos, planes y seguimiento.',
  robots: { index: false, follow: false },
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ confirmado?: string; linkinvalido?: string }>
}) {
  // El link del mail de registro termina acá (ver la plantilla "Confirm signup"
  // en Supabase → /auth/callback → /login?confirmado=1). Sin este cartel el
  // usuario aterriza en un login mudo y no sabe si la confirmación funcionó.
  const params = await searchParams

  return (
    <AuthShell
      description="Iniciá sesión para gestionar tus turnos"
      title="Bienvenido de nuevo"
    >
      {params.confirmado === '1' && (
        <div
          role="status"
          className="mb-4 rounded-lg bg-success/10 border border-success/20 px-4 py-3 text-sm text-success"
        >
          ¡Email confirmado! Tu cuenta queda pendiente de activación: te avisamos apenas esté lista.
        </div>
      )}
      {params.linkinvalido === '1' && (
        <div
          role="alert"
          className="mb-4 rounded-lg bg-vimet-red/10 border border-vimet-red/20 px-4 py-3 text-sm text-vimet-red"
        >
          Ese link ya fue usado o venció. Si ya confirmaste tu email, probá ingresar igual.
        </div>
      )}
      <LoginForm />
    </AuthShell>
  )
}
