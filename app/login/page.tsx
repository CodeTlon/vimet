import Link from 'next/link'

import { AuthShell } from '@/components/auth-shell'
import { LoginForm } from '@/components/login-form'

export const metadata = { title: 'Ingresar' }

export default function LoginPage() {
  return (
    <AuthShell
      description="Iniciá sesión para gestionar tus turnos"
      title="Bienvenido de nuevo"
      footer={
        <>
          ¿No tenés cuenta?{' '}
          <Link href="/registro" className="font-semibold text-vimet-orange hover:underline">
            Crear cuenta
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  )
}
