/* ═══════════════════════════════════════════════════════════
   Piston loader — slider-crank kinematics and the scripted
   rpm curve that drives it
   ───────────────────────────────────────────────────────────
   The mechanism is a real slider-crank, not a hand-waved loop:

     pistonY(θ) = r·cos θ + √(L² − r²sin²θ)
     crankPin(θ) = (cx + r·sin θ, cy − r·cos θ)

   Because the con-rod length L is constant, the rod can be drawn
   once along +x and only rotated onto the pin each frame.

   One `rpm` scalar is the single source of truth. It drives the
   needle, the crank rate, the distributor rotor (half speed, as a
   4-cylinder distributor does), the piston speed and the audio
   firing throb — so nothing can drift out of sync with anything
   else.

   Ported from the standalone preview's app.js (lines 19–116 and
   rpmTarget from 743–752). Pure: no DOM, no React, no side effects
   at import. The integrator that owns `rpm` and `theta` and writes
   them onto the SVG lives in the caller; progress here is the
   preview's simulated decode curve, and in the React port the real
   progress comes from the scroll store instead.
   ═══════════════════════════════════════════════════════════ */

export const TAU = Math.PI * 2
export const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v)

/* ── geometry (SVG user units, matches the ported index.html) ───── */
export const GEO = {
  R: 28, // crank radius — 56 stroke
  L: 96, // con-rod length
  CX: 210, // crank centre
  CY: 228,
} as const

export const REDLINE = 7000 // tach scale, 0–1 maps to this
export const IDLE = 800 // idle rpm → needle 0.114
export const CYL = 4 // 4-cylinder 4-stroke
export const MIN_DISPLAY = 1.6 // seconds the loader is held regardless

/** Phase machine: crank → loading → warm → blip → handoff. */
export type Phase = 'crank' | 'loading' | 'warm' | 'blip' | 'handoff'

/**
 * Per-phase dwell in seconds, for every phase that ends on a timer.
 *
 * `warm` is deliberately absent: it is the only unbounded phase — it exits on
 * `ready` (frames decoded and MIN_DISPLAY elapsed), not on a clock, so there
 * is no duration to key. Typed Partial so `PHASE_T[phase] ?? 1` is honest at
 * the call site instead of silently reading `undefined`.
 */
export const PHASE_T: Partial<Record<Phase, number>> = {
  crank: 1.55,
  loading: 0.22,
  blip: 0.75,
  handoff: 0.7,
}

/**
 * rpm integrator time constant per phase — how fast the crank chases its
 * target. A τ of 0.09 s is a starter lugging; 0.45 s in warm is the engine
 * settling. Every phase has a value here, so `?? 0.2` is only a guard.
 */
export const TAU_BY_PHASE: Record<Phase, number> = {
  crank: 0.09,
  loading: 0.1,
  warm: 0.45,
  blip: 0.07,
  handoff: 0.3,
}

export const BLIP_RPM = 3400

/** The rotor is authored pointing straight up, which is exactly where the HT
 *  lead leaves the cap — (86,78) sits 9 units above the hub at (86,87). So the
 *  phase offset is zero: at θ = 0 (TDC firing) the rotor already aims at the
 *  wire. Rate is half crank speed: a 4-cyl fires 4 x (rpm/120) times a second,
 *  one 90° tower each, i.e. 180° of rotor per crank revolution. */
export const ROTOR_BASE = 0

export const TOTAL_FRAMES = 1202

/* ── kinematics ────────────────────────────────────────────── */
export const pinAt = (th: number): { x: number; y: number } => ({
  x: GEO.CX + GEO.R * Math.sin(th),
  y: GEO.CY - GEO.R * Math.cos(th),
})

export const pistonPinY = (th: number): number => {
  const s = GEO.R * Math.sin(th)
  return GEO.CY - (GEO.R * Math.cos(th) + Math.sqrt(GEO.L * GEO.L - s * s))
}

/* Per-cylinder FIRING rate for a 4-stroke: rpm/120. Note this is deliberately
   HALF the rate of the single visible piston (one cycle per crank rev =
   rpm/60). The visible cylinder is drawn 1-cylinder-per-4, so it can only show
   one of the four firing events the real engine produces per revolution. */
export const firingHz = (rpm: number): number => rpm / 120
export const needleFrac = (rpm: number): number => clamp(rpm / REDLINE, 0, 1)

/* ── piecewise keyframe curve ──────────────────────────────── */
export function curve(points: [number, number][], p: number): number {
  if (p <= points[0][0]) return points[0][1]
  for (let i = 1; i < points.length; i++) {
    if (p <= points[i][0]) {
      const [t0, v0] = points[i - 1]
      const [t1, v1] = points[i]
      const k = (p - t0) / (t1 - t0 || 1)
      return v0 + (v1 - v0) * (k * k * (3 - 2 * k)) // smoothstep
    }
  }
  return points[points.length - 1][1]
}

/** Starter motor: two false starts, a stall, then it catches. */
export const STALL: [number, number][] = [
  [0, 0], [0.05, 0.9], [0.14, 0.5], [0.26, 1.0], [0.36, 0.45],
  [0.47, 0.95], [0.56, 0.12], [0.65, 0.0], [0.71, 0.0], [0.79, 0.55],
  [0.89, 0.9], [0.95, 1.0], [1, 0.5],
]

/** Throttle blip: quick up, lazy back down. */
export const BLIP: [number, number][] = [
  [0, 0], [0.1, 0.22], [0.28, 1.0], [0.42, 0.93], [0.68, 0.4], [1, 0.02],
]

/** Simulated decode curve: first 2% of frames land fast, then a steady creep. */
export function loadCurve(x: number): number {
  if (x <= 0) return 0
  if (x >= 1) return 1
  return x < 0.04 ? (x / 0.04) * 0.02 : 0.02 + ((x - 0.04) / 0.96) * 0.98
}

/* ── scripted rpm target ───────────────────────────────────── */

/**
 * The rpm the engine is chasing this frame, for the given phase.
 *
 * `phaseP` is the phase's own normalized progress —
 * `clamp(phaseT / (PHASE_T[phase] ?? 1), 0, 1)` — passed in rather than read
 * from a global so this stays a pure function of (phase, phaseP). `t` is
 * elapsed wall-clock seconds; `warm` rides a slow sine on it so idle is never
 * dead flat. It defaults to 0, which collapses the wobble to nothing and
 * returns exactly IDLE — a pure (phase, phaseP) call is still correct.
 *
 * The preview's app.js reads these off `state`; nothing else is consulted.
 * `reduced` and `skipNarr` deliberately do NOT appear here — they pick the
 * starting phase and decide whether `warm` exits to `blip` or straight to
 * `handoff`, both of which happen in the caller's `advance()`, so adding them
 * here would be two parameters that cannot change the return value.
 *
 * The preview calls this phase `catch`; it is `loading` here so the phase
 * names line up with the gate the existing Loader already owns
 * (`done = framesReady && minPassed && phase === 'loading'`).
 */
export function rpmTarget(phase: Phase, phaseP: number, t = 0): number {
  switch (phase) {
    case 'crank': return IDLE * 0.3 * curve(STALL, phaseP)
    case 'loading': return IDLE * 1.05
    case 'warm': return IDLE + Math.sin(t * 2.1) * 24
    case 'blip': return IDLE + BLIP_RPM * curve(BLIP, phaseP)
    default: return IDLE
  }
}
