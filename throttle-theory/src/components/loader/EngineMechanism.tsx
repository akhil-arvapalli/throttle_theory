import { useImperativeHandle, useMemo, useRef } from 'react'
import type { Ref, RefObject } from 'react'
import './mechanism.css'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Slider-crank mechanism — the loader's centre stage.
 *
 * Ported verbatim from `D:/projects/ui/index.html` `#engine` (lines 48-408).
 * The SVG is already `viewBox`-scaled, so this component needs no resize
 * handling: it just declares a height in mechanism.css and lets the aspect
 * ratio follow.
 *
 * THREE RULES THAT MAKE THIS FILE WORK
 *
 * 1. Nothing animates through React state. There is no `setState` in this
 *    component and there must not be one. The integrator's single rAF owns
 *    `rpm` and `theta` and writes `setAttribute('transform', …)` straight onto
 *    the refs handed out by `useImperativeHandle`.
 *
 * 2. Every id and class is byte-identical to the source. `render()` in the
 *    original addressed elements by id (`el.crank = $('#crank')`) and the CSS
 *    keys its animations to classes. Renaming either silently disconnects the
 *    animation from the drawing.
 *
 * 3. The static subtrees below are hoisted to module scope. They never change,
 *    so keeping them out of the component body means React is handed the *same
 *    element object* on every render and bails out of reconciling them.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TRANSFORM CONVENTION — every ref and the exact string it expects
 *
 * The original writes `node.setAttribute('transform', v)`. `v` is always a
 * complete transform list, never a bare number: degrees, SVG user units,
 * explicit pivots. Reproduce these character-for-character.
 *
 *   crank            rotate(${deg} 210 228)
 *   pulley           rotate(${deg} 210 228)
 *   rod              translate(${pin.x} ${pin.y}) rotate(${rodDeg})
 *   piston           translate(210 ${py})
 *   rotor            rotate(${deg / 2 + ROTOR_BASE} 86 87)
 *   turbineWheel     rotate(${turbineAngle} 302 84)
 *   compressorWheel  rotate(${compressorAngle} 302 130)
 *   butterfly        rotate(${-8 + open * 74} 106 43)
 *   spark            translate(210 60) translate(-210 -60) scale(${s})
 *   puff             translate(${dx} ${dy}) translate(284 45) scale(${s}) translate(-284 -45)
 *   chamberGlow      opacity attribute only — no transform
 *   crownHeat        opacity attribute only — no transform
 *
 * Pivots: crank/pulley at the crank centre (210,228); rod origin IS the crank
 * pin, which is why the rod is authored along +x at exact length L and only
 * ever rotated; rotor about the distributor hub (86,87); turbine about its own
 * centre (302,84); compressor about (302,130); butterfly about its pivot
 * (106,43); spark and puff scale about their own art centre.
 *
 * `ROTOR_BASE`, `pinAt`, `pistonPinY` and the `GEO` table are NOT here — they
 * belong to `sliderCrank.ts` (porting note #1), which this file deliberately
 * does not duplicate.
 *
 * CSS CUSTOM PROPERTIES — written on `parts.root`, inherited by the drawing
 *
 *   --heat        0..1   rpm/redline. Drives the root drop-shadow.
 *   --rev         0..1   rpm/redline. Drives the intake chevron march rate.
 *   --load        0..1   boost^0.7. Drives `.exhaust-glow` and `.turbo-heat`.
 *   --belt-speed  0..n   drives the belt-tooth march rate.
 *
 * `#engine.stall` is toggled by the integrator with
 * `root.classList.toggle('stall', …)` — same call the original makes.
 */

/* ═══ exposed surface ═══════════════════════════════════════════════════ */

export interface EngineMechanismParts {
  /** Root `<svg id="engine">`. Where the four custom properties above go. */
  root: SVGSVGElement | null
  crank: SVGGElement | null
  rod: SVGGElement | null
  piston: SVGGElement | null
  pulley: SVGGElement | null
  rotor: SVGGElement | null
  spark: SVGGElement | null
  turbineWheel: SVGGElement | null
  compressorWheel: SVGGElement | null
  butterfly: SVGCircleElement | null
  chamberGlow: SVGEllipseElement | null
  crownHeat: SVGRectElement | null
  puff: SVGGElement | null
}

/**
 * HUD nodes the integrator drives from the same rAF tick. They are NOT inside
 * this component — the tach gauge in particular belongs to the React project's
 * own Gauge/Odometer corner cluster (porting note #6), and `Gauge` is a plain
 * function component with no imperative handle, so it cannot be reached from
 * here. The integrator passes its own refs in and gets them back on the handle
 * so the whole tick stays in one place. Every field is optional: `Gauge` will
 * simply never supply `tachNeedle`.
 */
export interface EngineMechanismHud {
  tachNeedle: SVGElement | null
  boostRead: HTMLElement | null
  statusText: HTMLElement | null
  bootLines: HTMLElement | null
  sparkBurst: HTMLElement | null
}

export type EngineMechanismHandle = EngineMechanismParts & EngineMechanismHud

/**
 * The matching *input* shape: caller-owned refs, passed in so the integrator's
 * one rAF can reach both the drawing and the HUD from the same handle. Each
 * field keeps its own element type, so `useRef<HTMLPreElement>(null)` is
 * accepted for `bootLines` without a cast.
 */
export interface EngineMechanismHudRefs {
  tachNeedle?: RefObject<SVGElement | null>
  boostRead?: RefObject<HTMLElement | null>
  statusText?: RefObject<HTMLElement | null>
  bootLines?: RefObject<HTMLElement | null>
  sparkBurst?: RefObject<HTMLElement | null>
}

interface Props {
  /** Extra classes on the root `<svg>`. Merged after the built-in id hook. */
  className?: string
  /** Caller-owned refs for the HUD nodes listed above. */
  hud?: EngineMechanismHudRefs
  ref?: Ref<EngineMechanismHandle>
}

/* ═══ static geometry — hoisted, never re-created ═════════════════════════ */

const DEFS = (
  <defs>
    <linearGradient id="gBlock" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#1e1e1e" />
      <stop offset="1" stopColor="#0e0e0e" />
    </linearGradient>
    <linearGradient id="gLiner" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stopColor="#0a0a0a" />
      <stop offset="0.16" stopColor="#242424" />
      <stop offset="0.5" stopColor="#161616" />
      <stop offset="0.84" stopColor="#242424" />
      <stop offset="1" stopColor="#0a0a0a" />
    </linearGradient>
    <linearGradient id="gPiston" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stopColor="#4a4a48" />
      <stop offset="0.22" stopColor="#b9b6ad" />
      <stop offset="0.5" stopColor="#8e8b83" />
      <stop offset="0.78" stopColor="#b9b6ad" />
      <stop offset="1" stopColor="#4a4a48" />
    </linearGradient>
    <linearGradient id="gRod" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stopColor="#6a6a68" />
      <stop offset="0.5" stopColor="#c9c6bd" />
      <stop offset="1" stopColor="#6a6a68" />
    </linearGradient>
    <linearGradient id="gHead" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#26262a" />
      <stop offset="1" stopColor="#121214" />
    </linearGradient>
    <linearGradient id="gHeat" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stopColor="#f59e0b" stopOpacity="0" />
      <stop offset="1" stopColor="#f59e0b" stopOpacity="0.9" />
    </linearGradient>
    <radialGradient id="gFlash" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stopColor="#fff6d8" stopOpacity="1" />
      <stop offset="0.35" stopColor="#f59e0b" stopOpacity="0.75" />
      <stop offset="1" stopColor="#f59e0b" stopOpacity="0" />
    </radialGradient>
    <radialGradient id="gGlow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stopColor="#ffd27a" stopOpacity="0.55" />
      <stop offset="1" stopColor="#f59e0b" stopOpacity="0" />
    </radialGradient>
    <linearGradient id="gPlug" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stopColor="#8d8a80" />
      <stop offset="0.4" stopColor="#f2efe6" />
      <stop offset="1" stopColor="#8d8a80" />
    </linearGradient>
    {/* gLamp deleted with the work lamps */}
    {/* turbine housing heats toward cherry as exhaust energy arrives */}
    <radialGradient id="gHeatSide" cx="0.42" cy="0.42" r="0.62">
      <stop offset="0" stopColor="#ff9d4d" stopOpacity="0.7" />
      <stop offset="0.55" stopColor="#c1502e" stopOpacity="0.45" />
      <stop offset="1" stopColor="#c1502e" stopOpacity="0" />
    </radialGradient>
    <filter id="fSoft" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="3" />
    </filter>
    <filter id="fBloom" x="-120%" y="-120%" width="340%" height="340%">
      <feGaussianBlur stdDeviation="5" result="b" />
      <feMerge>
        <feMergeNode in="b" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
)

/* engine block, cooling fins, crankcase + sump, liner, head, strut towers */
const BLOCK = (
  <>
    <rect x="146" y="24" width="128" height="278" rx="10" fill="url(#gBlock)" stroke="#3c3c42" />
    <rect x="146" y="24" width="128" height="2" fill="#f59e0b" opacity="0.4" />
    <g stroke="#33333a" strokeWidth="2">
      <line x1="136" y1="46" x2="146" y2="46" />
      <line x1="136" y1="62" x2="146" y2="62" />
      <line x1="136" y1="78" x2="146" y2="78" />
      <line x1="136" y1="94" x2="146" y2="94" />
      <line x1="136" y1="110" x2="146" y2="110" />
      <line x1="136" y1="126" x2="146" y2="126" />
      <line x1="136" y1="142" x2="146" y2="142" />
      <line x1="136" y1="158" x2="146" y2="158" />
      <line x1="274" y1="60" x2="284" y2="60" />
      <line x1="274" y1="76" x2="284" y2="76" />
      <line x1="274" y1="92" x2="284" y2="92" />
      <line x1="274" y1="108" x2="284" y2="108" />
      <line x1="274" y1="124" x2="284" y2="124" />
      <line x1="274" y1="140" x2="284" y2="140" />
      <line x1="274" y1="156" x2="284" y2="156" />
    </g>
    <rect x="160" y="196" width="100" height="96" rx="6" fill="#0d0d0f" stroke="#2e2e34" />
    <rect x="166" y="284" width="88" height="10" rx="3" fill="#1c1c1f" stroke="#33333a" />
    <path
      d="M172 186 L172 54 L248 54 L248 186"
      fill="url(#gLiner)"
      stroke="#3d3d44"
      strokeWidth="1"
    />
    <rect x="172" y="54" width="5" height="132" fill="#3a3a40" opacity="0.55" />
    <rect x="243" y="54" width="5" height="132" fill="#3a3a40" opacity="0.55" />
    <rect x="172" y="182" width="76" height="6" fill="#222228" stroke="#38383f" />
    <rect x="162" y="34" width="96" height="20" rx="3" fill="url(#gHead)" stroke="#46464e" />
    <rect x="256" y="40" width="22" height="11" rx="2" fill="#111" stroke="#3d3d44" />
    <g stroke="#3a3a42" fill="#141418">
      <rect x="150" y="4" width="21" height="34" rx="3" />
      <rect x="249" y="4" width="21" height="34" rx="3" />
      <circle cx="160.5" cy="34" r="7" fill="#232329" stroke="#4a4a52" />
      <circle cx="259.5" cy="34" r="7" fill="#232329" stroke="#4a4a52" />
    </g>
    <line x1="160.5" y1="34" x2="160.5" y2="60" stroke="#5a5a62" strokeWidth="3" />
    <line x1="259.5" y1="34" x2="259.5" y2="60" stroke="#5a5a62" strokeWidth="3" />
  </>
)

/**
 * Cold-air bellmouth. The mouth centreline stays at y=43 and the flare's lower
 * edge stops at y62→y50, because the distributor cap plate's top edge runs y62
 * at x74 to y71 at x97 — running the flare to y70 collides by 23×8 units.
 * The throat streaks reuse `.intake-chev` so there is exactly one airflow rate
 * in the file and it stays tied to `--rev`.
 */
const INTAKE_DEFS = (
  <>
    <linearGradient id="gIntake" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#0a0a0c" />
      <stop offset="0.3" stopColor="#2a2a2e" />
      <stop offset="0.5" stopColor="#16161a" />
      <stop offset="0.72" stopColor="#2a2a2e" />
      <stop offset="1" stopColor="#0a0a0c" />
    </linearGradient>
    <clipPath id="clipMouth">
      <ellipse cx="40" cy="43" rx="7" ry="27" />
    </clipPath>
  </>
)

const INTAKE_TRACT = (
  <>
    <path d="M40 16 L97 34 L97 50 L40 62 Z" fill="url(#gIntake)" stroke="#3d3d44" strokeWidth="1" />
    {/* throat interior, visible through the mouth */}
    <ellipse cx="40" cy="43" rx="7" ry="27" fill="#08080a" />
    {/* mesh guard across the mouth (min 1.6u: thinner dies at 240px) */}
    <g clipPath="url(#clipMouth)" stroke="#4e4e56" strokeWidth="1.6" fill="none">
      <line x1="33" y1="27" x2="47" y2="27" />
      <line x1="33" y1="35" x2="47" y2="35" />
      <line x1="33" y1="43" x2="47" y2="43" />
      <line x1="33" y1="51" x2="47" y2="51" />
      <line x1="33" y1="59" x2="47" y2="59" />
      <line x1="37" y1="16" x2="37" y2="70" />
      <line x1="43" y1="16" x2="43" y2="70" />
    </g>
    {/* rolled lip + throat streaks */}
    <ellipse cx="40" cy="43" rx="7" ry="27" fill="none" stroke="#5a5a62" strokeWidth="2" />
    <path
      d="M48 39 L94 41"
      stroke="#5a5a62"
      strokeWidth="7"
      fill="none"
      strokeDasharray="4 10"
      className="intake-chev"
    />
    <path
      d="M48 47 L94 45"
      stroke="#4a4a52"
      strokeWidth="5"
      fill="none"
      strokeDasharray="4 10"
      className="intake-chev"
    />
    {/* bolted heat-shield tab */}
    <rect x="48" y="4" width="24" height="9" rx="2" fill="#1c1c20" stroke="#3d3d44" />
    <line x1="58" y1="13" x2="58" y2="18" stroke="#5a5a62" strokeWidth="1.4" />
    {/* clamp band where the trumpet bolts to the throttle body */}
    <rect x="92" y="33" width="6" height="20" fill="#232329" stroke="#45454d" strokeWidth="1" />
    <circle cx="95" cy="37" r="1.4" fill="#6a6a72" />
    <circle cx="95" cy="49" r="1.4" fill="#6a6a72" />
  </>
)

const PLENUM = (
  <>
    {/* plenum */}
    <rect x="114" y="33" width="48" height="20" rx="10" fill="#1c1c21" stroke="#3d3d44" />
    {/* runners into the head */}
    <g stroke="#33333a" strokeWidth="5" fill="none" strokeLinecap="round">
      <path d="M158 38 C168 38 168 42 176 44" />
      <path d="M158 44 L176 47" />
      <path d="M158 50 C168 50 168 48 176 47" />
    </g>
  </>
)

/* exhaust manifold from the head down to the turbine inlet */
const TURBO_MANIFOLD = (
  <>
    <path
      d="M258 46 C276 46 278 62 288 70"
      stroke="#4a3a34"
      strokeWidth="9"
      fill="none"
      strokeLinecap="round"
    />
    <path
      d="M258 46 C276 46 278 62 288 70"
      stroke="#6b4a3c"
      strokeWidth="9"
      fill="none"
      strokeLinecap="round"
      className="exhaust-glow"
      opacity="0.5"
    />
  </>
)

/* centre housing between the two wheels */
const TURBO_CENTRE = (
  <rect x="288" y="106" width="28" height="10" rx="4" fill="#232323" stroke="#3f3f45" />
)

/* charge pipe back to the intake side */
const CHARGE_PIPE = (
  <path
    d="M284 130 C270 130 262 112 246 96"
    stroke="#2e2e35"
    strokeWidth="8"
    fill="none"
    strokeLinecap="round"
  />
)

/* downpipe: turbine outlet down to the converter inlet flange */
const DOWNPIPE = (
  <>
    <path d="M302 148 L302 172" stroke="#3a3a40" strokeWidth="10" strokeLinecap="butt" />
    <path
      d="M302 148 L302 172"
      stroke="#6b4a3c"
      strokeWidth="10"
      strokeLinecap="butt"
      className="exhaust-glow"
      opacity="0.5"
    />
  </>
)

/* catalytic converter / mid-pipe can + cat-back out through the bay edge */
const EXHAUST_CAN = (
  <g id="exhaust">
    <rect x="292" y="168" width="20" height="6" rx="1" fill="#2c2c32" stroke="#48484f" strokeWidth="1" />
    <path d="M302 174 L302 236" stroke="#1a1a1e" strokeWidth="22" strokeLinecap="butt" />
    <path d="M302 174 L302 236" stroke="#2e2e34" strokeWidth="14" strokeLinecap="butt" />
    <path
      d="M302 174 L302 236"
      stroke="#6b4a3c"
      strokeWidth="14"
      strokeLinecap="butt"
      className="exhaust-glow"
      opacity="0.5"
    />
    <g stroke="#45454d" strokeWidth="2">
      <line x1="291" y1="186" x2="313" y2="186" />
      <line x1="291" y1="199" x2="313" y2="199" />
      <line x1="291" y1="212" x2="313" y2="212" />
      <line x1="291" y1="225" x2="313" y2="225" />
    </g>
    <rect x="292" y="236" width="20" height="6" rx="1" fill="#2c2c32" stroke="#48484f" strokeWidth="1" />
    <path
      d="M302 242 L302 268 Q302 282 316 282 L334 282"
      stroke="#3a3a40"
      strokeWidth="10"
      strokeLinecap="butt"
      fill="none"
    />
    <path
      d="M302 242 L302 268 Q302 282 316 282 L334 282"
      stroke="#6b4a3c"
      strokeWidth="10"
      strokeLinecap="butt"
      className="exhaust-glow"
      opacity="0.5"
      fill="none"
    />
    <rect x="326" y="276" width="8" height="12" rx="1" fill="#22222a" stroke="#48484f" strokeWidth="1" />
  </g>
)

/* drive belt: tensioner idler + belt run, teeth march with the crank */
const BELT = (
  <g id="belt">
    <circle cx="152" cy="272" r="15" fill="#1c1c20" stroke="#3d3d44" strokeWidth="2" />
    <circle cx="152" cy="272" r="4" fill="#3a3a40" />
    <path
      id="beltPath"
      d="M210 284 L167 282 A15 15 0 0 1 148 258 L180 200 A56 56 0 0 1 236 176 L214 176"
      fill="none"
      stroke="#2a2a30"
      strokeWidth="6"
    />
    <path
      d="M210 284 L167 282 A15 15 0 0 1 148 258 L180 200 A56 56 0 0 1 236 176 L214 176"
      fill="none"
      stroke="#4a4a52"
      strokeWidth="6"
      strokeDasharray="3 9"
      className="belt-teeth"
    />
  </g>
)

/* flywheel / crank pulley (behind the web) */
const PULLEY = (
  <>
    <circle cx="210" cy="228" r="56" fill="#0d0d0d" stroke="#2b2b2b" strokeWidth="2" />
    <circle cx="210" cy="228" r="47" fill="none" stroke="#1d1d1d" strokeWidth="9" />
    <g className="pulley-ticks">
      <line x1="210" y1="181" x2="210" y2="190" stroke="#4a4a4a" strokeWidth="2" />
      <line x1="210" y1="266" x2="210" y2="275" stroke="#4a4a4a" strokeWidth="2" />
      <line x1="163" y1="228" x2="172" y2="228" stroke="#4a4a4a" strokeWidth="2" />
      <line x1="248" y1="228" x2="257" y2="228" stroke="#4a4a4a" strokeWidth="2" />
      <line x1="177" y1="195" x2="183" y2="201" stroke="#3a3a3a" strokeWidth="2" />
      <line x1="237" y1="255" x2="243" y2="261" stroke="#3a3a3a" strokeWidth="2" />
      <line x1="243" y1="195" x2="237" y2="201" stroke="#3a3a3a" strokeWidth="2" />
      <line x1="183" y1="255" x2="177" y2="261" stroke="#3a3a3a" strokeWidth="2" />
    </g>
    <circle cx="210" cy="181" r="3.2" fill="#f59e0b" filter="url(#fBloom)" />
  </>
)

/* crankshaft: counterweight + pin, all driven by one rotate() */
const CRANK = (
  <>
    <circle cx="210" cy="240" r="30" fill="#26262a" stroke="#3d3d42" />
    <rect x="196" y="220" width="28" height="26" fill="#26262a" />
    <circle cx="210" cy="240" r="7" fill="#131316" stroke="#45454b" />
    <circle cx="198" cy="230" r="2.4" fill="#0d0d0f" />
    <circle cx="222" cy="230" r="2.4" fill="#0d0d0f" />
    <circle cx="198" cy="252" r="2.4" fill="#0d0d0f" />
    <circle cx="222" cy="252" r="2.4" fill="#0d0d0f" />
    <rect x="204" y="196" width="12" height="18" fill="#3a3a40" />
    <circle id="crankPin" cx="210" cy="200" r="7" fill="#f59e0b" filter="url(#fBloom)" />
  </>
)

/* con-rod: drawn along +x at exact length L, then rotated onto the pin */
const ROD = (
  <>
    <path
      d="M0 -10 L96 -5.5 L96 5.5 L0 10 Z"
      fill="url(#gRod)"
      stroke="#6f6f6c"
      strokeWidth="1"
      strokeLinejoin="round"
    />
    <circle cx="0" cy="0" r="12" fill="#8e8b83" stroke="#5f5d57" strokeWidth="1.5" />
    <circle cx="0" cy="0" r="5" fill="#17171a" stroke="#4a4a4e" />
    <circle cx="96" cy="0" r="7.5" fill="#a9a69e" stroke="#5f5d57" strokeWidth="1.5" />
    <circle cx="96" cy="0" r="3" fill="#17171a" />
  </>
)

/* piston: local origin = wrist pin. Split in two because #crownHeat carries a
   ref and so has to live in the component body — it sits between them in the
   source, above the crown and below the skirt. */
const PISTON_SKIRT = (
  <>
    <rect x="-31" y="-34" width="62" height="46" rx="3" fill="url(#gPiston)" stroke="#6c6a64" />
    <g stroke="#4a4843" strokeWidth="2">
      <line x1="-30" y1="-27" x2="30" y2="-27" />
      <line x1="-30" y1="-21" x2="30" y2="-21" />
      <line x1="-30" y1="-15" x2="30" y2="-15" />
    </g>
    <rect x="-31" y="-34" width="62" height="8" fill="#d8d4c9" opacity="0.85" />
  </>
)

const PISTON_PIN = (
  <>
    <circle cx="0" cy="0" r="5.5" fill="#3b3b3f" stroke="#6a6a70" />
    <circle cx="0" cy="0" r="2" fill="#0e0e10" />
  </>
)

/* spark plug body + electrodes */
const PLUG = (
  <>
    <rect x="203" y="12" width="14" height="22" rx="2" fill="url(#gPlug)" stroke="#6f6d66" />
    <rect x="206" y="2" width="8" height="12" rx="2" fill="#c9922f" stroke="#8a6420" />
    <rect x="205" y="34" width="3" height="16" fill="#9aa0a6" />
    <rect x="212" y="34" width="3" height="16" fill="#9aa0a6" />
    <rect x="207.4" y="46" width="1.6" height="5" fill="#c9922f" />
    <rect x="211" y="46" width="1.6" height="5" fill="#c9922f" />
  </>
)

/* spark flash — `opacity` and `transform` are both written by render() */
const SPARK = (
  <>
    <circle cx="210" cy="60" r="16" fill="url(#gFlash)" filter="url(#fSoft)" />
    <path d="M210 52 L212.4 59 L210 68 L207.6 59 Z" fill="#fffbe8" />
    <path d="M202 60 L210 57 L218 60 L210 63 Z" fill="#fffbe8" opacity="0.9" />
    <line x1="210" y1="50" x2="210" y2="42" stroke="#fff3cf" strokeWidth="1.4" />
  </>
)

/* distributor cap + HT lead — rotor turns at half crank speed (4-cyl) */
const DISTRIBUTOR = (
  <>
    <path d="M86 78 C120 26 176 8 206 8" fill="none" stroke="#1e1e20" strokeWidth="3.5" />
    <path d="M150 62 L74 78 L150 96 Z" fill="#161618" stroke="#2f2f35" />
    <rect x="70" y="70" width="32" height="34" rx="4" fill="#151517" stroke="#3d3d44" />
    <circle cx="86" cy="87" r="15" fill="#1c1c1f" stroke="#3d3d44" strokeWidth="2" />
  </>
)

/* exhaust puff */
const PUFF = (
  <>
    <circle cx="284" cy="45" r="7" fill="#6b6b6b" filter="url(#fSoft)" />
    <circle cx="292" cy="42" r="5" fill="#5a5a5a" filter="url(#fSoft)" />
  </>
)

/* Construction lines from the original loader. This stays above the engine
   so the crank circle and piston reference marks cannot be painted over. */
const KINEMATICS_OVERLAY = (
  <svg id="ovlLayer" className="kinematics-overlay" viewBox="34 -6 300 322" aria-hidden="true">
    <circle cx="210" cy="228" r="28" fill="none" stroke="#fb7185" strokeWidth="1.8" strokeDasharray="5 4" opacity="0.95" />
    <line x1="210" y1="54" x2="210" y2="186" stroke="#a3e635" strokeWidth="1.8" strokeDasharray="7 5" opacity="0.85" />
    <line x1="150" y1="70" x2="270" y2="70" stroke="#a3e635" strokeWidth="1.8" strokeDasharray="7 5" opacity="0.85" />
    <line x1="150" y1="126" x2="270" y2="126" stroke="#a3e635" strokeWidth="1.8" strokeDasharray="7 5" opacity="0.85" />
    <line x1="210" y1="228" x2="210" y2="200" stroke="#a3e635" strokeWidth="1.8" opacity="0.85" />
    <text x="274" y="73" className="ovl">TDC</text>
    <text x="274" y="129" className="ovl">BDC</text>
  </svg>
)

/* ═══ component ══════════════════════════════════════════════════════════ */

/**
 * The mechanism, exposed as a bag of imperative refs. Drive it from one rAF
 * that owns `rpm` and `theta`; never through props or state.
 *
 * `className` is deliberately the only styling input. There is no `style`
 * prop on purpose: an inline style object that changes identity every render
 * would re-render the whole tree and React would rewrite the `opacity`
 * attributes that render() owns, snapping the spark and the chamber glow off
 * mid-flash. Size the SVG from CSS instead.
 */
export default function EngineMechanism({ className, hud, ref }: Props) {
  const root = useRef<SVGSVGElement | null>(null)
  const crank = useRef<SVGGElement | null>(null)
  const rod = useRef<SVGGElement | null>(null)
  const piston = useRef<SVGGElement | null>(null)
  const pulley = useRef<SVGGElement | null>(null)
  const rotor = useRef<SVGGElement | null>(null)
  const spark = useRef<SVGGElement | null>(null)
  const turbineWheel = useRef<SVGGElement | null>(null)
  const compressorWheel = useRef<SVGGElement | null>(null)
  const butterfly = useRef<SVGCircleElement | null>(null)
  const chamberGlow = useRef<SVGEllipseElement | null>(null)
  const crownHeat = useRef<SVGRectElement | null>(null)
  const puff = useRef<SVGGElement | null>(null)

  const { tachNeedle, boostRead, statusText, bootLines, sparkBurst } = hud ?? {}

  // Deps are the ref *objects*, which are stable, so the handle identity holds
  // still across renders and a rAF effect that captured it stays valid.
  useImperativeHandle(
    ref,
    () => ({
      root: root.current,
      crank: crank.current,
      rod: rod.current,
      piston: piston.current,
      pulley: pulley.current,
      rotor: rotor.current,
      spark: spark.current,
      turbineWheel: turbineWheel.current,
      compressorWheel: compressorWheel.current,
      butterfly: butterfly.current,
      chamberGlow: chamberGlow.current,
      crownHeat: crownHeat.current,
      puff: puff.current,
      tachNeedle: tachNeedle?.current ?? null,
      boostRead: boostRead?.current ?? null,
      statusText: statusText?.current ?? null,
      bootLines: bootLines?.current ?? null,
      sparkBurst: sparkBurst?.current ?? null,
    }),
    [tachNeedle, boostRead, statusText, bootLines, sparkBurst]
  )

  /* One element object for the whole tree, rebuilt only when the class list
     changes. React therefore reconciles nothing on an ordinary re-render, and
     the `opacity` attributes render() writes onto #spark / #chamberGlow /
     #crownHeat / #puff are never stamped back over by React. (React does not
     rewrite a prop whose VDOM value did not change, but relying on that is
     thinner than not reconciling at all.) */
  const engine = useMemo(
    () => (
      <svg
        ref={root}
        id="engine"
        className={className}
        viewBox="34 -6 300 322"
        aria-hidden="true"
      >
        {DEFS}
        {BLOCK}

        {/* ── INTAKE TRACT (left) ── cold-air bellmouth → throttle → plenum ── */}
        <g id="intake">
          {INTAKE_DEFS}
          {INTAKE_TRACT}
          {/* throttle body */}
          <rect x="98" y="35" width="16" height="16" rx="2" fill="#202025" stroke="#45454d" />
          <circle
            id="butterfly"
            ref={butterfly}
            cx="106"
            cy="43"
            r="6"
            fill="none"
            stroke="#6a6a72"
            strokeWidth="2"
          />
          {PLENUM}
        </g>

        {/* ── TURBOCHARGER (right) ── turbine driven by exhaust, compressor faster ── */}
        <g id="turbo">
          {TURBO_MANIFOLD}
          {/* turbine (hot side) */}
          <g id="turbineHousing">
            <circle cx="302" cy="84" r="23" fill="#1c1a1a" stroke="#4a4038" strokeWidth="2" />
            <circle cx="302" cy="84" r="23" fill="url(#gHeatSide)" className="turbo-heat" opacity="0" />
            <g id="turbineWheel" ref={turbineWheel}>
              <circle cx="302" cy="84" r="16.5" fill="#1a1a1a" stroke="#55555c" strokeWidth="1" />
              <g stroke="#e8e4d8" strokeWidth="2.6" strokeLinecap="round">
                <line x1="302" y1="70" x2="307" y2="85" />
                <line x1="302" y1="98" x2="297" y2="83" />
                <line x1="288" y1="84" x2="303" y2="79" />
                <line x1="316" y1="84" x2="301" y2="89" />
                <line x1="292" y1="74" x2="305" y2="88" />
                <line x1="312" y1="74" x2="299" y2="88" />
                <line x1="292" y1="94" x2="305" y2="80" />
                <line x1="312" y1="94" x2="299" y2="80" />
              </g>
              <circle cx="302" cy="84" r="3.6" fill="#c9c6bd" stroke="#4a4a4e" />
            </g>
          </g>
          {TURBO_CENTRE}
          {/* compressor (cold side, spins ~3.05x the turbine) */}
          <g id="compressorHousing">
            <circle cx="302" cy="130" r="18" fill="#1a1a1e" stroke="#3d3d44" strokeWidth="2" />
            <g id="compressorWheel" ref={compressorWheel}>
              <circle cx="302" cy="130" r="13" fill="#1c1c20" stroke="#4e4e56" strokeWidth="1" />
              <g stroke="#d8d4c9" strokeWidth="2.2" strokeLinecap="round">
                <line x1="302" y1="119" x2="306" y2="131" />
                <line x1="302" y1="141" x2="298" y2="129" />
                <line x1="291" y1="130" x2="303" y2="126" />
                <line x1="313" y1="130" x2="301" y2="134" />
                <line x1="294" y1="122" x2="305" y2="133" />
                <line x1="310" y1="122" x2="299" y2="133" />
                <line x1="294" y1="138" x2="305" y2="127" />
                <line x1="310" y1="138" x2="299" y2="127" />
                <line x1="302" y1="141" x2="306" y2="129" />
              </g>
              <circle cx="302" cy="130" r="2.8" fill="#4a4a4e" />
            </g>
            {CHARGE_PIPE}
          </g>
          {DOWNPIPE}
          {EXHAUST_CAN}
        </g>

        {BELT}

        {/* combustion chamber glow (behind the piston crown) */}
        <ellipse id="chamberGlow" ref={chamberGlow} cx="210" cy="66" rx="46" ry="20" fill="url(#gGlow)" opacity="0" />

        {/* flywheel / crank pulley (behind the web) */}
        <g id="pulley" ref={pulley}>
          {PULLEY}
        </g>

        {/* crankshaft: counterweight + pin, all driven by one rotate() */}
        <g id="crank" ref={crank}>
          {CRANK}
        </g>

        {/* con-rod: drawn along +x at exact length L, then rotated onto the pin */}
        <g id="rod" ref={rod}>
          {ROD}
        </g>

        {/* piston: local origin = wrist pin */}
        <g id="piston" ref={piston}>
          {PISTON_SKIRT}
          <rect
            id="crownHeat"
            ref={crownHeat}
            className="crown-heat"
            x="-31"
            y="-40"
            width="62"
            height="12"
            fill="url(#gHeat)"
            opacity="0"
          />
          {PISTON_PIN}
        </g>

        {/* spark plug + ignition */}
        {PLUG}
        <g id="spark" ref={spark} opacity="0">
          {SPARK}
        </g>

        {/* distributor: rotor turns at half crank speed (4-cyl) */}
        <g id="dist">
          {DISTRIBUTOR}
          <g id="rotor" ref={rotor}>
            <rect x="84.5" y="74" width="3" height="26" fill="#f59e0b" opacity="0.9" />
          </g>
          <circle cx="86" cy="87" r="4" fill="#0c0c0e" stroke="#4a4a52" />
        </g>

        {/* exhaust puff */}
        <g id="puff" ref={puff} opacity="0">
          {PUFF}
        </g>
      </svg>
    ),
    [className]
  )

  return (
    <>
      {engine}
      {KINEMATICS_OVERLAY}
    </>
  )
}
