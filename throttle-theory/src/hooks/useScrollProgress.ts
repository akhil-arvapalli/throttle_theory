import { create } from 'zustand'

interface ScrollStore {
  progress: number
  setProgress: (p: number) => void
}

export const useScrollStore = create<ScrollStore>((set) => ({
  progress: 0,
  setProgress: (progress) => set({ progress }),
}))
