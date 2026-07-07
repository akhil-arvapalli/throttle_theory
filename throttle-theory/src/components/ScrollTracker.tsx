import { useEffect, useRef } from 'react'
import { useScrollStore } from '../hooks/useScrollProgress'

// ── Smooth scroll-driven progress tracker ──
// Uses a "target → lerp → actual" pattern for butter-smooth scrubbing.
// Wheel/touch events set a TARGET progress, then a rAF loop lerps toward it.

export default function ScrollTracker() {
  const targetRef = useRef(0)
  const currentRef = useRef(0)
  const rafRef = useRef(0)

  useEffect(() => {
    const WHEEL_SENSITIVITY = 0.0004
    const TOUCH_SENSITIVITY = 0.0012
    const LERP_SPEED = 0.12 // lower = smoother but laggier; 0.10–0.15 is the sweet spot
    const SNAP_THRESHOLD = 0.0001 // stop lerping when close enough

    let touchLastY = 0

    // ── Wheel handler ──
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY * WHEEL_SENSITIVITY
      targetRef.current = Math.max(0, Math.min(1, targetRef.current + delta))
    }

    // ── Touch handlers ──
    const handleTouchStart = (e: TouchEvent) => {
      touchLastY = e.touches[0].clientY
    }

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      const currentY = e.touches[0].clientY
      const delta = (touchLastY - currentY) * TOUCH_SENSITIVITY
      touchLastY = currentY
      targetRef.current = Math.max(0, Math.min(1, targetRef.current + delta))
    }

    // ── rAF lerp loop ──
    let running = true
    const tick = () => {
      if (!running) return

      const diff = targetRef.current - currentRef.current

      if (Math.abs(diff) > SNAP_THRESHOLD) {
        currentRef.current += diff * LERP_SPEED
        // Clamp to avoid floating-point overshoot
        currentRef.current = Math.max(0, Math.min(1, currentRef.current))
        useScrollStore.getState().setProgress(currentRef.current)
      }

      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    // ── Bind events ──
    window.addEventListener('wheel', handleWheel, { passive: false })
    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: false })

    return () => {
      running = false
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
    }
  }, [])

  return null
}
