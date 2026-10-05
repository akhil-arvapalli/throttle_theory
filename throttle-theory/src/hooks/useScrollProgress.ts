import { create } from 'zustand'

interface ScrollStore {
  /** Smoothed 0→1 progress — drives all rendering. */
  progress: number
  /** Raw scroll-derived 0→1 target. */
  target: number
  /** True once the required initial frames have loaded — successes only. */
  startReady: boolean
  /**
   * True once every required initial frame has settled and at least one FAILED.
   * Distinct from `startReady` on purpose: the loader must not hang waiting on
   * frames that will never arrive, but it must equally not treat a failed
   * frame as if it were decoded. This is the honest third state.
   */
  startFailed: boolean
  /** True once the loader has lifted and the experience has begun. */
  ready: boolean
  /**
   * True once the loader is actually unmounted. `ready` fires when the ignite
   * phase *starts*, ~700ms before the panel is gone and the flash has burnt
   * out — so anything that keys off `ready` begins its entrance behind a black
   * panel and a white flash.
   */
  lifted: boolean
  /** Frame preloading progress for the loader UI. */
  framesLoaded: number
  framesTotal: number
  /** True while the guided run is driving the page. */
  autoplaying: boolean
  setProgress: (p: number) => void
  setTarget: (t: number) => void
  setStartReady: (v: boolean) => void
  setStartFailed: (v: boolean) => void
  setReady: (v: boolean) => void
  setLifted: (v: boolean) => void
  setFrames: (loaded: number, total: number) => void
  startAutoplay: () => void
  stopAutoplay: () => void
}

export const useScrollStore = create<ScrollStore>((set) => ({
  progress: 0,
  target: 0,
  startReady: false,
  startFailed: false,
  ready: false,
  lifted: false,
  framesLoaded: 0,
  framesTotal: 0,
  autoplaying: false,
  setProgress: (progress) => set({ progress }),
  setTarget: (target) => set({ target }),
  setStartReady: (startReady) => set({ startReady }),
  setStartFailed: (startFailed) => set({ startFailed }),
  setReady: (ready) => set({ ready }),
  setLifted: (lifted) => set({ lifted }),
  setFrames: (framesLoaded, framesTotal) => set({ framesLoaded, framesTotal }),
  startAutoplay: () => set({ autoplaying: true }),
  stopAutoplay: () => set({ autoplaying: false }),
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