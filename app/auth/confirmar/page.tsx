'use client'

import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import type { EmailOtpType } from '@supabase/supabase-js'

import { AuthShell } from '@/components/auth-shell'
import { createClient } from '@/lib/supabase/client'

function ConfirmarInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const tokenHash = searchParams.get('token_hash')
    const type = searchParams.get('type') as EmailOtpType | null

    if (tokenHash && type) {
      // PKCE OTP flow: Supabase envía ?token_hash=...&type=invite
      supabase.auth.verifyOtp({ token_hash: tokenHash, type }).then(({ error }) => {
        if (error) {
          setError('El link es inválido o ya expiró.')
        } else {
          router.replace('/auth/nueva-contrasena')
        }
      })
      return
    }

    // Implicit flow: Supabase redirige con #access_token=...&type=invite en el hash.
    // createBrowserClient procesa el hash automáticamente al inicializarse.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/auth/nueva-contrasena')
        return
      }

      // Esperar a que el cliente procese el hash
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
        if (sess) {
          subscription.unsubscribe()
          router.replace('/auth/nueva-contrasena')
        }
      })

      const timeout = setTimeout(() => {
        subscription.unsubscribe()
        setError('No se encontró una invitación válida. El link puede haber expirado.')
      }, 6000)

      return () => {
        subscription.unsubscribe()
        clearTimeout(timeout)
      }
    })
  }, [router, searchParams])

  if (error) {
    return (
      <AuthShell
        title="Link inválido"
        description="Verificación de invitación"
        footer={
          <Link href="/login" className="font-semibold text-vimet-orange hover:underline">
            Ir al inicio de sesión
          </Link>
        }
      >
        <div role="alert" className="rounded-lg bg-vimet-red/10 border border-vimet-red/20 px-4 py-3 text-sm text-vimet-red">
          {error}
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Verificando invitación"
      description="Un momento…"
      footer={<span className="text-gray-400">Esto solo tarda un segundo</span>}
    >
      <div className="flex justify-center py-6">
        <div className="h-8 w-8 rounded-full border-4 border-vimet-orange border-t-transparent animate-spin" />
      </div>
    </AuthShell>
  )
}

export default function ConfirmarPage() {
  return (
    <Suspense
      fallback={
        <AuthShell
          title="Verificando invitación"
          description="Un momento…"
          footer={<span className="text-gray-400">Esto solo tarda un segundo</span>}
        >
          <div className="flex justify-center py-6">
            <div className="h-8 w-8 rounded-full border-4 border-vimet-orange border-t-transparent animate-spin" />
          </div>
        </AuthShell>
      }
    >
      <ConfirmarInner />
    </Suspense>
  )
}
