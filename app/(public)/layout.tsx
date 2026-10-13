import { Suspense, type ReactNode } from 'react'

import { BackToTop } from '@/components/back-to-top'
import { Footer } from '@/components/footer'
import { Navbar } from '@/components/navbar'
import { getUserAndProfile } from '@/lib/auth/session'
import { StickyMobileCTA } from '@/components/sticky-mobile-cta'
// La sesion se resuelve en el servidor y baja como prop: el cliente ya no consulta la base.
async function NavbarConSesion() {
  const { user, profile } = await getUserAndProfile()
  return <Navbar user={user ? { id: user.id, rol: profile?.rol ?? 'paciente' } : null} />
}

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense>
        <NavbarConSesion />
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
