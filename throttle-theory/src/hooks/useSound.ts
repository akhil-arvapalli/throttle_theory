import { useState, useEffect, useCallback } from 'react'
import { useScrollStore } from './useScrollProgress'
import { VIDEO_DURATION, PLAYBACK_RATE } from '../config/video'

const AUDIO_SRC = '/audio/video-audio.mp3'
const PREF_KEY = 'tt-sound-enabled'
// Matches the standalone loader's synth master level (app.js:535).
const VOLUME = 0.72
const PAUSE_DELAY_MS = 150
/** Seconds of audio-vs-frame slip tolerated before re-seeking during a run. */
const DRIFT_TOLERANCE = 0.12

const STORAGE_OK = (() => {
  try {
    return typeof localStorage !== 'undefined'
  } catch {
    return false
  }
})()

/* ═══ the one shared graph ═══════════════════════════════════════════════
   `useSound` is called from more than one component (EngineLoader and
   SoundToggle), so the AudioContext, its master gain, the decoded buffer and
   the scroll-driven transport are module state with a MODULE lifecycle — not
   per-instance state cleaned up by a hook effect.

   The previous shape had per-instance effects writing to shared refs, which
   broke in two ways that only showed up on a first visit:

     1. Each caller ran its own `[enabled]` effect, so two AudioContexts were
        created (the second overwriting `ctxRef.current`) and the 1.2MB clip
        was fetched twice — `bufferLoading` was a per-instance ref, so the
        second caller never saw the first one's in-flight guard.
     2. When the loader unmounted, ITS cleanup closed `ctxRef.current` — which
        by then was the context SoundToggle was using — and nulled
        `bufferRef`. SoundToggle's effect deps had not changed, so it never
        rebuilt the graph. Audio was dead for the rest of the session.

   Worse, on a cold cache the decode is still in flight when the loader lifts
   (~7s). The old `cancelled` flag discarded the result and the buffer was
   never refetched, so the engine note was silent until the next full reload
   — which is why "first time loading isn't loading the audio".

   Now the graph is created on demand, torn down only when sound is actually
   switched off, and the decoded AudioBuffer outlives the context that decoded
   it (AudioBuffers are not bound to an AudioContext), so a rebuild is free. */
const ctxRef = { current: null as AudioContext | null }
const bufferRef = { current: null as AudioBuffer | null }
const sourceRef = { current: null as AudioBufferSourceNode | null }
const gainRef = { current: null as GainNode | null }

/** Survives context teardown — an AudioBuffer is portable between contexts. */
let decodePromise: Promise<AudioBuffer> | null = null

const playingRef = { current: false }
const playingFromRef = { current: 0 }
const startedAtCtxRef = { current: 0 }
const rateRef = { current: 1 }
let pauseTimer: ReturnType<typeof setTimeout> | null = null
let lastProgress = 0
let scrollUnsub: (() => void) | null = null

const subscribers = new Set<() => void>()
let enabledState = (() => {
  if (!STORAGE_OK) return false
  try {
    return localStorage.getItem(PREF_KEY) === '1'
  } catch {
    return false
  }
})()
const emit = () => subscribers.forEach((fn) => fn())

function stopSource() {
  try {
    sourceRef.current?.stop()
  } catch {
    /* already stopped */
  }
  sourceRef.current = null
  playingRef.current = false
  if (pauseTimer) {
    clearTimeout(pauseTimer)
    pauseTimer = null
  }
}

/** Where the audio actually is right now, in video-seconds. */
function audioPosition() {
  const ctx = ctxRef.current
  if (!ctx || !playingRef.current) return 0
  return playingFromRef.current + (ctx.currentTime - startedAtCtxRef.current)
}

/**
 * Start the buffer at `offsetSeconds`, optionally at a playback rate.
 * AudioBufferSourceNode does not preserve pitch when the rate changes, so a
 * run at PLAYBACK_RATE > 1 sounds higher — which reads as revving on an
 * engine track, but it is a real artefact and not something to hide.
 */
function playFromOffset(offsetSeconds: number, rate = 1) {
  const ctx = ctxRef.current
  const buffer = bufferRef.current
  const gain = gainRef.current
  if (!ctx || !buffer || !gain) return

  if (ctx.state === 'suspended') void ctx.resume().catch(() => {})

  stopSource()

  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.connect(gain)
  source.playbackRate.value = rate
  const clamped = Math.max(0, Math.min(offsetSeconds, buffer.duration - 0.01))
  source.start(0, clamped)
  playingFromRef.current = clamped
  startedAtCtxRef.current = ctx.currentTime
  rateRef.current = rate
  sourceRef.current = source
  playingRef.current = true
}

/**
 * Create the context and master gain if they are not already there, and make
 * sure the clip is decoding. Idempotent, and safe to call from anywhere —
 * every caller goes through here rather than constructing its own graph.
 */
function ensureGraph() {
  if (ctxRef.current && ctxRef.current.state !== 'closed') {
    void ensureBuffer(ctxRef.current)
    return ctxRef.current
  }

  let ctx: AudioContext
  try {
    ctx = new AudioContext()
  } catch (err) {
    console.warn('WebAudio unavailable:', err)
    return null
  }
  ctxRef.current = ctx

  const gain = ctx.createGain()
  gain.gain.value = VOLUME
  gain.connect(ctx.destination)
  gainRef.current = gain

  void ensureBuffer(ctx)
  return ctx
}

function ensureBuffer(ctx: AudioContext) {
  if (bufferRef.current) return
  if (!decodePromise) {
    decodePromise = (async () => {
      const response = await fetch(AUDIO_SRC)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const bytes = await response.arrayBuffer()
      return await ctx.decodeAudioData(bytes)
    })()
      .then((decoded) => {
        // Deliberately NOT tied to any component's lifetime: a decode that
        // lands after the loader has lifted is still wanted. This is the
        // first-visit fix — the old code threw the result away.
        bufferRef.current = decoded
        return decoded
      })
      .catch((err) => {
        // Allow a later attempt to retry rather than caching the failure.
        decodePromise = null
        console.warn('Failed to load audio:', err)
        throw err
      })
  }
  void decodePromise.catch(() => {})
}

/** Close the context. Only ever called when sound is switched OFF. */
function teardownGraph() {
  stopSource()
  detachScrollAudio()
  const ctx = ctxRef.current
  ctxRef.current = null
  gainRef.current = null
  // bufferRef and decodePromise deliberately survive: the AudioBuffer is not
  // bound to the context, so switching sound back on costs no refetch.
  if (ctx && ctx.state !== 'closed') void ctx.close().catch(() => {})
}

/**
 * The scroll → audio transport, as ONE subscription for the whole app. It was
 * previously per-`useSound()`-caller, so every scroll tick restarted the
 * source once per caller.
 */
function attachScrollAudio() {
  if (scrollUnsub) return

  const unsub = useScrollStore.subscribe((state) => {
    if (!bufferRef.current) return

    const targetTime = state.progress * VIDEO_DURATION
    const delta = state.progress - lastProgress
    lastProgress = state.progress

    if (Math.abs(delta) < 0.00005) return

    if (delta > 0) {
      // A guided run drives the scroll at a known rate, so the note is
      // played back at that same rate and nudged back if it slips. Under
      // hand-driven scrolling it is left alone — re-seeking on every frame
      // of a hand-driven scroll would sound far worse than a little drift.
      const rate = state.autoplaying ? PLAYBACK_RATE : 1

      if (!playingRef.current || rate !== rateRef.current) {
        playFromOffset(targetTime, rate)
      } else if (state.autoplaying && Math.abs(audioPosition() - targetTime) > DRIFT_TOLERANCE) {
        playFromOffset(targetTime, rate)
      }

      if (pauseTimer) clearTimeout(pauseTimer)
      pauseTimer = setTimeout(stopSource, PAUSE_DELAY_MS)
    } else {
      // Scrolling backward — reverse playback sounds wrong, so stay quiet
      stopSource()
    }
  })

  const handleVisibility = () => {
    if (document.hidden) stopSource()
  }
  document.addEventListener('visibilitychange', handleVisibility)

  scrollUnsub = () => {
    unsub()
    document.removeEventListener('visibilitychange', handleVisibility)
    scrollUnsub = null
  }
}

function detachScrollAudio() {
  scrollUnsub?.()
}

/**
 * Engine audio synced to scroll — plays forward while scrolling down,
 * stops on reverse or idle. Preference persists across visits.
 */
export function useSound() {
  const [, force] = useState(0)
  const enabled = enabledState

  /* Every call site reads the same value and re-renders together — otherwise
     the loader could believe sound is off while the toggle believes it is on. */
  const setEnabled = useCallback(
    (v: boolean | ((prev: boolean) => boolean)) => {
      const next = typeof v === 'function' ? v(enabledState) : v
      if (next === enabledState) return
      enabledState = next
      emit()
      force((n) => n + 1)
    },
    []
  )

  useEffect(() => {
    const rerender = () => force((n) => n + 1)
    subscribers.add(rerender)
    return () => {
      subscribers.delete(rerender)
    }
  }, [])

  /* Graph lifecycle — module-level, driven ONLY by the preference.
     There is deliberately no cleanup that tears the graph down: a component
     unmounting (the loader lifting, which happens on every single visit) must
     not destroy audio that another component is still using. */
  useEffect(() => {
    if (!enabled) {
      teardownGraph()
      return
    }
    ensureGraph()
    attachScrollAudio()
  }, [enabled])

  // A restored preference still needs a user gesture before audio can start.
  useEffect(() => {
    if (!enabled) return
    const resume = () => {
      const ctx = ctxRef.current
      if (ctx?.state === 'suspended') void ctx.resume().catch(() => {})
    }
    window.addEventListener('pointerdown', resume, { once: true })
    window.addEventListener('keydown', resume, { once: true })
    return () => {
      window.removeEventListener('pointerdown', resume)
      window.removeEventListener('keydown', resume)
    }
  }, [enabled])

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev
      if (STORAGE_OK) {
        try {
          if (next) localStorage.setItem(PREF_KEY, '1')
          else localStorage.removeItem(PREF_KEY)
        } catch {
          /* private mode */
        }
      }
      return next
    })
  }, [setEnabled])

  /** Stable identity: an inline arrow here would be a new function every
   * render, and the loader's `useEffect(() => unlock(), [unlock])` would
   * re-fire each time, re-enabling audio after every gate click. `setEnabled`
   * is itself memoised on nothing, so including it keeps this stable too. */
  const unlock = useCallback(() => setEnabled(true), [setEnabled])

  return {
    enabled,
    toggle,
    /**
     * Turn sound on without persisting the choice. The loader needs this: the
     * site's SoundToggle sits at z-index 30 behind an opaque z-index 100
     * loader, so during the intro there is no way for a visitor to ask for
     * sound. The context still starts suspended until a gesture resumes it —
     * this only expresses intent.
     */
    unlock,
    /**
     * The live AudioContext and its master gain, so the engine's starter /
     * idle / blip voices can be layered into THIS graph. A second context
     * would mean two competing ones and a mute control that fights itself.
     */
    ctxRef,
    masterRef: gainRef,
  }
}
