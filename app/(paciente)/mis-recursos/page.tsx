import {
  Apple,
  BookOpen,
  Dumbbell,
  ExternalLink,
  FileImage,
  FileText,
  FolderOpen,
  TrendingUp,
  Video,
} from 'lucide-react'

import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Mis recursos' }
export const dynamic  = 'force-dynamic'

type Recurso = {
  id: number
  tipo: 'link' | 'pdf' | 'imagen' | 'video'
  categoria: string
  titulo: string
  descripcion: string | null
  url: string | null
  storage_path: string | null
  created_at: string
}

type RecursoConUrl = Recurso & { signedUrl: string | null }

const CATEGORIAS = [
  { key: 'ejercicio',  label: 'Ejercicio',  icon: Dumbbell    },
  { key: 'nutricion',  label: 'Nutrición',  icon: Apple       },
  { key: 'progreso',   label: 'Progreso',   icon: TrendingUp  },
  { key: 'educativo',  label: 'Educativo',  icon: BookOpen    },
  { key: 'otro',       label: 'Otros',      icon: FolderOpen  },
]

const TIPO_BG: Record<string, string> = {
  link:   'bg-blue-50 text-blue-500',
  pdf:    'bg-red-50 text-red-500',
  imagen: 'bg-emerald-50 text-emerald-500',
  video:  'bg-purple-50 text-purple-500',
}

export default async function MisRecursosPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('recursos_paciente')
    .select('id, tipo, categoria, titulo, descripcion, url, storage_path, created_at')
    .eq('paciente_id', user.id)
    .eq('visible_paciente', true)
    .order('created_at', { ascending: false })

  const recursos = (data ?? []) as Recurso[]

  // Generar URLs firmadas para archivos (1 hora)
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
    <>
      <header className="mb-6">
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900">Mis recursos</h1>
        <p className="text-gray-700 mt-1">
          Material que tu equipo compartió con vos — ejercicios, nutrición, educativo y más.
        </p>
      </header>

      {recursosConUrl.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <BookOpen className="size-10 text-gray-300 mx-auto mb-3" />
          <p className="font-heading font-semibold text-gray-700">
            Tu equipo todavía no compartió recursos
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Acá vas a ver videos, PDFs, imágenes y links que Gero y Avril compartan con vos.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-8">
            {CATEGORIAS.filter((cat) =>
              recursosConUrl.some((r) => r.categoria === cat.key),
            ).map((cat) => (
              <a
                key={cat.key}
                href={`#cat-${cat.key}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-vimet-tint4 text-vimet-tint5 text-sm font-medium hover:bg-vimet-tint1 transition-colors"
              >
                <cat.icon className="size-3.5" />
                {cat.label}
              </a>
            ))}
          </div>
          <div className="space-y-10">
            {CATEGORIAS.map((cat) => {
              const items = recursosConUrl.filter((r) => r.categoria === cat.key)
              if (items.length === 0) return null
              const CatIcon = cat.icon
              return (
                <section key={cat.key} id={`cat-${cat.key}`} className="scroll-mt-24">
                  <div className="flex items-center gap-2 mb-4">
                    <CatIcon className="size-5 text-vimet-orange" />
                    <h2 className="font-heading text-xl font-semibold text-gray-900">{cat.label}</h2>
                    <span className="text-xs text-gray-400 font-normal">({items.length})</span>
                  </div>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((r) => (
                      <RecursoCard key={r.id} r={r} />
                    ))}
                  </ul>
                </section>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}

function RecursoCard({ r }: { r: RecursoConUrl }) {
  const href = r.tipo === 'link' ? (r.url ?? '#') : (r.signedUrl ?? '#')

  return (
    <li className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
      {/* Thumbnail o placeholder */}
      {r.tipo === 'imagen' && r.signedUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={r.signedUrl}
          alt={r.titulo}
          className="w-full h-44 object-cover"
        />
      ) : (
        <div
          className={`w-full h-28 flex items-center justify-center ${TIPO_BG[r.tipo] ?? 'bg-gray-50'}`}
        >
          {r.tipo === 'link'   ? <ExternalLink className="size-10 opacity-60" /> : null}
          {r.tipo === 'pdf'    ? <FileText     className="size-10 opacity-60" /> : null}
          {r.tipo === 'imagen' ? <FileImage    className="size-10 opacity-60" /> : null}
          {r.tipo === 'video'  ? <Video        className="size-10 opacity-60" /> : null}
        </div>
      )}

      {/* Contenido */}
      <div className="flex flex-col flex-1 p-4">
        <p className="font-medium text-gray-900 leading-snug">{r.titulo}</p>
        {r.descripcion ? (
          <p className="text-xs text-gray-500 mt-1.5 line-clamp-3 flex-1">{r.descripcion}</p>
        ) : (
          <div className="flex-1" />
        )}

        <div className="mt-4">
          {href !== '#' ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-vimet-gradient text-white text-sm font-semibold shadow-sm hover:shadow-md transition-all"
            >
              {r.tipo === 'link'   ? <ExternalLink className="size-4" /> : null}
              {r.tipo === 'pdf'    ? <FileText     className="size-4" /> : null}
              {r.tipo === 'imagen' ? <FileImage    className="size-4" /> : null}
              {r.tipo === 'video'  ? <Video        className="size-4" /> : null}
              {r.tipo === 'pdf'    ? 'Descargar PDF'  :
               r.tipo === 'video'  ? 'Ver video'       :
               r.tipo === 'imagen' ? 'Ver imagen'      :
                                     'Abrir enlace'}
            </a>
          ) : (
            <span className="text-xs text-gray-400 italic">Archivo no disponible</span>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-3">
          {new Date(r.created_at).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
        </p>
      </div>
    </li>
  )
}
