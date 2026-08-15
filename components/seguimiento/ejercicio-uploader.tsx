'use client'

import GIF from 'gif.js'
import { Film, Loader2, Upload, Youtube } from 'lucide-react'
import { useRef, useState, useTransition } from 'react'

import { crearEjercicioCustomAction } from '@/actions/ejercicios'
import { Select } from '@/components/ui/select'
import { extraerYoutubeId, miniaturaYoutube } from '@/lib/youtube'

const MAX_DUR = 6
const MIN_DUR = 0.3
const FPS = 10
const MAX_WIDTH = 480

const CATEGORIAS = [
  { value: 'calentamiento', label: 'Calentamiento previo' },
  { value: 'entrenamiento', label: 'Entrenamiento' },
  { value: 'enfriamiento', label: 'Entrenamiento posterior / enfriamiento' },
  { value: 'grupo_muscular', label: 'Grupo muscular' },
] as const

const TIPOS_EJERCICIO = [
  { value: 'fuerza', label: 'Fuerza' },
  { value: 'cardio', label: 'Cardio' },
] as const

function seekTo(video: HTMLVideoElement, t: number) {
  return new Promise<void>((resolve) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked)
      resolve()
    }
    video.addEventListener('seeked', onSeeked)
    video.currentTime = t
  })
}

export function EjercicioUploader() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPending, startTransition] = useTransition()

  const [modo, setModo] = useState<'gif' | 'youtube'>('gif')
  const [youtubeUrl, setYoutubeUrl] = useState('')

  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [duration, setDuration] = useState(0)
  const [inicio, setInicio] = useState(0)
  const [fin, setFin] = useState(0)

  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [gifBlob, setGifBlob] = useState<Blob | null>(null)
  const [gifPreviewUrl, setGifPreviewUrl] = useState<string | null>(null)

  const [nombre, setNombre] = useState('')
  const [categoria, setCategoria] = useState<(typeof CATEGORIAS)[number]['value']>('entrenamiento')
  const [tipoEjercicio, setTipoEjercicio] = useState<(typeof TIPOS_EJERCICIO)[number]['value']>('fuerza')
  const [parteCuerpo, setParteCuerpo] = useState('')
  const [instrucciones, setInstrucciones] = useState('')
  const [message, setMessage] = useState<{ ok?: boolean; error?: string } | null>(null)

  const youtubeId = modo === 'youtube' ? extraerYoutubeId(youtubeUrl) : null
  const listoParaFormulario = modo === 'gif' ? !!gifPreviewUrl : !!youtubeId

  function resetTodo() {
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    if (gifPreviewUrl) URL.revokeObjectURL(gifPreviewUrl)
    setVideoUrl(null)
    setDuration(0)
    setInicio(0)
    setFin(0)
    setGifBlob(null)
    setGifPreviewUrl(null)
    setYoutubeUrl('')
    setNombre('')
    setTipoEjercicio('fuerza')
    setParteCuerpo('')
    setInstrucciones('')
  }

  function cambiarModo(m: 'gif' | 'youtube') {
    resetTodo()
    setModo(m)
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (gifPreviewUrl) URL.revokeObjectURL(gifPreviewUrl)
    setGifBlob(null)
    setGifPreviewUrl(null)
    setMessage(null)
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    setVideoUrl(URL.createObjectURL(file))
  }

  function onLoadedMetadata() {
    const video = videoRef.current
    if (!video) return
    const d = video.duration
    setDuration(d)
    setInicio(0)
    setFin(Math.min(d, 4))
  }

  function cambiarInicio(v: number) {
    const nuevoFin = Math.min(duration, v + MAX_DUR, Math.max(fin, v + MIN_DUR))
    setInicio(v)
    setFin(nuevoFin)
  }

  function cambiarFin(v: number) {
    const nuevoInicio = Math.max(0, v - MAX_DUR, Math.min(inicio, v - MIN_DUR))
    setFin(v)
    setInicio(nuevoInicio)
  }

  async function generarGif() {
    const video = videoRef.current
    if (!video || fin - inicio < MIN_DUR) return

    setGenerating(true)
    setProgress(0)
    video.pause()

    const scale = Math.min(1, MAX_WIDTH / video.videoWidth)
    const width = Math.round(video.videoWidth * scale)
    const height = Math.round(video.videoHeight * scale)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setGenerating(false)
      return
    }

    const gif = new GIF({ workers: 2, quality: 10, width, height, workerScript: '/gif.worker.js' })
    gif.on('progress', (p) => setProgress(p))
    gif.on('finished', (blob) => {
      setGifBlob(blob)
      setGifPreviewUrl(URL.createObjectURL(blob))
      setGenerating(false)
    })

    const frameCount = Math.max(2, Math.round((fin - inicio) * FPS))
    for (let i = 0; i < frameCount; i++) {
      const t = inicio + (i / (frameCount - 1)) * (fin - inicio)
      await seekTo(video, t)
      ctx.drawImage(video, 0, 0, width, height)
      gif.addFrame(ctx, { copy: true, delay: 1000 / FPS })
    }
    gif.render()
  }

  function guardar() {
    if (!nombre.trim() || !listoParaFormulario) return
    const fd = new FormData()
    fd.set('nombre', nombre.trim())
    fd.set('modo', tipoEjercicio)
    if (tipoEjercicio === 'fuerza') {
      fd.set('categoria', categoria)
      fd.set('parte_cuerpo', parteCuerpo)
    }
    fd.set('instrucciones', instrucciones)
    if (modo === 'youtube') {
      fd.set('youtube_url', youtubeUrl.trim())
    } else {
      if (!gifBlob) return
      fd.set('gif', new File([gifBlob], 'ejercicio.gif', { type: 'image/gif' }))
    }

    startTransition(async () => {
      const res = await crearEjercicioCustomAction(undefined, fd)
      setMessage(res)
      if (res.ok) resetTodo()
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <h3 className="font-heading font-semibold text-gray-900 flex items-center gap-2">
        <Film className="size-5 text-vimet-orange" />
        Subir ejercicio propio
      </h3>

      <div className="inline-flex rounded-lg border border-gray-200 p-1 text-sm">
        <button
          type="button"
          onClick={() => cambiarModo('gif')}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors ${modo === 'gif' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Video (GIF)
        </button>
        <button
          type="button"
          onClick={() => cambiarModo('youtube')}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors ${modo === 'youtube' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Link de YouTube
        </button>
      </div>

      {modo === 'youtube' ? (
        <div className="space-y-3">
          <input
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40 focus:border-vimet-orange"
          />
          {youtubeUrl.trim() && !youtubeId ? (
            <p className="text-xs text-vimet-red">No pudimos reconocer ese link como un video de YouTube.</p>
          ) : null}
          {youtubeId ? (
            <div className="relative w-full max-w-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={miniaturaYoutube(youtubeId)}
                alt="Miniatura del video de YouTube"
                className="w-full aspect-video object-cover rounded-lg border border-gray-100"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="size-12 rounded-full bg-red-600/90 flex items-center justify-center">
                  <Youtube className="size-6 text-white" />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : !videoUrl ? (
        <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 p-8 text-center text-sm text-gray-500 cursor-pointer hover:border-vimet-orange/40 hover:text-vimet-orange transition-colors">
          <Upload className="size-6" />
          Elegí un video corto (de tu celular o de otra fuente)
          <input type="file" accept="video/*" className="hidden" onChange={onFile} />
        </label>
      ) : (
        <div className="space-y-4">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            ref={videoRef}
            src={videoUrl}
            onLoadedMetadata={onLoadedMetadata}
            muted
            playsInline
            className="w-full max-w-sm rounded-lg bg-black"
          />

          {duration > 0 ? (
            <div className="space-y-2 max-w-sm">
              <p className="text-xs text-gray-500">
                Recorte: {inicio.toFixed(1)}s – {fin.toFixed(1)}s ({(fin - inicio).toFixed(1)}s, máx {MAX_DUR}s)
              </p>
              <label className="block text-xs text-gray-500">
                Inicio
                <input
                  type="range"
                  min={0}
                  max={duration}
                  step={0.1}
                  value={inicio}
                  onChange={(e) => cambiarInicio(Number(e.target.value))}
                  className="w-full accent-vimet-orange"
                />
              </label>
              <label className="block text-xs text-gray-500">
                Fin
                <input
                  type="range"
                  min={0}
                  max={duration}
                  step={0.1}
                  value={fin}
                  onChange={(e) => cambiarFin(Number(e.target.value))}
                  className="w-full accent-vimet-orange"
                />
              </label>
            </div>
          ) : null}

          <button
            type="button"
            onClick={generarGif}
            disabled={generating || duration === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 text-white text-sm font-medium px-4 py-2 disabled:opacity-60"
          >
            {generating ? <Loader2 className="size-4 animate-spin" /> : null}
            {generating ? `Generando GIF... ${Math.round(progress * 100)}%` : 'Generar GIF del recorte'}
          </button>

          <button
            type="button"
            onClick={resetTodo}
            className="ml-3 text-sm text-gray-500 hover:text-gray-700"
          >
            Elegir otro video
          </button>
        </div>
      )}

      {listoParaFormulario ? (
        <div className="space-y-3 border-t border-gray-100 pt-4">
          {modo === 'gif' && gifPreviewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={gifPreviewUrl} alt="Vista previa del GIF generado" className="max-w-[240px] rounded-lg border border-gray-100" />
          ) : null}

          <div>
            <p className="text-xs text-gray-500 mb-1">Tipo de ejercicio</p>
            <div className="inline-flex rounded-lg border border-gray-200 p-1 text-sm">
              {TIPOS_EJERCICIO.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTipoEjercicio(t.value)}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors ${tipoEjercicio === t.value ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre del ejercicio"
              className={`rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40 focus:border-vimet-orange ${tipoEjercicio === 'cardio' ? 'sm:col-span-2' : ''}`}
            />
            {tipoEjercicio === 'fuerza' ? (
              <>
                <Select
                  value={categoria}
                  onChange={(v) => setCategoria(v as typeof categoria)}
                  options={CATEGORIAS}
                />
                {categoria === 'grupo_muscular' ? (
                  <input
                    value={parteCuerpo}
                    onChange={(e) => setParteCuerpo(e.target.value)}
                    placeholder="Grupo muscular (ej: piernas, espalda)"
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40 focus:border-vimet-orange sm:col-span-2"
                  />
                ) : null}
              </>
            ) : null}
            <textarea
              value={instrucciones}
              onChange={(e) => setInstrucciones(e.target.value)}
              placeholder="Instrucciones (opcional)"
              rows={2}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-vimet-orange/40 focus:border-vimet-orange sm:col-span-2"
            />
          </div>

          {message?.error ? <p className="text-sm text-vimet-red">{message.error}</p> : null}

          <button
            type="button"
            onClick={guardar}
            disabled={isPending || !nombre.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-vimet-orange text-white text-sm font-medium px-4 py-2 disabled:opacity-60"
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Guardar en la biblioteca
          </button>
        </div>
      ) : null}
    </div>
  )
}
