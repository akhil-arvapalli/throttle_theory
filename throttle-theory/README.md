# Throttle Theory

Marketing site for **Throttle Theory**, a performance garage in Hyderabad.
A scroll-scrubbed cinematic experience: 1202 video frames mapped to scroll
position, with scene-synced service cards, engine audio, and a booking CTA.

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4, framer-motion, zustand
- Canvas frame scrubber (no video player — frames stream in progressively)

## Develop

```bash
npm install
npm run dev        # local dev server
npm run build      # type-check + production build to dist/
npm run preview    # serve the production build locally
```

## Asset pipeline

The video lives at `../final_throttle_theory.mp4` (50.17s @ ~23.96fps).

```bash
npm run extract:frames    # re-extract all 1202 frames from the video (quality 95 — heavy)
npm run optimize-frames   # re-encode frames in place to quality 75 (~40MB total)
npm run extract:audio     # re-extract the audio track to public/audio/
```

`optimize-frames` is already applied to the shipped frames. Only re-run the
pipeline if the source video changes.

## Editing business info

All contact details, socials and the tagline live in **`src/config/site.ts`**.
The footer, hero CTA, final CTA and SEO tags all read from it. The same values
are duplicated in `index.html` (meta/OG/JSON-LD) — update both when the real
details land.

## Scene ↔ overlay map

Scroll progress (0→1) is tuned to the video's scenes:

| Progress | Scene                          | Overlay              |
| -------- | ------------------------------ | -------------------- |
| 0.00     | Night facade, neon, shutter    | Hero (CTAs)          |
| 0.14     | Threshold — lights flick on    | About statement      |
| 0.22     | Workshop aisle                 | Maintenance card     |
| 0.33     | Engine bay (Lexus on lift)     | Engine card          |
| 0.45     | Classic Porsche 930            | Restoration card     |
| 0.60     | Paint booth reveal             | Paint card           |
| 0.75     | Finished car exits the bay     | Wraps & Finishing    |
| 0.91     | Neon finale                    | Final CTA            |
| 1.00     | —                              | Footer               |

Card positions/phases live in `src/data/services.ts`.

## Deploy (Vercel)

Config is in `vercel.json` (immutable cache for frames/audio + security
headers). Vercel auto-detects Vite:

```bash
npx vercel          # preview deploy
npx vercel --prod   # production
```

Or import the repo at vercel.com — zero extra settings needed.

## Before launch

- [ ] Replace placeholder contact details in `src/config/site.ts` **and** `index.html`
- [ ] Update `siteUrl` / canonical / OG URLs to the real domain
- [ ] Drop a real `og-image.jpg` (1200×630) into `public/`
