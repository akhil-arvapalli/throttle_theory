import type { CSSProperties } from 'react'

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

interface Props {
  value: number
  /** Fixed digit count (zero-padded), like a real odometer. */
  digits?: number
  className?: string
  style?: CSSProperties
}

/**
 * Odometer readout (React Bits style): each digit is a vertical wheel of
 * 0–9 that flips into place when the value changes.
 */
export default function Odometer({ value, digits = 3, className = '', style }: Props) {
  const max = Math.pow(10, digits) - 1
  const clamped = Math.max(0, Math.min(max, Math.round(value)))
  const str = String(clamped).padStart(digits, '0')

  return (
    <span className={`odometer${className ? ' ' + className : ''}`} style={style} aria-label={String(clamped)}>
      {str.split('').map((d, i) => (
        <span className="odo-digit" key={i} aria-hidden="true">
          <span className="odo-strip" style={{ transform: `translateY(-${Number(d)}em)` }}>
            {DIGITS.map((n) => (
              <span key={n}>{n}</span>
            ))}
          </span>
        </span>
      ))}
    </span>
  )
}
