import { motion } from 'framer-motion'
import { useScrollStore, scrollToProgress, SECTIONS } from '../../hooks/useScrollProgress'
import { SITE } from '../../config/site'
import ScrambleText from '../reactbits/ScrambleText'
import StarBorder from '../reactbits/StarBorder'
import Magnet from '../reactbits/Magnet'

const KICKER = `Performance Garage — ${SITE.city} · Est. ${SITE.established}`
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
  const ready = useScrollStore((s) => s.ready)

  // Visible at rest, fades out as the shutter opens
  let opacity = 1
  if (progress > 0.05 && progress <= 0.11) {
    opacity = 1 - (progress - 0.05) / 0.06
  } else if (progress > 0.11) {
    opacity = 0
  }

  const interactive = opacity > 0.1 && ready

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
          <ScrambleText
            text={KICKER}
            play={ready}
            duration={1100}
            className="hero-kicker"
          />
          <motion.div
            className="hero-actions"
            initial="hidden"
            animate={ready ? 'show' : 'hidden'}
            variants={{ show: { transition: { staggerChildren: 0.14, delayChildren: 0.7 } } }}
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
                  onClick={() => scrollToProgress(SECTIONS.services)}
                  tabIndex={interactive ? 0 : -1}
                >
                  Explore the Garage
                </button>
              </Magnet>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Scroll cue */}
      <div
        className="scroll-cue"
        style={{ opacity: progress < 0.04 ? 1 : 0 }}
        aria-hidden="true"
      >
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
