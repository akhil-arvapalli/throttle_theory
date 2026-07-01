import { useRef } from 'react'
import Scene3D from './components/Scene3D'
import VideoScrubber from './components/VideoScrubber'
import ScrollTracker from './components/ScrollTracker'
import HeroText from './components/overlays/HeroText'
import ServiceCards from './components/overlays/ServiceCards'
import Navbar from './components/overlays/Navbar'
import Footer from './components/ui/Footer'
import SoundToggle from './components/ui/SoundToggle'
import ScrollButtons from './components/ScrollButtons'
import { useScrollStore } from './hooks/useScrollProgress'

// First 50% of scroll = video frames, second 50% = 3D car scene
const VIDEO_END = 0.50

export default function App() {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const progress = useScrollStore((s) => s.progress)

  const inVideoPhase = progress < VIDEO_END
  const videoProgress = Math.min(progress / VIDEO_END, 1)
  const sceneProgress = inVideoPhase ? 0 : (progress - VIDEO_END) / (1 - VIDEO_END)

  return (
    <div style={{ overflowX: 'hidden' }}>
      <div id="scroll-container" ref={scrollContainerRef}>
        {/* Always-on scroll tracker — lives outside Canvas so it fires even when Canvas is hidden */}
        <ScrollTracker scrollContainerRef={scrollContainerRef} />

        {/* Video scrubber on top during first half */}
        <VideoScrubber progress={videoProgress} visible={inVideoPhase} />

        {/* 3D scene always mounted; opacity switches at the halfway point */}
        <Scene3D sceneProgress={sceneProgress} visible={!inVideoPhase} />

        <HeroText />
        <ServiceCards />
        <Navbar />
        <SoundToggle />
        <ScrollButtons />
      </div>
      <Footer />
    </div>
  )
}
