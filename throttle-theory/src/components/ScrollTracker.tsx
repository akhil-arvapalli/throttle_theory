import { type RefObject } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useScrollStore } from '../hooks/useScrollProgress'

gsap.registerPlugin(ScrollTrigger)

interface Props {
  scrollContainerRef: RefObject<HTMLDivElement | null>
}

// Lives outside the Canvas so it always tracks scroll,
// even when the Three.js canvas is hidden during the video phase.
export default function ScrollTracker({ scrollContainerRef }: Props) {
  const setProgress = useScrollStore((s) => s.setProgress)

  useGSAP(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const st = ScrollTrigger.create({
      trigger: container,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.5,
      onUpdate: (self) => setProgress(self.progress),
    })

    return () => st.kill()
  }, { dependencies: [] })

  return null
}
