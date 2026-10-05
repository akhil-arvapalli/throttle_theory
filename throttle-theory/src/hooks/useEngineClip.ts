/* ═══════════════════════════════════════════════════════════
   Engine clip — the RECORDED layer, ported from the standalone
   piston-loader preview
   ───────────────────────────────────────────────────────────
   `useEngineVoices` already ports the WebAudio SYNTH (starter,
   idle rumble, firing throb, rev voice). What was still missing
   is the other half of the mix: the actual recording.

   This is that recording, and nothing else. It carries the
   exhaust character no set of oscillators can fake; the synth
   carries the firing throb and the pitch rise that a six-second
   loop cannot. Both run through the SAME master gain, so one
   mute governs everything.

   ── the one structural change, and why ──────────────────────
   Upstream this clip is an `<audio>` element that plays DIRECTLY
   to the speakers — `app.js:387-397`. It is not in the WebAudio
   graph, because on a `file://` page it cannot be: `fetch()` +
   `decodeAudioData` is blocked by CORS (no bytes at all), and
   `createMediaElementSource()` SILENCES the element while logging
   "MediaElementAudioSource outputs zeroes due to CORS access
   restrictions". An element on `file://` can only reach the output
   by bypassing the graph entirely.

   Served over HTTP that workaround is dead weight, and its costs
   come with it: the element's `.volume` has no `setTargetAtTime`,
   so the level was eased by hand at frame rate (a 60 Hz zipper on
   the loudest layer in the mix), and the clip could not be shaped
   by the compressor that sits downstream of the synth.

   So here it is a real AudioBufferSourceNode with `loop = true`,
   decoded once, feeding its own GainNode into useSound's master.
   The behavioural constants and the rpm → level/rate relationship
   are unchanged; only the mechanism that carries them is the one
   this platform actually provides.
   ═══════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { needleFrac } from '../components/loader/sliderCrank'
import type { Phase } from '../components/loader/sliderCrank'

/* ── the recording ────────────────────────────────────────────────────────
   NOT `video-audio.mp3`. That is a different recording — a 50s engine
   note cut from the hero video — and it does not contain this narrative.
   The clip below was deliberately time-compressed by the source author so
   its measured crank, idle and rev landmarks all land inside a six-second
   preview; swapping in a full-length drive would land every one of those
   landmarks in the wrong place. */

const CLIP_SRC = '/audio/engine.mp3'

/** app.js:38 — steady-state rate for the whole narrative. The clip is a
 *  continuous start/idle/rev recording, so this is a FIXED rate rather than
 *  something that tracks rpm: it keeps the recording's own landmarks stable
 *  while squeezing them into the shorter preview. */
const CLIP_PLAYBACK_RATE = 1.65

/** app.js:39 — where the rev actually begins in the recording. `syncRev()`
 *  seeks here so the clip's throttle lift lands with the visual blip instead
 *  of wherever the free-running loop happens to be. */
const CLIP_REV_OFFSET = 11.75

/** app.js:40 — rate during the blip only. Half the steady rate, so the rev
 *  inside the clip lasts as long as the visual blip does rather than being
 *  scrubbed through in a third of its length. */
const CLIP_BLIP_RATE = 0.8

/** app.js:401 — the recording has about 1.75s of lead-in before the starter
 *  catches. Kept: it puts the first audible crank at animation time 0. */
const CLIP_START_OFFSET = 1.75

/** app.js:401 — the loop window, `[1.75, 14.5]`. The source is ~40s of a
 *  real drive and only the engine-start section is used; the tail is mostly
 *  road and wind, and playing all 40s meant the loader sat under arbitrary
 *  footage on a slow connection.
 *
 *  Upstream this was a `timeupdate` listener seeking back to `a` — necessary
 *  because an element cannot loop a sub-range. An AudioBufferSourceNode has
 *  `loopStart`/`loopEnd` for exactly this, so the window is now declarative
 *  and the clip can never wander into the quiet tail. */
const CLIP_LOOP_START = 1.75
const CLIP_LOOP_END = 14.5

/** Level reached once the engine has caught, before the rpm term. The clip
 *  is an idle recording, so it sits well down while the starter works (the
 *  starter synth carries that phase — app.js:505-517). */
const CLIP_CAUGHT_LEVEL = 0.8
/** …plus this much for revs, so the blip is audible through the mix. */
const CLIP_CAUGHT_RPM_SPAN = 0.18
/** The lower level used during `crank`, where the starter synth dominates. */
const CLIP_CRANK_LEVEL = 0.5

/** app.js:519 — the level easing time constant. `setTargetAtTime`'s
 *  timeConstant IS the continuous limit of `1 - exp(-dt/τ)`, so this is the
 *  same envelope the source hand-integrated, but sample-accurate instead of
 *  stepped 60 times a second. */
const CLIP_LEVEL_TAU = 0.1

/* ── graph ──────────────────────────────────────────────────────────────── */

/** The ramp-able part of the clip. Built exactly once per graph lifetime;
 *  `updateClip` only ever writes to `gain.gain`, so the per-frame path
 *  allocates nothing. */
interface ClipBus {
  readonly ctx: AudioContext
  readonly gain: GainNode
}

/* ── hook ───────────────────────────────────────────────────────────────── */

export interface EngineClipOptions {
  /** Ties clip loading to the sound preference. useSound only assigns
   *  ctxRef.current in an effect gated on `enabled`, so without this the
   *  clip's own build effect runs first, finds no context, returns early, and
   *  — because its other deps are stable ref objects — never re-runs. The
   *  recording is then never fetched at all. */
  enabled?: boolean
  /**
   * useSound's `ctxRef`. Optional so the four documented returns stay the
   * whole contract, but without it there is no context to join and this hook
   * is correctly silent — a missing pair warns once in dev rather than
   * failing quietly.
   */
  ctxRef?: RefObject<AudioContext | null>
  /** useSound's `masterRef` — the same GainNode the synth voices attach to. */
  masterRef?: RefObject<GainNode | null>
}

let warnedMissingRefs = false

/**
 * The recorded engine layer, plus its mute gate.
 *
 * ```tsx
 * const sound = useSound()
 * const clip = useEngineClip({ ctxRef: sound.ctxRef, masterRef: sound.masterRef })
 * // in the integrator's rAF:
 * clip.updateClip(rpm, dt, phaseRef.current)
 * // at the blip transition:
 * clip.syncRev()
 * ```
 *
 * The mute is a gate, not a checkbox: the clip starts MUTED and the first
 * click or tap is what unmutes it. That is not decoration — browser autoplay
 * policy blocks audible audio before a user gesture, so "start audible" is a
 * request that is frequently refused. The gate stays visible for exactly as
 * long as the request is outstanding, so what the UI shows and what the
 * speakers are doing cannot disagree.
 */
export function useEngineClip({ ctxRef, masterRef, enabled = true }: EngineClipOptions = {}) {
  /* Only the GATE is React state. Everything the 60fps path touches — the
     gain, the playback rate, the seek — is a ref or a DOM-free imperative
     write, because a `setState` here would re-render the whole loader sixty
     times a second purely to move audio. */
  const [gateVisible, setGateVisible] = useState(true)

  const busRef = useRef<ClipBus | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const bufferRef = useRef<AudioBuffer | null>(null)
  const loadStartedRef = useRef(false)
  const disposeRef = useRef<(() => void) | null>(null)

  /** Live phase. `updateClip` is memoised on the graph alone so it can be
   *  called every frame without being rebuilt, which means it closes over
   *  whatever phase it was given at the time. */
  const phaseRef = useRef<Phase>('crank')

  /* Mute state as a ref, because `updateClip` reads it per frame. The
     counterpart is `gateVisible`, which is the same fact as something a
     human can see — that is the only reason it is state.

     There is no separate "awaitingGesture" flag here, because the source
     needed one (`app.js:601`) only where it had a third, independently
     paused element: an element can be unmuted and still paused by policy.
     A suspended AudioContext reports that itself as `ctx.state`, so the same
     condition is read from the context rather than duplicated in a flag that
     could disagree with it. */
  const mutedRef = useRef(true)

  /**
   * Build at most once per graph lifetime.
   *
   * Driven from `updateClip`/`syncRev` rather than from an effect alone for
   * the same reason `useEngineVoices.ensureGraph` is: useSound assigns
   * `ctxRef.current` synchronously in its own effect body yet tears it down
   * in that effect's cleanup, and the two commit independently, so an effect
   * cannot observe the moment the context arrives.
   *
   * Reading `.current` rather than caching it during render keeps this a pure
   * read — useSound swaps the context out whenever sound is disabled, and a
   * value captured on the render path would go stale.
   *
   * Memoised on the two ref objects, whose identity is stable for the life of
   * useSound. Were this rebuilt every render, listing it in an effect's deps
   * would fire that effect's cleanup on every render and tear the graph down
   * continuously.
   */
  const ensureClip = useCallback((): ClipBus | null => {
    const existing = busRef.current
    if (existing) return existing

    const ctx = ctxRef?.current ?? null
    const master = masterRef?.current ?? null
    if (!ctx || !master || ctx.state === 'closed') return null

    /* The standalone loader sends this recording directly to the speakers
       through the media element's volume (app.js:416-500). Keep that topology
       here instead of routing it through useSound's master: the master belongs
       to the scroll soundtrack and would attenuate the loader recording a
       second time. The clip gain is still our mute/phase control. */
    const gain = ctx.createGain()
    // Silent until a gesture says otherwise; the gate is the affordance.
    gain.gain.value = 0
    gain.connect(ctx.destination)

    const bus: ClipBus = { ctx, gain }
    busRef.current = bus

    disposeRef.current = () => {
      try {
        sourceRef.current?.stop()
      } catch {
        /* never started, or already stopped */
      }
      sourceRef.current?.disconnect()
      gain.disconnect()
      sourceRef.current = null
      bufferRef.current = null
      busRef.current = null
      loadStartedRef.current = false
    }

    return bus
  }, [ctxRef, masterRef])

  /**
   * Build the looped source at a given offset and rate.
   *
   * Called exactly twice in a normal run: once when the decode lands, and
   * once from `syncRev` at the blip, which cannot reposition an existing
   * source. Never per frame — `updateClip` only writes AudioParams and
   * `.playbackRate` onto the node this returns.
   *
   * The loop window is declarative (`loopStart`/`loopEnd`) rather than the
   * source's `timeupdate` seek, so the clip cannot drift into the quiet tail
   * of the recording.
   */
  const ensureSource = useCallback(
    (bus: ClipBus, offset: number, rate: number): AudioBufferSourceNode | null => {
      const buffer = bufferRef.current
      if (!buffer || bus.ctx.state === 'closed') return null

      const source = bus.ctx.createBufferSource()
      source.buffer = buffer
      source.loop = true
      source.loopStart = CLIP_LOOP_START
      source.loopEnd = CLIP_LOOP_END
      source.playbackRate.value = rate
      source.connect(bus.gain)

      const span = Math.min(offset, buffer.duration - 0.01)
      source.start(0, Math.max(0, span))
      sourceRef.current = source
      return source
    },
    [],
  )

  /* Fetch and decode the recording. Once per graph lifetime — the `loadStarted`
     guard matters: without it a caller that reaches `updateClip` before the
     first decode resolves would kick off a second fetch for the same 625 KB. */
  const loadClip = useCallback((bus: ClipBus) => {
    if (loadStartedRef.current || bufferRef.current) return
    loadStartedRef.current = true
    void (async () => {
      try {
        const response = await fetch(CLIP_SRC)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const bytes = await response.arrayBuffer()
        const decoded = await bus.ctx.decodeAudioData(bytes)
        if (busRef.current !== bus || bus.ctx.state === 'closed') return
        bufferRef.current = decoded
        /* Start at the measured lead-in, not at zero. `source.start()` while
           the context is suspended is legal — the context simply does not
           advance — so the clip is already parked on the first audible crank
           and begins there the instant a gesture resumes the context. That is
           what makes "attempt play, leave it silent if refused" possible
           without faking success: the source genuinely is playing, the gate
           genuinely is honest about the context refusing to run it. */
        ensureSource(bus, CLIP_START_OFFSET, CLIP_PLAYBACK_RATE)
      } catch (err) {
        /* The synth carries the loader alone and nothing breaks — the same
           degradation the source documents at app.js:450-453. */
        console.warn('engine clip failed to load; synth only', err)
      }
    })()
  }, [ensureSource])

  // Build on mount and keep the gate honest as the context's state changes.
  useEffect(() => {
    const bus = ensureClip()
    if (!bus) {
      if (!warnedMissingRefs) {
        warnedMissingRefs = true
        console.warn(
          'useEngineClip: no ctxRef/masterRef from useSound yet — the engine clip is silent until they are supplied.',
        )
      }
      return
    }
    loadClip(bus)

    /* What is ACTUALLY producing sound, not what was merely requested. The
       source reconciled the same way (app.js:572-577) after its checkbox read
       ON with a dead context and nothing audible. A suspended context is the
       equivalent failure here. */
    const reconcile = () => {
      const audible = bus.ctx.state === 'running' && !mutedRef.current
      setGateVisible(!audible)
    }
    bus.ctx.addEventListener('statechange', reconcile)
    reconcile()

    return () => {
      bus.ctx.removeEventListener('statechange', reconcile)
      disposeRef.current?.()
      disposeRef.current = null
    }
  }, [ensureClip, loadClip, enabled])

  /**
   * The first click or tap. This call IS the user gesture, so it is the only
   * place a `resume()` is permitted to succeed.
   *
   * Returns whether sound is actually audible afterwards. The source's caller
   * used the return value to revert its checkbox (`app.js:1198-1210`) — that
   * is what stops a control reading ON over a context that refused to resume.
   */
  const unmute = useCallback((): boolean => {
    mutedRef.current = false

    const bus = ensureClip()
    if (!bus) return false
    if (bus.ctx.state === 'suspended') {
      // Fire and do not pretend: `reconcile` below reads the real state, and
      // the statechange listener re-runs it whenever the resume lands (or
      // fails to).
      void bus.ctx.resume().catch((err: unknown) => {
        console.warn('engine clip resume rejected:', err)
      })
    }

    const audible = bus.ctx.state === 'running'
    setGateVisible(!audible)
    return audible
  }, [ensureClip])

  /**
   * Gate toggle. The clip starts muted, so the first tap STARTS playback
   * rather than muting — treating it as a mute was why the source's first tap
   * appeared to do nothing and only the second one worked (`app.js:1233-1249`).
   * That property is structural here: with `muted` true on mount, the first
   * call can only ever take the unmute branch.
   *
   * Upstream this also branched on the loader surface, which was bound to
   * `pointerdown` as a fallback for anyone clicking the animation rather than
   * the caption (`app.js:1253-1256`). That binding is a DOM concern of the
   * integrator, not of the audio — wire this callback to it.
   */
  const toggle = useCallback((): boolean => {
    if (mutedRef.current) return unmute()

    mutedRef.current = true
    const bus = ensureClip()
    if (bus) {
      // Ramp rather than cut: dropping to zero instantly is an audible click
      // on the loudest layer in the mix.
      bus.gain.gain.setTargetAtTime(0, bus.ctx.currentTime, CLIP_LEVEL_TAU)
    }
    setGateVisible(true)
    return false
  }, [ensureClip, unmute])

  /**
   * Seek the clip to its rev onset when the visual blip starts
   * (`app.js:403-411`), so the recording's throttle lift and the drawn
   * ignition happen together instead of the clip arriving somewhere else.
   *
   * This is the one place a node IS constructed after setup: an
   * AudioBufferSourceNode cannot seek, so a reposition means a new source at
   * the new offset. That is once per blip, not once per frame — the same
   * argument `useEngineVoices` makes for the blip transient, and it is why
   * the old leaf source is stopped rather than left running alongside.
   */
  const syncRev = useCallback((): void => {
    const bus = ensureClip()
    if (!bus || bus.ctx.state === 'closed') return

    try {
      sourceRef.current?.stop()
    } catch {
      /* never started, or already stopped */
    }
    sourceRef.current?.disconnect()
    sourceRef.current = null

    ensureSource(bus, CLIP_REV_OFFSET, CLIP_BLIP_RATE)
  }, [ensureClip, ensureSource])

  /**
   * Per-frame level and rate. Called from the integrator's single rAF, exactly
   * as `audio.updateClip(state.rpm, dt)` is at `app.js:840`.
   *
   * `dt` is accepted for call-site parity and deliberately unused: upstream it
   * existed only to hand-integrate the level, `1 - exp(-dt/0.1)` per frame.
   * `setTargetAtTime`'s timeConstant is that same envelope expressed
   * continuously, so it needs no frame step — and being sample-accurate rather
   * than resampled 60 times a second is why there is nothing left for `dt` to
   * do here. It stays in the signature because that is the shape every caller
   * and every doc comment in this project uses.
   *
   * The phase is an argument rather than a closure so this stays memoised on
   * the graph alone: a callback rebuilt every phase change would need to be
   * re-read by the caller each frame, and a two-argument call stays valid.
   */
  const updateClip = useCallback(
    (rpm: number, _dt: number, phase?: Phase): void => {
      const bus = ensureClip()
      if (!bus || bus.ctx.state === 'closed') return
      // Self-heal: the mount effect can run before useSound has created the
      // context, and its other deps are stable refs, so it would never re-run.
      // The per-frame path is always called, so kicking the fetch off here
      // means the clip loads whenever the graph finally appears. Guarded by
      // loadStartedRef, so this is still once per graph lifetime.
      loadClip(bus)
      if (phase !== undefined) phaseRef.current = phase

      const p = phaseRef.current

      // This is a continuous recording of the whole start/idle/rev narrative.
      // A fixed rate keeps its landmarks stable while fitting the shorter
      // preview — see CLIP_PLAYBACK_RATE.
      const rate = p === 'blip' ? CLIP_BLIP_RATE : CLIP_PLAYBACK_RATE
      if (sourceRef.current && sourceRef.current.playbackRate.value !== rate) {
        sourceRef.current.playbackRate.value = rate
      }

      // Phase-aware level. The recording is an idle recording, so it is well
      // down while the starter works and comes up as the engine catches.
      const norm = needleFrac(rpm)
      const catching = p !== 'crank'

      // Held at zero while awaiting a gesture. Autoplay policy has the
      // context suspended, so a rising level curve would only ever look like
      // sound that was not there. Once a gesture lands, the caught level is
      // high enough to be clearly audible over the starter synth rather than
      // sitting under it.
      const live = !mutedRef.current && bus.ctx.state === 'running'
      const target = live
        ? p === 'handoff'
          ? 0
          : catching
            ? CLIP_CAUGHT_LEVEL + norm * CLIP_CAUGHT_RPM_SPAN
            : CLIP_CRANK_LEVEL
        : 0

      bus.gain.gain.setTargetAtTime(target, bus.ctx.currentTime, CLIP_LEVEL_TAU)
    },
    [ensureClip, loadClip],
  )

  return {
    /** useSound's context, passed through so the caller can spread one object. */
    ctxRef,
    /** useSound's master gain, likewise. */
    masterRef,
    /**
     * Whether the mute gate should be on screen: true while sound is muted,
     * and true — honestly — while a gesture is still outstanding. It hides
     * only once the context is genuinely running.
     */
    gateVisible,
    /** First-gesture unmute. Returns whether sound is actually audible now. */
    unmute,
    /** Gate toggle; treats a pending gesture as "start", not "mute". */
    toggle,
    /** Seek to the rev onset — call at the visual blip's start. */
    syncRev,
    /** Per-frame level and rate. */
    updateClip,
  }
}