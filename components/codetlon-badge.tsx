import Link from 'next/link'

export function CodeTlonBadge() {
  return (
    <div className="bg-black py-3">
      <div className="container-vimet flex flex-col sm:flex-row items-center justify-center gap-2 text-center text-xs sm:text-sm text-white/80">
        <span>
          &copy; {new Date().getFullYear()} VIMET — Vida y Metabolismo. Todos los derechos reservados.
        </span>
        <span className="hidden sm:inline text-white/40">·</span>
        <span>
          Desarrollado por{' '}
          <Link
            href="https://codetlon.com.ar"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-white hover:text-vimet-orange transition-colors"
          >
            CodeTlon
          </Link>
        </span>
      </div>
    </div>
  )
}
