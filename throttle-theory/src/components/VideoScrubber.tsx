import { useEffect, useRef } from 'react'
import { useScrollStore } from '../hooks/useScrollProgress'
import { START_FRAMES } from '../config/video'

export const TOTAL_FRAMES = 1202
const CONCURRENCY = 10
/** Cap the backing store — 2× DPR is plenty and keeps the GPU work sane. */
const MAX_DPR = 2

const FRAME_PATH = (n: number) => `/frames/frame_${String(n).padStart(4, '0')}.webp`

/**
 * Adaptive frame step: small screens and data-saver users get every 2nd
 * frame (~32MB instead of ~64MB) — imperceptible at phone size, half the
 * download. Decided once per page load.
 */
function frameStep(): number {
  try {
    const conn = (navigator as { connection?: { saveData?: boolean } }).connection
    if (conn?.saveData) return 2
    if (window.matchMedia('(max-width: 768px)').matches) return 2
  } catch {
    /* fall through */
  }
  return 1
}

const STEP = frameStep()
const FRAME_NUMS: number[] = []
for (let n = 1; n <= TOTAL_FRAMES; n += STEP) FRAME_NUMS.push(n)
const SLOT_COUNT = FRAME_NUMS.length

/**
 * Slots that must land before the reveal. Indexed by SOURCE frame, not slot
 * position: with STEP=2 (mobile / data-saver) slot 23 is source frame 47, so
 * treating the slot index as a frame number over-reports by STEP× and, worse,
 * fires readiness off a frame past the one the reveal needs.
 */
const REQUIRED_SLOTS = Math.min(SLOT_COUNT, Math.ceil(START_FRAMES / STEP))

/**
 * Progressive frame preloader.
 * Phase 1: first START_FRAMES slots (fast — reveals the site quickly).
 * Phase 2: the rest, in order, CONCURRENCY at a time.
 *
 * A failed load is NOT a successful load. `onload` and `onerror` are separate
 * handlers: sharing them counted 404s toward the loaded total AND stored a
 * pixel-less Image as if it were a decoded frame, which let a wholly broken
 * frame directory report "ready".
 */
function useFrames() {
  const frames = useRef<(HTMLImageElement | undefined)[]>([])

  useEffect(() => {
    let cancelled = false
    let loaded = 0
    let failed = 0
    let requiredOk = 0
    let requiredBad = 0
    let nextIdx = 0
    let loading = 0

    const images: (HTMLImageElement | undefined)[] = new Array(SLOT_COUNT)
    frames.current = images
    const { setFrames, setStartReady, setStartFailed } = useScrollStore.getState()
    setFrames(0, SLOT_COUNT)

    /** All required slots settled — report which way they went. */
    const settleRequired = () => {
      if (requiredOk === REQUIRED_SLOTS) setStartReady(true)
      else if (requiredOk + requiredBad === REQUIRED_SLOTS) setStartFailed(true)
    }

    const pump = () => {
      if (cancelled) return
      while (nextIdx < SLOT_COUNT && loading < CONCURRENCY) {
        const idx = nextIdx++
        loading++
        const img = new Image()
        img.src = FRAME_PATH(FRAME_NUMS[idx])

        img.onload = () => {
          loading--
          if (cancelled) return
          loaded++
          images[idx] = img
          setFrames(loaded, SLOT_COUNT)
          if (idx < REQUIRED_SLOTS) {
            requiredOk++
            settleRequired()
          }
          if (loaded + failed === SLOT_COUNT) return
          pump()
        }

        img.onerror = () => {
          loading--
          if (cancelled) return
          failed++
          // Deliberately NOT stored into `images` — a broken image would be
          // drawn as an empty bitmap for the rest of the session.
          if (idx < REQUIRED_SLOTS) {
            requiredBad++
            settleRequired()
          }
          if (loaded + failed === SLOT_COUNT) return
          pump()
        }
      }
    }

    pump()

    return () => {
      cancelled = true
    }
  }, [])

  return frames
}

/**
 * Scroll-scrubbed video: draws the frame matching the smoothed scroll
 * progress onto a fixed full-viewport canvas.
 *
 * The backing store is resized to the viewport (DPR-capped) so the bitmap
 * always matches the CSS box aspect — frames are center-cropped to fit,
 * never stretched.
 */
export default function VideoScrubber() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frames = useFrames()
  const startReady = useScrollStore((s) => s.startReady)
  const lastSlot = useRef(-1)
  const rafId = useRef(0)
  const progressRef = useRef(0)

  useEffect(() => {
    const unsub = useScrollStore.subscribe((state) => {
      progressRef.current = state.progress
    })
    progressRef.current = useScrollStore.getState().progress
    return unsub
  }, [])

  useEffect(() => {
    if (!startReady) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    let running = true

    const drawCover = (img: HTMLImageElement) => {
      // Manual object-fit: cover against the CURRENT backing store
      const scale = Math.max(
        canvas.width / img.naturalWidth,
        canvas.height / img.naturalHeight
      )
      const w = img.naturalWidth * scale
      const h = img.naturalHeight * scale
      ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h)
    }

    const drawSlot = (slot: number) => {
      const img = frames.current[slot]
      // Skip frames that haven't streamed in yet — keep the last drawn one
      if (img && img.complete && img.naturalWidth > 0) {
        lastSlot.current = slot
        drawCover(img)
      }
    }

    /** Match the bitmap to the viewport aspect; called on mount + resize. */
    const fitCanvas = () => {
      const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1)
      const w = Math.max(1, Math.round(window.innerWidth * dpr))
      const h = Math.max(1, Math.round(window.innerHeight * dpr))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        // Resizing clears the bitmap — redraw whatever frame is current
        if (lastSlot.current >= 0) drawSlot(lastSlot.current)
      }
    }

    fitCanvas()
    window.addEventListener('resize', fitCanvas)

    const tick = () => {
      if (!running) return

      const slot = Math.min(
        SLOT_COUNT - 1,
        Math.max(0, Math.round(progressRef.current * (SLOT_COUNT - 1)))
      )
      if (slot !== lastSlot.current) drawSlot(slot)

      rafId.current = requestAnimationFrame(tick)
    }

    // Draw frame 0 immediately so there's no flash
    drawSlot(0)

    rafId.current = requestAnimationFrame(tick)
    return () => {
      running = false
      cancelAnimationFrame(rafId.current)
      window.removeEventListener('resize', fitCanvas)
    }
  }, [startReady, frames])

  return (
    <canvas
      ref={canvasRef}
      className="scrub-canvas"
      aria-hidden="true"
    />
  )
}
