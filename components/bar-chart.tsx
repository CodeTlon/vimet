// Gráfico de barras SVG nativo (sin libs) — mismo lenguaje visual que
// evolution-chart.tsx (width/padding/colores de eje), pero para categorías
// discretas en vez de una serie temporal. Sin tooltip: el valor ya se
// imprime arriba de cada barra.

type Barra = { label: string; value: number | null; color?: string }

export function BarChart({
  bars,
  unit = '',
  height = 220,
  color = '#E8611A',
}: {
  bars: Barra[]
  unit?: string
  height?: number
  color?: string
}) {
  const valores = bars.filter((b): b is Barra & { value: number } => b.value !== null)
  if (valores.length === 0) {
    return (
      <div className="rounded-xl bg-gray-50 border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
        Todavía no hay datos para graficar.
      </div>
    )
  }

  const width = 600
  const padding = { top: 24, right: 16, bottom: 40, left: 36 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom

  const yMax = Math.max(...valores.map((b) => b.value)) * 1.15 || 1
  const sy = (v: number) => padding.top + innerH - (v / yMax) * innerH

  const ticksY = Array.from({ length: 4 }).map((_, i) => (yMax * i) / 3)

  const slotW = innerW / bars.length
  const barW = slotW * 0.5

  const ariaLabel = `Gráfico de barras de ${bars.map((b) => b.label).join(', ')}${unit ? ` (${unit})` : ''}`

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

        {bars.map((b, i) => {
          const cx = padding.left + slotW * i + slotW / 2
          if (b.value === null) {
            return (
              <g key={b.label}>
                <text x={cx} y={sy(0) - 6} textAnchor="middle" fontSize="11" fontWeight="600" fill="#9CA3AF">
                  —
                </text>
                <text x={cx} y={height - 14} textAnchor="middle" fontSize="10" fill="#6B7280">
                  {b.label}
                </text>
              </g>
            )
          }
          const y = sy(b.value)
          return (
            <g key={b.label}>
              <rect
                x={cx - barW / 2}
                y={y}
                width={barW}
                height={sy(0) - y}
                rx="4"
                fill={b.color ?? color}
              />
              <text x={cx} y={y - 6} textAnchor="middle" fontSize="11" fontWeight="600" fill="#1A1A1A">
                {b.value.toFixed(1)}
                {unit}
              </text>
              <text x={cx} y={height - 14} textAnchor="middle" fontSize="10" fill="#6B7280">
                {b.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
