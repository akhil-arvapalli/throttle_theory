import { useEffect, useRef } from 'react'
import { useScrollStore } from '../hooks/useScrollProgress'
import { VIDEO_DURATION, PLAYBACK_RATE } from '../config/video'

/**
 * Position along the run. Velocity ramps from 0 to full over the first
 * `RAMP` of the timeline, then stays constant.
 *
 * Constant rate is the whole point — scroll maps linearly onto the video, so
 * a constant scroll rate is 1x playback. An ease-in-out over a 50s run is
 * hopeless at the start (a cubic spends the first ~10s covering a pixel or
 * two, so the button looks broken), and easing the end would stretch the
 * finale. The short ramp only takes the edge off the initial jump; it is
 * C1-continuous into the linear part, so there is no visible kink.
 */
/**
 * Fraction of the run spent ramping up to full speed.
 *
 * This is a fraction of the whole run, so it scales with the total — which is
 * exactly wrong for the thing it exists to solve. At 4% of a 33s run the page
 * took 1.3s to reach full speed and only moved ~40px in the first half second,
 * so clicking looked like nothing had happened. 1.2% keeps the smooth entry
 * (no jerk off the button) while being up and moving within a couple of
 * hundred milliseconds.
 */
const RAMP = 0.012

function rampedLinear(t: number) {
  const norm = 1 - RAMP / 2
  // Ramp branch is the integral of a 0→1 velocity ramp, i.e. t²/2a. The
  // quadratic matters: with a linear ramp branch the two halves meet at
  // different values and the page snaps backwards at the join.
  if (t < RAMP) return ((t * t) / (2 * RAMP)) / norm
  return (t - RAMP / 2) / norm
}

/** How far the page may drift from our own scroll before we call it manual. */
const MAX_DRIFT_PX = 12

/**
 * Guided run from the hero CTA — plays the whole experience at 1x.
 *
 * Scroll maps linearly onto VIDEO_DURATION, so a full run lasts exactly as
 * long as the video it is scrubbing: the frames advance at their own speed
 * rather than being skimmed, and the engine note stays in sync because both
 * read the same constant.
 *
 * Hands control back the instant the visitor touches anything — wheel, touch,
 * key, scrollbar drag — or presses the skip button. Programmatic scrollTo
 * fires none of those, so only a real gesture can stop it.
 */
export default function AutoplayScroll() {
  const autoplaying = useScrollStore((s) => s.autoplaying)
  const stopAutoplay = useScrollStore((s) => s.stopAutoplay)
  const rafRef = useRef(0)

  useEffect(() => {
    if (!autoplaying) return

    // A guided run is motion the visitor did not initiate; if they've asked
    // the OS to reduce motion, don't move the page for them at all.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      stopAutoplay()
      return
    }

    const maxScroll = document.documentElement.scrollHeight - window.innerHeight
    const startY = window.scrollY
    const distance = maxScroll - startY
    if (distance <= 1) {
      stopAutoplay()
      return
    }

    // Starting partway down scales the run down rather than rushing the
    // remainder. PLAYBACK_RATE sets the ceiling: at 1x this is the video's own
    // length, and above it the audio scrubs forward at the same rate.
    const totalMs = Math.max(
      1200,
      ((VIDEO_DURATION * 1000 * distance) / maxScroll) / PLAYBACK_RATE
    )
    const startedAt = performance.now()

    let alive = true
    let expectedY = startY

    function stop() {
      if (!alive) return
      alive = false
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('wheel', stop)
      window.removeEventListener('touchstart', stop)
      window.removeEventListener('keydown', stop)
      window.removeEventListener('scroll', onScroll)
      stopAutoplay()
    }

    // Scrollbar drags fire no wheel/touch/key event, so catch them by noticing
    // the page moving somewhere we didn't put it.
    function onScroll() {
      if (alive && Math.abs(window.scrollY - expectedY) > MAX_DRIFT_PX) stop()
    }

    function tick() {
      const t = Math.min(1, (performance.now() - startedAt) / totalMs)
      expectedY = startY + distance * rampedLinear(t)
      window.scrollTo(0, expectedY)
      if (t >= 1) {
        stop()
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    window.addEventListener('wheel', stop, { passive: true })
    window.addEventListener('touchstart', stop, { passive: true })
    window.addEventListener('keydown', stop)
    window.addEventListener('scroll', onScroll, { passive: true })
    rafRef.current = requestAnimationFrame(tick)

    return stop
  }, [autoplaying, stopAutoplay])

  if (!autoplaying) return null

  return (
    <button type="button" className="autoplay-skip" onClick={stopAutoplay}>
      Skip
      <kbd>esc</kbd>
    </button>
  )
}
