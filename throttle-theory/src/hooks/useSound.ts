import { useState, useRef, useEffect, useCallback } from 'react'
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


/* ═══ shared graph ═══════════════════════════════════════════════════════
   One AudioContext for the whole app. `useSound` is called from more than one
   component (the loader and the sound toggle); giving each its own context
   produced two competing ones, a duplicate fetch of the same recording, and a
   mute button that only governed half the site. */
const ctxRef = { current: null as AudioContext | null }
const bufferRef = { current: null as AudioBuffer | null }
const sourceRef = { current: null as AudioBufferSourceNode | null }
const gainRef = { current: null as GainNode | null }
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

  // Intentionally the shared module refs, not per-instance ones: App renders
  // both EngineLoader and SoundToggle, and two independent useSound() calls
  // meant two AudioContexts, two fetches of the same 1.2MB clip, and a mute
  // control governing only one of them.

  const playingRef = useRef(false)
  const playingFromRef = useRef(0)
  const startedAtCtxRef = useRef(0)
  const rateRef = useRef(1)
  const pauseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastProgress = useRef(0)
  const bufferLoading = useRef(false)

  const stopSource = useCallback(() => {
    try {
      sourceRef.current?.stop()
    } catch {
      /* already stopped */
    }
    sourceRef.current = null
    playingRef.current = false
  }, [])

  /**
   * Start the buffer at `offsetSeconds`, optionally at a playback rate.
   * AudioBufferSourceNode does not preserve pitch when the rate changes, so a
   * run at PLAYBACK_RATE > 1 sounds higher — which reads as revving on an
   * engine track, but it is a real artefact and not something to hide.
   */
  const playFromOffset = useCallback((offsetSeconds: number, rate = 1) => {
    const ctx = ctxRef.current
    const buffer = bufferRef.current
    const gain = gainRef.current
    if (!ctx || !buffer || !gain) return

    if (ctx.state === 'suspended') void ctx.resume()

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
  }, [stopSource])

  /** Where the audio actually is right now, in video-seconds. */
  const audioPosition = useCallback(() => {
    const ctx = ctxRef.current
    if (!ctx || !playingRef.current) return 0
    return playingFromRef.current + (ctx.currentTime - startedAtCtxRef.current)
  }, [])

  // Create/tear down the audio context with the preference
  useEffect(() => {
    if (!enabled) return

    let cancelled = false

    async function loadAudio() {
      try {
        const ctx = new AudioContext()
        ctxRef.current = ctx

        const gain = ctx.createGain()
        gain.gain.value = VOLUME
        gain.connect(ctx.destination)
        gainRef.current = gain

        if (!bufferLoading.current) {
          bufferLoading.current = true
          const response = await fetch(AUDIO_SRC)
          const arrayBuffer = await response.arrayBuffer()
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
          bufferLoading.current = false
          if (!cancelled) {
            bufferRef.current = audioBuffer
            lastProgress.current = useScrollStore.getState().progress
          }
        }
      } catch (err) {
        console.warn('Failed to load audio:', err)
      }
    }

    void loadAudio()

    return () => {
      cancelled = true
      stopSource()
      void ctxRef.current?.close()
      ctxRef.current = null
      bufferRef.current = null
      gainRef.current = null
    }
  }, [enabled, stopSource])

  // Sync playback to scroll
  useEffect(() => {
    if (!enabled) return

    const unsub = useScrollStore.subscribe((state) => {
      if (!bufferRef.current) return

      const targetTime = state.progress * VIDEO_DURATION
      const delta = state.progress - lastProgress.current
      lastProgress.current = state.progress

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

        if (pauseTimer.current) clearTimeout(pauseTimer.current)
        pauseTimer.current = setTimeout(stopSource, PAUSE_DELAY_MS)
      } else {
        // Scrolling backward — reverse playback sounds wrong, so stay quiet
        stopSource()
      }
    })

    const handleVisibility = () => {
      if (document.hidden) stopSource()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      unsub()
      document.removeEventListener('visibilitychange', handleVisibility)
      if (pauseTimer.current) clearTimeout(pauseTimer.current)
    }
  }, [enabled, playFromOffset, stopSource, audioPosition])

  // Restored preference needs a user gesture before audio can start
  useEffect(() => {
    if (!enabled || !ctxRef.current) return
    const resume = () => {
      if (ctxRef.current?.state === 'suspended') void ctxRef.current.resume()
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
      if (!next) stopSource()
      return next
    })
  }, [stopSource, setEnabled])

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
