import sharp from 'sharp'

// Redimensiona (sin agrandar) y reencodea a webp antes de subir a Storage —
// las fotos que suben pacientes/staff desde el celular suelen pesar varios MB.
export async function optimizeImage(buf: Buffer, maxWidth = 1600): Promise<Buffer> {
  return sharp(buf)
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer()
}
