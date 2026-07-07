import { useState, useRef, useEffect } from 'react'
import { useScrollStore } from './useScrollProgress'

const VIDEO_DURATION = 50.17 // seconds – matches final_throttle_theory.mp4
const AUDIO_SRC = '/audio/video-audio.mp3'

export function useSound() {
  const [enabled, setEnabled] = useState(false)
  const ctxRef = useRef<AudioContext | null>(null)
  const bufferRef = useRef<AudioBuffer | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const playingRef = useRef(false)
  const pauseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastProgress = useRef(0)

  // Load audio buffer once when enabled
  useEffect(() => {
    if (!enabled) return

    let cancelled = false

    async function loadAudio() {
      try {
        const ctx = new AudioContext()
        ctxRef.current = ctx

        const gain = ctx.createGain()
        gain.gain.value = 1.0
        gain.connect(ctx.destination)
        gainRef.current = gain

        const response = await fetch(AUDIO_SRC)
        const arrayBuffer = await response.arrayBuffer()
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer)

        if (!cancelled) {
          bufferRef.current = audioBuffer
          // Set initial position
          lastProgress.current = useScrollStore.getState().progress
        }
      } catch (err) {
        console.warn('Failed to load audio:', err)
      }
    }

    loadAudio()

    return () => {
      cancelled = true
      stopSource()
      ctxRef.current?.close()
      ctxRef.current = null
      bufferRef.current = null
    }
  }, [enabled])

  function stopSource() {
    try {
      sourceRef.current?.stop()
    } catch {}
    sourceRef.current = null
    playingRef.current = false
  }

  function playFromOffset(offsetSeconds: number) {
    const ctx = ctxRef.current
    const buffer = bufferRef.current
    const gain = gainRef.current
    if (!ctx || !buffer || !gain) return

    // Resume context if suspended (autoplay policy)
    if (ctx.state === 'suspended') ctx.resume()

    // Stop any currently playing source
    stopSource()

    // Create a new source each time (Web Audio sources are one-shot)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(gain)

    // Clamp offset to valid range
    const clampedOffset = Math.max(0, Math.min(offsetSeconds, buffer.duration - 0.01))
    source.start(0, clampedOffset)
    sourceRef.current = source
    playingRef.current = true
  }

  // Sync to scroll
  useEffect(() => {
    if (!enabled) return

    const unsub = useScrollStore.subscribe((state) => {
      if (!bufferRef.current) return

      const targetTime = state.progress * VIDEO_DURATION
      const delta = state.progress - lastProgress.current
      lastProgress.current = state.progress

      const isScrolling = Math.abs(delta) > 0.00005

      if (isScrolling && delta > 0) {
        // Scrolling forward — play from current position
        if (!playingRef.current) {
          playFromOffset(targetTime)
        }

        // Reset the auto-pause timer
        if (pauseTimer.current) clearTimeout(pauseTimer.current)
        pauseTimer.current = setTimeout(() => {
          stopSource()
        }, 150)
      } else if (isScrolling && delta < 0) {
        // Scrolling backward — stop audio (reverse playback sounds bad)
        stopSource()
      }
    })

    return () => {
      unsub()
      if (pauseTimer.current) clearTimeout(pauseTimer.current)
    }
  }, [enabled])

  function enable() {
    setEnabled(true)
  }

  function disable() {
    stopSource()
    setEnabled(false)
  }

  function toggle() {
    enabled ? disable() : enable()
  }

  // Backward compat stubs
  function playShutter() {}
  function playEngineRev() {}

  return { enabled, toggle, playShutter, playEngineRev }
}
