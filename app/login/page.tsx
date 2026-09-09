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
  searchParams: Promise<{ linkinvalido?: string }>
}) {
  const params = await searchParams

  return (
    <AuthShell
      description="Iniciá sesión para gestionar tus turnos"
      title="Bienvenido de nuevo"
    >
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
