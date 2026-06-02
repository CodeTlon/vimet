'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { createClient } from '@/lib/supabase/client'

// Detecta tokens de invitación en el hash (#access_token=...&type=invite).
// @supabase/ssr no procesa el hash automáticamente, hay que parsear y setSession manualmente.
export function HashInviteHandler() {
  const router = useRouter()

  useEffect(() => {
    const hash = window.location.hash.substring(1)
    if (!hash.includes('type=invite')) return

    const params = new URLSearchParams(hash)
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    if (!accessToken || !refreshToken) return

    createClient()
      .auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ data: { session } }) => {
        if (session) router.replace('/auth/nueva-contrasena')
      })
  }, [router])

  return null
}
