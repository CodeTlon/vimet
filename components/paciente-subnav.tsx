'use client'

import {
  CalendarDays,
  ClipboardList,
  FileText,
  HeartPulse,
  Library,
  MessageSquare,
  Target,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

const ICONS = {
  CalendarDays,
  ClipboardList,
  FileText,
  HeartPulse,
  Library,
  MessageSquare,
  Target,
} as const

type IconKey = keyof typeof ICONS

export function PacienteSubnav({
  tabs,
}: {
  tabs: { href: string; label: string; icon: IconKey }[]
}) {
  const pathname = usePathname()
  return (
    <nav className="mb-6">
      <ul className="flex flex-wrap gap-1.5">
        {tabs.map((t) => {
          const Icon = ICONS[t.icon]
          const active = pathname === t.href || pathname.startsWith(`${t.href}/`)
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-colors',
                  active
                    ? 'bg-vimet-gradient text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-800 hover:border-vimet-orange/40 hover:text-vimet-orange',
                )}
              >
                <Icon className="size-3.5 shrink-0" />
                {t.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
