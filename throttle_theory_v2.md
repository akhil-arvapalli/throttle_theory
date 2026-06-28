# Throttle Theory — Garage Website (Claude Code Prompt)

---

## Core Concept

One persistent Three.js scene runs the entire page. The camera is the storyteller.
As the user scrolls, the camera moves through 3D space — from aerial above the garage,
swooping down to front, through the entrance, inside, and around the car.
HTML divs sit on top of the canvas for text and UI. Scroll = camera movement.

---

## Tech Stack

```
Vite + React 18 + TypeScript
@react-three/fiber       — R3F canvas (persistent, fullscreen, position: fixed)
@react-three/drei        — OrbitControls, useGLTF helpers, environment
three                    — geometry, materials, textures
gsap + @gsap/react       — ScrollTrigger drives camera, all scroll animation
tailwindcss              — responsive HTML overlays only
framer-motion            — service card entrance animations
howler                   — sound (lazy loaded, off by default)
```

Install:
```bash
npm create vite@latest throttle-theory -- --template react-ts && cd throttle-theory
npm install three @react-three/fiber @react-three/drei gsap @gsap/react framer-motion tailwindcss postcss autoprefixer howler
npm install -D @types/three @types/howler
npx tailwindcss init -p
```

---

## Architecture

```
App.tsx
 ├── <ScrollContainer>          — 600vh tall div, position: relative, overflow: hidden on body
 │    ├── <Scene3D />           — R3F Canvas, position: fixed, top:0 left:0, 100vw × 100vh, z-index: 0
 │    │    ├── CameraController — reads GSAP ScrollTrigger progress, moves camera
 │    │    ├── GarageExterior   — the 3D shed (visible phases 0–2)
 │    │    ├── Shutter3D        — horizontal slat meshes inside the door (visible phases 1–2)
 │    │    ├── GarageInterior   — floor, ceiling, walls, workshop lights (visible phase 3+)
 │    │    ├── Porsche911       — procedural car mesh (visible phase 3+)
 │    │    └── SceneLighting    — all lights, env map
 │    │
 │    ├── <HeroText />          — "THROTTLE THEORY" overlay, z-index: 10 (phase 1)
 │    ├── <ServiceCards />      — 5 Forza-style cards, z-index: 10 (phase 4)
 │    └── <Navbar />            — fixed, z-index: 20, appears after 15% scroll
 │
 └── <Footer />                 — normal flow, appears after scroll container ends
```

---

## Scroll Timeline (total = 600vh)

GSAP ScrollTrigger is set on the 600vh ScrollContainer.
`scrub: 1.5` on all camera animations. Progress is 0.0 → 1.0 across the full 600vh.

```
Progress 0.00 → 0.30   PHASE 1: Aerial sweep
  Camera arcs from overhead (y:30) down to front (y:3.5, z:16)
  "THROTTLE THEORY" text fades in at 0.20

Progress 0.30 → 0.48   PHASE 2: Shutter opens
  Camera holds at front (y:3.5, z:16)
  Shutter slats animate up (translateY: 0 → -100%) in Three.js
  Amber light bleeds out from inside the gap as slats lift

Progress 0.48 → 0.62   PHASE 3: Enter
  Camera moves forward through the entrance
  (z: 16 → -1, y stays ~3.5)
  Exterior fades out (opacity mesh material), interior fades in

Progress 0.62 → 0.72   PHASE 4: Car reveal
  Camera settles at interior position (0, 2.5, 7) looking at origin
  Porsche 911 animates in — drives slowly from z:-20 to z:0, stops center
  Spotlights fade up on car

Progress 0.72 → 1.00   PHASE 5: Service walkaround
  Camera slowly orbits the car (y stays fixed at ~2.5, x and z rotate)
  5 service cards appear as fixed HTML overlays, staggered by scroll
  Each card appears as camera reaches that side of the car
```

---

## File Structure

```
src/
├── main.tsx
├── App.tsx
├── index.css
│
├── components/
│   ├── Scene3D.tsx              ← R3F Canvas entry point
│   ├── CameraController.tsx     ← GSAP ScrollTrigger → camera.position
│   │
│   ├── three/
│   │   ├── GarageExterior.tsx   ← 3D shed box group
│   │   ├── Shutter3D.tsx        ← 3D slat meshes, animated on scroll
│   │   ├── GarageInterior.tsx   ← interior environment
│   │   ├── Porsche911.tsx       ← procedural car mesh
│   │   └── SceneLighting.tsx    ← all lights
│   │
│   ├── overlays/
│   │   ├── HeroText.tsx         ← "THROTTLE THEORY" title overlay
│   │   ├── ServiceCards.tsx     ← 5 cards container
│   │   ├── ServiceCard.tsx      ← individual card with connector line
│   │   └── Navbar.tsx
│   │
│   └── ui/
│       ├── Footer.tsx
│       └── SoundToggle.tsx
│
├── hooks/
│   ├── useScrollProgress.ts     ← returns 0–1 scroll progress
│   └── useSound.ts
│
├── data/
│   └── services.ts
│
└── assets/
    └── garage-front.jpg         ← the actual photo, used as front face texture
```

---

## CameraController.tsx — Exact Spec

This is the most critical component. Get this right first.

```typescript
// Camera path — Catmull-Rom spline through these waypoints:
const WAYPOINTS = {
  aerial:   { pos: [0, 30, 3],   target: [0, 0, 0]  },   // progress 0.00
  arcMid:   { pos: [0, 14, 14],  target: [0, 1, 0]  },   // progress 0.15
  front:    { pos: [0, 3.5, 16], target: [0, 2, 0]  },   // progress 0.30–0.48 (held)
  enter:    { pos: [0, 3.5, -1], target: [0, 2, -10] },   // progress 0.62
  carView:  { pos: [0, 2.5, 7],  target: [0, 1, 0]  },   // progress 0.72
  // orbit continues from here in Phase 5 via a separate useFrame loop
}

// Implementation:
// useGSAP() hook from @gsap/react
// Create a ScrollTrigger timeline pinned to the ScrollContainer
// Use useThree() to get camera reference
// Tween camera.position.x/y/z and a lookAtTarget vec3
// On each frame: camera.lookAt(lookAtTarget)
// Use THREE.CatmullRomCurve3 for smooth arc in Phase 1
// Phases 2 (hold) and 5 (orbit) are separate from the main tween

// Phase 5 orbit: after scroll progress > 0.72, useFrame slowly increments
// orbitAngle and positions camera in a circle around origin at radius 7, height 2.5
// orbitAngle speed = 0.003 rad/frame, pauses when user interacts
```

---

## GarageExterior.tsx — Exact Spec

Build the garage with these meshes. No GLTF. No external files.

```typescript
// All textures: created via CanvasTexture using a <canvas> element drawn in code.

// FRONT FACE TEXTURE (512×384):
// — Use the imported garage-front.jpg as an Image element
// — Draw it onto the canvas: ctx.drawImage(img, 0, 0, 512, 384)
// — This maps the actual photo to the front face
// — THREE.CanvasTexture wrapping it

// SIDE TEXTURE (256×256):
// — Draw amber corrugated metal: fillRect amber base + vertical black lines every 14px

// ROOF TEXTURE (256×256):
// — Draw darker amber + vertical corrugation lines + ridge line horizontal center

// MESH LAYOUT:
// All meshes inside a <group> at position [0,0,0]

const meshes = {
  mainBody: {
    geo: BoxGeometry(8, 3.5, 5.5),
    materials: [side, side, roof, black, FRONT_PHOTO, side],  // MeshStandardMaterial array
    position: [0, 1.75, 0],
  },
  leftWing: {
    geo: BoxGeometry(2.8, 2.2, 5.5),
    // same material array, no photo on front
    position: [-5.4, 1.1, 0],
  },
  rightWing: {
    geo: BoxGeometry(2.8, 2.2, 5.5),
    position: [5.4, 1.1, 0],
  },
  signBoard: {
    geo: BoxGeometry(3.2, 0.55, 0.12),
    material: MeshStandardMaterial({ color: 0x0d0d0d, emissive: 0xf59e0b, emissiveIntensity: 0.3 }),
    position: [0, 3.75, 2.76],
  },
  overhang: {
    // flat slab roof canopy extending forward
    geo: BoxGeometry(9, 0.15, 1.5),
    position: [0, 3.55, 3.5],
    material: MeshStandardMaterial({ color: 0x1a1a1a }),
  },
  ground: {
    geo: PlaneGeometry(40, 40),
    rotation: [-PI/2, 0, 0],
    material: MeshStandardMaterial({ color: 0x1a1a18, roughness: 0.95, metalness: 0.05 }),
  }
}

// Visibility: set garageGroup.visible = false when scroll progress > 0.65
// Fade: on progress 0.50→0.62, tween all exterior materials opacity 1→0
// (set transparent: true on all exterior mats)
```

---

## Shutter3D.tsx — Exact Spec

```typescript
// Position: inside the door opening on the front of the garage
// Door opening approx: x: -2 to +2, y: 0 to 3.2, z: 2.75

// Build 16 slats as BoxGeometry meshes in a group:
const SLAT_COUNT = 16
const SLAT_HEIGHT = 0.2
const SLAT_WIDTH = 4.0
const SLAT_DEPTH = 0.05

// Each slat: BoxGeometry(4.0, 0.2, 0.05)
// Material: MeshStandardMaterial({ color: 0x222222, metalness: 0.6, roughness: 0.4 })
// With a top-edge strip: slightly lighter (0x333333) emissive highlight

// Stack slats at y: 0.1, 0.3, 0.5 ... up to y: 3.1
// All slats are children of shutterGroup

// Animation via CameraController's ScrollTrigger:
// progress 0.30→0.48: shutterGroup.position.y goes 0 → 3.5 (slats slide up, out of door frame)
// A clipplane or just letting them go above the overhang (overhang hides the top edge)

// Light effect: PointLight inside the door at z:2.5, intensity 0→2.5 as shutter opens
// Color: warm amber #f59e0b, distance 5
// This makes the amber light bleed under the rising slats — cinematic effect
```

---

## GarageInterior.tsx — Exact Spec

```typescript
// Visible after scroll progress > 0.55, opacity fades in 0.55→0.65

// Floor: PlaneGeometry(12, 20), rotated, concrete texture (CanvasTexture: gray + grid lines)
// Ceiling: PlaneGeometry(12, 20), y: 4.0, dark
// Left wall: PlaneGeometry(20, 4.0), rotated 90° around Y
// Right wall: same, other side
// Back wall: PlaneGeometry(12, 4.0)

// Workshop lights: 3× RectAreaLight (white, intensity 3, width 1.5, height 0.1)
// Positioned at ceiling level y:3.8, spread along z axis
// These create the characteristic fluorescent workshop look

// Floor material: MeshStandardMaterial, roughness 0.9, metalness 0.05
// CanvasTexture (256×256): dark gray base + grid lines every 32px (slightly lighter gray)
// Large oil stain in center: dark oval ellipse on canvas
```

---

## Porsche911.tsx — Exact Spec

Build entirely from Three.js geometry. Target silhouette: 1973 Porsche 911 Carrera RS.
This must be recognisable — not a generic car shape.

```typescript
// All parts are children of car911Group, centered at origin

// === BODY (the critical piece) ===
// Use THREE.Shape + THREE.ExtrudeGeometry for the side profile

const bodyShape = new THREE.Shape()
// Side profile points — left to right, bottom to top:
// These trace the iconic 911 silhouette
bodyShape.moveTo(-2.1, 0.3)       // front bumper bottom
bodyShape.lineTo(-2.1, 0.55)      // front bumper height
bodyShape.bezierCurveTo(-2.0, 0.7, -1.8, 0.85, -1.5, 0.85)  // front hood slope up
bodyShape.bezierCurveTo(-1.2, 0.85, -0.8, 0.9, -0.5, 1.1)   // hood rises to windshield base
bodyShape.bezierCurveTo(-0.3, 1.4, 0.0, 1.65, 0.4, 1.68)    // windshield angle (steep!)
bodyShape.bezierCurveTo(0.8, 1.70, 1.1, 1.68, 1.4, 1.62)    // roof (flat)
bodyShape.bezierCurveTo(1.6, 1.55, 1.75, 1.35, 1.85, 1.1)   // fastback rear slope
bodyShape.lineTo(2.0, 0.75)       // engine lid
bodyShape.lineTo(2.05, 0.65)      // duck tail spoiler base
bodyShape.lineTo(2.2, 0.72)       // duck tail tip (extends out)
bodyShape.lineTo(2.2, 0.62)       // spoiler underside
bodyShape.lineTo(2.05, 0.55)      // rear bumper top
bodyShape.lineTo(2.1, 0.3)        // rear bumper bottom
bodyShape.lineTo(-2.1, 0.3)       // close shape (bottom)

const extrudeSettings = {
  depth: 1.7,             // car width (half — mirrored)
  bevelEnabled: true,
  bevelThickness: 0.04,
  bevelSize: 0.04,
  bevelSegments: 3,
}

const bodyGeo = new THREE.ExtrudeGeometry(bodyShape, extrudeSettings)
bodyGeo.center()
// Material: Guards Red for impact
// MeshStandardMaterial({ color: 0xcc1111, roughness: 0.15, metalness: 0.7 })

// === WHEEL ARCHES ===
// Cut into the body visually using darker arch shapes
// Front arch: TorusGeometry(0.42, 0.06, 8, 24, PI) — half circle, positioned at front wheel
// Rear arch: same, wider (0.46 radius) — rear wheels are wider on a 911

// Front arch position: x: -1.35, y: 0.42, z: 0 (centered on wheel)
// Rear arch position: x: 1.25, y: 0.44, z: 0

// === WHEELS (x4) ===
// Tire: CylinderGeometry(0.38, 0.38, 0.22, 32) — rotate 90° on Z
// Color: 0x111111, roughness 0.95

// Fuchs wheel (iconic 5-spoke):
// Center hub: CylinderGeometry(0.12, 0.12, 0.24, 32)
// 5 spokes: BoxGeometry(0.05, 0.24, 0.25) rotated at 0°, 72°, 144°, 216°, 288°
// Rim ring: TorusGeometry(0.32, 0.025, 8, 32)
// Color: 0x2a2a2a metalness 0.9

// Wheel positions:
// Front-left:  [-1.35, 0.38, -0.95]
// Front-right: [-1.35, 0.38,  0.95]
// Rear-left:   [ 1.25, 0.38, -1.0 ]   // wider track rear
// Rear-right:  [ 1.25, 0.38,  1.0 ]

// === GLASS ===
// Windshield: PlaneGeometry(1.2, 0.65), angled to match bodyShape slope, z-centered
// Side windows: PlaneGeometry(0.9, 0.45) × 2, left and right
// Rear window: PlaneGeometry(0.7, 0.4)
// Material: MeshPhysicalMaterial({ color: 0x0a2a30, transmission: 0.6, roughness: 0.05, thickness: 0.5 })

// === HEADLIGHTS (round, signature 911) ===
// 2× CircleGeometry(0.14, 32) at front
// Emissive: 0xffe8cc, emissiveIntensity: 2.0
// Outer ring: TorusGeometry(0.14, 0.02, 8, 32) chrome

// === REAR LIGHTS ===
// 2× CircleGeometry(0.12, 32) at rear
// Emissive: 0xff2200, emissiveIntensity: 1.5

// === BUMPERS ===
// Front: BoxGeometry(1.8, 0.25, 0.12) MeshStandardMaterial black rubber
// Rear: same

// === ENTRY ANIMATION ===
// On mount (progress hits 0.62): car911Group.position.z starts at -20
// Tween to z:0 over 0.62→0.72 progress using GSAP
// ease: "power2.out"
// Add a very subtle ambient dust particle system on entry (optional)

// === COLOR TOGGLE ===
// Expose a `color` prop: 'red' | 'white' | 'silver' | 'black'
// Default: Guards Red (0xcc1111)
// Service cards section has a subtle color switcher UI (4 swatches)
```

---

## SceneLighting.tsx — Exact Spec

```typescript
// Phase 1–2 (exterior):
AmbientLight({ intensity: 0.2, color: 0xffffff })
DirectionalLight({ intensity: 1.5, color: 0xfff5e0, position: [8, 20, 12] })  // sun
PointLight({ intensity: 3.0, color: 0xf59e0b, position: [0, 4.2, 3.2], distance: 6 })  // sign glow
PointLight({ intensity: 0.5, color: 0x4060ff, position: [-8, 4, 8] })  // cool fill from sky

// Phase 3–5 (interior):
AmbientLight({ intensity: 0.15 })  // very dark base
RectAreaLight({ intensity: 4, color: 0xfff5e0, width: 2, height: 0.1, position: [0, 3.8, 2] })
RectAreaLight({ intensity: 4, color: 0xfff5e0, width: 2, height: 0.1, position: [0, 3.8, -3] })
RectAreaLight({ intensity: 3, color: 0xfff5e0, width: 2, height: 0.1, position: [0, 3.8, -8] })
// Two hero spotlights on the car:
SpotLight({ intensity: 6, color: 0xfff5e0, position: [-3, 5, 4], angle: PI/7, penumbra: 0.3 })
SpotLight({ intensity: 5, color: 0xffe0c0, position: [3, 5, 4],  angle: PI/7, penumbra: 0.3 })
// Rim light from behind car:
PointLight({ intensity: 2, color: 0xf59e0b, position: [0, 2, -5], distance: 8 })
// Floor reflection: the floor material roughness 0.05, metalness 0.15 — picks up car reflections

// All lights fade in/out based on scroll phase
// Transition exterior→interior: 0.55–0.65 progress
```

---

## Service Cards — Exact Spec

```typescript
// src/data/services.ts
export const SERVICES = [
  {
    id: 'engine',
    title: 'Engine & Performance',
    subtitle: 'Rebuild · Tune · Remap',
    description: 'Full diagnostics, engine rebuilds, ECU remapping, turbo service, and performance upgrades. We speak Bosch and Haltech.',
    items: ['Compression & leak-down testing', 'Timing chain / belt', 'Turbo rebuild & upgrade', 'ECU remap'],
    accentColor: '#f59e0b',
    scrollPhase: 0.75,   // appears when scroll progress hits this value
    position: 'right',   // screen position
  },
  {
    id: 'maintenance',
    title: 'Maintenance & Service',
    subtitle: 'Full spectrum care',
    description: 'Scheduled servicing, brake systems, suspension, AC, and full pre-purchase inspections.',
    items: ['Oil, filter & fluids', 'Brake pads, rotors, caliper', 'Suspension & alignment', 'AC service & regas'],
    accentColor: '#60a5fa',
    scrollPhase: 0.80,
    position: 'left',
  },
  {
    id: 'detailing',
    title: 'Paint & Detailing',
    subtitle: 'Correction · Ceramic · PPF',
    description: 'Single-stage to multi-stage paint correction, ceramic coating, and paint protection film application.',
    items: ['Multi-stage paint correction', 'Ceramic Pro coating', 'PPF (full / partial)', 'Interior deep clean'],
    accentColor: '#34d399',
    scrollPhase: 0.85,
    position: 'right',
  },
  {
    id: 'wrapping',
    title: 'Vinyl Wrapping',
    subtitle: 'Full · Partial · Livery',
    description: 'Full body wraps, chrome deletes, racing stripes, and custom livery design. 3M and Avery certified.',
    items: ['Full body wrap', 'Chrome delete', 'Custom livery design', 'Carbon fibre accents'],
    accentColor: '#a78bfa',
    scrollPhase: 0.88,
    position: 'left',
  },
  {
    id: 'wash',
    title: 'Wash & Valet',
    subtitle: 'Hand wash · Express · Full',
    description: 'Foam cannon hand wash, interior valet, tyre dressing, and express packages. No automated machines — ever.',
    items: ['Foam cannon wash', 'Clay bar decontamination', 'Interior vacuum & wipe', 'Tyre & trim dressing'],
    accentColor: '#38bdf8',
    scrollPhase: 0.93,
    position: 'right',
  },
]

// ServiceCard component:
// — Fixed position HTML div, z-index: 10
// — width: 280px on desktop, full-width stacked below canvas on mobile
// — Background: rgba(8,8,8,0.82), backdrop-filter: blur(12px)
// — Left border: 3px solid accentColor
// — Border-radius: 4px (sharp, automotive)
// — Title: Rajdhani Bold 18px, white
// — Subtitle: Inter 11px, accentColor, letter-spacing 0.1em, uppercase
// — Description: Inter 13px, rgba(255,255,255,0.6), line-height 1.6
// — Item list: 12px, rgba(255,255,255,0.4), with a small accentColor dash prefix
// — Entrance: framer-motion, x: +40 → 0, opacity: 0 → 1, duration 0.5s
// — Connector line: SVG <line> from card edge to a glowing dot on the car zone
//   Dot: 6px circle, accentColor, filter: drop-shadow(0 0 4px accentColor)
//   Line: dashed, 1px, accentColor at 40% opacity
```

---

## Navbar — Exact Spec

```typescript
// position: fixed, top:0, full width, z-index: 20
// Initial state: opacity 0 (hidden)
// Appears: when scroll progress > 0.12 (camera past aerial phase)
// Background: rgba(8,8,8,0.85) backdrop-filter: blur(14px)
// Height: 52px
// Border-bottom: 1px solid rgba(255,255,255,0.06)

// Left: Logo
// — Inline SVG car silhouette icon (simple path, 20×12px, fill amber)
// — "THROTTLE THEORY" Rajdhani Bold, 15px, letter-spacing: 0.2em
// — Color: white, no hover effect on text

// Right: Nav links + Sound toggle
// — Links: Services | About | Contact (smooth scroll to section IDs)
// — Font: Inter 13px, rgba(255,255,255,0.55)
// — Hover: rgba(255,255,255,1), no underline, transition 0.2s
// — Sound toggle: 🔇 icon button, right edge

// Mobile (< 768px):
// — Links hidden, hamburger icon (3 lines SVG, no emoji)
// — Slide-down drawer (framer-motion AnimatePresence), dark bg
```

---

## HeroText Overlay — Exact Spec

```typescript
// position: fixed, centered horizontally, bottom: 18%, z-index: 10

// Content:
// — "THROTTLE THEORY" Rajdhani Bold, 42px desktop / 28px mobile
// — Letter-spacing: 0.25em, color: white
// — Below it: thin amber line (width: 40px, height: 1px, margin auto)
// — Below that: "HYDERABAD — EST. 2026" Inter 11px, rgba(255,255,255,0.35), letter-spacing 0.2em

// Visibility:
// — opacity: 0 until scroll progress 0.20
// — Fade in: progress 0.20 → 0.28
// — Fade out: progress 0.42 → 0.50 (disappears before entering)
// — Never visible during interior / car phases

// On load (progress = 0), show a subtle scroll indicator:
// — Arrow down SVG, bottom center, rgba(255,255,255,0.25)
// — Gentle bounce animation (CSS keyframe, -6px → 0px, 1.5s infinite)
// — Disappears at progress > 0.08
```

---

## Scene3D.tsx — Exact Spec

```typescript
// The R3F Canvas wrapper

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
  <CameraController />
</Canvas>

// scrollProgress is from a shared zustand or jotai atom
// updated by CameraController's ScrollTrigger callback
// All child components read the same progress value to decide visibility/opacity
```

---

## useScrollProgress.ts

```typescript
// Create a Zustand store (install: npm install zustand)
// Store shape: { progress: number, setProgress: (p: number) => void }
// CameraController calls setProgress inside ScrollTrigger onUpdate
// All overlay components and Three.js components subscribe to progress
// This avoids prop drilling across the canvas boundary

import { create } from 'zustand'
export const useScrollStore = create(set => ({
  progress: 0,
  setProgress: (progress) => set({ progress }),
}))
```

---

## Performance — Non-Negotiable

```
1. CanvasTextures: create once on mount, never recreate on re-render
2. Geometries: create once, reuse across instances (wheel geometry × 4)
3. Materials: share materials across meshes where possible
4. frameloop: "always" is fine — the scene always has subtle animation (sign glow, car shimmer)
5. Three.js dispose: call geo.dispose() and mat.dispose() on unmount
6. Shadows: only the car and key interior objects cast shadows (castShadow: true)
   Exterior shed: receiveShadow only, not castShadow
7. CSS: use will-change: transform on all overlay elements that animate
8. HTML overlays: use framer-motion layout animations, never JS setInterval
9. ScrollTrigger scrub: 1.5 (smooth, not instant) — never scrub: true (too snappy)
10. Mobile: reduce dpr to [1, 1.5], disable shadows, simplify Porsche911 geometry
    (reduce bevel segments from 3 to 1, skip particle effects)
11. Vite chunk split: three + @react-three/* in their own chunk (see vite.config.ts below)
```

---

## vite.config.ts

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'three-core': ['three'],
          'three-fiber': ['@react-three/fiber', '@react-three/drei'],
          'gsap': ['gsap', '@gsap/react'],
          'motion': ['framer-motion'],
        }
      }
    },
    target: 'esnext',
  }
})
```

---

## Tailwind Config (tailwind.config.js)

```js
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        brand: ['Rajdhani', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      colors: {
        amber: { DEFAULT: '#f59e0b', dim: '#92640a' },
        garage: {
          black: '#080808',
          dark: '#111111',
          surface: '#1a1a1a',
        }
      }
    }
  }
}
```

---

## index.css (global)

```css
@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Inter:wght@400;500&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: auto; }  /* GSAP controls scroll, not CSS */
body { background: #080808; color: #f5f5f0; font-family: 'Inter', sans-serif; overflow-x: hidden; }
#scroll-container { height: 600vh; position: relative; }

@media (prefers-reduced-motion: reduce) {
  /* Static fallback: skip all scroll animations, show sections stacked */
  #scroll-container { height: auto; }
  canvas { position: relative !important; height: 100vh !important; }
}
```

---

## Footer

```typescript
// Normal flow, sits after the 600vh scroll container ends
// Background: #080808
// Border-top: 1px solid rgba(255,255,255,0.06)
// Padding: 48px 5%
// Two column grid:
//   Left: Logo + tagline "We work on machines. Not timelines."
//   Right: Services list (5 items) | Contact column
// Contact: Address Hyderabad | phone | hours Mon–Sat 9am–7pm
// Bottom bar: "© 2026 Throttle Theory" left, "Instagram | Google Maps" right
// All text: Inter 13px, rgba(255,255,255,0.45)
// Headers: Rajdhani 14px, rgba(255,255,255,0.8), letter-spacing 0.12em
```

---

## Sound Design (lazy, off by default)

```typescript
// SoundToggle.tsx: fixed bottom-right, z-index: 30
// Icon: speaker SVG (inline, no emoji)
// On click: load Howler sounds, start ambient
//
// Sounds:
// ambient.mp3     — low workshop hum, loop, volume 0.15
// shutter.mp3     — metal roller sound, plays once at progress 0.30
// engineRev.mp3   — 911 engine rev, plays once at progress 0.68 (car enters)
//
// All sounds: Howler.js, loaded ONLY after user enables audio
// Mobile: never autoplay, toggle must be explicit user tap
```

---

## Build Order for Claude Code

Build in this exact sequence. Don't skip ahead.

```
1. Project scaffold + installs + tailwind config
2. index.css + App.tsx (ScrollContainer shell + Canvas placeholder)
3. useScrollStore (zustand atom)
4. Scene3D.tsx + SceneLighting.tsx (empty scene, lighting only)
5. CameraController.tsx — get the camera path working and verify with slider
6. GarageExterior.tsx — shed boxes with textures
7. Shutter3D.tsx — slat meshes + animation
8. GarageInterior.tsx — floor, walls, workshop lights
9. Porsche911.tsx — build piece by piece, verify silhouette
10. HeroText.tsx overlay
11. ServiceCards.tsx + ServiceCard.tsx (5 cards, staggered)
12. Navbar.tsx
13. Footer.tsx
14. SoundToggle.tsx (last — optional)
15. Performance pass: dispose cleanup, mobile breakpoints, reduced-motion
16. vite.config.ts chunk splitting
```

---

## Final Notes

- The `garage-front.jpg` image is placed in `src/assets/`. Import it and use it as the texture source for the front face of `GarageExterior`. Draw it to a CanvasTexture via `ctx.drawImage(img, ...)`.
- The Porsche 911 silhouette shape coordinates above are a starting point. Adjust bezier handles until the profile looks unmistakably like a 911 — the steep windshield angle and the duck tail spoiler are the most identifiable features. Do not skip them.
- Color scheme is `#080808` black, `#f59e0b` amber, `#f5f5f0` near-white. Nothing else. No blues, no greens in the UI chrome.
- Every scroll animation uses `scrub: 1.5` — never `scrub: true` (too harsh) or `scrub: false` (not scrubbed).
- The garage has a real neon sign. The `emissiveIntensity` on the sign material should pulse slightly using `useFrame` (sin wave, 0.2 amplitude, 0.8s period). This makes it feel alive even before the camera reaches the front.
