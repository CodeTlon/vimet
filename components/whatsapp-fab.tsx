'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { social } from '@/lib/config/team'

const HIDE_PREFIXES = ['/admin', '/login', '/registro']

export function WhatsAppFab() {
  const pathname = usePathname()
  if (HIDE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null
  return (
    <Link
      href={social.whatsapp}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Abrir WhatsApp"
      className="fixed bottom-5 right-5 z-30 inline-flex items-center justify-center size-14 rounded-full bg-[#25D366] text-white shadow-lg hover:scale-105 hover:shadow-xl transition-all"
    >
      <svg
        viewBox="0 0 32 32"
        fill="currentColor"
        className="size-7"
        aria-hidden="true"
      >
        <path d="M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39a.63.63 0 0 1-.315-.1c-.802-.402-1.504-.817-2.163-1.447-.545-.516-1.146-1.29-1.46-1.963a.426.426 0 0 1-.073-.215c0-.33.99-.945.99-1.49 0-.143-.73-2.09-.832-2.335-.143-.372-.214-.487-.6-.487-.187 0-.36-.043-.53-.043-.302 0-.53.115-.746.315-.688.645-1.032 1.318-1.06 2.264v.114c-.015.99.472 1.977.873 2.85 1.018 2.205 2.78 4.165 4.954 5.218.66.327 2.115.972 2.84.972.317 0 1.762-.444 2.018-.673.36-.33.595-.62.694-1.085.05-.246.05-.48.02-.713-.06-.394-2.36-1.61-2.595-1.61zm-2.99 7.336h-.024c-2.05 0-4.06-.557-5.79-1.61l-.41-.246-4.31 1.13 1.155-4.193-.27-.43c-1.165-1.85-1.78-3.99-1.78-6.18 0-6.39 5.235-11.59 11.64-11.59 3.105 0 6.025 1.21 8.21 3.4 2.196 2.18 3.41 5.08 3.4 8.18-.005 6.395-5.24 11.595-11.665 11.595zm9.93-21.475A14.05 14.05 0 0 0 16.07 0C8.355 0 2.075 6.245 2.07 13.92c0 2.456.645 4.85 1.867 6.964L1.95 28.825l8.108-2.117a14.005 14.005 0 0 0 6.687 1.7h.005c7.71 0 14-6.245 14.005-13.92a13.82 13.82 0 0 0-4.115-9.872z" />
      </svg>
    </Link>
  )
}
