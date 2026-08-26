import { useScrollStore } from '../hooks/useScrollProgress'
import { SITE } from '../config/site'
import StarBorder from './reactbits/StarBorder'
import Magnet from './reactbits/Magnet'

/**
 * Closing call-to-action over the neon finale (progress ~0.90–1.0) —
 * the car drives out under the sign while the booking buttons hold.
 */
export default function FinalCTA() {
  const progress = useScrollStore((s) => s.progress)

  let opacity = 0
  if (progress >= 0.9 && progress <= 0.94) {
    opacity = (progress - 0.9) / 0.04
  } else if (progress > 0.94 && progress <= 0.975) {
    opacity = 1
  } else if (progress > 0.975 && progress <= 0.995) {
    // Hand off to the footer — fade out as it scrolls up over the canvas
    opacity = 1 - (progress - 0.975) / 0.02
  }

  const interactive = opacity > 0.5

  return (
    <section
      className="final-cta"
      style={{
        opacity,
        visibility: opacity === 0 ? 'hidden' : 'visible',
      }}
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
