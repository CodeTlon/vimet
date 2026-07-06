import { UbicacionForm } from '@/components/admin/ubicacion-form'
import { getContenidoSitio } from '@/lib/config/contenido'

export const dynamic = 'force-dynamic'

export default async function ContenidoUbicacionPage() {
  const contenido = await getContenidoSitio()

  return (
    <UbicacionForm
      direccion={contenido.direccion}
      lugar={contenido.lugar}
      ciudad={contenido.ciudad}
      mapEmbed={contenido.mapEmbed}
      emailContacto={contenido.emailContacto}
      whatsappGeneral={contenido.whatsappGeneral}
      instagramHandle={contenido.instagramHandle}
      instagramUrl={contenido.instagramUrl}
    />
  )
}
