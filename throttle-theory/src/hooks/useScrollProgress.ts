import { create } from 'zustand'

interface ScrollStore {
  progress: number
  setProgress: (p: number) => void
  jumpTarget: number | null
  jumpTo: (p: number) => void
}

export const useScrollStore = create<ScrollStore>((set) => ({
  progress: 0,
  setProgress: (progress) => set({ progress }),
  jumpTarget: null,
  jumpTo: (p) => set({ jumpTarget: p }),
}))
