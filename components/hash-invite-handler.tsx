'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { createClient } from '@/lib/supabase/client'

// Detecta tokens de invitación en el hash (#access_token=...&type=invite)
// que Supabase envía al site URL en el implicit flow.
export function HashInviteHandler() {
  const router = useRouter()

  useEffect(() => {
    if (!window.location.hash.includes('type=invite')) return

    const supabase = createClient()
    let done = false
    const go = () => {
      if (done) return
      done = true
      router.replace('/auth/nueva-contrasena')
    }

    // Suscribirse ANTES de getSession para no perder el evento si ya se disparó
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        subscription.unsubscribe()
        go()
      }
    })

    // Chequear sesión existente en paralelo (el cliente puede haberla procesado ya)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        subscription.unsubscribe()
        go()
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  return null
}
