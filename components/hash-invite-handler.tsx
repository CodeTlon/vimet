'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { createClient } from '@/lib/supabase/client'

// Detecta tokens de invitación o recuperación en el hash
// (#access_token=...&type=invite | #access_token=...&type=recovery).
// @supabase/ssr no procesa el hash automáticamente, hay que parsear y setSession manualmente.
// En ambos casos el destino es /auth/nueva-contrasena para crear/cambiar la contraseña.
export function HashInviteHandler() {
  const router = useRouter()

  useEffect(() => {
    const hash = window.location.hash.substring(1)
    if (!hash.includes('type=invite') && !hash.includes('type=recovery')) return

    const params = new URLSearchParams(hash)
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    if (!accessToken || !refreshToken) return

    // recovery = usuario existente cambiando contraseña; invite = primer ingreso.
    const flow = params.get('type') === 'recovery' ? 'recovery' : 'invite'

    createClient()
      .auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ data: { session } }) => {
        if (session) router.replace(`/auth/nueva-contrasena?flow=${flow}`)
      })
  }, [router])

  return null
}
