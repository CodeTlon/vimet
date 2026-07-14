import {
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileImage,
  FileText,
  Link2,
  Trash2,
  Video,
} from 'lucide-react'

import { eliminarRecursoAction, toggleVisibilidadRecursoAction } from '@/actions/recursos'
import { RecursoForm } from '@/components/seguimiento/recurso-form'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type Recurso = {
  id: number
  tipo: 'link' | 'pdf' | 'imagen' | 'video'
  categoria: string
  titulo: string
  descripcion: string | null
  url: string | null
  storage_path: string | null
  visible_paciente: boolean
  created_at: string
  creador: { nombre: string; apellido: string } | null
}

type RecursoConUrl = Recurso & { signedUrl: string | null }

const CATEGORIA_LABEL: Record<string, string> = {
  ejercicio: 'Ejercicio',
  nutricion: 'Nutrición',
  progreso:  'Progreso',
  educativo: 'Educativo',
  otro:      'Otro',
}

const TIPO_COLORS: Record<string, string> = {
  link:   'bg-blue-50 text-blue-700',
  pdf:    'bg-red-50 text-red-700',
  imagen: 'bg-emerald-50 text-emerald-700',
  video:  'bg-purple-50 text-purple-700',
}

function TipoIcon({ tipo, className }: { tipo: string; className?: string }) {
  const cls = className ?? 'size-5'
  if (tipo === 'link')   return <Link2    className={cls} />
  if (tipo === 'pdf')    return <FileText className={cls} />
  if (tipo === 'imagen') return <FileImage className={cls} />
  return <Video className={cls} />
}

export default async function RecursosPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createClient()

  const { data } = await supabase
    .from('recursos_paciente')
    .select(
      'id, tipo, categoria, titulo, descripcion, url, storage_path, visible_paciente, created_at, creador:profiles!recursos_paciente_creado_por_fkey(nombre, apellido)',
    )
    .eq('paciente_id', params.id)
    .order('created_at', { ascending: false })

  const recursos = (data ?? []) as unknown as Recurso[]

  // Generar URLs firmadas para archivos (1 hora de vigencia)
  const recursosConUrl: RecursoConUrl[] = await Promise.all(
    recursos.map(async (r) => {
      if (!r.storage_path) return { ...r, signedUrl: null }
      const { data: signed } = await supabase.storage
        .from('recursos')
        .createSignedUrl(r.storage_path, 3600)
      return { ...r, signedUrl: signed?.signedUrl ?? null }
    }),
  )

  return (
    <div className="space-y-5">
      <RecursoForm pacienteId={params.id} />
      {recursosConUrl.length === 0 ? (
        <p className="text-center text-sm text-gray-500 italic py-6">
          Aún no hay recursos cargados para este paciente.
        </p>
      ) : (
        <ul className="space-y-3">
          {recursosConUrl.map((r) => (
            <li
              key={r.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5"
            >
              <div className="flex gap-3 sm:gap-4">
                {/* Visual */}
                <div className="shrink-0">
                  {r.tipo === 'imagen' && r.signedUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    (<img
                      src={r.signedUrl}
                      alt={r.titulo}
                      className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-xl border border-gray-100"
                    />)
                  ) : (
                    <div
                      className={`w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center rounded-xl ${TIPO_COLORS[r.tipo] ?? 'bg-gray-50 text-gray-400'}`}
                    >
                      <TipoIcon tipo={r.tipo} className="size-7" />
                    </div>
                  )}
                </div>

                {/* Info + acciones */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{r.titulo}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                          {CATEGORIA_LABEL[r.categoria] ?? r.categoria}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                            r.visible_paciente
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {r.visible_paciente ? (
                            <><Eye className="size-3" /> Visible</>
                          ) : (
                            <><EyeOff className="size-3" /> Privado</>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Ver / abrir */}
                      {r.tipo === 'link' && r.url ? (
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Abrir enlace"
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <ExternalLink className="size-4" />
                        </a>
                      ) : r.signedUrl ? (
                        <a
                          href={r.signedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Ver / descargar archivo"
                          className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                          <Download className="size-4" />
                        </a>
                      ) : null}

                      {/* Toggle visibilidad */}
                      <form action={toggleVisibilidadRecursoAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="paciente_id" value={params.id} />
                        <input
                          type="hidden"
                          name="visible_paciente"
                          value={r.visible_paciente ? 'false' : 'true'}
                        />
                        <button
                          type="submit"
                          title={r.visible_paciente ? 'Ocultar al paciente' : 'Mostrar al paciente'}
                          className={`p-1.5 rounded-lg transition-colors ${
                            r.visible_paciente
                              ? 'text-green-600 hover:bg-green-50'
                              : 'text-gray-400 hover:bg-gray-100'
                          }`}
                        >
                          {r.visible_paciente ? (
                            <Eye className="size-4" />
                          ) : (
                            <EyeOff className="size-4" />
                          )}
                        </button>
                      </form>

                      {/* Eliminar */}
                      <form action={eliminarRecursoAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="paciente_id" value={params.id} />
                        <button
                          type="submit"
                          title="Eliminar recurso"
                          className="p-1.5 rounded-lg text-vimet-red hover:bg-vimet-red/10 transition-colors"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </form>
                    </div>
                  </div>

                  {r.descripcion ? (
                    <p className="text-xs text-gray-500 mt-2 line-clamp-2">{r.descripcion}</p>
                  ) : null}

                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(r.created_at).toLocaleDateString('es-AR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                    {r.creador
                      ? ` · ${r.creador.nombre} ${r.creador.apellido}`
                      : null}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
