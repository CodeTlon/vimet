import { MetodologiaForm } from '@/components/admin/metodologia-form'
import { getContenidoSitio } from '@/lib/config/contenido'

export const dynamic = 'force-dynamic'

export default async function ContenidoMetodologiaPage() {
  const contenido = await getContenidoSitio()

  return (
    <MetodologiaForm
      pasos={contenido.metodologia.pasos}
      pilares={contenido.metodologia.pilares}
      dirigidoA={contenido.metodologia.dirigidoA}
    />
  )
}
