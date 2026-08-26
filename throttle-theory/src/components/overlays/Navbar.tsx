import { useEffect, useRef, useState, type ReactElement } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useScrollStore, scrollToProgress, SECTIONS } from '../../hooks/useScrollProgress'
import { SITE } from '../../config/site'
import ScrambleText from '../reactbits/ScrambleText'
import Odometer from '../reactbits/Odometer'

interface NavLink {
  label: string
  progress: number
  activeFrom: number
  activeTo: number
  icon: ReactElement
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const PIP_COUNT = 36

const NAV_LINKS: NavLink[] = [
  {
    label: 'About',
    progress: SECTIONS.about,
    activeFrom: 0.12,
    activeTo: 0.21,
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" {...stroke}>
        <circle cx="8" cy="8" r="6.2" />
        <line x1="8" y1="7.2" x2="8" y2="11" />
        <circle cx="8" cy="4.9" r="0.4" fill="currentColor" />
      </svg>
    ),
  },
  {
    label: 'Services',
    progress: SECTIONS.services,
    activeFrom: 0.21,
    activeTo: 0.88,
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" {...stroke}>
        <rect x="2" y="2" width="5" height="5" rx="1" />
        <rect x="9" y="2" width="5" height="5" rx="1" />
        <rect x="2" y="9" width="5" height="5" rx="1" />
        <rect x="9" y="9" width="5" height="5" rx="1" />
      </svg>
    ),
  },
  {
    label: 'Contact',
    progress: SECTIONS.contact,
    activeFrom: 0.88,
    activeTo: 1.01,
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" {...stroke}>
        <path d="M2.5 3.5h11v7.5h-6.5L3.5 14v-3H2.5z" />
      </svg>
    ),
  },
]

/**
 * Instrument-strip navbar: scroll progress renders as an RPM bar that
 * redlines near the page end, links glow like dashboard telltales, the
 * waveform logo twitches like a live needle, and a monospace odometer
 * counts scroll percentage.
 */
export default function Navbar() {
  const progress = useScrollStore((s) => s.progress)
  const [menuOpen, setMenuOpen] = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)
  const [kicked, setKicked] = useState(false)
  const lastProgress = useRef(progress)
  const kickTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Needle "kick" when the user scrolls fast
  useEffect(() => {
    const unsub = useScrollStore.subscribe((s) => {
      const delta = Math.abs(s.progress - lastProgress.current)
      lastProgress.current = s.progress
      if (delta > 0.004) {
        setKicked(true)
        if (kickTimer.current) clearTimeout(kickTimer.current)
        kickTimer.current = setTimeout(() => setKicked(false), 380)
      }
    })
    return () => {
      unsub()
      if (kickTimer.current) clearTimeout(kickTimer.current)
    }
  }, [])

  const visible = progress > 0.12
  const pct = Math.round(progress * 100)

  const go = (p: number) => {
    setMenuOpen(false)
    scrollToProgress(p)
  }

  return (
    <>
      <nav
        className={`navbar${kicked ? ' navbar-kicked' : ''}`}
        style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none' }}
        aria-label="Main"
      >
        {/* Logo — live RPM needle twitch */}
        <button className="navbar-logo" onClick={() => go(SECTIONS.home)} aria-label="Back to start">
          <svg width="20" height="12" viewBox="0 0 20 12" fill="none" aria-hidden="true">
            <path
              d="M1 8h4l2-6 3 8 2-4 2 3 2-3h3"
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
          <span>{SITE.name.toUpperCase()}</span>
        </button>

        <div className="navbar-right hidden-mobile">
          {/* Odometer scroll readout */}
          <div className="nav-readout" aria-label={`Scroll position ${pct}%`}>
            <Odometer value={pct} digits={3} />
            <span className="nav-readout-unit">%</span>
          </div>

          {/* Telltale links */}
          <div className="navbar-links">
            {NAV_LINKS.map((link) => {
              const active = progress >= link.activeFrom && progress < link.activeTo
              return (
                <button
                  key={link.label}
                  className={`navbar-telltale${active ? ' telltale-on' : ''}`}
                  onClick={() => go(link.progress)}
                  onMouseEnter={() => setHovered(link.label)}
                  onMouseLeave={() => setHovered(null)}
                  aria-current={active ? 'true' : undefined}
                >
                  <span className="telltale-icon">{link.icon}</span>
                  <span className="telltale-label">
                    {hovered === link.label ? (
                      <ScrambleText text={link.label} play duration={380} />
                    ) : (
                      link.label
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Mobile: readout + burger */}
        <div className="navbar-mobile-right show-mobile">
          <div className="nav-readout" aria-label={`Scroll position ${pct}%`}>
            <Odometer value={pct} digits={3} />
            <span className="nav-readout-unit">%</span>
          </div>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="navbar-burger"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            <svg width="22" height="16" viewBox="0 0 22 16" fill="none" aria-hidden="true">
              {menuOpen ? (
                <>
                  <line x1="2" y1="2" x2="20" y2="14" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="20" y1="2" x2="2" y2="14" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                </>
              ) : (
                <>
                  <line x1="0" y1="2" x2="22" y2="2" stroke="white" strokeWidth="1.5" />
                  <line x1="0" y1="8" x2="22" y2="8" stroke="white" strokeWidth="1.5" />
                  <line x1="0" y1="14" x2="22" y2="14" stroke="white" strokeWidth="1.5" />
                </>
              )}
            </svg>
          </button>
        </div>

        {/* Shift-light strip — pips snap on, decay like phosphor, redline at the end */}
        <div className="nav-gauge" aria-hidden="true">
          {Array.from({ length: PIP_COUNT }, (_, i) => {
            const f = i / PIP_COUNT
            const lit = progress >= f
            const isRed = f >= 0.82
            return (
              <span
                key={i}
                className={`nav-pip${lit ? ' pip-lit' : ''}${isRed ? ' pip-red' : ''}`}
              />
            )
          })}
        </div>
      </nav>

      {/* Mobile: full-screen takeover menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="nav-takeover"
          >
            <button className="nav-takeover-close" onClick={() => setMenuOpen(false)} aria-label="Close menu">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                <line x1="3" y1="3" x2="19" y2="19" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="19" y1="3" x2="3" y2="19" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            <div className="nav-takeover-links">
              {NAV_LINKS.map((link, i) => (
                <motion.button
                  key={link.label}
                  initial={{ opacity: 0, y: 22 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.09, duration: 0.45, ease: 'easeOut' }}
                  className="nav-takeover-link"
                  onClick={() => go(link.progress)}
                >
                  <span className="telltale-icon">{link.icon}</span>
                  <ScrambleText text={link.label} play duration={650} className="nav-takeover-label" />
                </motion.button>
              ))}
              <motion.a
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + NAV_LINKS.length * 0.09, duration: 0.45, ease: 'easeOut' }}
                className="nav-takeover-link nav-takeover-cta"
                href={SITE.whatsappHref}
                target={SITE.whatsappHref.startsWith('#') ? undefined : '_blank'}
                rel={SITE.whatsappHref.startsWith('#') ? undefined : 'noopener noreferrer'}
              >
                <span className="telltale-icon">
                  <svg width="14" height="14" viewBox="0 0 16 16" {...stroke}>
                    <path d="M8 2v8M4.5 6.5 8 10l3.5-3.5M3 13.5h10" />
                  </svg>
                </span>
                <ScrambleText text="Book a Service" play duration={800} className="nav-takeover-label" />
              </motion.a>
            </div>
            <p className="nav-takeover-foot">{SITE.tagline}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
