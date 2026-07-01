import { useEffect, useRef, useState } from 'react'

const TOTAL_FRAMES = 192
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

  useEffect(() => {
    if (!loaded || !canvasRef.current || !visible) return

    const frameIndex = Math.min(
      Math.floor(progress * (TOTAL_FRAMES - 1)),
      TOTAL_FRAMES - 1
    )

    if (frameIndex === lastFrame.current) return
    lastFrame.current = frameIndex

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = frames[frameIndex]
    if (img?.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    }
  }, [progress, loaded, visible, frames])

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
      }}
    />
  )
}
