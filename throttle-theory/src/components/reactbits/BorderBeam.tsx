import type { CSSProperties, ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Beam color (usually the card's accent). */
  color?: string
  /** Seconds per rotation. */
  duration?: number
  className?: string
}

/**
 * Orbiting border beam (React Bits "Border Beam" style): a comet of light
 * travels the 1px edge of the wrapper while the child sits on top.
 */
export default function BorderBeam({ children, color = '#f59e0b', duration = 7, className = '' }: Props) {
  return (
    <div
      className={`border-beam ${className}`}
      style={{ '--bb-color': color, '--bb-duration': `${duration}s` } as CSSProperties}
    >
      <span className="border-beam-orbit" aria-hidden="true" />
      {children}
    </div>
  )
}
