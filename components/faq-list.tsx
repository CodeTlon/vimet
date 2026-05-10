'use client'

import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

import { cn } from '@/lib/utils'

export function FaqList({ items }: { items: ReadonlyArray<{ q: string; a: string }> }) {
  const [openIdx, setOpenIdx] = useState<number | null>(0)
  return (
    <div className="space-y-3">
      {items.map((faq, i) => {
        const open = openIdx === i
        return (
          <div
            key={faq.q}
            className={cn(
              'rounded-xl border bg-white transition-all',
              open ? 'border-vimet-orange/40 shadow-md' : 'border-gray-100 shadow-sm',
            )}
          >
            <button
              type="button"
              onClick={() => setOpenIdx(open ? null : i)}
              aria-expanded={open}
              className="w-full flex items-center justify-between gap-4 p-5 text-left"
            >
              <span className="font-heading font-semibold text-gray-900 text-base">
                {faq.q}
              </span>
              <ChevronDown
                className={cn(
                  'size-5 text-vimet-orange shrink-0 transition-transform duration-200',
                  open && 'rotate-180',
                )}
              />
            </button>
            <div
              className={cn(
                'grid transition-all duration-200',
                open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
              )}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-5 text-sm text-gray-700 leading-relaxed">{faq.a}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
