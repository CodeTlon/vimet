import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { AuthShell } from '@/components/auth-shell'
import { RegisterForm } from '@/components/register-form'
import { esStaff, getUserAndProfile } from '@/lib/auth/session'

export const metadata: Metadata = {
  title: 'Crear cuenta',
  description: 'Creá tu cuenta de paciente en VIMET para reservar turnos de nutrición y entrenamiento.',
  robots: { index: false, follow: false },
}

export default async function RegistroPage() {
  const { user, profile } = await getUserAndProfile()
  if (user && profile) redirect(esStaff(profile.rol) ? '/admin/dashboard' : '/mis-turnos')

  return (
    <AuthShell
      description="Creá tu cuenta para sacar turnos"
      title="Crear cuenta"
      backHref="/login"
      backLabel="Volver a iniciar sesión"
      footer={
        <>
          ¿Ya tenés cuenta?{' '}
          <Link href="/login" className="font-semibold text-vimet-orange hover:text-vimet-red transition-colors">
            Iniciar sesión
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  )
}
