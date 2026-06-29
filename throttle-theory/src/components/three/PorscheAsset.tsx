import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import Porsche911 from './Porsche911'

interface Props {
  scrollProgress: number
  color?: 'red' | 'white' | 'silver' | 'black'
}

const PORSCHE_MODEL_URL = '/porsche.glb'

function ImportedPorsche({ scrollProgress }: Props) {
  const groupRef = useRef<THREE.Group>(null)
  const entryDone = useRef(false)
  const { scene } = useGLTF(PORSCHE_MODEL_URL)

  // Deep-clone the scene so we get our own copy of the scene graph
  // with all materials, textures, and hierarchy preserved
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true)

    clone.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return
      const mesh = child as THREE.Mesh
      mesh.castShadow = true
      mesh.receiveShadow = true
    })

    return clone
  }, [scene])

  useEffect(() => {
    if (!groupRef.current) return
    if (scrollProgress >= 0.62 && !entryDone.current) {
      groupRef.current.position.z = -20
      gsap.to(groupRef.current.position, {
        z: 0,
        duration: 1.2,
        ease: 'power2.out',
      })
      entryDone.current = true
    }
  }, [scrollProgress])

  if (scrollProgress < 0.62) return null

  return (
    <group ref={groupRef} position={[0, 0, 0]} scale={1.0}>
      <primitive object={clonedScene} dispose={null} />
    </group>
  )
}

export default function PorscheAsset({ scrollProgress, color = 'red' }: Props) {
  const [hasModel, setHasModel] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch(PORSCHE_MODEL_URL, { method: 'HEAD' })
      .then((response) => {
        if (!cancelled) setHasModel(response.ok)
      })
      .catch(() => {
        if (!cancelled) setHasModel(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (hasModel === false) {
    return <Porsche911 scrollProgress={scrollProgress} color={color} />
  }

  return (
    <Suspense fallback={<Porsche911 scrollProgress={scrollProgress} color={color} />}>
      <ImportedPorsche scrollProgress={scrollProgress} color={color} />
    </Suspense>
  )
}
