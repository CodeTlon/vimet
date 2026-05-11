'use client'

// Gráfico de líneas SVG nativo (sin libs).
// Soporta múltiples series y un eje X temporal por fecha.

type Punto = { x: string; y: number | null }
type Serie = { label: string; color: string; data: Punto[] }

export function EvolutionChart({
  series,
  unit = '',
  height = 220,
}: {
  series: Serie[]
  unit?: string
  height?: number
}) {
  const all = series.flatMap((s) =>
    s.data.filter((p): p is { x: string; y: number } => p.y !== null && p.y !== undefined),
  )
  if (all.length === 0) {
    return (
      <div className="rounded-xl bg-gray-50 border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
        Todavía no hay datos para graficar.
      </div>
    )
  }

  const xs = all.map((p) => new Date(`${p.x}T00:00:00`).getTime())
  const ys = all.map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const padY = (maxY - minY) * 0.1 || 1
  const yMin = minY - padY
  const yMax = maxY + padY
  const width = 600
  const padding = { top: 16, right: 16, bottom: 32, left: 36 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom

  const sx = (t: number) =>
    padding.left + (maxX === minX ? innerW / 2 : ((t - minX) / (maxX - minX)) * innerW)
  const sy = (v: number) =>
    padding.top + (yMax === yMin ? innerH / 2 : ((yMax - v) / (yMax - yMin)) * innerH)

  // 4 ticks en Y
  const ticksY = Array.from({ length: 4 }).map((_, i) => yMin + ((yMax - yMin) * i) / 3)

  return (
    <div className="rounded-xl bg-white border border-gray-100 p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img">
        {/* Ejes */}
        <line
          x1={padding.left}
          x2={width - padding.right}
          y1={height - padding.bottom}
          y2={height - padding.bottom}
          stroke="#E5E7EB"
        />
        {ticksY.map((t, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={sy(t)}
              y2={sy(t)}
              stroke="#F3F4F6"
              strokeDasharray="3 3"
            />
            <text
              x={padding.left - 6}
              y={sy(t) + 4}
              textAnchor="end"
              fontSize="10"
              fill="#6B7280"
            >
              {t.toFixed(1)}
            </text>
          </g>
        ))}
        {/* Series */}
        {series.map((s) => {
          const valid = s.data.filter(
            (p): p is { x: string; y: number } => p.y !== null && p.y !== undefined,
          )
          if (valid.length === 0) return null
          const points = valid
            .map((p) => `${sx(new Date(`${p.x}T00:00:00`).getTime())},${sy(p.y)}`)
            .join(' ')
          return (
            <g key={s.label}>
              <polyline
                fill="none"
                stroke={s.color}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={points}
              />
              {valid.map((p, i) => (
                <circle
                  key={i}
                  cx={sx(new Date(`${p.x}T00:00:00`).getTime())}
                  cy={sy(p.y)}
                  r="3"
                  fill={s.color}
                />
              ))}
            </g>
          )
        })}
        {/* Etiquetas X (primera y última fecha) */}
        <text
          x={padding.left}
          y={height - 10}
          fontSize="10"
          fill="#6B7280"
          textAnchor="start"
        >
          {new Date(minX).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
        </text>
        <text
          x={width - padding.right}
          y={height - 10}
          fontSize="10"
          fill="#6B7280"
          textAnchor="end"
        >
          {new Date(maxX).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
        </text>
      </svg>
      <div className="flex flex-wrap gap-3 mt-2 px-2 text-xs">
        {series.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5 text-gray-700">
            <span className="size-2.5 rounded-full" style={{ background: s.color }} />
            {s.label}
            {unit ? ` (${unit})` : ''}
          </span>
        ))}
      </div>
    </div>
  )
}
