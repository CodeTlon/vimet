// Gráfico de línea SVG nativo sobre categorías discretas (no una serie
// temporal) — mismo lenguaje visual que evolution-chart.tsx, pero el eje X
// son etiquetas fijas en vez de fechas. Sin tooltip: son pocos puntos y se
// leen directo del eje. Usado para el perfil de pliegues cutáneos
// individuales de una evaluación ISAK (igual que el gráfico de línea del
// reporte de ISAKmetry).

type Punto = { label: string; value: number | null }

export function CategoryLineChart({
  points,
  unit = '',
  height = 220,
  color = '#E8611A',
}: {
  points: Punto[]
  unit?: string
  height?: number
  color?: string
}) {
  const valores = points.filter((p): p is Punto & { value: number } => p.value !== null)
  if (valores.length === 0) {
    return (
      <div className="rounded-xl bg-gray-50 border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
        Todavía no hay datos para graficar.
      </div>
    )
  }

  const width = 600
  const padding = { top: 16, right: 16, bottom: 44, left: 36 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom

  const yMax = Math.max(...valores.map((p) => p.value)) * 1.15 || 1
  const sy = (v: number) => padding.top + innerH - (v / yMax) * innerH

  const ticksY = Array.from({ length: 4 }).map((_, i) => (yMax * i) / 3)

  const slotW = innerW / points.length
  const sx = (i: number) => padding.left + slotW * i + slotW / 2

  const validIdx = points
    .map((p, i) => ({ p, i }))
    .filter((x): x is { p: Punto & { value: number }; i: number } => x.p.value !== null)

  const ariaLabel = `Gráfico de línea de ${points.map((p) => p.label).join(', ')}${unit ? ` (${unit})` : ''}`

  return (
    <div className="rounded-xl bg-white border border-gray-100 p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label={ariaLabel}>
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
            <text x={padding.left - 6} y={sy(t) + 4} textAnchor="end" fontSize="10" fill="#6B7280">
              {t.toFixed(0)}
            </text>
          </g>
        ))}

        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={validIdx.map(({ p, i }) => `${sx(i)},${sy(p.value)}`).join(' ')}
        />
        {validIdx.map(({ p, i }) => (
          <circle key={p.label} cx={sx(i)} cy={sy(p.value)} r="3.5" fill={color} />
        ))}

        {points.map((p, i) => (
          <text
            key={p.label}
            x={sx(i)}
            y={height - 8}
            textAnchor="end"
            fontSize="10"
            fill="#6B7280"
            transform={`rotate(-35 ${sx(i)} ${height - 8})`}
          >
            {p.label}
          </text>
        ))}
      </svg>
    </div>
  )
}
