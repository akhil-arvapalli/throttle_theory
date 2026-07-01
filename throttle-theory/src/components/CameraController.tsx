import { useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface Props {
  sceneProgress: number
}

// Video covers the exterior approach. 3D scene picks up from garage entrance.
// sceneProgress 0→1 maps to:
//   0.00–0.15  entrance → interior entry
//   0.15–0.40  settle to interior car view
//   0.40–0.60  car reveal (camera holds)
//   0.60–1.00  orbit with service cards
const WAYPOINTS = {
  entrance: { pos: new THREE.Vector3(0, 2.8, 5),   target: new THREE.Vector3(0, 1.5, 0)   },
  interior: { pos: new THREE.Vector3(0, 3.0, -1),  target: new THREE.Vector3(0, 1.5, -10) },
  carView:  { pos: new THREE.Vector3(0, 2.5, 7),   target: new THREE.Vector3(0, 1, 0)     },
}

export default function CameraController({ sceneProgress }: Props) {
  const { camera } = useThree()
  const lookAtTarget = useRef(new THREE.Vector3(0, 1, 0))

  useFrame(() => {
    const p = sceneProgress

    if (p <= 0.20) {
      // Hold at car view while car drives in
      camera.position.copy(WAYPOINTS.carView.pos)
      lookAtTarget.current.copy(WAYPOINTS.carView.target)

    } else {
      // Orbit around car — maps 0.20→1.0 to a full 360°
      const orbitT = (p - 0.20) / 0.80
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
