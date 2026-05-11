'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

export type TabItem = { href: string; label: string }

export function Tabs({ items }: { items: TabItem[] }) {
  const pathname = usePathname()
  return (
    <div className="border-b border-gray-200 mb-6 overflow-x-auto">
      <nav className="flex gap-1 min-w-max">
        {items.map((t) => {
          const active = pathname === t.href
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                'px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors',
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
