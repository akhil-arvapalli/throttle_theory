# Throttle Theory — Complete Build Checklist
> Repo: https://github.com/akhil-arvapalli/throttle_theory
> Stack: Vite + React 18 + TypeScript + Three.js/R3F + GSAP + Tailwind
> Goal: Cinematic frame-scrub exterior → realistic Three.js interior → Porsche 911 walkaround

---

## PHASE 0 — Assets & Prerequisites
> Do these manually before touching code

- [ ] **Garage video** — Go to [flow.google.com](https://flow.google.com) → Scenes → upload garage photo → prompt:
  ```
  Cinematic drone shot starting directly overhead looking down at the 
  roof of Throttle Theory garage at night. Camera slowly sweeps forward 
  and down to eye level facing the amber neon-lit entrance and roller 
  shutter. Moody, dark, cinematic. 8 seconds smooth continuous movement.
  ```
- [ ] **Extract frames** — [ezgif.com/video-to-gif](https://ezgif.com/video-to-gif) → switch to "Video to JPG" tab → 30 FPS → convert → download ZIP
- [ ] **Rename frames** — rename extracted images to `frame001.jpg` → `frame240.jpg` (sequential)
- [ ] **Put frames in repo** — `/throttle-theory/public/frames/frame001.jpg` ... `frame240.jpg`
- [ ] **Confirm hero.png exists** — `src/assets/hero.png` should be the garage front photo ✓ (already in repo)
- [ ] **Get a Porsche 911 GLB** (optional but major upgrade) — either:
  - Download free model: [sketchfab.com/3d-models/porsche-911](https://sketchfab.com/models/categories/cars-vehicles?q=porsche+911&sort_by=-likeCount&license=cc-attribution) → download GLTF → convert to GLB in Blender
  - OR keep the procedural mesh (skip this item)
- [ ] If you have a GLB → place it at `public/models/porsche911.glb`

---

## PHASE 1 — Install Packages
> Run in `/throttle-theory`

- [ ] Install post-processing:
  ```bash
  npm install @react-three/postprocessing postprocessing
  ```
- [ ] Install zustand if not already there:
  ```bash
  npm install zustand
  ```
- [ ] Verify dev server runs clean:
  ```bash
  npm run dev
  ```

---

## PHASE 2 — Frame Scrubber (Exterior Aerial Pan)
> Replace the CSS aerial trick with real pre-rendered frames
> **Paste this entire section to Claude Code**

```
In the throttle-theory repo, create a new file:
src/components/sections/FrameScrubber.tsx

Content:
- Canvas element, position fixed, full viewport, z-index 0
- On mount: preload all 240 frames from /frames/frame001.jpg to frame240.jpg
  Use a priority queue: load frames 1-30 first (critical path), then 31-240
- useScrollStore to read progress (0-1)
- Map scroll progress 0.00 → 0.45 to frame index 1 → 240
- On each progress change: draw the current frame to canvas via ctx.drawImage
- Use requestAnimationFrame to batch draw calls, never draw more than once per frame
- Add a loading state: show a dark screen with a small amber pulsing dot 
  until first 30 frames are loaded
- Export: default FrameScrubber

Then in Scene3D.tsx:
- Import FrameScrubber
- Render FrameScrubber when progress < 0.50
- Render the Three.js Canvas when progress >= 0.40
- Between 0.40-0.50: both render simultaneously (FrameScrubber on top fading out)
  Fade: FrameScrubber opacity goes 1 → 0 as progress goes 0.40 → 0.50
- The Three.js canvas starts transparent and fades in over the same range
```

- [ ] FrameScrubber created
- [ ] Tested: frames play as you scroll 0-45%
- [ ] Tested: smooth crossfade to Three.js canvas at 40-50%
- [ ] No jank on scrub (stays locked to scroll, not async)

---

## PHASE 3 — Three.js Realism Upgrades
> These are surgical edits to existing files
> **Paste each sub-section to Claude Code separately**

### 3A — Fix the front face texture bug (GarageExterior.tsx)
```
In src/components/three/GarageExterior.tsx:

CURRENT BUG: mainBodyMaterials[4] (the front face of the garage box, 
the face that faces the camera) is using sideMat (corrugated amber texture).
The hero.png (actual garage photo) is never used anywhere. Fix this:

1. Import useTexture from @react-three/drei
2. Import heroUrl from '../../assets/hero.png'
3. Inside the component: const heroTex = useTexture(heroUrl)
4. Set heroTex.flipY = false
5. Create frontMat = new THREE.MeshStandardMaterial({ map: heroTex, roughness: 0.7, transparent: true })
6. Change mainBodyMaterials to: [sideMat, sideMat, roofMat, blackMat, frontMat, sideMat]
   (index 4 is +Z face = front face = what the camera sees)

Also: move all material opacity updates from useEffect to useFrame.
The current useEffect pattern fires on every React re-render (60fps React overhead).
useFrame is synced to RAF and has zero React overhead.
Pattern: useFrame(() => { sideMat.opacity = calcOpacity(scrollProgress) })
```

- [ ] hero.png showing on garage front face
- [ ] Material opacity running in useFrame not useEffect

### 3B — HDRI + ContactShadows + Post-processing (Scene3D.tsx)
```
In src/components/Scene3D.tsx, make these additions inside the Canvas:

1. Add Environment from @react-three/drei:
   <Environment preset="warehouse" background={false} />
   (background false = reflections only, not visible as bg)

2. Add ContactShadows from @react-three/drei, only when progress >= 0.60:
   <ContactShadows position={[0, 0.02, 0]} opacity={0.65} scale={12} blur={2.0} far={3} />

3. Add EffectComposer from @react-three/postprocessing after all meshes:
   <EffectComposer multisampling={4}>
     <SSAO blendFunction={BlendFunction.MULTIPLY} samples={16} radius={0.04} intensity={12} />
     <Bloom intensity={0.6} luminanceThreshold={0.85} luminanceSmoothing={0.05} mipmapBlur />
     <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
   </EffectComposer>

4. On Canvas gl prop: add toneMapping: 0 (disables default, postprocessing handles it)
5. Add shadows="soft" to Canvas (enables PCFSoftShadowMap)
6. Wrap everything in <Suspense fallback={null}>
```

- [ ] HDRI warehouse env loaded (car now has real reflections)
- [ ] ContactShadows visible under car
- [ ] SSAO making crevices dark and real
- [ ] Bloom making sign and headlights glow
- [ ] ACES filmic tonemapping killing the flat look

### 3C — MeshPhysicalMaterial on car (Porsche911.tsx)
```
In src/components/three/Porsche911.tsx:

Replace bodyMat with:
new THREE.MeshPhysicalMaterial({
  color: bodyColor,
  roughness: 0.08,
  metalness: 0.9,
  clearcoat: 1.0,
  clearcoatRoughness: 0.04,
  reflectivity: 1.0,
  envMapIntensity: 2.0,
})

Replace glassMat with:
new THREE.MeshPhysicalMaterial({
  color: 0x0a2a30,
  transmission: 1.0,
  thickness: 0.8,
  roughness: 0.0,
  ior: 1.5,
  transparent: true,
  envMapIntensity: 1.5,
})

Replace hubMat with:
new THREE.MeshPhysicalMaterial({ 
  color: 0x1a1a1a, metalness: 1.0, roughness: 0.1, reflectivity: 1.0 
})
```

- [ ] Car paint has visible clearcoat sheen
- [ ] Glass is physically transparent (transmission not opacity)
- [ ] Wheels look chromed/metallic

### 3D — If you have a GLB model (optional upgrade)
```
In src/components/three/Porsche911.tsx:
If file public/models/porsche911.glb exists:

Replace the entire procedural mesh construction with:
  import { useGLTF } from '@react-three/drei'
  const { scene } = useGLTF('/models/porsche911.glb')
  
  // Apply MeshPhysicalMaterial to all car body meshes:
  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        if (child.name.toLowerCase().includes('body') || 
            child.name.toLowerCase().includes('paint')) {
          child.material = bodyMat
        }
        if (child.name.toLowerCase().includes('glass') || 
            child.name.toLowerCase().includes('window')) {
          child.material = glassMat
        }
        child.castShadow = true
        child.receiveShadow = true
      }
    })
  }, [scene])

  return <primitive object={scene} ref={groupRef} />

Add outside component: useGLTF.preload('/models/porsche911.glb')
```

- [ ] GLB model loading (if you have it)
- [ ] Materials applied correctly to body/glass meshes
- [ ] Preload added

### 3E — Lighting fix (SceneLighting.tsx)
```
In src/components/three/SceneLighting.tsx:

BUGS TO FIX:
1. There are two ambientLight components — remove one, keep intensity 0.12
2. The directionalLight has castShadow={false} — change to castShadow={true}
3. Add shadow camera config to directionalLight:
   shadow-mapSize={[2048, 2048]}
   shadow-camera-near={0.1}
   shadow-camera-far={40}
   shadow-camera-left={-10}
   shadow-camera-right={10}
   shadow-camera-top={10}
   shadow-camera-bottom={-10}
   shadow-bias={-0.001}
4. Add a rim light behind the car (interior phase only):
   <pointLight intensity={3 * intOpacity} color={0xf59e0b} position={[0, 2, -6]} distance={10} />
5. Add a cool under-light for floor reflection:
   <pointLight intensity={1.5 * intOpacity} color={0x80b0ff} position={[0, 0.1, 0]} distance={6} />
```

- [ ] Single ambient light
- [ ] Directional light casting shadows with correct frustum
- [ ] Rim light visible on car rear
- [ ] Floor reflection light visible

### 3F — Reflective workshop floor (GarageInterior.tsx)
```
In src/components/three/GarageInterior.tsx:

Replace floorMat with:
new THREE.MeshStandardMaterial({
  map: floorTex,
  roughness: 0.02,      // near-mirror epoxy floor
  metalness: 0.3,
  envMapIntensity: 1.5,
  transparent: true,
})

Upgrade makeFloorTexture to draw:
- Dark gray-green base (#252825) — workshop epoxy color
- Subtle grid lines every 32px (rgba white, 4% opacity)
- Two oil stain radial gradients (elliptical, centered under where car parks)
- One tyre track streak across floor
```

- [ ] Car reflects in floor (epoxy mirror effect)
- [ ] Oil stains visible
- [ ] Floor looks like an actual workshop, not gray box

---

## PHASE 4 — UI / UX Fixes
> **Paste to Claude Code**

### 4A — Service cards accumulation fix
```
In src/components/overlays/ServiceCards.tsx:

CURRENT BUG: Cards disappear after scrollProgress passes scrollPhase + 0.07.
FIX: Cards should appear at their scrollPhase and STAY VISIBLE for the rest 
of the page (Forza-style accumulation).

Change visibility logic to:
  const appeared = progress >= service.scrollPhase   // appears and stays

Also add a 'highlighted' prop to ServiceCard — the most recently appeared card 
gets full opacity (1.0), earlier cards drop to 0.65 opacity.
Most recent = the card with the highest scrollPhase that is <= current progress.

In ServiceCard.tsx add highlighted prop:
  border-left color: highlighted ? accentColor : accentColor + '55'  
  opacity: highlighted ? 1 : 0.65
  scale: highlighted ? 1 : 0.97
```

- [ ] Cards accumulate and stack (don't disappear)
- [ ] Most recent card is highlighted
- [ ] Earlier cards visible at lower opacity

### 4B — Camera transition easing
```
In src/components/CameraController.tsx:

Add this helper:
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3) / 2
}

In Phase 3 (enter): wrap the lerp progress in easeInOutCubic
In Phase 4 (car reveal): wrap the lerp progress in easeInOutCubic

Also: at top of useFrame block, add:
if (p < 0.72) orbitAngle.current = 0
This resets the orbit if user scrolls back, so car doesn't 
start mid-orbit when they scroll forward again.
```

- [ ] Camera phase transitions feel smooth and cinematic (not mechanical)
- [ ] Orbit resets correctly on back-scroll

### 4C — Navbar polish
```
In src/components/overlays/Navbar.tsx:

1. Navbar should hide when user scrolls DOWN fast (not just appear/disappear at threshold)
   Use: track lastProgress, if progress increasing fast → hide, if decreasing → show
2. Add transition: opacity 0.3s ease on the navbar div
3. On mobile (< 768px): hamburger menu with framer-motion AnimatePresence slide-down drawer
```

- [ ] Navbar hides on fast scroll down, shows on scroll up
- [ ] Mobile hamburger working

---

## PHASE 5 — Performance
> **Paste to Claude Code**

```
In throttle-theory, apply these performance fixes:

1. vite.config.ts — add manualChunks:
   'three-core': ['three']
   'r3f': ['@react-three/fiber', '@react-three/drei']  
   'postfx': ['@react-three/postprocessing', 'postprocessing']
   'gsap': ['gsap', '@gsap/react']
   'motion': ['framer-motion']
   'state': ['zustand']

2. In Scene3D.tsx Canvas: add dpr={[1, Math.min(window.devicePixelRatio, 2)]}

3. All components that subscribe to useScrollStore: use selector pattern
   const progress = useScrollStore(s => s.progress)   ← already correct
   Never useScrollStore() without selector (subscribes to entire store)

4. In GarageExterior, Porsche911, GarageInterior: 
   Wrap all geometry/material creation in useMemo with [] deps
   Add dispose calls in useEffect cleanup:
   return () => { geo.dispose(); mat.dispose() }

5. FrameScrubber: frames should be loaded via a priority queue
   Priority 1 (immediate): frames 1-30
   Priority 2 (background): frames 31-120  
   Priority 3 (idle): frames 121-240
   Use requestIdleCallback for priority 3 loading

6. On mobile (navigator check or window.innerWidth < 768):
   - dpr: [1, 1.5] max
   - Disable shadows: shadows={false} on Canvas
   - SSAO: reduce samples from 16 to 8
   - FrameScrubber: load 120 frames max (every other frame), interpolate
```

- [ ] Bundle split working (check network tab — three-core should be separate chunk)
- [ ] No geometry/material created outside useMemo
- [ ] dispose() called on all three.js objects on unmount
- [ ] Frame priority loading working
- [ ] Mobile performance acceptable (test on actual phone)

---

## PHASE 6 — Sound (optional, do last)
> **Paste to Claude Code**

```
In src/hooks/useSound.ts and src/components/ui/SoundToggle.tsx:

Sounds needed (source free sounds from freesound.org):
  - workshop-ambient.mp3: low garage hum, loop
  - roller-shutter.mp3: metal door rolling up
  - engine-911.mp3: porsche flat-six rev up

useSound hook:
  - All sounds loaded ONLY after user clicks sound toggle (never on mount)
  - Howler.js for all playback
  - Workshop ambient: starts at progress 0.48, loops, volume 0.15
  - Shutter sound: fires once when progress crosses 0.30
  - Engine rev: fires once when progress crosses 0.68

SoundToggle:
  - Fixed bottom-right, z-index 30
  - SVG speaker icon (not emoji)  
  - Tooltip: "Sound off" / "Sound on"
  - Default: muted
```

- [ ] Sound toggle button renders
- [ ] All sounds load lazily (not on page load)
- [ ] Shutter sound fires at correct scroll point
- [ ] Engine rev fires when car appears
- [ ] Works on mobile (user gesture required)

---

## PHASE 7 — Mobile Responsiveness
> **Paste to Claude Code**

```
Audit and fix mobile layout across all overlay components:

HeroText.tsx:
  - Font size: clamp(24px, 5vw, 42px) for the title
  - Subtitle: hide on < 480px

ServiceCards.tsx / ServiceCard.tsx:
  - On mobile (< 768px): position fixed cards stack vertically at bottom of screen
    instead of floating over the canvas
  - Stack order: most recent card on top
  - Max height: 40vh, overflow-y: auto
  - Each card: full width minus padding, no SVG connector line on mobile

Navbar.tsx:
  - Logo text: hide "THROTTLE THEORY" text on < 400px, show icon only
  
Canvas/FrameScrubber:
  - Both always 100vw × 100vh (already correct)

Footer.tsx:
  - Single column on < 640px
```

- [ ] Hero text readable on 375px phone
- [ ] Service cards usable on mobile (don't overlap/clip)
- [ ] Navbar works on mobile
- [ ] Test on actual phone or Chrome devtools 375px

---

## PHASE 8 — Final QA Checklist
> Do manually

- [ ] Full scroll test from 0% to 100% — no freezes, no blank frames
- [ ] Back-scroll test — everything resets and re-plays correctly
- [ ] Frame scrubber: aerial pan looks cinematic (not pixelated, not jittery)
- [ ] Garage front face: your actual garage photo visible on the 3D box
- [ ] Shutter: slats lift smoothly, amber light bleeds underneath
- [ ] Interior: workshop floor visible, lights on
- [ ] Car: drives in from side, stops center
- [ ] Car paint: clearcoat sheen visible (move mouse in orbit, watch reflections shift)
- [ ] Car glass: see-through, not opaque
- [ ] Floor: car reflects in epoxy floor
- [ ] All 5 service cards appear and accumulate
- [ ] Neon sign pulse animation running
- [ ] Navbar appears after first scroll, hides on fast scroll down
- [ ] Chrome devtools Lighthouse: Performance > 80 on desktop
- [ ] No console errors
- [ ] Works in: Chrome, Safari, Firefox
- [ ] Works on mobile (iPhone/Android)

---

## PHASE 9 — Deploy
- [ ] `npm run build` — zero errors
- [ ] Check `dist/` folder — verify chunk files split correctly
- [ ] Deploy to Vercel:
  ```bash
  npm install -g vercel
  vercel --prod
  ```
  OR drag `/dist` folder to [vercel.com/new](https://vercel.com/new)
- [ ] Check deployed URL — frames loading from `/frames/` path
- [ ] Share URL

---

## Quick Reference — Scroll Phase Map

```
Progress    What's happening
─────────────────────────────────────────────
0.00–0.45   FrameScrubber: aerial drone → front of garage
0.40–0.50   Crossfade: FrameScrubber fades out, Three.js fades in
0.30–0.48   Shutter3D: slat meshes slide up, amber light bleeds
0.48–0.62   Camera moves through entrance (z: 16 → -1)
0.62–0.72   Interior: car drives in, spotlights up
0.72–1.00   Car orbit: service cards appear and accumulate
```

## Quick Reference — File Map

```
What to change              File
──────────────────────────────────────────────────────
Frame scrubber              src/components/sections/FrameScrubber.tsx (NEW)
Three.js canvas             src/components/Scene3D.tsx
Garage 3D box               src/components/three/GarageExterior.tsx
Shutter slats               src/components/three/Shutter3D.tsx
Interior floor/walls        src/components/three/GarageInterior.tsx
Porsche 911                 src/components/three/Porsche911.tsx
All lights                  src/components/three/SceneLighting.tsx
Camera path                 src/components/CameraController.tsx
Title overlay               src/components/overlays/HeroText.tsx
Service cards               src/components/overlays/ServiceCards.tsx
Individual card             src/components/overlays/ServiceCard.tsx
Top navbar                  src/components/overlays/Navbar.tsx
Sound hook                  src/hooks/useSound.ts
Scroll state                src/hooks/useScrollProgress.ts  ← don't touch
Services data               src/data/services.ts            ← don't touch
Vite config                 vite.config.ts
```

## Status

- [ ] Phase 0 — Assets ready
- [ ] Phase 1 — Packages installed
- [ ] Phase 2 — Frame scrubber working
- [ ] Phase 3 — Three.js realistic
- [ ] Phase 4 — UI/UX polished
- [ ] Phase 5 — Performance optimized
- [ ] Phase 6 — Sound added
- [ ] Phase 7 — Mobile responsive
- [ ] Phase 8 — QA passed
- [ ] Phase 9 — Deployed
