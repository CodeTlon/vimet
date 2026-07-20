import { ArrowLeft, Building2, Mail, MessageCircle, Phone, UserRound, Video } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { cancelarPendientesSinConfirmar, marcarNoAsistioVencidos } from '@/actions/turnos'
import { TurnoDetalleForm } from '@/components/turno-detalle-form'
import { ESTADO_TURNO_BADGE, ESTADO_TURNO_LABEL } from '@/lib/seguimiento'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Detalle de turno' }
export const dynamic = 'force-dynamic'

type TurnoDetail = {
  id: number
  fecha: string
  hora_inicio: string
  hora_fin: string
  modalidad: 'presencial' | 'virtual'
  estado: string
  notas_paciente: string | null
  notas_profesional: string | null
  turno_par_id: number | null
  servicios: { nombre: string } | null
  paciente: {
    nombre: string
    apellido: string
    email: string | null
    telefono: string | null
  } | null
  profesional: { nombre: string; apellido: string } | null
}

export default async function TurnoDetallePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = Number(params.id)
  if (!Number.isFinite(id) || id <= 0) notFound()

  await marcarNoAsistioVencidos()
  await cancelarPendientesSinConfirmar()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('turnos')
    .select(
      'id, fecha, hora_inicio, hora_fin, modalidad, estado, notas_paciente, notas_profesional, turno_par_id, servicios(nombre), paciente:profiles!turnos_paciente_id_fkey(nombre, apellido, email, telefono), profesional:profiles!turnos_profesional_id_fkey(nombre, apellido)',
    )
    .eq('id', id)
    .maybeSingle()

  if (!data) {
    if (error) console.error('turno detalle: select falló', error)
    notFound()
  }
  const turno = data as unknown as TurnoDetail

  // El turno vinculado (plan integral) pertenece al otro profesional — se
  // lee con el cliente admin porque RLS no deja ver turnos ajenos entre
  // staff no-admin, y acá es una lectura intencional para mostrar con quién
  // más tiene turno el paciente.
  let otroProfesional: { nombre: string; apellido: string } | null = null
  if (turno.turno_par_id) {
    const admin = createAdminClient()
    const { data: par } = await admin
      .from('turnos')
      .select('profesional:profiles!turnos_profesional_id_fkey(nombre, apellido)')
      .eq('id', turno.turno_par_id)
      .maybeSingle()
    otroProfesional = (par as unknown as { profesional: { nombre: string; apellido: string } } | null)?.profesional ?? null
  }

  const ModalidadIcon = turno.modalidad === 'virtual' ? Video : Building2

  return (
    <div>
      <header className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-gray-900">
          Detalle de turno
        </h1>
        <Link
          href="/admin/calendario"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-vimet-orange hover:underline"
        >
          <ArrowLeft className="size-4" /> Volver
        </Link>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-heading text-xl font-semibold text-gray-900">
                    {turno.servicios?.nombre ?? 'Consulta'}
                  </h2>
                  {otroProfesional ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-success/10 text-success">
                      Plan integral
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-gray-700 mt-1">
                  Profesional: {turno.profesional?.nombre} {turno.profesional?.apellido}
                  {otroProfesional
                    ? ` — junto con ${otroProfesional.nombre} ${otroProfesional.apellido}`
                    : ''}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  ESTADO_TURNO_BADGE[turno.estado] ?? 'bg-gray-100 text-gray-700'
                }`}
              >
                {ESTADO_TURNO_LABEL[turno.estado] ?? turno.estado}
              </span>
            </div>

            <dl className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Fecha" value={new Date(`${turno.fecha}T00:00:00`).toLocaleDateString('es-AR')} />
              <Field
                label="Horario"
                value={`${turno.hora_inicio.slice(0, 5)} – ${turno.hora_fin.slice(0, 5)}`}
              />
              <Field
                label="Modalidad"
                value={
                  <span className="inline-flex items-center gap-1.5">
                    <ModalidadIcon className="size-4 text-vimet-orange" />
                    {turno.modalidad === 'virtual' ? 'Virtual' : 'Presencial'}
                  </span>
                }
              />
            </dl>

            {turno.notas_paciente ? (
              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-700">
                  Notas del paciente
                </p>
                <p className="mt-2 text-sm text-gray-800 bg-gray-50 rounded-lg px-4 py-3 leading-relaxed whitespace-pre-wrap">
                  {turno.notas_paciente}
                </p>
              </div>
            ) : null}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-heading text-base font-semibold text-gray-900 mb-4">
              Gestionar turno
            </h3>
            <TurnoDetalleForm
              id={turno.id}
              estadoActual={turno.estado}
              notas={turno.notas_profesional}
            />
          </div>
        </div>

        <aside className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-fit">
          <h3 className="font-heading text-base font-semibold text-gray-900 mb-4 inline-flex items-center gap-2">
            <UserRound className="size-4 text-vimet-orange" /> Paciente
          </h3>
          <p className="text-base font-semibold text-gray-900">
            {turno.paciente?.nombre} {turno.paciente?.apellido}
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {turno.paciente?.email ? (
              <li>
                <a
                  href={`mailto:${turno.paciente.email}`}
                  className="inline-flex items-center gap-2 text-gray-800 hover:text-vimet-orange"
                >
                  <Mail className="size-4" /> {turno.paciente.email}
                </a>
              </li>
            ) : null}
            {turno.paciente?.telefono ? (
              <li>
                <a
                  href={`https://wa.me/54${turno.paciente.telefono.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-vimet-orange hover:underline font-semibold"
                >
                  <MessageCircle className="size-4" /> WhatsApp · {turno.paciente.telefono}
                </a>
              </li>
            ) : (
              <li className="inline-flex items-center gap-2 text-gray-400">
                <Phone className="size-4" /> Sin teléfono cargado
              </li>
            )}
          </ul>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-700">{label}</p>
      <p className="mt-1 text-sm text-gray-900 font-medium">{value}</p>
    </div>
  )
}
