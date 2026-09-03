import { CalendarPlus, Home } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Página no encontrada' }

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-5"
      style={{ background: 'radial-gradient(circle at top, #C4391C 0%, #1A1A1A 65%)' }}
    >
      <div className="text-center max-w-md">
        <p
          className="font-heading font-black text-white mb-2"
          style={{ fontSize: 'clamp(5rem, 20vw, 9rem)', lineHeight: 1, opacity: 0.15 }}
        >
          404
        </p>
        <h1
          className="font-heading font-extrabold uppercase text-white -mt-6 mb-4 relative z-10"
          style={{ fontSize: 'clamp(1.6rem, 5vw, 2.5rem)', letterSpacing: '-0.5px' }}
        >
          PÁGINA NO <span className="text-white/80">ENCONTRADA</span>
        </h1>
        <p className="text-white/60 text-sm mb-8 leading-relaxed">
          La página que buscás no existe o fue movida. Volvé al inicio o mirá nuestros servicios
          de nutrición y entrenamiento.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white text-vimet-red font-semibold shadow-lg transition-all hover:shadow-xl active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          >
            <Home className="size-4" /> Volver al inicio
          </Link>
          <Link
            href="/turnos/nuevo"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-white/30 text-white font-semibold transition-colors hover:bg-white/10 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <CalendarPlus className="size-4" /> Reservar turno
          </Link>
        </div>
      </div>
    </div>
  )
}
