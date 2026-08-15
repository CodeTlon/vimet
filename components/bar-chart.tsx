// Gráfico de barras SVG nativo (sin libs) — mismo lenguaje visual que
// evolution-chart.tsx / category-line-chart.tsx (grilla sólida hairline,
// mismos colores de eje), pero para categorías discretas. Sin tooltip: el
// valor ya se imprime arriba de cada barra. Barra fina con cap ~28px (nunca
// ocupa medio slot completo, por más que haya 1-3 categorías) y esquina
// redondeada solo arriba, cuadrada contra la base — para que lea como que
// "crece" desde el eje, no como un bloque gordo estático.

type Barra = { label: string; value: number | null; color?: string }

function roundedTopBarPath(cx: number, top: number, base: number, w: number, r: number) {
  const x0 = cx - w / 2
  const x1 = cx + w / 2
  const radius = Math.min(r, w / 2, Math.max(base - top, 0))
  return `M ${x0},${base} L ${x0},${top + radius} Q ${x0},${top} ${x0 + radius},${top} L ${x1 - radius},${top} Q ${x1},${top} ${x1},${top + radius} L ${x1},${base} Z`
}

export function BarChart({
  bars,
  unit = '',
  height = 220,
  color = '#E8611A',
  axisLabel,
}: {
  bars: Barra[]
  unit?: string
  height?: number
  color?: string
  axisLabel?: string
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
  const padding = { top: 24, right: 16, bottom: 32, left: axisLabel ? 46 : 34 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom

  const yMax = Math.max(...valores.map((b) => b.value)) * 1.15 || 1
  const sy = (v: number) => padding.top + innerH - (v / yMax) * innerH

  const ticksY = Array.from({ length: 4 }).map((_, i) => (yMax * i) / 3)

  const slotW = innerW / bars.length
  const barW = Math.min(slotW * 0.5, 28)

  const ariaLabel = `Gráfico de barras de ${bars.map((b) => b.label).join(', ')}${unit ? ` (${unit})` : ''}`

  return (
    <div className="rounded-xl bg-white border border-gray-100 p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label={ariaLabel}>
        {axisLabel ? (
          <text
            x={14}
            y={padding.top + innerH / 2}
            textAnchor="middle"
            fontSize="10"
            fill="#9CA3AF"
            transform={`rotate(-90 14 ${padding.top + innerH / 2})`}
          >
            {axisLabel}
          </text>
        ) : null}

        {ticksY.map((t, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={sy(t)}
              y2={sy(t)}
              stroke="#E5E5E5"
              strokeWidth="1"
            />
            <text x={padding.left - 8} y={sy(t) + 4} textAnchor="end" fontSize="10" fill="#6B7280">
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
                <text x={cx} y={height - 10} textAnchor="middle" fontSize="10" fill="#6B7280">
                  {b.label}
                </text>
              </g>
            )
          }
          const y = sy(b.value)
          return (
            <g key={b.label} style={{ animation: `bar-grow-in 0.4s ease-out ${i * 70}ms backwards` }}>
              <path d={roundedTopBarPath(cx, y, sy(0), barW, 4)} fill={b.color ?? color} />
              <text x={cx} y={y - 8} textAnchor="middle" fontSize="11" fontWeight="600" fill="#1A1A1A">
                {b.value.toFixed(1)}
                {unit}
              </text>
              <text x={cx} y={height - 10} textAnchor="middle" fontSize="10" fill="#6B7280">
                {b.label}
              </text>
            </g>
          )
        })}
      </svg>
      <style>{`
        @keyframes bar-grow-in {
          from { transform: translateY(8px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
