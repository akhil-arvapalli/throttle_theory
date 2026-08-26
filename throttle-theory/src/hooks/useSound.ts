import { useState, useRef, useEffect, useCallback } from 'react'
import { useScrollStore } from './useScrollProgress'

const VIDEO_DURATION = 50.17 // seconds — matches the frame sequence (1202 @ ~23.96fps)
const AUDIO_SRC = '/audio/video-audio.mp3'
const PREF_KEY = 'tt-sound-enabled'
const VOLUME = 0.85
const PAUSE_DELAY_MS = 150

const STORAGE_OK = (() => {
  try {
    return typeof localStorage !== 'undefined'
  } catch {
    return false
  }
})()

/**
 * Engine audio synced to scroll — plays forward while scrolling down,
 * stops on reverse or idle. Preference persists across visits.
 */
export function useSound() {
  const [enabled, setEnabled] = useState(() => {
    if (!STORAGE_OK) return false
    try {
      return localStorage.getItem(PREF_KEY) === '1'
    } catch {
      return false
    }
  })

  const ctxRef = useRef<AudioContext | null>(null)
  const bufferRef = useRef<AudioBuffer | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const playingRef = useRef(false)
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

  const playFromOffset = useCallback((offsetSeconds: number) => {
    const ctx = ctxRef.current
    const buffer = bufferRef.current
    const gain = gainRef.current
    if (!ctx || !buffer || !gain) return

    if (ctx.state === 'suspended') void ctx.resume()

    stopSource()

    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(gain)
    const clamped = Math.max(0, Math.min(offsetSeconds, buffer.duration - 0.01))
    source.start(0, clamped)
    sourceRef.current = source
    playingRef.current = true
  }, [stopSource])

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
        // Scrolling forward — play from the matching position
        if (!playingRef.current) playFromOffset(targetTime)
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
  }, [enabled, playFromOffset, stopSource])

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
  }, [stopSource])

  return { enabled, toggle }
}
