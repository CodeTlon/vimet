'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

const STORAGE_KEY = 'vimet_cookie_consent'
const PLACEHOLDER = 'G-XXXXXXXXXX'

type Choice = 'granted' | 'denied'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

// Solo pedimos consentimiento si realmente cargamos GA.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID
const gaActivo = Boolean(GA_ID && GA_ID !== PLACEHOLDER)

/**
 * Banner de consentimiento de cookies. Guarda la elección en localStorage y
 * actualiza GA4 (Consent Mode v2); el default 'denied' lo setea
 * GoogleAnalytics.tsx antes del config.
 */
export default function CookieConsent() {
  const [visible, setVisible] = useState(false)
  const aceptarRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!gaActivo) return
    let prev: string | null = null
    try {
      prev = localStorage.getItem(STORAGE_KEY)
    } catch {
      prev = null
    }
    // localStorage no existe en el server: el primer render (SSR + hidratación)
    // siempre arranca oculto para no generar mismatch, y este efecto recién
    // después del commit decide si corresponde mostrar el banner.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (prev !== 'granted' && prev !== 'denied') setVisible(true)
  }, [])

  useEffect(() => {
    if (visible) aceptarRef.current?.focus()
  }, [visible])

  function decidir(choice: Choice) {
    try {
      localStorage.setItem(STORAGE_KEY, choice)
    } catch {
      /* localStorage no disponible — igual ocultamos el banner */
    }
    window.gtag?.('consent', 'update', {
      analytics_storage: choice,
      ad_storage: choice,
      ad_user_data: choice,
      ad_personalization: choice,
    })
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Consentimiento de cookies"
      onKeyDown={(e) => {
        if (e.key === 'Escape') decidir('denied')
      }}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-800 bg-gray-900/97 px-4 py-4 backdrop-blur sm:px-6"
    >
      <div className="mx-auto flex max-w-[1280px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-body text-sm text-white/75">
          Usamos cookies analíticas para entender cómo se usa el sitio y mejorarlo. Podés aceptarlas o
          rechazarlas. Más info en nuestra{' '}
          <Link href="/privacidad" className="font-semibold text-vimet-orange underline underline-offset-4">
            política de privacidad
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => decidir('denied')}
            className="rounded-full border border-white/20 px-4 py-2 font-body text-sm font-semibold text-white/90 transition-colors hover:bg-white/10 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            Rechazar
          </button>
          <button
            ref={aceptarRef}
            type="button"
            onClick={() => decidir('granted')}
            className="rounded-full bg-vimet-gradient px-4 py-2 font-body text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vimet-orange/60 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  )
}
