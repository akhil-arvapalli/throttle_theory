import { useRef, type CSSProperties, type MouseEvent, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
  style?: CSSProperties
  /** Radial glow size in px. */
  size?: number
}

/**
 * Mouse-tracked radial highlight (React Bits "Spotlight Card" style).
 * The glow paints via ::before using --spot-x/--spot-y custom properties.
 */
export default function SpotlightCard({ children, className = '', style, size = 340 }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  const onMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    el.style.setProperty('--spot-x', `${e.clientX - rect.left}px`)
    el.style.setProperty('--spot-y', `${e.clientY - rect.top}px`)
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      className={`spotlight-card ${className}`}
      style={{ '--spot-size': `${size}px`, ...style } as CSSProperties}
    >
      {children}
    </div>
  )
}
