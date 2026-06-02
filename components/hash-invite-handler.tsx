'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { createClient } from '@/lib/supabase/client'

// Detecta tokens de invitación en el hash (#access_token=...&type=invite)
// que Supabase envía al site URL en el implicit flow.
export function HashInviteHandler() {
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!window.location.hash.includes('type=invite')) return

    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        subscription.unsubscribe()
        router.replace('/auth/nueva-contrasena')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  return null
}
