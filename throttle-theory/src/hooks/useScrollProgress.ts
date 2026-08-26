import { create } from 'zustand'

interface ScrollStore {
  /** Smoothed 0→1 progress — drives all rendering. */
  progress: number
  /** Raw scroll-derived 0→1 target. */
  target: number
  /** True once the first START_FRAMES frames have loaded. */
  startReady: boolean
  /** True once the loader has lifted and the experience has begun. */
  ready: boolean
  /** Frame preloading progress for the loader UI. */
  framesLoaded: number
  framesTotal: number
  setProgress: (p: number) => void
  setTarget: (t: number) => void
  setStartReady: (v: boolean) => void
  setReady: (v: boolean) => void
  setFrames: (loaded: number, total: number) => void
}

export const useScrollStore = create<ScrollStore>((set) => ({
  progress: 0,
  target: 0,
  startReady: false,
  ready: false,
  framesLoaded: 0,
  framesTotal: 0,
  setProgress: (progress) => set({ progress }),
  setTarget: (target) => set({ target }),
  setStartReady: (startReady) => set({ startReady }),
  setReady: (ready) => set({ ready }),
  setFrames: (framesLoaded, framesTotal) => set({ framesLoaded, framesTotal }),
}))

/**
 * Named scroll positions (0→1), tuned to the video's scenes:
 *   0.00  night facade + neon sign (hero)
 *   0.14  threshold — lights flick on (about statement)
 *   0.22  workshop aisle (maintenance card)
 *   0.33  engine bay (engine card)
 *   0.45  classic Porsche 930 (restoration card)
 *   0.60  paint booth reveal (paint card)
 *   0.75  finished car exits bay (wraps & finishing card)
 *   0.91  neon finale (CTA)
 *   1.00  footer
 */
export const SECTIONS = {
  home: 0,
  about: 0.16,
  services: 0.24,
  contact: 1,
} as const

export function scrollToProgress(p: number, smooth = true) {
  const max = document.documentElement.scrollHeight - window.innerHeight
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({
    top: Math.max(0, Math.min(1, p)) * max,
    behavior: reduced || !smooth ? 'auto' : 'smooth',
  })
}