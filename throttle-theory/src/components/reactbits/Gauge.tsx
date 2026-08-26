import type { CSSProperties } from 'react'

interface Props {
  /** 0–1 — needle position along the dial. */
  value: number
  /** Rendered width in px (height follows the semicircle). */
  size?: number
  /** Value where the redline zone starts (0–1). */
  redlineFrom?: number
  /** Small caption under the needle hub. */
  label?: string
  className?: string
  style?: CSSProperties
}

const CX = 100
const CY = 104
const R = 78

const pointAt = (v: number, radius: number = R) => {
  const theta = Math.PI - v * Math.PI // 180° → 0°
  return { x: CX + radius * Math.cos(theta), y: CY - radius * Math.sin(theta) }
}

const arcPath = (fromV: number, toV: number, radius: number = R) => {
  const a = pointAt(fromV, radius)
  const b = pointAt(toV, radius)
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${radius} ${radius} 0 0 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`
}

const TICKS = Array.from({ length: 11 }, (_, i) => i / 10)

/**
 * Tachometer-style gauge (SVG + CSS, no deps): dial with ticks, redline
 * zone, progress arc and a needle with a glowing tip — the classic
 * ignition-self-check instrument.
 */
export default function Gauge({
  value,
  size = 220,
  redlineFrom = 0.78,
  label,
  className = '',
  style,
}: Props) {
  const v = Math.max(0, Math.min(1, value))
  const needleAngle = v * 180

  return (
    <div className={`gauge${className ? ' ' + className : ''}`} style={{ width: size, ...style }}>
      <svg viewBox="0 0 200 118" width="100%" aria-hidden="true">
        {/* dial background */}
        <path d={arcPath(0, 1)} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="8" strokeLinecap="round" />
        {/* redline zone */}
        <path
          d={arcPath(redlineFrom, 1)}
          fill="none"
          stroke="#ef4444"
          strokeOpacity="0.75"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* ticks */}
        {TICKS.map((t) => {
          const outer = pointAt(t, R - 9)
          const inner = pointAt(t, R - 15)
          const major = Math.round(t * 10) % 5 === 0
          return (
            <line
              key={t}
              x1={outer.x}
              y1={outer.y}
              x2={inner.x}
              y2={inner.y}
              stroke={t >= redlineFrom ? '#ef4444' : 'rgba(255,255,255,0.35)'}
              strokeOpacity={major ? 0.8 : 0.4}
              strokeWidth={major ? 2 : 1}
            />
          )
        })}
        {/* progress arc */}
        <path
          d={arcPath(0, 1)}
          fill="none"
          stroke="#f59e0b"
          strokeWidth="4"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${v * 100} 100`}
          style={{ filter: 'drop-shadow(0 0 5px rgba(245,158,11,0.65))' }}
        />
        {/* needle + glowing tip — inner group carries the live idle jitter */}
        <g transform={`rotate(${needleAngle} ${CX} ${CY})`}>
          <g className="gauge-needle-idle">
            <line x1={CX} y1={CY} x2={CX - R + 16} y2={CY} stroke="#f5f5f0" strokeWidth="3" strokeLinecap="round" />
            <circle
              cx={CX - R + 16}
              cy={CY}
              r="4"
              fill="#f59e0b"
              style={{ filter: 'drop-shadow(0 0 6px rgba(245,158,11,0.95))' }}
            />
          </g>
        </g>
        {/* hub */}
        <circle cx={CX} cy={CY} r="7" fill="#141414" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
      </svg>
      {label ? <p className="gauge-label">{label}</p> : null}
    </div>
  )
}
