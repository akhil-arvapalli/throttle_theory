import { useEffect, useRef, useState } from 'react'
import { useScrollStore } from '../hooks/useScrollProgress'
import { useSound } from '../hooks/useSound'
import { useEngineVoices } from '../hooks/useEngineVoices'
import { useEngineClip } from '../hooks/useEngineClip'
import LoaderChrome from './loader/LoaderChrome'
import type { LoaderChromeHandle } from './loader/LoaderChrome'
import EngineMechanism from './loader/EngineMechanism'
import type { EngineMechanismHandle } from './loader/EngineMechanism'
import {
  GEO,
  IDLE,
  REDLINE,
  PHASE_T,
  TAU_BY_PHASE,
  ROTOR_BASE,
  TAU,
  TOTAL_FRAMES,
  clamp,
  pinAt,
  pistonPinY,
  firingHz,
  needleFrac,
  rpmTarget,
  loadCurve,
  type Phase,
} from './loader/sliderCrank'

/**
 * Six seconds keeps the loader lively without making the visitor wait
 * (app.js:209). The narrative is SCRIPTED, not bound to the network: progress
 * runs on this window so the boot log unfurls, the blip lands and the handoff
 * plays even when the frames decoded a second ago. Binding it to real frame
 * counts instead makes the whole sequence collapse to whatever the connection
 * happened to do, which is not a thing a visitor can predict.
 */
const SIM_DUR = 6

/** Floor before the reveal may fire, independent of the scripted curve. */
const MIN_DISPLAY = 1.6

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** app.js:716 — the word under the stage. */
const PHASE_TAG: Record<Phase, string> = {
  crank: 'CRANKING',
  loading: 'CATCH',
  warm: 'IDLE',
  blip: 'BLIP',
  handoff: 'HANDSHAKE',
}

/** app.js:950 — the rotating phrase inside the progress block. */
const PHRASES = [
  'Warming up the garage',
  'Rolling up the shutter',
  'Polishing the floor',
  'Filling the toolbox',
]

/** app.js:57 — driven purely by progress, never wall-clock. */
const BOOT = [
  ['CRANK ........ ENGAGED', 0.0],
  ['ECU .......... ONLINE', 0.02],
  ['FUEL MAP ..... LOADED', 0.14],
  ['IGNITION ..... FIRING', 0.26],
  ['TURBO ........ SPOOLING', 0.4],
  ['TORQUE ....... STAGED', 0.55],
  ['HANDBRAKE .... DOWN', 0.72],
] as const

/** Dense minor ticks, stronger major divisions (app.js:161). */
function buildTicks(): string {
  let d = ''
  for (let i = 0; i <= 50; i++) {
    const major = i % 5 === 0
    const th = Math.PI - (i / 50) * Math.PI
    const r0 = major ? 62 : 68
    const r1 = 72
    d += `M ${(100 + r0 * Math.cos(th)).toFixed(2)} ${(104 - r0 * Math.sin(th)).toFixed(2)} ` +
      `L ${(100 + r1 * Math.cos(th)).toFixed(2)} ${(104 - r1 * Math.sin(th)).toFixed(2)}`
  }
  return d
}


/**
 * Foreground motes — deterministic scatter, CSS animates the drift
 * (app.js:991). Seeded LCG rather than Math.random so the field is identical on
 * every load; a loader whose dust reshuffles on each visit reads as noise.
 */
function seedDust(host: HTMLElement | null) {
  if (!host || host.childElementCount) return
  let seed = 20261004
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
  const frag = document.createDocumentFragment()
  for (let i = 0; i < 30; i++) {
    const m = document.createElement('i')
    m.className = 'mote'
    m.style.left = `${rnd() * 100}%`
    m.style.top = `${35 + rnd() * 65}%`
    m.style.setProperty('--dx', `${(rnd() - 0.5) * 220}px`)
    m.style.setProperty('--dy', `${-120 - rnd() * 220}px`)
    m.style.animationDuration = `${7 + rnd() * 11}s`
    m.style.animationDelay = `${-rnd() * 14}s`
    m.style.opacity = `${0.25 + rnd() * 0.6}`
    frag.appendChild(m)
  }
  host.appendChild(frag)
}

interface Anim {
  t: number
  phaseT: number
  rpm: number
  theta: number
  flash: number
  puffT: number
  turbine: number
  compressor: number
  boost: number
  shake: number
  peakRpm: number
  bovFired: boolean
  progress: number
  lastRpmText: number
  lastPctText: number
  lastFrameText: number
  lastSrPct: number
  lastPsi: string
  bootKey: string
  phraseIdx: number
  phaseAt: Phase | null
}

const newAnim = (): Anim => ({
  t: 0, phaseT: 0, rpm: 0, theta: 0, flash: 0, puffT: -1,
  turbine: 0, compressor: 0, boost: 0, shake: 0, peakRpm: 0, bovFired: false,
  progress: 0, lastRpmText: -1, lastPctText: -1, lastFrameText: -1,
  lastSrPct: -1, lastPsi: '', bootKey: '', phraseIdx: -1, phaseAt: null,
})

/**
 * The loader shell. Markup and CSS come from LoaderChrome — a verbatim port of
 * the original `#stage` + `.hud` structure — and every moving part is driven
 * from ONE rpm scalar by ONE rAF below:
 *
 *     rpm  ──▶ first-order lag onto the phase target
 *     rpm  ──▶ theta = ∫ (rpm/60)·2π dt
 *     theta ─▶ crank, pulley, rod, piston, distributor rotor, firing rate
 *
 * So the needle, the piston and the sound cannot disagree — two independent
 * animations would drift apart within seconds.
 */
export default function EngineLoader() {
  const framesReady = useScrollStore((s) => s.startReady)
  // The honest third state: every required initial frame settled and at least
  // one FAILED. Without it a broken frame directory would hang the loader
  // forever, and without gating on it the loader would reveal over a canvas
  // with nothing decoded in it.
  const framesFailed = useScrollStore((s) => s.startFailed)

  const [phase, setPhase] = useState<Phase>('crank')
  const { enabled, toggle, unlock, ctxRef, masterRef } = useSound()
  // The live phase, not a literal: passing 'crank' pinned the starter motor's
  // gain open for the whole sequence and left the rev voice on its idle branch,
  // so the blip never sounded and the starter never stopped.
  const updateVoices = useEngineVoices({ phase, enabled, ctxRef, masterRef })
  const { gateVisible, toggle: toggleClip, updateClip, syncRev } = useEngineClip({
    ctxRef,
    masterRef,
    enabled,
  })

  const chromeRef = useRef<LoaderChromeHandle>(null)
  const mechRef = useRef<EngineMechanismHandle>(null)
  const shellRef = useRef<HTMLDivElement>(null)
  const ticksRef = useRef<string>('')

  const [gone, setGone] = useState(false)
  const [fading, setFading] = useState(false)

  const animRef = useRef<Anim>(newAnim())
  const phaseRef = useRef<Phase>('crank')
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const setPhaseBoth = (p: Phase) => {
    phaseRef.current = p
    setPhase(p)
    animRef.current.phaseT = 0
    const tag = chromeRef.current?.phaseTag
    if (tag) tag.textContent = PHASE_TAG[p]
  }

  /* The site's SoundToggle sits at z-index 30 behind an opaque z-index 100
     loader, so during the intro the visitor has no way to ask for sound. Seed
     it on when no preference has been stored — the gate is the affordance, and
     the context starts suspended until a gesture resumes it either way. */
  useEffect(() => {
    unlock()
  }, [unlock])

  /* Lock the page: the 420vh spacer under `overflow-y: scroll` is live during
     load, so a stray wheel would scrub the video before it is revealed.
     Restoring the scroll position lives in ScrollTracker — a lock does not
     stop programmatic scrolling. */
  useEffect(() => {
    document.documentElement.classList.add('is-loading')
    window.scrollTo(0, 0)
    seedDust(chromeRef.current?.dust ?? null)
    return () => document.documentElement.classList.remove('is-loading')
  }, [])

  /* Gate: first gesture anywhere on the loader surface unmutes (app.js:1253). */
  useEffect(() => {
    if (!gateVisible) return
    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement)?.closest('#gate')) return
      toggleClip()
    }
    const shell = shellRef.current
    shell?.addEventListener('pointerdown', onDown)
    return () => shell?.removeEventListener('pointerdown', onDown)
  }, [gateVisible, toggleClip])

  /* The gate is the source's own `#gate` node, not a second control: it is
     also the tap target, and it hides only once the context is genuinely
     running unmuted — so it cannot claim a success that did not happen. */
  useEffect(() => {
    const gate = chromeRef.current?.gate
    if (!gate) return
    const sync = () => {
      gate.textContent = gateVisible
        ? 'tap anywhere for engine sound'
        : 'tap anywhere to mute'
      gate.classList.toggle('hidden', !gateVisible)
    }
    sync()
    gate.addEventListener('click', onGateClick)
    return () => gate.removeEventListener('click', onGateClick)
    function onGateClick() {
      /* Do NOT fall back to `toggle()` when the resume has not landed. It
         reads ctx.state synchronously, so on a gesture it is still
         'suspended', the fallback flips useSound off, and useSound's cleanup
         CLOSES the context — killing the resume that was in flight and
         spawning a replacement. `reconcile` on statechange is the correct
         observer; the gate self-corrects when the resume actually lands. */
      toggleClip()
    }
  }, [gateVisible, toggleClip, toggle])

  const finish = () => {
    setFading(true)
    fadeTimer.current = setTimeout(() => {
      document.documentElement.classList.remove('is-loading')
      useScrollStore.getState().setLifted(true)
      setGone(true)
    }, 600)
  }

  /* ── the single integrator ────────────────────────────────────────── */
  useEffect(() => {
    if (gone) return
    let raf = 0
    /* Seeded from the clock, NOT from 0. This effect re-runs on every phase
       change and on the framesReady flip, and `prev` is re-initialised with
       it — so a `0` seed made the first frame after each re-run compute
       dt = min(0.05, now/1000) = 0.05, i.e. a phantom 50ms step injected
       into A.t, A.phaseT and A.theta. On a cold cache the re-runs bunch up
       (framesReady lands late, phases still advance on their timers), so the
       crank accumulated phantom time faster than real time and the piston
       lurched — the "messed up animation on a new device". Seeding from the
       same timebase as the rAF timestamp makes the first frame an ordinary
       ~16ms one, so a re-run costs nothing. */
    let prev = performance.now()
    const A = animRef.current
    const isReduced = prefersReducedMotion()

    if (!ticksRef.current) {
      ticksRef.current = buildTicks()
      const g = chromeRef.current?.tachTicks
      if (g) {
        const p = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        p.setAttribute('d', ticksRef.current)
        p.setAttribute('stroke', 'rgba(245,245,240,0.28)')
        p.setAttribute('stroke-width', '1')
        p.setAttribute('fill', 'none')
        g.appendChild(p)
      }
    }

    const step = (now: number) => {
      raf = requestAnimationFrame(step)
      const dt = Math.min(0.05, (now - prev) / 1000 || 0)
      prev = now
      A.t += dt
      A.phaseT += dt

      /* rpm — first-order lag onto the phase target, frame-rate independent */
      if (!isReduced) {
        const p = phaseRef.current
        const target = rpmTarget(p, clamp(A.phaseT / (PHASE_T[p] ?? 1), 0, 1), A.t)
        const tau = TAU_BY_PHASE[p] ?? 0.2
        A.rpm += (target - A.rpm) * (1 - Math.exp(-dt / tau))

        /* theta — one integrator for crank, piston, rotor and audio */
        const prevRev = Math.floor(A.theta / TAU)
        const prevHalf = Math.floor((A.theta + Math.PI) / TAU)
        A.theta += ((A.rpm / 60) * TAU) * dt
        if (Math.floor(A.theta / TAU) !== prevRev) A.flash = 1
        if (Math.floor((A.theta + Math.PI) / TAU) !== prevHalf && A.puffT < 0) A.puffT = 0
        A.flash *= Math.exp(-dt / 0.055)
      } else {
        A.rpm = IDLE
      }

      /* scripted progress — the six-second window */
      if (phaseRef.current !== 'handoff') {
        A.progress = Math.max(A.progress, loadCurve(A.t / SIM_DUR))
      }

      /* phase machine (app.js:765-787) */
      const p = phaseRef.current
      /* Scripted timing AND genuine frame readiness. The source had no real
         frames — its progress was the simulated curve — so it needed only
         the first term. Here the video is real, so revealing over an
         undecoded canvas would hand the visitor a black scroll. */
      const ready = A.progress >= 1 && A.t >= MIN_DISPLAY && (framesReady || framesFailed)
      if (A.phaseAt !== p) {
        A.phaseAt = p
        const shell = shellRef.current
        if (p === 'loading' && shell) {
          A.shake = 1
          shell.classList.add('shudder')
          setTimeout(() => shell.classList.remove('shudder'), 300)
        }
        if (p === 'blip' && shell) {
          A.shake = 0.85
          syncRev()
          // Restart the one-shot flash: reading offsetWidth forces a reflow,
          // without which re-adding the class is a no-op.
          shell.classList.remove('blast')
          void shell.offsetWidth
          shell.classList.add('blast')
        }
        if (p === 'handoff') chromeRef.current?.stage?.classList.add('retreat')
      }
      if (p === 'crank' && A.phaseT >= (PHASE_T.crank ?? 1)) setPhaseBoth('loading')
      else if (p === 'loading' && A.phaseT >= (PHASE_T.loading ?? 1)) setPhaseBoth('warm')
      else if (p === 'warm' && ready) setPhaseBoth(isReduced ? 'handoff' : 'blip')
      else if (p === 'blip') {
        if (!A.bovFired && A.phaseT >= (PHASE_T.blip ?? 1) * 0.6) A.bovFired = true
        if (A.phaseT >= (PHASE_T.blip ?? 1)) setPhaseBoth('handoff')
      } else if (p === 'handoff' && A.phaseT >= (PHASE_T.handoff ?? 1)) finish()

      /* audio rides the same scalar as the drawing */
      updateVoices(A.rpm)
      updateClip(A.rpm, dt, p)

      paint(A, dt, isReduced)
    }

    const paint = (A: Anim, dt: number, isReduced: boolean) => {
      const m = mechRef.current
      const h = chromeRef.current
      if (!m || !h) return

      const th = A.theta
      const deg = (th * 180) / Math.PI
      const norm = clamp(A.rpm / REDLINE, 0, 1)

      /* ── mechanism ── */
      if (!isReduced) {
        const pin = pinAt(th)
        const py = pistonPinY(th)
        const rodDeg = (Math.atan2(py - pin.y, GEO.CX - pin.x) * 180) / Math.PI
        m.crank?.setAttribute('transform', `rotate(${deg.toFixed(2)} ${GEO.CX} ${GEO.CY})`)
        m.pulley?.setAttribute('transform', `rotate(${deg.toFixed(2)} ${GEO.CX} ${GEO.CY})`)
        m.rod?.setAttribute('transform', `translate(${pin.x.toFixed(2)} ${pin.y.toFixed(2)}) rotate(${rodDeg.toFixed(2)})`)
        m.piston?.setAttribute('transform', `translate(${GEO.CX} ${py.toFixed(2)})`)
        m.rotor?.setAttribute('transform', `rotate(${(deg / 2 + ROTOR_BASE).toFixed(2)} 86 87)`)

        const f = A.flash
        m.spark?.setAttribute('opacity', f.toFixed(3))
        m.spark?.setAttribute('transform', `translate(${GEO.CX} 60) scale(${(0.55 + f * 0.75).toFixed(3)}) translate(${-GEO.CX} -60)`)
        m.chamberGlow?.setAttribute('opacity', (f * 0.8 + norm * 0.05).toFixed(3))
        m.crownHeat?.setAttribute('opacity', (0.06 + norm * 0.5).toFixed(3))
        m.root?.classList.toggle('stall', phaseRef.current === 'crank' && A.rpm > 8)

        if (A.puffT >= 0) {
          A.puffT += dt
          const k = Math.min(1, A.puffT / 0.55)
          m.puff?.setAttribute('opacity', ((1 - k) * 0.42).toFixed(3))
          m.puff?.setAttribute('transform', `translate(${(k * 48).toFixed(1)} ${(-k * 18 - k * k * 12).toFixed(1)}) translate(284 45) scale(${(1 + k * 1.6).toFixed(3)}) translate(-284 -45)`)
          if (k >= 1) A.puffT = -1
        }

        /* turbo — turbine off exhaust energy, compressor off the shaft, so the
           3.05:1 ratio is directly visible. Heat follows LOAD, not speed. */
        A.boost += (clamp(norm * 2.0, 0, 1) - A.boost) * (1 - Math.exp(-dt / 0.13))
        A.turbine += (6 + A.boost * 210) * dt
        A.compressor += (6 + A.boost * 210) * 3.05 * dt
        m.turbineWheel?.setAttribute('transform', `rotate(${(A.turbine % 360).toFixed(2)} 302 84)`)
        m.compressorWheel?.setAttribute('transform', `rotate(${(A.compressor % 360).toFixed(2)} 302 130)`)
        m.butterfly?.setAttribute('transform', `rotate(${(-8 + clamp(A.rpm / 4200, 0, 1) * 74).toFixed(1)} 106 43)`)
      } else {
        const pin = pinAt(0)
        const py = pistonPinY(0)
        const rodDeg = (Math.atan2(py - pin.y, GEO.CX - pin.x) * 180) / Math.PI
        m.crank?.setAttribute('transform', `rotate(0 ${GEO.CX} ${GEO.CY})`)
        m.pulley?.setAttribute('transform', `rotate(0 ${GEO.CX} ${GEO.CY})`)
        m.rod?.setAttribute('transform', `translate(${pin.x.toFixed(2)} ${pin.y.toFixed(2)}) rotate(${rodDeg.toFixed(2)})`)
        m.piston?.setAttribute('transform', `translate(${GEO.CX} ${py.toFixed(2)})`)
        m.rotor?.setAttribute('transform', `rotate(${ROTOR_BASE} 86 87)`)
        m.spark?.setAttribute('opacity', '0')
        m.chamberGlow?.setAttribute('opacity', '0')
        m.crownHeat?.setAttribute('opacity', '0.1')
        m.root?.classList.remove('stall')
      }

      /* ── camera: a stationary engine that trembles (app.js:973) ──
         The amplitude rides rpm, so a stationary idle is nearly still and the
         blip visibly shakes the block. Three incommensurate frequencies so it
         never visibly loops. Rotation stays at zero — nothing tilts. */
      if (!isReduced && h.camera) {
        const tremble = 0.16 + clamp(A.rpm / IDLE, 0, 3) * 0.5
        const t = A.t
        const vx = (Math.sin(t * 41) + Math.sin(t * 57) * 0.7 + Math.sin(t * 83) * 0.4) * tremble
        const vy = (Math.cos(t * 47) + Math.sin(t * 61) * 0.6) * tremble * 0.7
        A.shake *= Math.exp(-dt / 0.14)
        const s = A.shake
        const jx = s ? (Math.sin(t * 91) + Math.sin(t * 57)) * 5.5 * s : 0
        const jy = s ? (Math.cos(t * 83) + Math.sin(t * 61)) * 5.5 * s : 0
        h.camera.style.setProperty('--orbit', '0deg')
        h.camera.style.setProperty('--tilt', '0deg')
        h.camera.style.setProperty('--roll', '0deg')
        h.camera.style.setProperty('--zoom', (1 + (vx + jx) * 0.0012).toFixed(4))
        h.camera.style.setProperty('--shiftX', `${(vx + jx).toFixed(2)}px`)
        h.camera.style.setProperty('--shiftY', `${(vy + jy).toFixed(2)}px`)
      }

      /* These must land on `#engine` ITSELF. mechanism.css declares
         --heat/--rev/--load/--belt-speed on that element, and a custom
         property declared on an element always beats an inherited one — so
         writing them to an ancestor is silently discarded, which freezes the
         bloom, the belt teeth, the intake chevrons and the exhaust glow at
         their default values. */
      const root = m.root
      if (root) {
        root.style.setProperty('--heat', (norm * 1.15).toFixed(3))
        root.style.setProperty('--rev', clamp(A.rpm / IDLE, 0.02, 6).toFixed(3))
        root.style.setProperty('--load', Math.pow(A.boost, 0.7).toFixed(3))
        root.style.setProperty('--belt-speed', clamp(A.rpm / IDLE, 0.25, 6).toFixed(3))
      }

      /* ── tach ── */
      const v = needleFrac(A.rpm)
      A.peakRpm = Math.max(A.rpm, A.peakRpm - dt * 1100)
      h.tachNeedle?.setAttribute('transform', `rotate(${(v * 180).toFixed(2)} 100 104)`)
      h.tachArc?.setAttribute('stroke-dasharray', `${(v * 100).toFixed(2)} 100`)
      h.tachArc?.setAttribute('stroke', phaseRef.current === 'blip' ? '#fb7185' : '#f59e0b')
      const peak = needleFrac(A.peakRpm)
      const pk = Math.PI - peak * Math.PI
      h.tachPeak?.setAttribute('cx', (100 + 78 * Math.cos(pk)).toFixed(2))
      h.tachPeak?.setAttribute('cy', (104 - 78 * Math.sin(pk)).toFixed(2))
      h.tachPeak?.setAttribute('opacity', A.peakRpm > IDLE + 20 ? '0.95' : '0')

      /* ── cluster readouts: RPM, not a percentage ── */
      const rpmText = Math.round(A.rpm / 10) * 10
      if (rpmText !== A.lastRpmText) {
        A.lastRpmText = rpmText
        if (h.rpmDigits) h.rpmDigits.textContent = String(Math.round(A.rpm)).padStart(4, '0')
        if (h.firingRead) h.firingRead.textContent = `firing ${firingHz(A.rpm).toFixed(1)} Hz`
      }
      const psi = (A.boost * 18).toFixed(1)
      if (psi !== A.lastPsi) {
        A.lastPsi = psi
        if (h.boostRead) h.boostRead.textContent = `boost ${psi} psi`
      }

      /* ── progress ── */
      const frames = Math.round(A.progress * TOTAL_FRAMES)
      const pct = frames >= TOTAL_FRAMES ? 100 : Math.floor((frames / TOTAL_FRAMES) * 100)
      if (h.barFill) h.barFill.style.width = `${((frames / TOTAL_FRAMES) * 100).toFixed(2)}%`
      if (pct !== A.lastPctText || frames !== A.lastFrameText) {
        A.lastPctText = pct
        A.lastFrameText = frames
        if (h.pctDigits) h.pctDigits.textContent = String(pct).padStart(3, '0')
        if (h.frameRead) h.frameRead.textContent = `${frames} / ${TOTAL_FRAMES} frames · simulated`
      }

      /* live region — once per whole percent, never per frame. `role="status"`
         implies aria-atomic, so anything inside the animating subtree would be
         re-announced continuously. */
      if (pct !== A.lastSrPct) {
        A.lastSrPct = pct
        if (h.srStatus) {
          h.srStatus.textContent =
            pct >= 100 ? 'Loading complete. Simulated preview.' : `Loading, ${pct} percent. Simulated preview.`
        }
      }

      /* boot log — driven purely by progress, so it can never claim a stage the
         load has not reached */
      const count = BOOT.filter(([, at]) => A.progress >= at).length
      const bootKey = `${count}:${phaseRef.current === 'crank' || phaseRef.current === 'loading' ? 0 : 1}`
      if (bootKey !== A.bootKey) {
        A.bootKey = bootKey
        if (h.bootLines) {
          h.bootLines.textContent = BOOT.slice(0, count).map(([line]) => line).join('\n')
        }
      }

      if (phaseRef.current === 'warm' || phaseRef.current === 'blip') {
        const idx = Math.floor(A.t / 0.95) % PHRASES.length
        if (idx !== A.phraseIdx) {
          A.phraseIdx = idx
          if (h.statusText) h.statusText.textContent = PHRASES[idx]
        }
      }
    }

    raf = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(raf)
      if (fadeTimer.current) clearTimeout(fadeTimer.current)
    }
  }, [gone, framesReady, framesFailed, phase, updateClip, syncRev, updateVoices])

  if (gone) return null

  /* NO role="status" on this node. It implies aria-atomic, so every per-frame
     rewrite inside it — rpmDigits, bootLines, the status phrase — would be
     re-announced continuously. The loading announcement lives in the dedicated
     #srStatus node rendered by LoaderChrome instead. */
  return (
    <div id="loader" ref={shellRef} className={`loader${fading ? ' lifting' : ''}`} aria-busy={!gone}>
      <LoaderChrome ref={chromeRef}>
        <EngineMechanism ref={mechRef} className="loader-engine" />
      </LoaderChrome>
    </div>
  )
}