import { useEffect, useState, type RefObject } from 'react'

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n)

interface FooterPressure {
  /** 0 = footer is clear, 1 = overlay must be gone. */
  overlap: number
  /** Px to raise the overlay so it sits centred in the space above the footer. */
  lift: number
}

const IDLE: FooterPressure = { overlap: 0, lift: 0 }

/**
 * Keeps a fixed overlay clear of the footer, on every viewport.
 *
 * The footer is not a fixed height — it reflows with the viewport, the zoom
 * level and text wrapping, and on a phone it eats 77-88% of the screen. Two
 * things follow from measuring it rather than assuming it:
 *
 *   lift    — the overlay is re-centred in whatever space the footer has left,
 *             so it rides up instead of being buried. Zero on desktop, where
 *             the footer never reaches it, so nothing moves there.
 *   overlap — rises to 1 as the footer closes the last of the gap, and the
 *             caller fades out. The fade runs over half an element-height of
 *             scroll, so it completes before the two ever share a pixel.
 *
 * Scaling the fade to the element's own height keeps that true for a 200px
 * headline and a 42px button alike.
 *
 * rAF-throttled to at most one layout read per frame, and fully reversible —
 * the overlay settles back the moment you scroll up.
 */
export function useFooterOverlap(ref: RefObject<Element | null>): FooterPressure {
  const [state, setState] = useState<FooterPressure>(IDLE)

  useEffect(() => {
    const el = ref.current
    const footer = document.querySelector('.footer')
    if (!el || !footer) return

    let frame = 0

    const measure = () => {
      frame = 0
      const elRect = el.getBoundingClientRect()
      const footRect = footer.getBoundingClientRect()
      const vh = window.innerHeight
      const h = elRect.height

      // Centred in the viewport is the resting position; raise it only as far
      // as it takes to centre in the gap above the footer, never off-screen.
      const resting = (vh - h) / 2
      const inFreeSpace = Math.max(0, (footRect.top - h) / 2)
      const lift = Math.min(Math.max(0, resting - inFreeSpace), resting)

      // Overlap is measured against the rect as it is actually rendered —
      // getBoundingClientRect already includes the transform, so re-adding
      // `lift` here would count the shift twice. Reading the live rect keeps
      // this correct for any element, lifted or bottom-anchored.
      const gap = footRect.top - elRect.bottom
      const band = h * 0.5
      const overlap = h > 0 ? clamp01((band - gap) / band) : 0

      setState((prev) =>
        Math.abs(prev.overlap - overlap) > 0.01 || Math.abs(prev.lift - lift) > 0.5
          ? { overlap, lift }
          : prev
      )
    }

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }

    measure()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)

    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [ref])

  return state
}