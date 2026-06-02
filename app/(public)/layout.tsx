import { Suspense, type ReactNode } from 'react'

import { Footer } from '@/components/footer'
import { Navbar } from '@/components/navbar'

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense>
        <Navbar />
      </Suspense>
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  )
}
