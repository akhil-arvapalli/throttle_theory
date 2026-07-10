import VideoScrubber from './components/VideoScrubber'
import ScrollTracker from './components/ScrollTracker'
import HeroText from './components/overlays/HeroText'
import HomeServices from './components/overlays/HomeServices'
import GarageBox from './components/overlays/GarageBox'
import Navbar from './components/overlays/Navbar'
import Footer from './components/ui/Footer'
import SoundToggle from './components/ui/SoundToggle'
import ScrollButtons from './components/ScrollButtons'
import { useScrollStore } from './hooks/useScrollProgress'
import { SERVICES } from './data/services'

export default function App() {
  const progress = useScrollStore((s) => s.progress)

  return (
    <div style={{ overflowX: 'hidden' }}>
      <div id="scroll-container">
        <ScrollTracker />
        <VideoScrubber progress={progress} visible={true} />

        {/* Clip 1 (0.000–0.143): opening — no overlay */}

        {/* Clip 2 (0.143–0.286): home page */}
        <HeroText />
        <HomeServices progress={progress} />

        {/* Clips 3–7 (0.286–1.000): service detail boxes */}
        {SERVICES.map((service) => (
          <GarageBox key={service.id} service={service} progress={progress} />
        ))}

        <Navbar />
        <SoundToggle />
        <ScrollButtons />
      </div>
      <Footer />
    </div>
  )
}
