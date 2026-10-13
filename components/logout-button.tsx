'use client'

import { useRouter } from 'next/navigation'
import { type ButtonHTMLAttributes, type ReactNode, useState } from 'react'

import { authClient } from '@/lib/auth-client'

/**
 * Logout del lado del cliente: `signOut` revoca la sesion en el servidor y limpia la cookie;
 * despues se refresca la ruta para que el layout (que resuelve la sesion en el servidor)
 * vuelva a renderizar sin el usuario.
 */
export function LogoutButton({
  className,
  children,
  ...props
}: {
  className?: string
  children: ReactNode
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'type' | 'disabled'>) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const onLogout = async () => {
    if (loading) return
    setLoading(true)
    await authClient.signOut()
    router.replace('/')
    router.refresh()
  }

  return (
    <button type="button" onClick={onLogout} disabled={loading} className={className} {...props}>
      {children}
    </button>
  )
}
