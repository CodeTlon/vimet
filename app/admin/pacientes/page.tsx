import { ArrowRight, Mail, Phone, UsersRound } from 'lucide-react'
import Link from 'next/link'

import { toggleActivoAction } from '@/actions/staff'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Pacientes' }
export const dynamic = 'force-dynamic'

type Paciente = {
  id: string
  nombre: string
  apellido: string
  email: string | null
  telefono: string | null
  activo: boolean
  created_at: string
}

export default async function PacientesPage() {
  const supabase = createClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, nombre, apellido, email, telefono, activo, created_at')
    .eq('rol', 'paciente')
    .order('activo', { ascending: true })   // pendientes primero
    .order('created_at', { ascending: false })

  const pacientes = (data ?? []) as Paciente[]
  const activos = pacientes.filter((p) => p.activo).length
  const pendientes = pacientes.length - activos

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-gray-900">Pacientes</h1>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 text-sm text-gray-700 bg-white border border-gray-100 px-3 py-1.5 rounded-full shadow-sm">
            <UsersRound className="size-4 text-vimet-orange" /> {activos} activos
          </span>
          {pendientes > 0 && (
            <span className="inline-flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full shadow-sm">
              {pendientes} pendiente{pendientes > 1 ? 's' : ''}
            </span>
          )}
        </div>
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
                  <tr key={p.id} className={p.activo ? 'hover:bg-gray-50' : 'bg-amber-50/60 hover:bg-amber-50'}>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      <div className="flex items-center gap-2">
                        {p.activo ? (
                          <Link href={`/admin/pacientes/${p.id}`} className="hover:text-vimet-orange">
                            {p.nombre} {p.apellido}
                          </Link>
                        ) : (
                          <span>{p.nombre} {p.apellido}</span>
                        )}
                        {!p.activo && (
                          <span className="text-xs font-medium text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
                            Pendiente
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {p.email ? (
                        <a href={`mailto:${p.email}`} className="inline-flex items-center gap-1.5 hover:text-vimet-orange">
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
                      <div className="flex items-center justify-end gap-3">
                        {!p.activo ? (
                          <form action={toggleActivoAction}>
                            <input type="hidden" name="id" value={p.id} />
                            <input type="hidden" name="activo" value="true" />
                            <button
                              type="submit"
                              className="text-xs font-semibold text-white bg-vimet-orange hover:bg-vimet-red px-3 py-1.5 rounded-lg transition-colors"
                            >
                              Activar
                            </button>
                          </form>
                        ) : (
                          <>
                            <form action={toggleActivoAction}>
                              <input type="hidden" name="id" value={p.id} />
                              <input type="hidden" name="activo" value="false" />
                              <button
                                type="submit"
                                className="text-xs font-medium text-gray-500 hover:text-red-600 transition-colors"
                              >
                                Desactivar
                              </button>
                            </form>
                            <Link
                              href={`/admin/pacientes/${p.id}`}
                              className="inline-flex items-center gap-1 text-vimet-orange font-semibold text-sm hover:underline"
                            >
                              Abrir <ArrowRight className="size-3.5" />
                            </Link>
                          </>
                        )}
                      </div>
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
