import { useEffect, useRef } from 'react'
import { useScrollStore } from '../hooks/useScrollProgress'

/**
 * Scroll driver — native scrolling is the source of truth (wheel, touch,
 * keyboard, scrollbar, anchor jumps all just work); a rAF lerp smooths the
 * value the site renders at, keeping the buttery scrubbed feel.
 */
export default function ScrollTracker() {
  const rafRef = useRef(0)

  useEffect(() => {
    const LERP_SPEED = 0.14 // lower = smoother but laggier
    const SNAP = 0.0002
    const SET_EPSILON = 0.00005
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')

    const maxScroll = () =>
      Math.max(1, document.documentElement.scrollHeight - window.innerHeight)

    const readTarget = () => {
      useScrollStore.getState().setTarget(
        Math.max(0, Math.min(1, window.scrollY / maxScroll()))
      )
    }

    let current = useScrollStore.getState().target
    let lastSet = -1

    const tick = () => {
      const target = useScrollStore.getState().target

      if (reduced.matches) {
        current = target
      } else {
        const diff = target - current
        if (Math.abs(diff) > SNAP) current += diff * LERP_SPEED
        else current = target
      }
      current = Math.max(0, Math.min(1, current))

      // Only propagate when meaningfully changed — avoids 60fps re-renders at rest
      if (Math.abs(current - lastSet) > SET_EPSILON) {
        lastSet = current
        useScrollStore.getState().setProgress(current)
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    readTarget()
    current = useScrollStore.getState().target
    useScrollStore.getState().setProgress(current)
    window.addEventListener('scroll', readTarget, { passive: true })
    window.addEventListener('resize', readTarget)
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('scroll', readTarget)
      window.removeEventListener('resize', readTarget)
    }
  }, [])

  return null
}