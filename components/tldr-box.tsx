import { ListChecks } from 'lucide-react'
import { type ReactNode } from 'react'

export function TLDRBox({ items, className }: { items: ReactNode[]; className?: string }) {
  return (
    <div
      className={
        'mx-auto max-w-3xl rounded-2xl border border-vimet-orange/20 bg-vimet-cream px-6 py-5 sm:px-7 sm:py-6 ' +
        (className ?? '')
      }
    >
      <p className="flex items-center gap-2 font-heading text-sm font-bold uppercase tracking-wide text-vimet-red">
        <ListChecks className="size-4" /> En resumen
      </p>
      <ul className="mt-3 space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed text-gray-800">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-vimet-orange" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
