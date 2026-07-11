import Link from 'next/link'

import { AuthShell } from '@/components/auth-shell'
import { RegisterForm } from '@/components/register-form'

export const metadata = { title: 'Crear cuenta' }

export default function RegistroPage() {
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
