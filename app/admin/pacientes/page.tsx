import { ArrowRight, Mail, Phone, UsersRound } from 'lucide-react'
import Link from 'next/link'

import { toggleActivoAction } from '@/actions/staff'
import { CrearPacienteButton } from '@/components/crear-paciente-button'
import { Pagination } from '@/components/pagination'
import { PacienteDeleteButton } from '@/components/paciente-delete-button'
import { pageRange, parsePage, totalPages as calcTotalPages } from '@/lib/pagination'
import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm'

import { profiles } from '@/db/schema'
import { requireStaff } from '@/lib/auth/session'
import { db } from '@/lib/db'
export const metadata = { title: 'Pacientes' }
export const dynamic = 'force-dynamic'

type Paciente = {
  id: string
  nombre: string
  apellido: string
  email: string | null
  telefono: string | null
  activo: boolean
  activado_en: string | null
  gestionado_por_staff: boolean
  created_at: string
}

export default async function PacientesPage(
  props: {
    searchParams: Promise<{ page?: string }>
  }
) {
  await requireStaff()
  const searchParams = await props.searchParams;
  const page = parsePage(searchParams?.page)
  const [from, to] = pageRange(page)

  const soloPacientes = eq(profiles.rol, 'paciente')
  const [pacientes, [{ total }], [{ activos }], [{ pendientes }]] = await Promise.all([
    db
      .select({
        id: profiles.id,
        nombre: profiles.nombre,
        apellido: profiles.apellido,
        email: profiles.email,
        telefono: profiles.telefono,
        activo: profiles.activo,
        activado_en: profiles.activado_en,
        gestionado_por_staff: profiles.gestionado_por_staff,
        created_at: profiles.created_at,
      })
      .from(profiles)
      .where(soloPacientes)
      .orderBy(asc(profiles.activo), desc(profiles.created_at)) // sin activar primero
      .limit(to - from + 1)
      .offset(from),
    db.select({ total: sql<number>`count(*)::int` }).from(profiles).where(soloPacientes),
    db
      .select({ activos: sql<number>`count(*)::int` })
      .from(profiles)
      .where(and(soloPacientes, eq(profiles.activo, true))),
    db
      .select({ pendientes: sql<number>`count(*)::int` })
      .from(profiles)
      .where(and(soloPacientes, eq(profiles.activo, false), isNull(profiles.activado_en))),
  ]) as [Paciente[], { total: number }[], { activos: number }[], { pendientes: number }[]]
  const pages = calcTotalPages(total)

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
              {pendientes} sin confirmar
            </span>
          )}
          <CrearPacienteButton />
        </div>
      </header>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {pacientes.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-700">
            Todavía no hay pacientes registrados.
          </p>
        ) : (
          <>
          <ul className="sm:hidden divide-y divide-gray-100">
            {pacientes.map((p) => (
              <li key={p.id} className={`p-4 space-y-2 ${p.activo ? '' : 'bg-amber-50/60'}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-semibold text-gray-900">
                    {p.activo ? (
                      <Link href={`/admin/pacientes/${p.id}`} className="hover:text-vimet-orange">
                        {p.nombre} {p.apellido}
                      </Link>
                    ) : (
                      <span>{p.nombre} {p.apellido}</span>
                    )}
                    {p.gestionado_por_staff && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border text-blue-700 bg-blue-50 border-blue-200 shrink-0">
                        Gestionado
                      </span>
                    )}
                  </div>
                  {!p.activo && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 border ${p.activado_en ? 'text-gray-500 bg-gray-100 border-gray-200' : 'text-amber-700 bg-amber-100 border-amber-200'}`}>
                      {p.activado_en ? 'Inactivo' : 'Sin confirmar'}
                    </span>
                  )}
                </div>
                {p.email ? (
                  <a href={`mailto:${p.email}`} className="flex items-center gap-1.5 text-sm text-gray-700 hover:text-vimet-orange">
                    <Mail className="size-3.5 shrink-0" /> {p.email}
                  </a>
                ) : null}
                {p.telefono ? (
                  <a
                    href={`https://wa.me/54${p.telefono.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-vimet-orange hover:underline font-semibold"
                  >
                    <Phone className="size-3.5 shrink-0" /> {p.telefono}
                  </a>
                ) : null}
                <p className="text-xs text-gray-500">
                  Registrado el {new Date(p.created_at).toLocaleDateString('es-AR')}
                </p>
                <div className="flex items-center gap-3 pt-1">
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
                      <Link
                        href={`/admin/pacientes/${p.id}`}
                        className="inline-flex items-center gap-1 text-vimet-orange font-semibold text-sm hover:underline"
                      >
                        Abrir <ArrowRight className="size-3.5" />
                      </Link>
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
                    </>
                  )}
                  {!p.activo && (
                    <PacienteDeleteButton id={p.id} nombre={`${p.nombre} ${p.apellido}`} />
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="hidden sm:block overflow-x-auto">
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
                        {p.gestionado_por_staff && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border text-blue-700 bg-blue-50 border-blue-200 shrink-0">
                            Gestionado
                          </span>
                        )}
                        {!p.activo && (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${p.activado_en ? 'text-gray-500 bg-gray-100 border-gray-200' : 'text-amber-700 bg-amber-100 border-amber-200'}`}>
                            {p.activado_en ? 'Inactivo' : 'Sin confirmar'}
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
                          className="inline-flex items-center gap-1.5 text-vimet-orange hover:underline font-semibold"
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
                        {!p.activo && (
                          <PacienteDeleteButton id={p.id} nombre={`${p.nombre} ${p.apellido}`} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      <Pagination page={page} totalPages={pages} makeHref={(p) => `/admin/pacientes?page=${p}`} />
    </div>
  );
}
