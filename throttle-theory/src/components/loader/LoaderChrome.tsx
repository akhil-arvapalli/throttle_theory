import { useImperativeHandle, useRef } from 'react'
import type { ReactNode, Ref } from 'react'
import './loader-chrome.css'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Piston loader — the chrome around the mechanism.
 *
 * Ported verbatim from `D:/projects/ui/index.html` lines 30-555, minus the parts
 * that are not this port's business:
 *
 *   - `#engine` (lines 48-408)  → `EngineMechanism.tsx`, already ported. It
 *     arrives here as `children`, rendered inside `.camera` exactly where the
 *     source put it.
 *   - `#panel` / `#panelBtn`    → demo controls, development-only. Not shipped,
 *     so not ported.
 *   - `#loader` itself          → the shell. The integrator owns it and renders
 *     this fragment inside it.
 *
 * TWO RULES THAT MAKE THIS FILE WORK
 *
 * 1. Nothing here animates through React state. There is no `setState` in this
 *    component and there must not be one — the tach is driven imperatively from
 *    the integrator's single rAF, which writes `setAttribute('transform', …)`
 *    and `style.width` straight onto the refs handed out by
 *    `useImperativeHandle`.
 *
 * 2. Every id and class is byte-identical to the source, and the static
 *    subtrees below are hoisted to module scope. The source addressed these
 *    elements by id and the CSS keys its animations to classes; renaming either
 *    silently disconnects the art from its behaviour. Hoisting means React is
 *    handed the *same element object* on every render and bails out of
 *    reconciling them.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE TACH SVG — the one piece with real per-frame work
 *
 * Four refs, all written by the integrator:
 *
 *   tachNeedle   rotate(${deg} 100 104)      — pivot is the dial hub
 *   tachArc      stroke-dasharray            — the arc is pathLength="100", so
 *                                              the value is 0..100, not pixels
 *   tachPeak     cx, plus opacity             — the rev-limiter marker
 *   tachTicks    built once, on mount         — see below
 *
 * `tachTicks` is a `<g>` the integrator empties and refills once, at mount. Its
 * markup depends on the tick interval the integrator chooses, so it is not
 * guessed here — the source ships an empty `<g id="tachTicks"></g>` too.
 *
 * NOTE ON ATTRIBUTES THE INTEGRATOR OWNS. `tachArc` carries `pathLength="100"`
 * and `strokeDasharray="0 100"`, `tachNeedle` carries `transform="rotate(0 100
 * 104)"` and `tachPeak` carries `opacity="0"`. These are written once here and
 * never changed as props, so React never re-stamps them after mount and the
 * rAF owns those attributes outright from the first tick. They are kept as
 * markup rather than left off because an un-dashed arc would paint solid amber
 * for one frame before the first tick corrects it.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THE INTEGRATOR WRITES, AND HOW
 *
 *   rpmDigits     textContent  `${Math.round(rpm).toString().padStart(4, '0')}`
 *   firingRead    textContent  `firing ${hz.toFixed(1)} Hz`
 *   boostRead     textContent  `boost ${psi.toFixed(1)} psi`
 *   pctDigits     textContent  `${pct.toString().padStart(3, '0')}`
 *   frameRead     textContent  `${n} / ${total} frames · simulated`
 *   statusText    textContent  free text
 *   phaseTag      textContent  CRANKING / CATCH / IDLE / BLIP / HANDSHAKE
 *   barFill       style.width  `${pct}%`
 *   bootLines     textContent  — the integrator writes the whole log as one
 *                 string. It is rendered EMPTY here and never populated from
 *                 props: the log is driven by progress, and a prop would put it
 *                 back on the render path.
 *   srStatus      textContent  — see the note on the live region below
 *   dust          children     — the integrator injects `.mote` divs, each with
 *                 its own --dx/--dy and animation-duration
 *   gate          classList    `hidden` after the first audio-unlock gesture
 *
 * Everything else is set once, at mount, and never touched again.
 *
 * The three root-level state classes — `#stage.retreat`, `#gate.hidden` and the
 * integrator's own shell states — are toggled with `classList`, never with
 * `className` props, for the same reason.
 */

/* ═══ exposed surface ═══════════════════════════════════════════════════ */

export interface LoaderChromeParts {
  /** Root `<div id="stage">`. Perspective origin; `.retreat` is toggled here. */
  stage: HTMLDivElement | null
  /** `.camera` — where `--orbit` / `--tilt` / `--roll` / `--zoom` are written. */
  camera: HTMLDivElement | null
  /** `.dust` — the integrator appends `.mote` children here. */
  dust: HTMLDivElement | null
  /** `.phase-tag` — the phase caption under the stage. */
  phaseTag: HTMLParagraphElement | null
  /** The live region. Kept out of the animating subtree on purpose. */
  srStatus: HTMLParagraphElement | null
  /** Audio-unlock affordance. `aria-hidden`, so it needs a real click handler. */
  gate: HTMLDivElement | null

  /* tach, all driven from the integrator's single rAF */
  tachNeedle: SVGGElement | null
  tachArc: SVGPathElement | null
  tachPeak: SVGCircleElement | null
  /** Filled once at mount by the integrator; ships empty, as in the source. */
  tachTicks: SVGGElement | null

  /* readouts */
  rpmDigits: HTMLSpanElement | null
  firingRead: HTMLSpanElement | null
  boostRead: HTMLSpanElement | null
  pctDigits: HTMLSpanElement | null
  frameRead: HTMLSpanElement | null
  statusText: HTMLSpanElement | null
  /** `textContent`, wholesale, from the integrator. Rendered empty. */
  bootLines: HTMLPreElement | null
  /** `style.width = ${pct}%` */
  barFill: HTMLDivElement | null
}

export type LoaderChromeHandle = LoaderChromeParts

interface Props {
  /**
   * The slot inside `.camera`, where the source put `<svg id="engine">`. The
   * integrator passes the already-ported `<EngineMechanism />`.
   */
  children?: ReactNode
  ref?: Ref<LoaderChromeHandle>
}

/* ═══ static subtrees — hoisted, never re-created ═══════════════════════ */

const SR_STATUS_INITIAL = 'Loading, 0 percent. Simulated preview.'

const GRIDLINES = <div className="gridlines" aria-hidden="true" />

const BRAND = (
  <div className="brand">
    <span className="brand-mark">THROTTLE THEORY</span>
    <span className="brand-sub">performance garage · est. 2026</span>
  </div>
)

/* far plane — behind the engine, drifts against the orbit */
const HAZE = <div className="haze" aria-hidden="true" />

const VIGNETTE = <div className="vignette" aria-hidden="true" />
const SCANLINES = <div className="scanlines" aria-hidden="true" />

/* `<pre id="bootLines">` is deliberately NOT hoisted: it carries a ref, and a
   ref cannot live on a module-scope element. It is written by textContent from
   the integrator and rendered empty — a prop would put it back on the render
   path, which is the one thing this component must not have. */
const BOOTLOG_CAP = <span className="sim-cap">sim log — scripted</span>

/* the honesty marker. Must survive every breakpoint: `.frames` is detail and
   gets hidden on narrow screens, this must not. */
const SIM_TAG = <span className="sim-tag">SIMULATED</span>

/* dial face: track, redline, arc, peak marker, needle and hub. The needle group
   and the arc carry attributes the integrator owns — see the note above. */
const TACH_DIAL = (
  <>
    <path
      id="tachTrack"
      d="M22 104 A 78 78 0 0 1 178 104"
      fill="none"
      stroke="rgba(245,245,240,0.09)"
      strokeWidth="8"
      strokeLinecap="round"
    />
    <path
      d="M160.10 54.30 A 78 78 0 0 1 178 104"
      fill="none"
      stroke="#ef4444"
      strokeOpacity="0.75"
      strokeWidth="8"
      strokeLinecap="round"
    />
  </>
)

const TACH_HUB = (
  <circle cx="100" cy="104" r="7" fill="#141414" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
)

const SIM_CAP_CLUSTER = <span className="sim-cap">scripted curve — not sensed</span>

/* The fill carries a ref, so unlike the other static subtrees it cannot be
   hoisted — a hoisted node never gets one attached, which is how the progress
   bar shipped as a permanently empty track. */
const barEl = (ref: React.Ref<HTMLDivElement>) => (
  <div className="bar">
    <div className="bar-fill" id="barFill" ref={ref} />
  </div>
)

/* ═══ component ══════════════════════════════════════════════════════════ */

/**
 * The chrome, as a fragment for the integrator to drop inside its `#loader`
 * shell. `.gridlines`, `.vignette`, `.scanlines` and `#gate` are all
 * `position: absolute`, so they resolve against whatever the shell establishes —
 * that is the shell's job, not this component's.
 */
export default function LoaderChrome({ children, ref }: Props) {
  const stage = useRef<HTMLDivElement | null>(null)
  const camera = useRef<HTMLDivElement | null>(null)
  const dust = useRef<HTMLDivElement | null>(null)
  const phaseTag = useRef<HTMLParagraphElement | null>(null)
  const srStatus = useRef<HTMLParagraphElement | null>(null)
  const gate = useRef<HTMLDivElement | null>(null)

  const tachNeedle = useRef<SVGGElement | null>(null)
  const tachArc = useRef<SVGPathElement | null>(null)
  const tachPeak = useRef<SVGCircleElement | null>(null)
  const tachTicks = useRef<SVGGElement | null>(null)

  const rpmDigits = useRef<HTMLSpanElement | null>(null)
  const firingRead = useRef<HTMLSpanElement | null>(null)
  const boostRead = useRef<HTMLSpanElement | null>(null)
  const pctDigits = useRef<HTMLSpanElement | null>(null)
  const frameRead = useRef<HTMLSpanElement | null>(null)
  const statusText = useRef<HTMLSpanElement | null>(null)
  const bootLines = useRef<HTMLPreElement | null>(null)
  const barFill = useRef<HTMLDivElement | null>(null)

  // No deps: the refs are stable, so the handle identity holds still across
  // renders and a rAF effect that captured it stays valid.
  useImperativeHandle(ref, () => ({
    stage: stage.current,
    camera: camera.current,
    dust: dust.current,
    phaseTag: phaseTag.current,
    srStatus: srStatus.current,
    gate: gate.current,
    tachNeedle: tachNeedle.current,
    tachArc: tachArc.current,
    tachPeak: tachPeak.current,
    tachTicks: tachTicks.current,
    rpmDigits: rpmDigits.current,
    firingRead: firingRead.current,
    boostRead: boostRead.current,
    pctDigits: pctDigits.current,
    frameRead: frameRead.current,
    statusText: statusText.current,
    bootLines: bootLines.current,
    barFill: barFill.current,
  }))

  return (
    <>
      {/* The loader subtree is NOT a live region: role="status" implies
          aria-atomic, which would re-announce the whole screen on every frame. */}
      <p
        id="srStatus"
        ref={srStatus}
        className="sr-only"
        role="status"
        aria-live="polite"
      >
        {SR_STATUS_INITIAL}
      </p>

      {GRIDLINES}

      <div id="stage" ref={stage}>
        {BRAND}

        {/* camera rig: perspective lives on #stage, this plane carries the orbit */}
        <div className="camera" id="camera" ref={camera}>
          {HAZE}

          {/* the slider-crank assembly, ported separately */}
          {children}

          {/* foreground dust: nearest depth plane, catches the lamp light */}
          <div className="dust" id="dust" ref={dust} aria-hidden="true" />
        </div>

        <p className="phase-tag" id="phaseTag" ref={phaseTag}>
          CRANKING
        </p>
      </div>

      <div className="hud">
        {/* tach cluster */}
        <div className="cluster">
          <svg className="tach" viewBox="0 0 200 118" aria-hidden="true">
            {TACH_DIAL}
            {/* the integrator fills this once, at mount */}
            <g id="tachTicks" ref={tachTicks} />
            <path
              id="tachArc"
              ref={tachArc}
              d="M22 104 A 78 78 0 0 1 178 104"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="4"
              strokeLinecap="round"
              pathLength="100"
              strokeDasharray="0 100"
              style={{ filter: 'drop-shadow(0 0 5px rgba(245,158,11,0.65))' }}
            />
            <circle id="tachPeak" ref={tachPeak} cx="100" cy="104" r="3" fill="#fb7185" opacity="0" />
            <g id="tachNeedle" ref={tachNeedle} transform="rotate(0 100 104)">
              <g className="needle-idle">
                <line x1="100" y1="104" x2="38" y2="104" stroke="#f5f5f0" strokeWidth="3" strokeLinecap="round" />
                <circle
                  cx="38"
                  cy="104"
                  r="4"
                  fill="#f59e0b"
                  style={{ filter: 'drop-shadow(0 0 6px rgba(245,158,11,0.95))' }}
                />
              </g>
            </g>
            {TACH_HUB}
          </svg>
          <div className="cluster-read">
            <span className="odo" id="rpmDigits" ref={rpmDigits}>
              0000
            </span>
            <span className="odo-unit">RPM</span>
            <span className="odo-sub" id="firingRead" ref={firingRead}>
              firing 0.0 Hz
            </span>
            <span className="odo-sub" id="boostRead" ref={boostRead}>
              boost 0.0 psi
            </span>
            {SIM_CAP_CLUSTER}
          </div>
        </div>

        {/* boot log */}
        <div className="bootlog" aria-hidden="true">
          {BOOTLOG_CAP}
          <pre id="bootLines" ref={bootLines} />
        </div>

        {/* progress */}
        <div className="progress-block">
          {barEl(barFill)}
          <div className="progress-meta">
            <span className="odo" id="pctDigits" ref={pctDigits}>
              000
            </span>
            <span className="odo-unit">%</span>
            {SIM_TAG}
            <span className="status" id="statusText" ref={statusText}>
              Warming up the garage
            </span>
            <span className="frames" id="frameRead" ref={frameRead}>
              0 / 1202 frames · simulated
            </span>
          </div>
        </div>
      </div>

      {VIGNETTE}
      {SCANLINES}
      <div id="gate" ref={gate} aria-hidden="true">
        click to mute engine sound
      </div>
    </>
  )
}