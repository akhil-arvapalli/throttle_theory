import { Canvas } from '@react-three/fiber'
import { ContactShadows, Environment } from '@react-three/drei'
import * as THREE from 'three'
import SceneLighting from './three/SceneLighting'
import GarageExterior from './three/GarageExterior'
import Shutter3D from './three/Shutter3D'
import GarageInterior from './three/GarageInterior'
import PorscheAsset from './three/PorscheAsset'
import CameraController from './CameraController'

interface Props {
  sceneProgress: number
  visible: boolean
}

export default function Scene3D({ sceneProgress, visible }: Props) {
  return (
    <Canvas
      camera={{ fov: 45, near: 0.1, far: 200 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        opacity: visible ? 1 : 0,
        pointerEvents: 'none',
      }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.12
        gl.outputColorSpace = THREE.SRGBColorSpace
        gl.shadowMap.enabled = false
        scene.background = new THREE.Color('#050505')
        scene.fog = new THREE.Fog('#050505', 14, 55)
      }}
      dpr={[1, 1.75]}
      frameloop="always"
      shadows={false}
    >
      <color attach="background" args={['#050505']} />
      <fog attach="fog" args={['#050505', 14, 55]} />
      {/* Always interior phase — exterior/shutter never shown after video */}
      <SceneLighting scrollProgress={1.0} />
      <GarageExterior scrollProgress={1.0} />
      <Shutter3D scrollProgress={1.0} />
      <GarageInterior scrollProgress={0.65} />
      <PorscheAsset scrollProgress={sceneProgress} />
      <Environment preset="city" background={false} blur={0.35} />
      <ContactShadows
        position={[0, 0.02, 0]}
        opacity={0.55}
        scale={28}
        blur={2.8}
        far={18}
        resolution={512}
        color="#000000"
      />
      <CameraController sceneProgress={sceneProgress} />
    </Canvas>
  )
}
