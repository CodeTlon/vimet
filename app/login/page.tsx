import { AuthShell } from '@/components/auth-shell'
import { LoginForm } from '@/components/login-form'

export const metadata = { title: 'Ingresar' }

export default function LoginPage() {
  return (
    <AuthShell
      description="Iniciá sesión para gestionar tus turnos"
      title="Bienvenido de nuevo"
    >
      <LoginForm />
    </AuthShell>
  )
}
