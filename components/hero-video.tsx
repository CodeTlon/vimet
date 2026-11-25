'use client'

import { useEffect, useRef } from 'react'

export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    // Safari (iOS) ignora el atributo `media` en <source> dentro de <video>
    // y siempre carga el primer source decodificable, así que elegimos el
    // archivo a mano según el viewport real.
    // Con "ahorro de datos" o movimiento reducido queda el poster: el clip pesa 3-5 MB.
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true
    if (saveData || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const isMobile = window.matchMedia('(max-width: 767px)').matches
    video.src = isMobile ? '/videos/hero-training-mobile.mp4' : '/videos/hero-training.mp4'
    video.load()
    video.play().catch(() => {})
  }, [])

  return (
    <video
      ref={videoRef}
      poster="/images/hero/training-video-poster.jpg"
      muted
      loop
      playsInline
      preload="none"
      className="absolute inset-0 size-full object-cover"
    />
  )
}
