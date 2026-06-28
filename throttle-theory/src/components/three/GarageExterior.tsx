import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface Props {
  scrollProgress: number
}

function makeSideTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256; canvas.height = 256
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#c47a1a'
  ctx.fillRect(0, 0, 256, 256)
  ctx.strokeStyle = '#1a0a00'
  ctx.lineWidth = 1.5
  for (let x = 0; x < 256; x += 14) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke()
  }
  return new THREE.CanvasTexture(canvas)
}

function makeRoofTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256; canvas.height = 256
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#8a5210'
  ctx.fillRect(0, 0, 256, 256)
  ctx.strokeStyle = '#1a0a00'
  ctx.lineWidth = 1.5
  for (let x = 0; x < 256; x += 14) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke()
  }
  // Ridge line
  ctx.strokeStyle = '#4a2a00'
  ctx.lineWidth = 3
  ctx.beginPath(); ctx.moveTo(0, 128); ctx.lineTo(256, 128); ctx.stroke()
  return new THREE.CanvasTexture(canvas)
}

function makeGroundTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 512; canvas.height = 512
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#1a1a18'
  ctx.fillRect(0, 0, 512, 512)
  return new THREE.CanvasTexture(canvas)
}

export default function GarageExterior({ scrollProgress }: Props) {
  const groupRef = useRef<THREE.Group>(null)

  const { sideTex, roofTex, groundTex } = useMemo(() => ({
    sideTex: makeSideTexture(),
    roofTex: makeRoofTexture(),
    groundTex: makeGroundTexture(),
  }), [])

  useEffect(() => {
    return () => {
      sideTex.dispose()
      roofTex.dispose()
      groundTex.dispose()
    }
  }, [sideTex, roofTex, groundTex])

  const opacity = scrollProgress < 0.50 ? 1 : scrollProgress > 0.62 ? 0 : 1 - (scrollProgress - 0.50) / 0.12

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.visible = scrollProgress < 0.65
    }
  }, [scrollProgress])

  const sideMat = useMemo(() => new THREE.MeshStandardMaterial({ map: sideTex, transparent: true }), [sideTex])
  const roofMat = useMemo(() => new THREE.MeshStandardMaterial({ map: roofTex, transparent: true }), [roofTex])
  const blackMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x0d0d0d, transparent: true }), [])
  const groundMat = useMemo(() => new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.95, metalness: 0.05 }), [groundTex])

  // Sign material with pulsing emissive handled via useFrame
  const signMatRef = useRef(new THREE.MeshStandardMaterial({
    color: 0x0d0d0d,
    emissive: new THREE.Color(0xf59e0b),
    emissiveIntensity: 0.3,
  }))

  useFrame(({ clock }) => {
    const pulse = Math.sin(clock.getElapsedTime() * (2 * Math.PI / 0.8)) * 0.2
    signMatRef.current.emissiveIntensity = 0.3 + pulse
  })

  // Update opacity on all transparent materials
  useEffect(() => {
    sideMat.opacity = opacity
    roofMat.opacity = opacity
    blackMat.opacity = opacity
  }, [opacity, sideMat, roofMat, blackMat])

  const mainBodyMaterials = [sideMat, sideMat, roofMat, blackMat, sideMat, sideMat]

  return (
    <group ref={groupRef}>
      {/* Main body */}
      <mesh position={[0, 1.75, 0]} receiveShadow>
        <boxGeometry args={[8, 3.5, 5.5]} />
        {mainBodyMaterials.map((mat, i) => (
          <primitive key={i} object={mat} attach={`material-${i}`} />
        ))}
      </mesh>

      {/* Left wing */}
      <mesh position={[-5.4, 1.1, 0]} receiveShadow>
        <boxGeometry args={[2.8, 2.2, 5.5]} />
        <primitive object={sideMat} attach="material" />
      </mesh>

      {/* Right wing */}
      <mesh position={[5.4, 1.1, 0]} receiveShadow>
        <boxGeometry args={[2.8, 2.2, 5.5]} />
        <primitive object={sideMat} attach="material" />
      </mesh>

      {/* Sign board */}
      <mesh position={[0, 3.75, 2.76]}>
        <boxGeometry args={[3.2, 0.55, 0.12]} />
        <primitive object={signMatRef.current} attach="material" />
      </mesh>

      {/* Overhang */}
      <mesh position={[0, 3.55, 3.5]}>
        <boxGeometry args={[9, 0.15, 1.5]} />
        <meshStandardMaterial color={0x1a1a1a} />
      </mesh>

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[40, 40]} />
        <primitive object={groundMat} attach="material" />
      </mesh>
    </group>
  )
}
