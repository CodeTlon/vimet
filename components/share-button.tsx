'use client'

import { Check, Share2 } from 'lucide-react'
import { useState } from 'react'

export function ShareButton({
  title,
  text,
  className,
}: {
  title: string
  text?: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url })
      } catch {
        /* usuario canceló el share nativo — no hacer nada */
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard no disponible — sin fallback adicional */
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className={
        className ??
        'inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60'
      }
    >
      {copied ? <Check className="size-4" /> : <Share2 className="size-4" />}
      {copied ? 'Link copiado' : 'Compartir'}
    </button>
  )
}
