import { ArrowRight, Mail, Phone, UsersRound } from 'lucide-react'
import Link from 'next/link'

import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Pacientes' }
export const dynamic = 'force-dynamic'

type Paciente = {
  id: string
  nombre: string
  apellido: string
  email: string | null
  telefono: string | null
  created_at: string
}

export default async function PacientesPage() {
  const supabase = createClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, nombre, apellido, email, telefono, created_at')
    .eq('rol', 'paciente')
    .eq('activo', true)
    .order('created_at', { ascending: false })

  const pacientes = (data ?? []) as Paciente[]

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-gray-900">Pacientes</h1>
        <span className="inline-flex items-center gap-2 text-sm text-gray-700 bg-white border border-gray-100 px-3 py-1.5 rounded-full shadow-sm">
          <UsersRound className="size-4 text-vimet-orange" /> {pacientes.length}
        </span>
      </header>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {pacientes.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-700">
            Todavía no hay pacientes registrados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-700">
                  <th className="px-4 py-3 font-semibold">Nombre</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Teléfono</th>
                  <th className="px-4 py-3 font-semibold">Registrado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pacientes.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      <Link
                        href={`/admin/pacientes/${p.id}`}
                        className="hover:text-vimet-orange"
                      >
                        {p.nombre} {p.apellido}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {p.email ? (
                        <a
                          href={`mailto:${p.email}`}
                          className="inline-flex items-center gap-1.5 hover:text-vimet-orange"
                        >
                          <Mail className="size-3.5" /> {p.email}
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {p.telefono ? (
                        <a
                          href={`https://wa.me/54${p.telefono.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[#25D366] hover:underline font-semibold"
                        >
                          <Phone className="size-3.5" /> {p.telefono}
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {new Date(p.created_at).toLocaleDateString('es-AR')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/pacientes/${p.id}`}
                        className="inline-flex items-center gap-1 text-vimet-orange font-semibold text-sm hover:underline"
                      >
                        Abrir <ArrowRight className="size-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
