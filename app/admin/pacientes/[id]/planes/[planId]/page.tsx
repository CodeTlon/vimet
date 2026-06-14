import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PlanForm } from '@/components/seguimiento/plan-form'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function EditarPlanPage(
  props: {
    params: Promise<{ id: string; planId: string }>
  }
) {
  const params = await props.params;
  const supabase = createClient()
  const { data: plan } = await supabase
    .from('planes')
    .select('*')
    .eq('id', Number(params.planId))
    .eq('paciente_id', params.id)
    .maybeSingle()
  if (!plan) notFound()

  return (
    <div className="space-y-4">
      <Link
        href={`/admin/pacientes/${params.id}/planes`}
        className="inline-flex items-center gap-1 text-sm text-gray-700 hover:text-vimet-orange"
      >
        <ChevronLeft className="size-4" /> Planes
      </Link>
      <h2 className="font-heading text-xl font-semibold text-gray-900">Editar plan</h2>
      <PlanForm pacienteId={params.id} plan={plan} />
    </div>
  )
}
