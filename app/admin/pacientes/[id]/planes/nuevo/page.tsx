import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

import { PlanForm } from '@/components/seguimiento/plan-form'

export const metadata = { title: 'Nuevo plan' }

export default function NuevoPlanPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-4">
      <Link
        href={`/admin/pacientes/${params.id}/planes`}
        className="inline-flex items-center gap-1 text-sm text-gray-700 hover:text-vimet-orange"
      >
        <ChevronLeft className="size-4" /> Planes
      </Link>
      <h2 className="font-heading text-xl font-semibold text-gray-900">Nuevo plan</h2>
      <PlanForm pacienteId={params.id} />
    </div>
  )
}
