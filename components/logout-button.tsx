'use client'

import { useRouter } from 'next/navigation'
import { type ButtonHTMLAttributes, type ReactNode, useState } from 'react'

import { createClient } from '@/lib/supabase/client'

/**
 * Logout del lado del cliente: el signOut corre sobre el cliente browser de
 * Supabase para que dispare `onAuthStateChange` (así la navbar y demás UI que
 * escuchan la sesión se actualizan al instante) y además limpie las cookies.
 * Un server action solo limpiaba las cookies en el server y dejaba el estado
 * en memoria del cliente colgado mostrando "Panel"/"Mi espacio".
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
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/')
    router.refresh()
  }

  return (
    <button type="button" onClick={onLogout} disabled={loading} className={className} {...props}>
      {children}
    </button>
  )
}
