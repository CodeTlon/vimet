'use client'

import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import type { EmailOtpType } from '@supabase/supabase-js'

import { AuthShell } from '@/components/auth-shell'
import { createClient } from '@/lib/supabase/client'

// Signup: solo confirma el email, la cuenta sigue activo=false hasta que un
// admin la active — no tiene sentido pedir contraseña de nuevo ni dejar
// sesión abierta.
async function resolveDestino(
  supabase: ReturnType<typeof createClient>,
  type: EmailOtpType | null,
) {
  if (type === 'signup') {
    await supabase.auth.signOut()
    return '/login?confirmado=1'
  }
  const flow = type === 'recovery' ? 'recovery' : 'invite'
  return `/auth/nueva-contrasena?flow=${flow}`
}

function ConfirmarInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [verificando, setVerificando] = useState(false)

  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  // Confirmar solo con click real del usuario (no en useEffect al cargar):
  // los escáneres de link de mail (Gmail Safe Browsing, antivirus corporativo)
  // pre-visitan la URL y ejecutan JS antes de que el usuario la abra — si
  // verifyOtp corriera automático al montar, el token de un solo uso se quema
  // ahí y el usuario ve "vencido" en su primer click real.
  function confirmar() {
    if (!tokenHash || !type) return
    setVerificando(true)
    const supabase = createClient()
    supabase.auth.verifyOtp({ token_hash: tokenHash, type }).then(async ({ error }) => {
      if (error) {
        setVerificando(false)
        setError('El link es inválido o ya expiró.')
      } else {
        router.replace(await resolveDestino(supabase, type))
      }
    })
  }

  useEffect(() => {
    if (tokenHash && type) return

    const supabase = createClient()
    const code = searchParams.get('code')

    if (code) {
      // Links viejos de "Confirm signup": la plantilla anterior usaba
      // {{ .ConfirmationURL }}, que pasa por /auth/v1/verify y vuelve acá con
      // ?code= (el signUp corre con el cliente server, que fuerza PKCE). Esto
      // solo puede funcionar en el mismo navegador donde se hizo el registro —
      // el code_verifier es una cookie local — así que la plantilla nueva
      // apunta a /auth/callback con token_hash, que se verifica server-side.
      // Esta rama queda solo para los mails que ya están en las casillas.
      supabase.auth.exchangeCodeForSession(code).then(async ({ error }) => {
        if (error) {
          setError(
            'Este link ya fue usado o se abrió en un dispositivo distinto al que usaste para registrarte. Si ya confirmaste tu cuenta, iniciá sesión.',
          )
        } else {
          router.replace(await resolveDestino(supabase, 'signup'))
        }
      })
      return
    }

    // Implicit flow: Supabase redirige con #access_token=...&type=... en el hash.
    // createBrowserClient procesa el hash automáticamente al inicializarse.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        resolveDestino(supabase, session.user.app_metadata?.type ?? null).then((dest) =>
          router.replace(dest),
        )
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
        setError('No pudimos verificar el link. Puede que ya haya sido usado o que haya vencido.')
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
        description="Verificación de cuenta"
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

  if (tokenHash && type) {
    return (
      <AuthShell
        title="Confirmá tu cuenta"
        description="Un último paso"
        footer={<span className="text-gray-400">El link es válido por un solo click</span>}
      >
        <button
          type="button"
          onClick={confirmar}
          disabled={verificando}
          className="w-full rounded-lg bg-vimet-orange px-4 py-3 font-semibold text-white hover:bg-vimet-orange/90 disabled:opacity-60"
        >
          {verificando ? 'Confirmando…' : 'Confirmar cuenta'}
        </button>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Verificando enlace"
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
          title="Verificando enlace"
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
