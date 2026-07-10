import { useEffect, useRef, useState } from 'react'

const TOTAL_FRAMES = 1344
const FRAME_PATH = (n: number) => `/frames/frame_${String(n).padStart(4, '0')}.webp`

// Preload all frames into Image objects once on mount
function useFrames() {
  const [loaded, setLoaded] = useState(false)
  const frames = useRef<HTMLImageElement[]>([])

  useEffect(() => {
    let completed = 0
    const images: HTMLImageElement[] = []

    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image()
      img.src = FRAME_PATH(i)
      img.onload = img.onerror = () => {
        completed++
        if (completed === TOTAL_FRAMES) setLoaded(true)
      }
      images.push(img)
    }

    frames.current = images
  }, [])

  return { frames: frames.current, loaded }
}

interface Props {
  // 0→1 progress within the video section only
  progress: number
  visible: boolean
}

export default function VideoScrubber({ progress, visible }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { frames, loaded } = useFrames()
  const lastFrame = useRef(-1)
  const rafId = useRef(0)
  const progressRef = useRef(progress)

  // Keep a ref in sync so rAF can read the latest value
  progressRef.current = progress

  // Use a persistent rAF loop for buttery-smooth rendering
  useEffect(() => {
    if (!loaded || !visible) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    let running = true

    const tick = () => {
      if (!running) return

      const frameIndex = Math.min(
        Math.floor(progressRef.current * (TOTAL_FRAMES - 1)),
        TOTAL_FRAMES - 1
      )

      if (frameIndex !== lastFrame.current) {
        lastFrame.current = frameIndex
        const img = frames[frameIndex]
        if (img?.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        }
      }

      rafId.current = requestAnimationFrame(tick)
    }

    rafId.current = requestAnimationFrame(tick)

    return () => {
      running = false
      cancelAnimationFrame(rafId.current)
    }
  }, [loaded, visible, frames])

  return (
    <canvas
      ref={canvasRef}
      width={1280}
      height={720}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        objectFit: 'cover',
        display: visible ? 'block' : 'none',
        background: '#050505',
        pointerEvents: 'none',
      }}
    />
  )
}
