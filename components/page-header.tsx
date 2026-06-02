import { type ReactNode } from 'react'

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
}) {
  return (
    <section className="relative bg-vimet-gradient text-white pt-32 pb-16 sm:pt-40 sm:pb-20 overflow-hidden">
      <div
        className="absolute inset-0 opacity-20 mix-blend-overlay"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.4) 0, transparent 40%), radial-gradient(circle at 80% 80%, rgba(0,0,0,0.4) 0, transparent 50%)',
        }}
      />
      <div className="relative container-vimet text-center max-w-3xl mx-auto">
        {eyebrow ? (
          <p className="uppercase text-xs sm:text-sm tracking-[0.2em] text-white/80 font-semibold mb-3">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-heading text-4xl sm:text-5xl font-extrabold leading-tight">
          {title}
        </h1>
        {description ? (
          <p className="mt-4 text-base sm:text-lg text-white/90 max-w-2xl mx-auto">
            {description}
          </p>
        ) : null}
        {children}
      </div>
    </section>
  )
}
