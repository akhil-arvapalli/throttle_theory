import { useMemo, useEffect } from 'react'
import * as THREE from 'three'

interface Props {
  scrollProgress: number
}

function makeFloorTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256; canvas.height = 256
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#2a2a28'
  ctx.fillRect(0, 0, 256, 256)
  ctx.strokeStyle = '#333331'
  ctx.lineWidth = 1
  for (let x = 0; x <= 256; x += 32) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke()
  }
  for (let y = 0; y <= 256; y += 32) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke()
  }
  // Oil stain
  ctx.fillStyle = 'rgba(10,10,8,0.5)'
  ctx.beginPath()
  ctx.ellipse(128, 128, 55, 35, 0.3, 0, Math.PI * 2)
  ctx.fill()
  return new THREE.CanvasTexture(canvas)
}

export default function GarageInterior({ scrollProgress }: Props) {
  const opacity = scrollProgress < 0.55 ? 0 : scrollProgress > 0.65 ? 1 : (scrollProgress - 0.55) / 0.10
  const visible = scrollProgress > 0.55

  const floorTex = useMemo(() => makeFloorTexture(), [])
  useEffect(() => () => floorTex.dispose(), [floorTex])

  const floorMat = useMemo(() => new THREE.MeshStandardMaterial({
    map: floorTex,
    roughness: 0.05,
    metalness: 0.15,
    transparent: true,
  }), [floorTex])

  const wallMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.9,
    transparent: true,
  }), [])

  useEffect(() => {
    floorMat.opacity = opacity
    wallMat.opacity = opacity
  }, [opacity, floorMat, wallMat])

  if (!visible) return null

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -4]} receiveShadow>
        <planeGeometry args={[12, 20]} />
        <primitive object={floorMat} attach="material" />
      </mesh>

      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 4.0, -4]}>
        <planeGeometry args={[12, 20]} />
        <meshStandardMaterial color={0x111111} transparent opacity={opacity} />
      </mesh>

      {/* Left wall */}
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-6, 2, -4]}>
        <planeGeometry args={[20, 4.0]} />
        <primitive object={wallMat} attach="material" />
      </mesh>

      {/* Right wall */}
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[6, 2, -4]}>
        <planeGeometry args={[20, 4.0]} />
        <primitive object={wallMat} attach="material" />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, 2, -14]}>
        <planeGeometry args={[12, 4.0]} />
        <primitive object={wallMat} attach="material" />
      </mesh>
    </group>
  )
}
