import { Youtube } from 'lucide-react'

import { extraerYoutubeId, miniaturaYoutube } from '@/lib/youtube'

export function EjercicioYoutubeThumbnail({
  url,
  alt,
  className = '',
}: {
  url: string
  alt: string
  className?: string
}) {
  const id = extraerYoutubeId(url)
  return (
    <div className={`relative overflow-hidden bg-gray-100 ${className}`}>
      {id ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={miniaturaYoutube(id)} alt={alt} className="absolute inset-0 size-full object-cover" />
      ) : null}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="size-10 rounded-full bg-red-600/90 flex items-center justify-center shadow">
          <Youtube className="size-5 text-white" />
        </div>
      </div>
    </div>
  )
}
