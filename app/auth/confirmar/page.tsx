'use client'

import Link from 'next/link'
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { confirmarEmailAction } from '@/actions/auth'
import { AuthShell } from '@/components/auth-shell'

// Confirmar solo con click real del usuario (no en useEffect al cargar): los escáneres de
// link de mail (Gmail Safe Browsing, antivirus corporativo) pre-visitan la URL y ejecutan JS
// antes de que el usuario la abra — si el token se consumiera al montar, se quema ahí y el
// usuario vería "vencido" en su primer click real. Verificar activa la cuenta y abre la sesión.
function ConfirmarInner() {
  const router = useRouter()
  const token = useSearchParams().get('token')
  const [error, setError] = useState<string | null>(token ? null : 'El link es inválido o ya expiró.')
  const [verificando, setVerificando] = useState(false)

  async function confirmar() {
    if (!token || verificando) return
    setVerificando(true)
    const res = await confirmarEmailAction(token)
    if (res.ok) {
      router.replace('/mis-turnos')
      router.refresh()
      return
    }
    setVerificando(false)
    setError(res.error ?? 'El link es inválido o ya expiró.')
  }

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

export default function ConfirmarPage() {
  return (
    <Suspense
      fallback={
        <AuthShell title="Verificando enlace" description="Un momento…" footer={<span className="text-gray-400">Esto solo tarda un segundo</span>}>
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
