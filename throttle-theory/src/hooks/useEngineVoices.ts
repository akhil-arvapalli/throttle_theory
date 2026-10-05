import { useCallback, useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { BLIP_RPM, IDLE, clamp, firingHz, needleFrac } from '../components/loader/sliderCrank'

/**
 * Engine voices layered into the AudioContext `useSound` already owns.
 *
 * Ported from `app.js:213-347` (build) and `app.js:650-706` (drive) of the
 * standalone piston-loader preview. Deliberately NOT ported as-is: `useSound`
 * already creates the context, already gates on `tt-sound-enabled` and already
 * handles the gesture resume, so a second context would mean two competing ones
 * and a mute button that fights itself. Every node here attaches to useSound's
 * own master gain and is torn down with the preference.
 *
 * Two upstream facts are load-bearing:
 *
 * - **The throb runs at rpm/120, not at the visible piston rate.** The drawn
 *   cylinder is one of four, so it can only depict one of the four firing events
 *   a real 4-cylinder produces per revolution. Its *cycle* rate is rpm/60
 *   (13.3 Hz at idle); the per-cylinder *firing* rate is rpm/120 (6.7 Hz).
 *   They are 2x apart. `firingHz` is the firing rate and is the only one that
 *   belongs here — using it as a piston rate, or `rpm / 60` as a firing rate,
 *   is the classic bug this file exists to not reintroduce.
 *
 * - **The node graph is built once per `enabled` transition**, never per frame.
 *   `rpm` reaches the voices exclusively through AudioParam automation
 *   (`setTargetAtTime`), exactly as `audio.update(rpm)` does at rAF cadence in
 *   `app.js:659`. Rebuilding here would create and discard ~14 nodes sixty times
 *   a second.
 */

/* ── tuning constants (verbatim from app.js) ──────────────────────────────────
   `IDLE` and `BLIP_RPM` are imported from sliderCrank rather than mirrored:
   they are the same numbers the mechanism integrates from, so a second copy
   here could silently drift out of step with the crank. */

const VOICE_BUS = 0.72 // app.js:536 — the level the original synth master was ramped to
const IDLE_PARTIALS = [27, 27.6, 54.4] as const // app.js:250 — fundamental, partner, octave
const REV_MULTIPLES = [1, 2, 4] as const // app.js:306 — exhaust partials at 1x / 2x / 4x
const REV_LEVELS = [0.65, 0.25, 0.1] as const

/* ── graph ───────────────────────────────────────────────────────────────────── */

interface EngineGraph {
  readonly ctx: AudioContext
  readonly bus: GainNode
  readonly idle: GainNode
  readonly idleLp: BiquadFilterNode
  readonly idleOscs: readonly OscillatorNode[]
  readonly sub: OscillatorNode
  readonly throbLfo: OscillatorNode
  readonly throbAmt: GainNode
  readonly rev: GainNode
  readonly revLp: BiquadFilterNode
  readonly revOscs: readonly { readonly osc: OscillatorNode; readonly multiple: number }[]
  readonly starter: GainNode
  /** Transients fired on phase entry. Self-terminating, but stoppable. */
  readonly oneShots: AudioBufferSourceNode[]
}

function buildGraph(ctx: AudioContext, master: GainNode): {
  graph: EngineGraph
  dispose: () => void
} {
  const started: OscillatorNode[] = []
  const connected: AudioNode[] = []
  const oneShots: AudioBufferSourceNode[] = []

  const track = <T extends AudioNode>(node: T): T => {
    connected.push(node)
    return node
  }

  const startOsc = <T extends OscillatorNode>(osc: T): T => {
    osc.start()
    started.push(osc)
    return track(osc)
  }

  /**
   * app.js:224-230 — the compressor sat AFTER the master gain, i.e. it only ever
   * shaped the synth (the recording bypassed the graph entirely). Kept in the
   * same relative position so the threshold/ratio still behave as tuned; putting
   * it before `master` would also duck useSound's clip.
   */
  const bus = track(ctx.createGain())
  bus.gain.value = VOICE_BUS
  const comp = track(ctx.createDynamicsCompressor())
  comp.threshold.value = -14
  comp.ratio.value = 8
  bus.connect(comp)
  comp.connect(master)

  /* idle rumble — V8 style. A V8's character is not pitch, it is the half-order
     loping: firing impulses arrive in two banks 90 degrees apart, so the exhaust
     note beats against itself. Modelled as three low partials (fundamental,
     detuned partner, octave) under a lowpass, with a sub-octave sine carrying
     the weight. Everything sits at 27–58 Hz so it reads as chest-thump rather
     than buzz. */
  const idle = track(ctx.createGain())
  idle.gain.value = 0
  const idleLp = track(ctx.createBiquadFilter())
  idleLp.type = 'lowpass'
  idleLp.frequency.value = 180
  idleLp.Q.value = 0.7 // was 4 — high Q rang on the fundamental
  idle.connect(idleLp)
  idleLp.connect(bus)

  const idleOscs = IDLE_PARTIALS.map((freq, i) => {
    const osc = ctx.createOscillator()
    osc.type = i === 2 ? 'triangle' : 'sawtooth'
    osc.frequency.value = freq
    const gain = track(ctx.createGain())
    gain.gain.value = i === 2 ? 0.08 : 0.22
    osc.connect(gain)
    gain.connect(idle)
    return startOsc(osc)
  })

  /* sub weight — a sine an octave below the fundamental. Gives the idle a floor
     so it does not thin out on laptop speakers. It enters ahead of the lowpass,
     so it is filtered along with everything else. */
  const sub = ctx.createOscillator()
  sub.type = 'sine'
  sub.frequency.value = IDLE_PARTIALS[0]
  const subGain = track(ctx.createGain())
  subGain.gain.value = 0.2
  sub.connect(subGain)
  subGain.connect(idle)
  startOsc(sub)

  /* firing throb — triangle LFO rectified to 0..1, then scaled by rpm. At a V8
     idle this runs at half the visible 4-cyl piston rate, which is exactly the
     half-order lope that makes a V8 sound like a V8. It sums into `idle.gain`,
     so the static idle level is 0 and the AM *is* the level. */
  const shaper = track(ctx.createWaveShaper())
  const rectify = new Float32Array(257)
  for (let i = 0; i < 257; i++) rectify[i] = 0.5 + 0.5 * (i / 128 - 1)
  shaper.curve = rectify
  const throbLfo = ctx.createOscillator()
  throbLfo.type = 'triangle'
  throbLfo.frequency.value = firingHz(IDLE)
  const throbAmt = track(ctx.createGain())
  throbAmt.gain.value = 0
  throbLfo.connect(shaper)
  shaper.connect(throbAmt)
  throbAmt.connect(idle.gain)
  startOsc(throbLfo)

  /* rev voice — harmonically rich exhaust tone that follows the same rpm as the
     piston. The recording supplies texture; this layer supplies the
     unmistakable pitch rise during the short scripted blip. */
  const rev = track(ctx.createGain())
  rev.gain.value = 0
  const revLp = track(ctx.createBiquadFilter())
  revLp.type = 'lowpass'
  revLp.frequency.value = 900
  revLp.Q.value = 0.8
  rev.connect(revLp)
  revLp.connect(bus)

  const revOscs = REV_MULTIPLES.map((multiple, i) => {
    const osc = ctx.createOscillator()
    osc.type = i === 0 ? 'sawtooth' : 'triangle'
    osc.frequency.value = (IDLE / 60) * multiple
    const gain = track(ctx.createGain())
    gain.gain.value = REV_LEVELS[i]
    osc.connect(gain)
    gain.connect(rev)
    startOsc(osc)
    return { osc, multiple }
  })

  /* starter motor — saw + wobble through a bandpass */
  const starter = track(ctx.createGain())
  starter.gain.value = 0
  const starterBp = track(ctx.createBiquadFilter())
  starterBp.type = 'bandpass'
  starterBp.frequency.value = 340 // was 520 — a starter at 520 Hz reads as a buzz saw
  starterBp.Q.value = 1.4
  starter.connect(starterBp)
  starterBp.connect(bus)

  const starterOsc = ctx.createOscillator()
  starterOsc.type = 'sawtooth'
  starterOsc.frequency.value = 168
  starterOsc.connect(starter)
  startOsc(starterOsc)

  const wobble = ctx.createOscillator()
  wobble.type = 'sine'
  wobble.frequency.value = 7.5
  const wobbleAmt = track(ctx.createGain())
  wobbleAmt.gain.value = 15
  wobble.connect(wobbleAmt)
  wobbleAmt.connect(starterOsc.frequency)
  startOsc(wobble)

  const starterHarmonic = ctx.createOscillator()
  starterHarmonic.type = 'square'
  starterHarmonic.frequency.value = 336
  const starterHarmonicGain = track(ctx.createGain())
  starterHarmonicGain.gain.value = 0.1
  starterHarmonic.connect(starterHarmonicGain)
  starterHarmonicGain.connect(starter)
  startOsc(starterHarmonic)

  const graph: EngineGraph = {
    ctx,
    bus,
    idle,
    idleLp,
    idleOscs,
    sub,
    throbLfo,
    throbAmt,
    rev,
    revLp,
    revOscs,
    starter,
    oneShots,
  }

  const dispose = () => {
    for (const source of oneShots) {
      try {
        source.stop()
      } catch {
        /* already ended */
      }
    }
    for (const osc of started) {
      try {
        osc.stop()
      } catch {
        /* already stopped */
      }
      osc.disconnect()
    }
    for (const node of connected) node.disconnect()
    oneShots.length = 0
  }

  return { graph, dispose }
}

/** Short intake transient layered under the rev voice (app.js:683-706). */
function fireBlip(graph: EngineGraph): void {
  const { ctx, bus } = graph
  const len = 0.55
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * len), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1

  const source = ctx.createBufferSource()
  source.buffer = buffer
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.Q.value = 1.4
  const t0 = ctx.currentTime
  bp.frequency.setValueAtTime(280, t0)
  bp.frequency.exponentialRampToValueAtTime(900, t0 + 0.16)
  bp.frequency.exponentialRampToValueAtTime(240, t0 + 0.48)
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.exponentialRampToValueAtTime(0.08, t0 + 0.06)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5)

  source.connect(bp)
  bp.connect(gain)
  gain.connect(bus)
  source.start(t0)
  source.stop(t0 + len)

  // 0.55s and one-shot: once it has ended there is nothing left to stop.
  source.onended = () => {
    const at = graph.oneShots.indexOf(source)
    if (at !== -1) graph.oneShots.splice(at, 1)
    source.disconnect()
    bp.disconnect()
    gain.disconnect()
  }
  graph.oneShots.push(source)
}

/* ── hook ───────────────────────────────────────────────────────────────────── */

export interface EngineVoiceOptions {
  /**
   * Accepted for call-site symmetry with the boost integrator, but
   * deliberately unwired: the turbo whistle, spool hiss and induction roar were
   * all synthesized noise and were removed outright from the source
   * (`app.js:353-359`) — the clip carries the exhaust character now. Inventing a
   * replacement here would re-add the 6.5 kHz Q=14 shriek that removal fixed.
   */
  boost?: number
  /** `crank → catch → warm → blip → handoff`. Gates the starter. */
  phase: string
  /** useSound's `tt-sound-enabled` preference. */
  enabled: boolean
  /**
   * useSound's `ctxRef` / `masterRef`. Optional so the four documented fields
   * stay the whole contract, but without them there is no way to reach the
   * existing graph and this hook is correctly silent — a missing pair warns
   * once in dev rather than failing quietly.
   */
  ctxRef?: RefObject<AudioContext | null>
  masterRef?: RefObject<GainNode | null>
}

let warnedMissingRefs = false

/**
 * Layers the starter / idle / throb / rev / blip voices into useSound's existing
 * AudioContext:
 *
 * ```tsx
 * const sound = useSound()
 * useEngineVoices({ rpm, phase, enabled: sound.enabled, ...sound })
 * ```
 *
 * The graph is created once per `enabled` transition; `rpm` is pushed through
 * AudioParam automation on every change.
 */
export function useEngineVoices({ phase, enabled, ctxRef, masterRef }: EngineVoiceOptions): (rpm: number) => void {
  const graphRef = useRef<EngineGraph | null>(null)
  const disposeRef = useRef<(() => void) | null>(null)
  /** Live phase for the imperative `update`. `update` is memoised on the graph
   * alone so it can be called every frame without being rebuilt, which would
   * otherwise close over a stale `phase`. */
  const phaseLive = useRef(phase)

  /* Keep the live phase current. `update` is memoised on the graph alone so it
     can be called every frame without being rebuilt — which means it closes
     over whatever `phase` was at the time. Without this the starter gate would
     read permanently "cranking" (the initial phase) and the blip would never
     fire. */
  useEffect(() => {
    phaseLive.current = phase
  }, [phase])

  /**
   * Build at most once per graph lifetime. Driven by the enabled effect, but
   * also called defensively from the frame effect: useSound assigns
   * `ctxRef.current` synchronously in its own effect body yet tears it down in
   * that effect's cleanup, and the two commit independently. The ref guard is
   * what makes the fallback safe — the graph is still built exactly once.
   *
   * Reading `.current` here rather than caching it in a ref on the render path
   * keeps this a pure read: useSound swaps the context out whenever `enabled`
   * flips, and a value captured during render would go stale.
   *
   * Memoised on the two ref objects, whose identity is stable for the life of
   * useSound. That matters: were this rebuilt every render, listing it in the
   * build effect's deps would fire that effect's cleanup on every render and
   * tear the graph down continuously.
   */
  const ensureGraph = useCallback((): EngineGraph | null => {
    const existing = graphRef.current
    if (existing) return existing
    const ctx = ctxRef?.current ?? null
    const master = masterRef?.current ?? null
    if (!ctx || !master || ctx.state === 'closed') return null
    const built = buildGraph(ctx, master)
    graphRef.current = built.graph
    disposeRef.current = built.dispose
    return built.graph
  }, [ctxRef, masterRef])

  // Build the graph on the enabled transition only. Never on rpm.
  useEffect(() => {
    if (!enabled) return
    ensureGraph()
    if (!graphRef.current && !warnedMissingRefs) {
      warnedMissingRefs = true
      console.warn(
        'useEngineVoices: no ctxRef/masterRef from useSound yet — engine voices are silent until they are supplied.',
      )
    }
    return () => {
      disposeRef.current?.()
      disposeRef.current = null
      graphRef.current = null

    }
  }, [enabled, ensureGraph])

  // Per-frame drive, called imperatively from the integrator's single rAF —
  // the same shape as `audio.update(state.rpm)` in the source. Deliberately NOT
  // an effect keyed on `rpm`: an effect that re-runs whenever rpm changes would
  // need a React render every frame purely to move audio, which would re-render
  // the loader too. This writes straight to AudioParams and never touches React.

  const update = useCallback((rpm: number) => {
    const graph = ensureGraph()
    if (!graph || graph.ctx.state === 'closed') return

    const { ctx } = graph
    const t = ctx.currentTime
    const norm = needleFrac(rpm)
    const revNorm = clamp((rpm - IDLE) / (BLIP_RPM * 0.9), 0, 1)
    const blipping = phaseLive.current === 'blip'

    graph.rev.gain.setTargetAtTime(
      blipping ? 0.025 + revNorm * 0.12 : 0.025 + norm * 0.025,
      t,
      blipping ? 0.035 : 0.12,
    )
    graph.revLp.frequency.setTargetAtTime(420 + revNorm * 980, t, 0.08)
    for (const { osc, multiple } of graph.revOscs) {
      osc.frequency.setTargetAtTime(Math.max(18, rpm / 60) * multiple, t, 0.04)
    }

    graph.throbAmt.gain.setTargetAtTime(0.18 + norm * 0.22, t, 0.08)
    graph.throbLfo.frequency.setTargetAtTime(clamp(firingHz(rpm), 0.5, 40), t, 0.08)

    // pitch rises with revs but stays in the low register — no top-end shrill
    const pitch = 0.78 + 0.34 * clamp(rpm / IDLE, 0, 3)
    graph.idleOscs.forEach((osc, i) => {
      osc.frequency.setTargetAtTime(IDLE_PARTIALS[i] * pitch, t, 0.09)
    })
    graph.sub.frequency.setTargetAtTime(IDLE_PARTIALS[0] * pitch, t, 0.09)
    // stays a lowpass and never opens into the shrill range
    graph.idleLp.frequency.setTargetAtTime(120 + norm * 420, t, 0.1)

    // Starter gate follows the phase, driven per frame exactly as app.js drives
    // it on its own lines 1204/1239.
    const cranking = phaseLive.current === 'crank'
    graph.starter.gain.setTargetAtTime(cranking ? 0.13 : 0, t, cranking ? 0.05 : 0.08)
  }, [ensureGraph])

  // The blip transient is a phase-entry one-shot, not a level — so it belongs
  // on the phase transition, not in the per-frame drive.
  useEffect(() => {
    const graph = ensureGraph()
    if (!graph) return
    if (phase === 'blip') fireBlip(graph)
  }, [phase, ensureGraph])

  return update
}