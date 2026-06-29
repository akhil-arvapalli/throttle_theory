import { type RefObject, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import * as THREE from 'three'
import { useScrollStore } from '../hooks/useScrollProgress'

gsap.registerPlugin(ScrollTrigger)

interface Props {
  scrollContainerRef: RefObject<HTMLDivElement | null>
}

// Camera path waypoints
const WAYPOINTS = {
  aerial:  { pos: new THREE.Vector3(0, 30, 3),   target: new THREE.Vector3(0, 0, 0)   },
  arcMid:  { pos: new THREE.Vector3(0, 14, 14),  target: new THREE.Vector3(0, 1, 0)   },
  front:   { pos: new THREE.Vector3(0, 3.5, 16), target: new THREE.Vector3(0, 2, 0)   },
  enter:   { pos: new THREE.Vector3(0, 3.5, -1), target: new THREE.Vector3(0, 2, -10) },
  carView: { pos: new THREE.Vector3(0, 2.5, 7),  target: new THREE.Vector3(0, 1, 0)   },
}

// Catmull-Rom spline for aerial arc (phase 1, progress 0→0.30 mapped to 0→1)
const arcCurve = new THREE.CatmullRomCurve3([
  WAYPOINTS.aerial.pos,
  WAYPOINTS.arcMid.pos,
  WAYPOINTS.front.pos,
])
const arcTargetCurve = new THREE.CatmullRomCurve3([
  WAYPOINTS.aerial.target,
  new THREE.Vector3(0, 1, 2),
  WAYPOINTS.front.target,
])

export default function CameraController({ scrollContainerRef }: Props) {
  const { camera } = useThree()
  const setProgress = useScrollStore((s) => s.setProgress)
  const progressRef = useRef(0)
  const lookAtTarget = useRef(new THREE.Vector3(0, 0, 0))

  useGSAP(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const proxy = { value: 0 }

    const st = ScrollTrigger.create({
      trigger: container,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.5,
      onUpdate: (self) => {
        proxy.value = self.progress
        progressRef.current = self.progress
        setProgress(self.progress)
      },
    })

    return () => st.kill()
  }, { dependencies: [] })

  useFrame(() => {
    const p = progressRef.current

    if (p <= 0.30) {
      // Phase 1: Aerial arc via Catmull-Rom
      const t = p / 0.30
      arcCurve.getPoint(t, camera.position)
      arcTargetCurve.getPoint(t, lookAtTarget.current)

    } else if (p <= 0.48) {
      // Phase 2: Hold at front — shutter opens
      camera.position.copy(WAYPOINTS.front.pos)
      lookAtTarget.current.copy(WAYPOINTS.front.target)

    } else if (p <= 0.62) {
      // Phase 3: Move through entrance
      const t = (p - 0.48) / (0.62 - 0.48)
      camera.position.lerpVectors(WAYPOINTS.front.pos, WAYPOINTS.enter.pos, t)
      lookAtTarget.current.lerpVectors(WAYPOINTS.front.target, WAYPOINTS.enter.target, t)

    } else if (p <= 0.72) {
      // Phase 4: Settle to car view
      const t = (p - 0.62) / (0.72 - 0.62)
      camera.position.lerpVectors(WAYPOINTS.enter.pos, WAYPOINTS.carView.pos, t)
      lookAtTarget.current.lerpVectors(WAYPOINTS.enter.target, WAYPOINTS.carView.target, t)

    } else {
      // Phase 5: Scroll-driven orbit around car
      // Maps progress 0.72→1.0 to a full 360° orbit
      const orbitT = (p - 0.72) / (1.0 - 0.72)
      const angle = orbitT * Math.PI * 2
      const radius = 7
      camera.position.x = Math.sin(angle) * radius
      camera.position.y = 2.5
      camera.position.z = Math.cos(angle) * radius
      lookAtTarget.current.set(0, 1, 0)
    }

    camera.lookAt(lookAtTarget.current)
  })

  return null
}
