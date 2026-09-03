import { Suspense, type ReactNode } from 'react'

import { BackToTop } from '@/components/back-to-top'
import { Footer } from '@/components/footer'
import { Navbar } from '@/components/navbar'
import { StickyMobileCTA } from '@/components/sticky-mobile-cta'
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense>
        <Navbar />
      </Suspense>
      <main className="flex-1">{children}</main>
      <Footer />
      <BackToTop />
      <Suspense>
        <StickyMobileCTA />
      </Suspense>
    </>
  )
}
