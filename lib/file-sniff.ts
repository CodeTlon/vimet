// Sniffing liviano por firma de bytes: el `file.type` de un <input> lo pone
// el navegador confiando en la extensión del archivo, así que un .txt
// renombrado a .pdf pasa cualquier validación basada sólo en ese campo.
// Las imágenes ya quedan cubiertas indirectamente (sharp falla si no son
// imágenes reales); esto tapa el mismo hueco para PDF y video.
// ponytail: chequea la firma, no valida el archivo entero — alcanza para
// rechazar el caso obvio (archivo random con extensión falsa).

export function pareceUnPdf(buf: Buffer): boolean {
  return buf.subarray(0, 5).toString('latin1') === '%PDF-'
}

export function pareceUnGif(buf: Buffer): boolean {
  const sig = buf.subarray(0, 6).toString('latin1')
  return sig === 'GIF87a' || sig === 'GIF89a'
}

export function pareceUnVideo(buf: Buffer, mime: string): boolean {
  const head = buf.subarray(0, 12)
  if (mime === 'video/webm') {
    return head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3
  }
  if (mime === 'video/x-msvideo') {
    return head.subarray(0, 4).toString('latin1') === 'RIFF' && head.subarray(8, 12).toString('latin1') === 'AVI '
  }
  // mp4 y quicktime (.mov) comparten el box 'ftyp' en el byte 4
  return head.subarray(4, 8).toString('latin1') === 'ftyp'
}
