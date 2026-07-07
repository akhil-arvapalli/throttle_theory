import VideoScrubber from './components/VideoScrubber'
import ScrollTracker from './components/ScrollTracker'
import HeroText from './components/overlays/HeroText'
import ServiceCards from './components/overlays/ServiceCards'
import Navbar from './components/overlays/Navbar'
import Footer from './components/ui/Footer'
import SoundToggle from './components/ui/SoundToggle'
import ScrollButtons from './components/ScrollButtons'
import { useScrollStore } from './hooks/useScrollProgress'

export default function App() {
  const progress = useScrollStore((s) => s.progress)

  return (
    <div style={{ overflowX: 'hidden' }}>
      <div id="scroll-container">
        {/* Smooth scroll tracker (pure rAF lerp, no DOM scroll dependency) */}
        <ScrollTracker />

        {/* Video frame scrubber — covers the entire scroll range */}
        <VideoScrubber progress={progress} visible={true} />

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
