import { useEffect, useMemo, useState } from 'react'
import { animate, motion, useMotionValue } from 'framer-motion'
import { useScrollStore } from '../hooks/useScrollProgress'
import { SITE } from '../config/site'
import Gauge from './reactbits/Gauge'
import Odometer from './reactbits/Odometer'

const MIN_DISPLAY_MS = 1600
const FADE_MS = 700
const PHRASES = [
  'Warming up the garage',
  'Rolling up the shutter',
  'Polishing the floor',
  'Filling the toolbox',
]
const SLATS = 8
const BOOT_LINES = [
  'ECU .......... ONLINE',
  'FUEL MAP ..... LOADED',
  'TURBO ........ SPOOLING',
  'TORQUE ....... STAGED',
  'HANDBRAKE .... DOWN',
]

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

type Phase = 'crank' | 'loading' | 'ignite'

/** Welding sparks flying off the needle when it slams the redline. */
function SparkBurst() {
  const sparks = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const angle = (i / 14) * Math.PI * 2 + Math.random() * 0.6
        const dist = 26 + Math.random() * 58
        return {
          dx: Math.cos(angle) * dist,
          dy: Math.sin(angle) * dist * 0.75,
          delay: Math.random() * 0.09,
          dur: 0.4 + Math.random() * 0.35,
          white: i % 4 === 0,
        }
      }),
    []
  )
  return (
    <div className="spark-burst" aria-hidden="true">
      {sparks.map((s, i) => (
        <motion.span
          key={i}
          className={s.white ? 'spark spark-white' : 'spark'}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1.3 }}
          animate={{
            x: s.dx,
            y: [s.dy * 0.35, s.dy * 0.35 + 44],
            opacity: [1, 1, 0],
            scale: [1.3, 1, 0.3],
          }}
          transition={{ duration: s.dur, delay: s.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}

/**
 * Ignition-sequence preloader with a full engine-start narrative:
 * crank (needle stutters, almost catches) → catch (drops to idle) →
 * loading (gauge tracks progress, needle idles alive) → ignition
 * (needle slams the redline, sparks fly, screen shakes, flash) → hero.
 */
export default function Loader() {
  const loaded = useScrollStore((s) => s.framesLoaded)
  const total = useScrollStore((s) => s.framesTotal)
  const framesReady = useScrollStore((s) => s.startReady)
  const [phase, setPhase] = useState<Phase>(() => (prefersReducedMotion() ? 'loading' : 'crank'))
  const [needleDisplay, setNeedleDisplay] = useState(0)
  const [shaking, setShaking] = useState(false)
  const [minPassed, setMinPassed] = useState(false)
  const [gone, setGone] = useState(false)
  const [phrase, setPhrase] = useState(0)
  const needle = useMotionValue(0)

  useEffect(() => needle.on('change', (v) => setNeedleDisplay(v)), [needle])

  // Crank: needle stutters like an engine almost catching, then settles to idle
  useEffect(() => {
    if (phase !== 'crank') return
    if (prefersReducedMotion()) {
      setPhase('loading')
      return
    }
    let alive = true
    const crank = animate(needle, [0, 0.55, 0.3, 0.7, 0.45, 0.85, 0.55, 1], {
      duration: 1.4,
      times: [0, 0.13, 0.25, 0.39, 0.52, 0.68, 0.84, 1],
      ease: 'linear',
      onComplete: () => {
        if (!alive) return
        animate(needle, 0.1, {
          duration: 0.3,
          ease: 'easeOut',
          onComplete: () => alive && setPhase('loading'),
        })
      },
    })
    return () => {
      alive = false
      crank.stop()
    }
  }, [phase, needle])

  useEffect(() => {
    const t = setTimeout(() => setMinPassed(true), MIN_DISPLAY_MS)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const id = setInterval(() => setPhrase((p) => (p + 1) % PHRASES.length), 950)
    return () => clearInterval(id)
  }, [])

  const pct = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0
  const done = framesReady && minPassed && phase === 'loading'

  // Ignition: slam the needle, sparks + shake + flash, arm the hero
  useEffect(() => {
    if (!done) return
    useScrollStore.getState().setReady(true)
    setPhase((p) => (p === 'ignite' ? p : 'ignite'))
  }, [done])

  useEffect(() => {
    if (phase !== 'ignite') return
    const reduced = prefersReducedMotion()
    if (!reduced) {
      // Two-step limiter: needle slams the redline and bounces off it
      animate(
        needle,
        [needle.get(), 1, 0.84, 1, 0.8, 1],
        { duration: 0.5, times: [0, 0.25, 0.45, 0.62, 0.8, 1], ease: 'easeOut' }
      )
      setShaking(true)
      const unshake = setTimeout(() => setShaking(false), 500)
      const t = setTimeout(() => setGone(true), FADE_MS)
      return () => {
        clearTimeout(unshake)
        clearTimeout(t)
      }
    }
    const t = setTimeout(() => setGone(true), 250)
    return () => clearTimeout(t)
  }, [phase, needle])

  if (gone) return null

  const gaugeLabel =
    phase === 'crank' ? 'CRANKING' : phase === 'ignite' ? 'IGNITION' : 'LOADING'
  const status =
    phase === 'crank' ? 'Cranking' : phase === 'ignite' ? 'Ignition' : PHRASES[phrase]
  const letters = SITE.name.toUpperCase().split('')

  return (
    <div
      className={`loader${done ? ' loader-done' : ''}${shaking ? ' shaking' : ''}${
        phase === 'crank' ? ' cranking' : ''
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="loader-gridlines" aria-hidden="true" />
      {phase === 'ignite' && !prefersReducedMotion() && <div className="ignite-flash" aria-hidden="true" />}

      <div className="loader-body">
        <div className="loader-gauge-anchor">
          <Gauge value={needleDisplay} size={210} label={gaugeLabel} className="loader-gauge" />
          {phase === 'ignite' && !prefersReducedMotion() && <SparkBurst />}
        </div>

        {/* Wordmark behind lifting shutter slats */}
        <div className="loader-shutter">
          <div className="loader-wordmark" aria-label={SITE.name}>
            {letters.map((ch, i) => (
              <motion.span
                key={i}
                className="loader-letter"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 + i * 0.04, duration: 0.4 }}
                aria-hidden="true"
              >
                {ch === ' ' ? ' ' : ch}
              </motion.span>
            ))}
          </div>
          <div className="loader-slats" aria-hidden="true">
            {Array.from({ length: SLATS }, (_, i) => (
              <span
                key={i}
                className={`loader-slat${pct > ((i + 1) / SLATS) * 100 ? ' slat-open' : ''}`}
                style={{ top: `${(i / SLATS) * 100}%`, height: `${100 / SLATS}%` }}
              />
            ))}
          </div>
        </div>

        <div className="loader-readout" aria-hidden="true">
          <Odometer value={pct} digits={3} className="loader-odo" />
          <span className="loader-odo-unit">%</span>
        </div>

        <div className="loader-bar" aria-hidden="true">
          <div className="loader-fill" style={{ width: `${pct}%` }} />
        </div>

        <p className="loader-status" key={status}>
          <span className="flicker-in">{status}</span>
        </p>
      </div>

      {/* ECU boot log — desktop only, anchored to the loader itself */}
      <div className="boot-log" aria-hidden="true">
        {BOOT_LINES.map((line, i) => (
          <p key={line} className="boot-line flicker-in" style={{ animationDelay: `${0.35 + i * 0.34}s` }}>
            {line}
          </p>
        ))}
      </div>
    </div>
  )
}
