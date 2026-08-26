import type { CSSProperties, ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Beam color (usually an accent). */
  color?: string
  /** Seconds per beam cycle. */
  duration?: number
  className?: string
}

/**
 * Animated border beams (React Bits "Star Border" style): two soft light
 * beams travel the edges of the wrapper, glowing through the padding gap
 * around the child.
 */
export default function StarBorder({ children, color = '#f59e0b', duration = 5, className = '' }: Props) {
  return (
    <div
      className={`star-border ${className}`}
      style={{ '--sb-color': color, '--sb-duration': `${duration}s` } as CSSProperties}
    >
      <span className="star-border-beam star-border-beam-top" aria-hidden="true" />
      <span className="star-border-beam star-border-beam-bottom" aria-hidden="true" />
      {children}
    </div>
  )
}
