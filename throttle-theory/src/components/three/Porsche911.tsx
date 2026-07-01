import { useRef, useMemo, useEffect } from 'react'
import gsap from 'gsap'
import * as THREE from 'three'

interface Props {
  scrollProgress: number
  color?: 'red' | 'white' | 'silver' | 'black'
}

const BODY_COLORS = {
  red: 0xcc1111,
  white: 0xf0f0f0,
  silver: 0x9a9a9a,
  black: 0x111111,
}

function buildBodyGeo(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape()
  shape.moveTo(-2.1, 0.3)
  shape.lineTo(-2.1, 0.55)
  shape.bezierCurveTo(-2.0, 0.7, -1.8, 0.85, -1.5, 0.85)
  shape.bezierCurveTo(-1.2, 0.85, -0.8, 0.9, -0.5, 1.1)
  shape.bezierCurveTo(-0.3, 1.4, 0.0, 1.65, 0.4, 1.68)
  shape.bezierCurveTo(0.8, 1.70, 1.1, 1.68, 1.4, 1.62)
  shape.bezierCurveTo(1.6, 1.55, 1.75, 1.35, 1.85, 1.1)
  shape.lineTo(2.0, 0.75)
  shape.lineTo(2.05, 0.65)
  shape.lineTo(2.2, 0.72)
  shape.lineTo(2.2, 0.62)
  shape.lineTo(2.05, 0.55)
  shape.lineTo(2.1, 0.3)
  shape.lineTo(-2.1, 0.3)

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 1.7,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.04,
    bevelSegments: 3,
  })
  geo.center()
  return geo
}

function buildWheel(tireGeo: THREE.CylinderGeometry, tireMat: THREE.MeshStandardMaterial, hubMat: THREE.MeshStandardMaterial): THREE.Group {
  const wheel = new THREE.Group()

  // Tire
  const tire = new THREE.Mesh(tireGeo, tireMat)
  tire.rotation.z = Math.PI / 2
  wheel.add(tire)

  // Fuchs 5-spoke wheel
  const hubGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.24, 32)
  wheel.add(new THREE.Mesh(hubGeo, hubMat))

  const spokeGeo = new THREE.BoxGeometry(0.05, 0.24, 0.25)
  for (let i = 0; i < 5; i++) {
    const spoke = new THREE.Mesh(spokeGeo, hubMat)
    spoke.rotation.z = (i * 72 * Math.PI) / 180
    wheel.add(spoke)
  }

  const rimGeo = new THREE.TorusGeometry(0.32, 0.025, 8, 32)
  const rim = new THREE.Mesh(rimGeo, hubMat)
  rim.rotation.x = Math.PI / 2
  wheel.add(rim)

  return wheel
}

export default function Porsche911({ scrollProgress, color = 'red' }: Props) {
  const groupRef = useRef<THREE.Group>(null)
  const entryDone = useRef(false)

  const bodyColor = BODY_COLORS[color]

  const {
    bodyGeo, bodyMat, glassMat, tireMat, hubMat,
    headlightMat, headlightRingMat, rearLightMat, bumperMat,
    tireGeo,
  } = useMemo(() => {
    const bodyGeo = buildBodyGeo()
    const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.15, metalness: 0.7 })
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x0a2a30, transmission: 0.6, roughness: 0.05, thickness: 0.5 })
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.95 })
    const hubMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.9, roughness: 0.2 })
    const headlightMat = new THREE.MeshStandardMaterial({ color: 0xffe8cc, emissive: new THREE.Color(0xffe8cc), emissiveIntensity: 2.0 })
    const headlightRingMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9 })
    const rearLightMat = new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: new THREE.Color(0xff2200), emissiveIntensity: 1.5 })
    const bumperMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 })
    const tireGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.22, 32)
    return { bodyGeo, bodyMat, glassMat, tireMat, hubMat, headlightMat, headlightRingMat, rearLightMat, bumperMat, tireGeo }
  }, [bodyColor])

  useEffect(() => {
    bodyMat.color.setHex(bodyColor)
  }, [bodyColor, bodyMat])

  useEffect(() => {
    return () => {
      bodyGeo.dispose()
      bodyMat.dispose()
      glassMat.dispose()
      tireMat.dispose()
      hubMat.dispose()
      tireGeo.dispose()
    }
  }, [bodyGeo, bodyMat, glassMat, tireMat, hubMat, tireGeo])

  // Entry animation fires on mount — car slides in from z:-20
  useEffect(() => {
    if (!groupRef.current || entryDone.current) return
    groupRef.current.position.z = -20
    gsap.to(groupRef.current.position, {
      z: 0,
      duration: 1.4,
      ease: 'power2.out',
    })
    entryDone.current = true
  }, [])

  const visible = true

  const frontWheelLeft = useMemo(() => buildWheel(tireGeo, tireMat, hubMat), [tireGeo, tireMat, hubMat])
  const frontWheelRight = useMemo(() => buildWheel(tireGeo, tireMat, hubMat), [tireGeo, tireMat, hubMat])
  const rearWheelLeft = useMemo(() => buildWheel(tireGeo, tireMat, hubMat), [tireGeo, tireMat, hubMat])
  const rearWheelRight = useMemo(() => buildWheel(tireGeo, tireMat, hubMat), [tireGeo, tireMat, hubMat])

  if (!visible) return null

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Body */}
      <mesh geometry={bodyGeo} material={bodyMat} position={[0, 0.38, 0]} castShadow />

      {/* Wheel arches — dark half-circle overlays */}
      <mesh position={[-1.35, 0.42, 0]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.42, 0.06, 8, 24, Math.PI]} />
        <meshStandardMaterial color={0x111111} />
      </mesh>
      <mesh position={[1.25, 0.44, 0]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.46, 0.06, 8, 24, Math.PI]} />
        <meshStandardMaterial color={0x111111} />
      </mesh>

      {/* Wheels */}
      <primitive object={frontWheelLeft} position={[-1.35, 0.38, -0.95]} />
      <primitive object={frontWheelRight} position={[-1.35, 0.38, 0.95]} />
      <primitive object={rearWheelLeft} position={[1.25, 0.38, -1.0]} />
      <primitive object={rearWheelRight} position={[1.25, 0.38, 1.0]} />

      {/* Windshield */}
      <mesh position={[-0.05, 1.15, 0]} rotation={[0.55, 0, 0]}>
        <planeGeometry args={[1.2, 0.65]} />
        <primitive object={glassMat} attach="material" />
      </mesh>

      {/* Side windows */}
      <mesh position={[0.5, 1.1, -0.86]}>
        <planeGeometry args={[0.9, 0.45]} />
        <primitive object={glassMat} attach="material" />
      </mesh>
      <mesh position={[0.5, 1.1, 0.86]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[0.9, 0.45]} />
        <primitive object={glassMat} attach="material" />
      </mesh>

      {/* Rear window */}
      <mesh position={[1.2, 1.1, 0]} rotation={[-0.5, 0, 0]}>
        <planeGeometry args={[0.7, 0.4]} />
        <primitive object={glassMat} attach="material" />
      </mesh>

      {/* Headlights — round signature 911 */}
      <mesh position={[-2.05, 0.62, -0.45]}>
        <circleGeometry args={[0.14, 32]} />
        <primitive object={headlightMat} attach="material" />
      </mesh>
      <mesh position={[-2.05, 0.62, 0.45]}>
        <circleGeometry args={[0.14, 32]} />
        <primitive object={headlightMat} attach="material" />
      </mesh>
      {/* Headlight rings */}
      <mesh position={[-2.04, 0.62, -0.45]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.14, 0.02, 8, 32]} />
        <primitive object={headlightRingMat} attach="material" />
      </mesh>
      <mesh position={[-2.04, 0.62, 0.45]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.14, 0.02, 8, 32]} />
        <primitive object={headlightRingMat} attach="material" />
      </mesh>

      {/* Rear lights */}
      <mesh position={[2.12, 0.62, -0.45]} rotation={[0, Math.PI / 2, 0]}>
        <circleGeometry args={[0.12, 32]} />
        <primitive object={rearLightMat} attach="material" />
      </mesh>
      <mesh position={[2.12, 0.62, 0.45]} rotation={[0, Math.PI / 2, 0]}>
        <circleGeometry args={[0.12, 32]} />
        <primitive object={rearLightMat} attach="material" />
      </mesh>

      {/* Bumpers */}
      <mesh position={[-2.1, 0.42, 0]} material={bumperMat}>
        <boxGeometry args={[0.12, 0.25, 1.8]} />
      </mesh>
      <mesh position={[2.1, 0.42, 0]} material={bumperMat}>
        <boxGeometry args={[0.12, 0.25, 1.8]} />
      </mesh>
    </group>
  )
}
