import { useRef, type MouseEvent, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** 0–1 — how far the content follows the cursor. */
  strength?: number
  className?: string
}

/**
 * Magnetic hover (React Bits "Magnet" style): the child is gently pulled
 * toward the cursor while hovered and springs back on leave.
 */
export default function Magnet({ children, strength = 0.3, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  const onMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - (rect.left + rect.width / 2)
    const y = e.clientY - (rect.top + rect.height / 2)
    el.style.transform = `translate(${x * strength}px, ${y * strength}px)`
  }

  const onMouseLeave = () => {
    const el = ref.current
    if (el) el.style.transform = 'translate(0px, 0px)'
  }

  return (
    <div ref={ref} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave} className={`magnet ${className}`}>
      {children}
    </div>
  )
}
