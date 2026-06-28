import { useRef } from 'react'
import Scene3D from './components/Scene3D'
import HeroText from './components/overlays/HeroText'
import ServiceCards from './components/overlays/ServiceCards'
import Navbar from './components/overlays/Navbar'
import Footer from './components/ui/Footer'
import SoundToggle from './components/ui/SoundToggle'

export default function App() {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  return (
    <div style={{ overflowX: 'hidden' }}>
      <div id="scroll-container" ref={scrollContainerRef}>
        <Scene3D scrollContainerRef={scrollContainerRef} />
        <HeroText />
        <ServiceCards />
        <Navbar />
        <SoundToggle />
      </div>
      <Footer />
    </div>
  )
}
