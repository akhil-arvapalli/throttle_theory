# Throttle Theory

Marketing site for **Throttle Theory**, a performance garage based in Hyderabad. The entire experience is a scroll-driven video scrub: 1 202 pre-extracted WebP frames are painted to a canvas in sync with the user's scroll position, layered with motion overlays for services, hero copy, and a final CTA.

Live at [throttletheory.in](https://throttletheory.in)

## Stack

| Layer | Tech |
|-------|------|
| Framework | React 19, TypeScript 6 |
| Build | Vite 8 |
| Styling | Tailwind CSS 4 (Vite plugin) |
| Animation | Framer Motion 12 |
| State | Zustand 5 |
| Hosting | Vercel |

## Project structure

```
throttle-theory/
├── public/
│   ├── frames/          # 1 202 WebP frames (scroll-scrub source)
│   ├── audio/           # Ambient engine audio
│   ├── favicon.png
│   ├── og-image.jpg
│   └── porsche.glb
├── scripts/             # Node helpers (ffmpeg frame extraction, optimization)
├── src/
│   ├── components/
│   │   ├── VideoScrubber.tsx    # Canvas renderer, progressive frame loader
│   │   ├── ScrollTracker.tsx    # Normalised scroll progress (Zustand store)
│   │   ├── Loader.tsx           # Ignition-style loading screen
│   │   ├── ProgressRail.tsx     # Scroll progress indicator
│   │   ├── FinalCTA.tsx         # WhatsApp CTA section
│   │   ├── overlays/            # HeroText, AboutStatement, ServiceCards, Navbar
│   │   ├── reactbits/           # Reusable UI primitives (Gauge, Odometer, Magnet, etc.)
│   │   └── ui/                  # Footer, SoundToggle
│   ├── config/
│   │   └── site.ts              # Single source of truth for business info
│   ├── data/
│   │   └── services.ts          # Service card content and scroll-phase mapping
│   ├── hooks/
│   │   ├── useScrollProgress.ts
│   │   └── useSound.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── vite.config.ts
├── vercel.json
└── package.json
```

## Getting started

```bash
cd throttle-theory
npm install
npm run dev
```

Open `http://localhost:5173`. Scroll to scrub through the video.

## Scripts

| Command | What it does |
|---------|-------------|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | TypeScript check + production build |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run oxlint |
| `npm run extract:frames` | Extract WebP frames from source video (requires ffmpeg) |
| `npm run extract:audio` | Extract audio track from source video |
| `npm run optimize-frames` | Batch-optimize extracted frames |

## How the scrub works

1. `ScrollTracker` listens to native scroll events on a tall spacer div and writes a normalised `0→1` progress value into a Zustand store.
2. `VideoScrubber` runs a `requestAnimationFrame` loop that maps progress to a frame index (out of 1 202 frames) and draws the matching `<img>` onto a fixed full-viewport `<canvas>`.
3. Frames load progressively: the first 24 land before the loader lifts, the rest stream in with a concurrency pool of 10. On mobile or data-saver connections, every 2nd frame is skipped to halve the download.
4. Overlay components (`HeroText`, `ServiceCards`, `AboutStatement`, `FinalCTA`) fade in and out at tuned scroll phases using Framer Motion.

## Deployment

Hosted on Vercel. The root directory is set to `throttle-theory` in project settings. Pushes to `main` trigger production deploys automatically.

## License

Private. All rights reserved.
