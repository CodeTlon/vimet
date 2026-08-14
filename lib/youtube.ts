const YOUTUBE_ID_RE =
  /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/

export function extraerYoutubeId(url: string): string | null {
  const match = url.trim().match(YOUTUBE_ID_RE)
  return match ? match[1] : null
}

export function miniaturaYoutube(id: string): string {
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`
}
