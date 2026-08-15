'use client'

import { useRef, useState } from 'react'

// Gráfico de línea SVG nativo sobre categorías discretas (no una serie
// temporal) — mismo lenguaje visual que evolution-chart.tsx (grilla sólida,
// relleno degradado, tooltip on hover/touch), pero el eje X son etiquetas
// fijas en vez de fechas. Fiel al gráfico de "Pliegues individuales" del
// reporte real de ISAKmetry: etiquetas horizontales sin rotar (rotarlas es
// lo que hacía que se cortaran contra el borde inferior del SVG) y título de
// eje Y opcional.

type Punto = { label: string; value: number | null }

export function CategoryLineChart({
  points,
  unit = '',
  height = 240,
  color = '#E8611A',
  axisLabel,
}: {
  points: Punto[]
  unit?: string
  height?: number
  color?: string
  axisLabel?: string
}) {
  const [hoverI, setHoverI] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const valores = points.filter((p): p is Punto & { value: number } => p.value !== null)
  if (valores.length === 0) {
    return (
      <div className="rounded-xl bg-gray-50 border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
        Todavía no hay datos para graficar.
      </div>
    )
  }

  const width = 600
  const padding = {
    top: 16,
    right: 16,
    bottom: 34,
    left: axisLabel ? 46 : 34,
  }
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

  const gradientId = `cat-line-fill-${color.replace('#', '')}`
  const areaPath =
    `M ${sx(validIdx[0].i)},${sy(0)} ` +
    validIdx.map(({ p, i }) => `L ${sx(i)},${sy(p.value)}`).join(' ') +
    ` L ${sx(validIdx[validIdx.length - 1].i)},${sy(0)} Z`

  function nearestIndex(clientX: number) {
    const svg = svgRef.current
    if (!svg) return null
    const rect = svg.getBoundingClientRect()
    const localX = ((clientX - rect.left) / rect.width) * width
    let nearest = validIdx[0].i
    let best = Infinity
    for (const { i } of validIdx) {
      const d = Math.abs(sx(i) - localX)
      if (d < best) {
        best = d
        nearest = i
      }
    }
    return nearest
  }

  const ariaLabel = `Gráfico de línea de ${points.map((p) => p.label).join(', ')}${unit ? ` (${unit})` : ''}`

  return (
    <div className="rounded-xl bg-white border border-gray-100 p-3">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto touch-none"
        role="img"
        aria-label={ariaLabel}
        onMouseMove={(e) => setHoverI(nearestIndex(e.clientX))}
        onMouseLeave={() => setHoverI(null)}
        onTouchStart={(e) => setHoverI(nearestIndex(e.touches[0].clientX))}
        onTouchMove={(e) => setHoverI(nearestIndex(e.touches[0].clientX))}
        onTouchEnd={() => setHoverI(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.16" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

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

        <path d={areaPath} fill={`url(#${gradientId})`} />

        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={validIdx.map(({ p, i }) => `${sx(i)},${sy(p.value)}`).join(' ')}
        />
        {validIdx.map(({ p, i }) => (
          <circle key={p.label} cx={sx(i)} cy={sy(p.value)} r="4" fill={color} stroke="white" strokeWidth="2" />
        ))}

        {hoverI !== null &&
          (() => {
            const hovered = validIdx.find((v) => v.i === hoverI)
            if (!hovered) return null
            const { p, i } = hovered
            const tooltipW = 96
            const flip = sx(i) + 10 + tooltipW > width - padding.right
            const tooltipX = flip ? sx(i) - 10 - tooltipW : sx(i) + 10
            return (
              <g>
                <line x1={sx(i)} x2={sx(i)} y1={padding.top} y2={height - padding.bottom} stroke="#9CA3AF" strokeWidth="1" />
                <circle cx={sx(i)} cy={sy(p.value)} r="6" fill="none" stroke={color} strokeWidth="1.5" opacity="0.5" />
                <g transform={`translate(${tooltipX}, ${padding.top})`}>
                  <rect width={tooltipW} height="34" rx="6" fill="#1A1A1A" opacity="0.9" />
                  <text x="8" y="14" fontSize="10" fill="#F3F4F6" fontWeight="600">
                    {p.label}
                  </text>
                  <text x="8" y="27" fontSize="10" fill="#F3F4F6">
                    {p.value.toFixed(1)}
                    {unit}
                  </text>
                </g>
              </g>
            )
          })()}

        {points.map((p, i) => {
          const words = p.label.split(' ')
          const cx = sx(i)
          const y = height - 20
          return (
            <text key={p.label} x={cx} y={y} textAnchor="middle" fontSize="10" fill="#6B7280">
              {words.length > 1 ? (
                <>
                  <tspan x={cx} dy="0">
                    {words[0]}
                  </tspan>
                  <tspan x={cx} dy="12">
                    {words.slice(1).join(' ')}
                  </tspan>
                </>
              ) : (
                p.label
              )}
            </text>
          )
        })}
      </svg>
    </div>
  )
}
