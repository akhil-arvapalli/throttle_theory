import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface Props {
  scrollProgress: number
}

const SLAT_COUNT = 16
const SLAT_HEIGHT = 0.2
const SLAT_WIDTH = 4.0
const SLAT_DEPTH = 0.05

export default function Shutter3D({ scrollProgress }: Props) {
  const shutterGroupRef = useRef<THREE.Group>(null)
  const lightRef = useRef<THREE.PointLight>(null)

  const slatGeo = useMemo(() => new THREE.BoxGeometry(SLAT_WIDTH, SLAT_HEIGHT, SLAT_DEPTH), [])
  const slatMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x222222,
    metalness: 0.6,
    roughness: 0.4,
  }), [])

  useFrame(() => {
    if (!shutterGroupRef.current || !lightRef.current) return

    if (scrollProgress <= 0.30) {
      shutterGroupRef.current.position.y = 0
      lightRef.current.intensity = 0
    } else if (scrollProgress >= 0.48) {
      shutterGroupRef.current.position.y = 3.5
      lightRef.current.intensity = 2.5
    } else {
      const t = (scrollProgress - 0.30) / (0.48 - 0.30)
      shutterGroupRef.current.position.y = t * 3.5
      lightRef.current.intensity = t * 2.5
    }
  })

  // Only visible during phases 1–3
  const visible = scrollProgress < 0.65

  return (
    <group visible={visible}>
      <group ref={shutterGroupRef} position={[0, 0, 2.75]}>
        {Array.from({ length: SLAT_COUNT }, (_, i) => (
          <mesh
            key={i}
            geometry={slatGeo}
            material={slatMat}
            position={[0, 0.1 + i * SLAT_HEIGHT, 0]}
            castShadow={false}
          />
        ))}
      </group>
      {/* Amber light that bleeds under the rising slats */}
      <pointLight
        ref={lightRef}
        color={0xf59e0b}
        position={[0, 1.5, 2.5]}
        distance={5}
        intensity={0}
      />
    </group>
  )
}
