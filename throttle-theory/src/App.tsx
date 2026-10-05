import ScrollTracker from './components/ScrollTracker'
import VideoScrubber from './components/VideoScrubber'
import Loader from './components/EngineLoader'
import HeroText from './components/overlays/HeroText'
import AboutStatement from './components/overlays/AboutStatement'
import ServiceCards from './components/overlays/ServiceCards'
import FinalCTA from './components/FinalCTA'
import Navbar from './components/overlays/Navbar'
import ProgressRail from './components/ProgressRail'
import Footer from './components/ui/Footer'
import SoundToggle from './components/ui/SoundToggle'
import AutoplayScroll from './components/AutoplayScroll'

export default function App() {
  return (
    <>
      {/* Scroll spacer — native scrolling drives the whole experience */}
      <div id="scroll-container" aria-hidden="true" />

      <ScrollTracker />
      <AutoplayScroll />
      <VideoScrubber />
      <Loader />
      <HeroText />
      <AboutStatement />
      <ServiceCards />
      <FinalCTA />
      <Navbar />
      <ProgressRail />
      <SoundToggle />
      <Footer />
    </>
  )
}