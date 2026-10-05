import { useRef } from 'react'
import type { CSSProperties } from 'react'
import { useScrollStore } from '../hooks/useScrollProgress'
import { useFooterOverlap } from '../hooks/useFooterOverlap'
import { SITE } from '../config/site'
import StarBorder from './reactbits/StarBorder'
import Magnet from './reactbits/Magnet'

/**
 * Closing call-to-action over the neon finale (progress ~0.90–1.0) —
 * the car drives out under the sign while the booking buttons hold.
 */
export default function FinalCTA() {
  const progress = useScrollStore((s) => s.progress)
  const ref = useRef<HTMLElement>(null)
  const { overlap, lift } = useFooterOverlap(ref)

  let appear = 0
  if (progress >= 0.9 && progress <= 0.94) {
    appear = (progress - 0.9) / 0.04
  } else if (progress > 0.94 && progress <= 0.975) {
    appear = 1
  } else if (progress > 0.975 && progress <= 0.995) {
    // Hand off to the footer as it scrolls up over the canvas
    appear = 1 - (progress - 0.975) / 0.02
  }

  // The bands above are tuned to the video, but the footer's height is not
  // fixed — it grows with viewport, zoom and wrapped text, and on a phone it
  // takes most of the screen. `lift` re-centres the CTA in the space the
  // footer has left, and `overlap` fades it out as that space runs out, so
  // the two can never collide at any size.
  const opacity = Math.min(appear, 1 - overlap)

  const interactive = opacity > 0.5

  return (
    <section
      ref={ref}
      className="final-cta"
      style={
        {
          '--cta-lift': `${lift}px`,
          opacity,
          visibility: opacity === 0 ? 'hidden' : 'visible',
        } as CSSProperties
      }
      aria-hidden={!interactive}
    >
      <p className="overlay-kicker">Ready when your car is</p>
      <h2 className="final-cta-headline shiny-text">Book your slot.</h2>
      <div className="hero-actions">
        <Magnet strength={0.25}>
          <StarBorder color="#fbbf24" duration={4.5}>
            <a
              className="btn btn-solid"
              href={SITE.whatsappHref}
              target={SITE.whatsappHref.startsWith('#') ? undefined : '_blank'}
              rel={SITE.whatsappHref.startsWith('#') ? undefined : 'noopener noreferrer'}
              tabIndex={interactive ? 0 : -1}
            >
              WhatsApp us
            </a>
          </StarBorder>
        </Magnet>
        <Magnet strength={0.25}>
          <a
            className="btn btn-ghost"
            href={SITE.instagram}
            target="_blank"
            rel="noopener noreferrer"
            tabIndex={interactive ? 0 : -1}
            aria-label={`${SITE.name} on Instagram`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ marginRight: 2 }}>
              <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="17.4" cy="6.6" r="1.3" fill="currentColor" />
            </svg>
            Instagram
          </a>
        </Magnet>
      </div>
    </section>
  )
}
