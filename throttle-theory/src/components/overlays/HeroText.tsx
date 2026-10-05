import { motion } from 'framer-motion'
import { useScrollStore, scrollToProgress, SECTIONS } from '../../hooks/useScrollProgress'
import { SITE } from '../../config/site'
import ScrambleText from '../reactbits/ScrambleText'
import StarBorder from '../reactbits/StarBorder'
import Magnet from '../reactbits/Magnet'

const KICKER = `Performance Garage — ${SITE.city} · Est. ${SITE.established}`

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches
const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' as const } },
}

/**
 * Hero — the video's neon facade shot carries the brand, so the HTML layer
 * stays minimal: a decoding kicker, two CTAs, and a scroll cue. Visible
 * immediately on load, gone before the about statement.
 */
export default function HeroText() {
  const progress = useScrollStore((s) => s.progress)
  // `lifted`, not `ready`: ready fires ~700ms before the loader panel is gone
  // and the ignition flash is still painting over the hero.
  const lifted = useScrollStore((s) => s.lifted)
  const startAutoplay = useScrollStore((s) => s.startAutoplay)

  // Visible at rest, fades out as the shutter opens
  let opacity = 1
  if (progress > 0.05 && progress <= 0.11) {
    opacity = 1 - (progress - 0.05) / 0.06
  } else if (progress > 0.11) {
    opacity = 0
  }

  const interactive = opacity > 0.1 && lifted

  return (
    <>
      <h1 className="sr-only">
        {SITE.name} — performance garage in {SITE.city}, {SITE.region}
      </h1>

      {/* Legibility scrim behind the hero text */}
      <div className="hero-scrim" style={{ opacity }} aria-hidden="true" />

      <div
        className="hero-overlay"
        style={{
          opacity,
          visibility: opacity === 0 ? 'hidden' : 'visible',
        }}
      >
        <div className="hero-inner">
          {/* The name lives only in the loader until now, and the loader
              unmounts — so the payoff frame showed an 11px kicker and two
              buttons with no business name anywhere. */}
          <div className="hero-wordmark" aria-hidden="true">
            <p className="hero-name">{SITE.name.toUpperCase()}</p>
            <p className="hero-tagline">{SITE.tagline}</p>
          </div>

          <ScrambleText
            text={KICKER}
            play={lifted}
            duration={700}
            className="hero-kicker"
          />
          <motion.div
            className="hero-actions"
            initial="hidden"
            animate={lifted ? 'show' : 'hidden'}
            variants={{ show: { transition: { staggerChildren: 0.14, delayChildren: 0.15 } } }}
          >
            <motion.div variants={itemVariants} className="hero-action">
              <Magnet strength={0.25}>
                <StarBorder color="#fbbf24" duration={4.5}>
                  <a
                    className="btn btn-solid"
                    href={SITE.whatsappHref}
                    target={SITE.whatsappHref.startsWith('#') ? undefined : '_blank'}
                    rel={SITE.whatsappHref.startsWith('#') ? undefined : 'noopener noreferrer'}
                    tabIndex={interactive ? 0 : -1}
                  >
                    Book a Service
                  </a>
                </StarBorder>
              </Magnet>
            </motion.div>
            <motion.div variants={itemVariants} className="hero-action">
              <Magnet strength={0.25}>
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    // A guided run is motion the visitor did not ask for, so
                    // it is skipped under reduced motion — but the button is
                    // the main way into the site and must never be a no-op.
                    // Fall back to jumping straight to the first section.
                    if (prefersReducedMotion()) scrollToProgress(SECTIONS.services)
                    else startAutoplay()
                  }}
                  tabIndex={interactive ? 0 : -1}
                >
                  Explore the Garage
                </button>
              </Magnet>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Scroll cue — the whole mechanic (scroll scrubs the video) is
          unstated at rest, and the chevron was aria-hidden so assistive tech
          never heard it either. */}
      <div
        className="scroll-cue"
        style={{ opacity: progress < 0.04 ? 1 : 0 }}
        role="note"
        aria-label="Scroll to explore the garage"
      >
        <span className="scroll-cue-label" aria-hidden="true">
          Scroll
        </span>
        <svg className="bounce-arrow-svg" width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 5v14M5 12l7 7 7-7"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </>
  )
}
