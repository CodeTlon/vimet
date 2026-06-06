'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

export type TabItem = { href: string; label: string }

export function Tabs({ items }: { items: TabItem[] }) {
  const pathname = usePathname()
  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="flex flex-wrap gap-x-1 gap-y-0.5">
        {items.map((t) => {
          const active = pathname === t.href
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                'px-3 py-2 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors',
                active
                  ? 'border-vimet-orange text-vimet-orange'
                  : 'border-transparent text-gray-700 hover:text-vimet-orange hover:border-vimet-orange/40',
              )}
            >
              {t.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
