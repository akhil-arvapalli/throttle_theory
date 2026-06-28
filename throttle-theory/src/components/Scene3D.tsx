import { type RefObject } from 'react'
import { Canvas } from '@react-three/fiber'
import { useScrollStore } from '../hooks/useScrollProgress'
import SceneLighting from './three/SceneLighting'
import GarageExterior from './three/GarageExterior'
import Shutter3D from './three/Shutter3D'
import GarageInterior from './three/GarageInterior'
import Porsche911 from './three/Porsche911'
import CameraController from './CameraController'

interface Props {
  scrollContainerRef: RefObject<HTMLDivElement | null>
}

export default function Scene3D({ scrollContainerRef }: Props) {
  const progress = useScrollStore((s) => s.progress)

  return (
    <Canvas
      camera={{ fov: 45, near: 0.1, far: 200 }}
      style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      frameloop="always"
      shadows
    >
      <SceneLighting scrollProgress={progress} />
      <GarageExterior scrollProgress={progress} />
      <Shutter3D scrollProgress={progress} />
      <GarageInterior scrollProgress={progress} />
      <Porsche911 scrollProgress={progress} />
      <CameraController scrollContainerRef={scrollContainerRef} />
    </Canvas>
  )
}
