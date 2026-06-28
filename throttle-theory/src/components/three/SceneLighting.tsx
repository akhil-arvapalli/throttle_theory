import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'
import * as THREE from 'three'

RectAreaLightUniformsLib.init()

interface Props {
  scrollProgress: number
}

export default function SceneLighting({ scrollProgress }: Props) {
  const exteriorOpacity = scrollProgress < 0.55 ? 1 : scrollProgress > 0.65 ? 0 : 1 - (scrollProgress - 0.55) / 0.10
  const interiorOpacity = scrollProgress < 0.55 ? 0 : scrollProgress > 0.65 ? 1 : (scrollProgress - 0.55) / 0.10

  const signGlowRef = useRef<THREE.PointLight>(null)

  useFrame(({ clock }) => {
    if (signGlowRef.current) {
      const pulse = Math.sin(clock.getElapsedTime() * (2 * Math.PI / 0.8)) * 0.2
      signGlowRef.current.intensity = (3.0 + pulse) * exteriorOpacity
    }
  })

  return (
    <>
      {/* Exterior phase lights */}
      <ambientLight intensity={0.2 * exteriorOpacity} color={0xffffff} />
      <directionalLight
        intensity={1.5 * exteriorOpacity}
        color={0xfff5e0}
        position={[8, 20, 12]}
        castShadow={false}
      />
      <pointLight
        ref={signGlowRef}
        color={0xf59e0b}
        position={[0, 4.2, 3.2]}
        distance={6}
      />
      <pointLight
        intensity={0.5 * exteriorOpacity}
        color={0x4060ff}
        position={[-8, 4, 8]}
      />

      {/* Interior phase lights */}
      <ambientLight intensity={0.15 * interiorOpacity} />
      <rectAreaLight
        intensity={4 * interiorOpacity}
        color={0xfff5e0}
        width={2}
        height={0.1}
        position={[0, 3.8, 2]}
        rotation={[-Math.PI / 2, 0, 0]}
      />
      <rectAreaLight
        intensity={4 * interiorOpacity}
        color={0xfff5e0}
        width={2}
        height={0.1}
        position={[0, 3.8, -3]}
        rotation={[-Math.PI / 2, 0, 0]}
      />
      <rectAreaLight
        intensity={3 * interiorOpacity}
        color={0xfff5e0}
        width={2}
        height={0.1}
        position={[0, 3.8, -8]}
        rotation={[-Math.PI / 2, 0, 0]}
      />
      <spotLight
        intensity={6 * interiorOpacity}
        color={0xfff5e0}
        position={[-3, 5, 4]}
        angle={Math.PI / 7}
        penumbra={0.3}
        castShadow
      />
      <spotLight
        intensity={5 * interiorOpacity}
        color={0xffe0c0}
        position={[3, 5, 4]}
        angle={Math.PI / 7}
        penumbra={0.3}
        castShadow
      />
      <pointLight
        intensity={2 * interiorOpacity}
        color={0xf59e0b}
        position={[0, 2, -5]}
        distance={8}
      />
    </>
  )
}
