'use client'

import { useRef, useState } from 'react'

// Gráfico de líneas SVG nativo (sin libs).
// Soporta múltiples series, eje X temporal por fecha, y tooltip on hover/touch.

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
  const [hoverT, setHoverT] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

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

  const fmtDate = (t: number) =>
    new Date(t).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })

  // Timestamps únicos ordenados (para snapear el hover al punto más cercano) +
  // lookup por serie (para saber qué series tienen dato en ese timestamp).
  const xsAll = Array.from(new Set(xs)).sort((a, b) => a - b)
  const seriesByX = series.map((s) => {
    const map = new Map<number, number>()
    for (const p of s.data) {
      if (p.y === null || p.y === undefined) continue
      map.set(new Date(`${p.x}T00:00:00`).getTime(), p.y)
    }
    return map
  })

  function nearestX(clientX: number) {
    const svg = svgRef.current
    if (!svg) return null
    const rect = svg.getBoundingClientRect()
    const localX = ((clientX - rect.left) / rect.width) * width
    let nearest = xsAll[0]
    let best = Infinity
    for (const t of xsAll) {
      const d = Math.abs(sx(t) - localX)
      if (d < best) {
        best = d
        nearest = t
      }
    }
    return nearest
  }

  function renderHover(t: number) {
    const lines = series
      .map((s, i) => {
        const v = seriesByX[i].get(t)
        return v === undefined ? null : { label: s.label, color: s.color, value: v }
      })
      .filter((l): l is { label: string; color: string; value: number } => l !== null)
    if (lines.length === 0) return null

    const tooltipW = 130
    const tooltipH = 16 + lines.length * 14
    const flip = sx(t) + 10 + tooltipW > width - padding.right
    const tooltipX = flip ? sx(t) - 10 - tooltipW : sx(t) + 10

    return (
      <g>
        <line x1={sx(t)} x2={sx(t)} y1={padding.top} y2={height - padding.bottom} stroke="#9CA3AF" strokeDasharray="2 2" />
        {lines.map((l) => (
          <circle key={l.label} cx={sx(t)} cy={sy(l.value)} r="4.5" fill={l.color} stroke="white" strokeWidth="1.5" />
        ))}
        <g transform={`translate(${tooltipX}, ${padding.top})`}>
          <rect width={tooltipW} height={tooltipH} rx="6" fill="#1A1A1A" opacity="0.9" />
          <text x="8" y="14" fontSize="10" fill="#F3F4F6" fontWeight="600">
            {fmtDate(t)}
          </text>
          {lines.map((l, i) => (
            <text key={l.label} x="8" y={28 + i * 14} fontSize="10" fill="#F3F4F6">
              {l.label}: {l.value.toFixed(1)}
              {unit ? ` ${unit}` : ''}
            </text>
          ))}
        </g>
      </g>
    )
  }

  const ariaLabel = `Gráfico de evolución de ${series.map((s) => s.label).join(', ')}${unit ? ` (${unit})` : ''}, del ${fmtDate(minX)} al ${fmtDate(maxX)}`

  return (
    <div className="rounded-xl bg-white border border-gray-100 p-3">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto touch-none"
        role="img"
        aria-label={ariaLabel}
        onMouseMove={(e) => setHoverT(nearestX(e.clientX))}
        onMouseLeave={() => setHoverT(null)}
        onTouchStart={(e) => setHoverT(nearestX(e.touches[0].clientX))}
        onTouchMove={(e) => setHoverT(nearestX(e.touches[0].clientX))}
        onTouchEnd={() => setHoverT(null)}
      >
        {/* Ejes */}
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
          const last = valid[valid.length - 1]
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
              {/* Último valor resaltado */}
              <circle
                cx={sx(new Date(`${last.x}T00:00:00`).getTime())}
                cy={sy(last.y)}
                r="6"
                fill="none"
                stroke={s.color}
                strokeWidth="1.5"
                opacity="0.5"
              />
            </g>
          )
        })}
        {hoverT !== null && renderHover(hoverT)}
        {/* Etiquetas X */}
        <text
          x={padding.left}
          y={height - 10}
          fontSize="10"
          fill="#6B7280"
          textAnchor="start"
        >
          {fmtDate(minX)}
        </text>
        {xsAll.length > 2 && (
          <text
            x={sx(xsAll[Math.floor(xsAll.length / 2)])}
            y={height - 10}
            fontSize="10"
            fill="#6B7280"
            textAnchor="middle"
          >
            {fmtDate(xsAll[Math.floor(xsAll.length / 2)])}
          </text>
        )}
        <text
          x={width - padding.right}
          y={height - 10}
          fontSize="10"
          fill="#6B7280"
          textAnchor="end"
        >
          {fmtDate(maxX)}
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
