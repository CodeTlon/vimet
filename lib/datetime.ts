// Utilidades de fecha en zona horaria de Córdoba (Argentina, UTC-3).
//
// new Date().toISOString().slice(0,10) devuelve la fecha en UTC: cuando son
// las 22:00 en Córdoba ya es el día siguiente en UTC, así que cualquier
// "hoy" derivado de ese patrón se corre un día. En Vercel (server UTC) este
// bug aparece todos los días entre las 21:00 y las 23:59 hora local.

export const TZ_ARGENTINA = 'America/Argentina/Cordoba'

const DATE_FMT = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ_ARGENTINA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const TIME_FMT = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ_ARGENTINA,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

// YYYY-MM-DD en zona Argentina para la fecha dada (default: ahora).
export function hoyArgentina(date: Date = new Date()): string {
  return DATE_FMT.format(date)
}

// HH:MM (24h) en zona Argentina para la fecha dada (default: ahora).
export function horaArgentina(date: Date = new Date()): string {
  return TIME_FMT.format(date)
}

// Lunes de la semana del calendario argentino que contiene la fecha dada.
// Se toma el calendario local de Argentina y se camina hacia atrás hasta lunes.
export function lunesDeSemanaArgentina(date: Date = new Date()): string {
  const partes = DATE_FMT.formatToParts(date)
  const y = Number(partes.find((p) => p.type === 'year')!.value)
  const m = Number(partes.find((p) => p.type === 'month')!.value)
  const d = Number(partes.find((p) => p.type === 'day')!.value)
  // Anclamos a mediodía UTC para evitar que cualquier corrimiento horario
  // (DST, segundos intercalados) cruce de día al sumar/restar.
  const utc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
  const dow = utc.getUTCDay() // 0=domingo
  const diff = (dow === 0 ? -6 : 1) - dow
  utc.setUTCDate(utc.getUTCDate() + diff)
  return utc.toISOString().slice(0, 10)
}

// YYYY-MM-DD de "hace `dias` días" en zona Argentina (mismo anclaje a
// mediodía UTC que lunesDeSemanaArgentina, para no cruzar de día al restar).
export function haceDiasArgentina(dias: number, date: Date = new Date()): string {
  const partes = DATE_FMT.formatToParts(date)
  const y = Number(partes.find((p) => p.type === 'year')!.value)
  const m = Number(partes.find((p) => p.type === 'month')!.value)
  const d = Number(partes.find((p) => p.type === 'day')!.value)
  const utc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
  utc.setUTCDate(utc.getUTCDate() - dias)
  return utc.toISOString().slice(0, 10)
}
