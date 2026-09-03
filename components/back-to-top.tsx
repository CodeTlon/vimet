'use client'

import { ArrowUp } from 'lucide-react'
import { useEffect, useState } from 'react'

export function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible) return null

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Volver arriba"
      className="fixed bottom-20 right-4 z-30 flex size-11 items-center justify-center rounded-full bg-gray-900/85 text-white shadow-lg backdrop-blur transition-all hover:bg-gray-900 active:scale-[0.92] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vimet-orange/60 focus-visible:ring-offset-2 sm:bottom-6"
    >
      <ArrowUp className="size-5" />
    </button>
  )
}
