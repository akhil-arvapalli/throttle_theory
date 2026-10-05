/**
 * Audio sync QA: during a guided run, the engine note must track the frame the
 * scroll is actually on — not merely keep playing.
 *
 * A silent-looking bug hides here: play-and-forget audio looks fine at 1x
 * because the drift never grows. Raise the playback rate and the same code
 * falls a half-second behind every second, which is very audible by the end.
 *
 * Instruments AudioBufferSourceNode.prototype.start to record every seek, then
 * compares the last seek against the scroll-derived position.
 *
 * Usage: node scripts/audio-sync-check.mjs [baseUrl]
 */
import puppeteer from 'puppeteer-core'
import { existsSync } from 'fs'

const BASE = process.argv[2] ?? 'http://localhost:4173'
const VIDEO_DURATION = 50.17

const CANDIDATES = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
]
const executablePath = CANDIDATES.find((p) => existsSync(p))

const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ['--disable-gpu', '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required'],
})

const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 810 })

// Turn the preference on before any script runs, and record every seek.
await page.evaluateOnNewDocument(() => {
  try {
    localStorage.setItem('tt-sound-enabled', '1')
  } catch {}
  window.__seeks = []
  const origStart = AudioBufferSourceNode.prototype.start
  AudioBufferSourceNode.prototype.start = function (...args) {
    window.__seeks.push({ offset: args[1] ?? 0, rate: this.playbackRate?.value ?? 1 })
    return origStart.apply(this, args)
  }
})

await page.goto(BASE, { waitUntil: 'load', timeout: 120000 })
await page
  .waitForFunction(() => !document.querySelector('.loader'), { timeout: 90000 })
  .catch(() => {})
await new Promise((r) => setTimeout(r, 1500))

await page.click('.hero-actions .btn-ghost')

// Sample drift across the run rather than once at the end.
const samples = []
for (let i = 0; i < 14; i++) {
  await new Promise((r) => setTimeout(r, 1400))
  const s = await page.evaluate(() => {
    const seeks = window.__seeks ?? []
    const last = seeks[seeks.length - 1]
    return {
      seeks: seeks.length,
      rates: [...new Set(seeks.map((x) => x.rate))],
      lastOffset: last ? Number(last.offset.toFixed(2)) : null,
      scrollY: Math.round(window.scrollY),
    }
  })
  // Frame position the scroll implies, recomputed independently of the audio.
  const max = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)
  const implied = Number((Math.min(1, s.scrollY / max) * VIDEO_DURATION).toFixed(2))
  samples.push({ ...s, implied, drift: s.lastOffset === null ? null : Number((s.lastOffset - implied).toFixed(2)) })
}

await browser.close()

const engaged = samples.filter((s) => s.lastOffset !== null)
console.log('scrollY  seeks  rates        audioOffset  scrollImplied  drift')
for (const s of samples) {
  console.log(
    `${String(s.scrollY).padStart(7)}  ${String(s.seeks).padStart(5)}  ` +
      `${JSON.stringify(s.rates).padEnd(12)}  ${String(s.lastOffset).padStart(11)}  ` +
      `${String(s.implied).padStart(14)}  ${String(s.drift).padStart(6)}`
  )
}

if (!engaged.length) {
  console.log('\nFAIL — audio never engaged during the run (seeks recorded: 0).')
  process.exit(1)
}

const rates = new Set(engaged.flatMap((s) => s.rates))
// 1.5 = the scroll-synced clip during a guided run. 1 = the loader's engine
// recording, which is time-driven rather than scroll-driven and must stay at
// 1x. Both appearing is correct; what must be true is that the autoplay seeks
// are at 1.5, so demand 1.5 is present rather than exclusive.
const autoplayTracked = rates.has(1.5)
// 1.65 / 0.8 are the loader clip's own rates — CLIP_PLAYBACK_RATE and
// CLIP_BLIP_RATE from the source. They are correct, not drift.
const ALLOWED = [1, 1.5, 1.65, 0.8]
const unexpected = [...rates].filter((r) => !ALLOWED.some((x) => Math.abs(r - x) < 0.02))
const worst = Math.max(...engaged.map((s) => Math.abs(s.drift)))

// Budget is on the *bound*, not on closeness to zero. The reference column is
// the raw scrollbar, but both the audio and the video frame follow the same
// lerped `progress`, so a constant offset between scrollbar and rendered
// position is expected and shared — it is not A/V desync. What must not happen
// is drift growing without limit: the pre-fix code fell ~16s behind over a run
// because it only ever re-seeked while silent.
const BUDGET = 1.2

console.log('')
if (!autoplayTracked) {
  console.log(`FAIL — no seek at playbackRate 1.5; autoplay did not track the scroll. Saw ${JSON.stringify([...rates])}.`)
  process.exit(1)
}
if (unexpected.length) {
  console.log(`FAIL — unexpected playbackRate(s): ${JSON.stringify(unexpected)}.`)
  process.exit(1)
}
if (worst > BUDGET) {
  console.log(`FAIL — drift is not bounded: worst ${worst.toFixed(2)}s (budget ${BUDGET}s).`)
  process.exit(1)
}
console.log(`pass — drift stays bounded at ${worst.toFixed(2)}s (budget ${BUDGET}s), autoplay rate 1.5.`)
console.log('       (bounded, not zero: audio and video share the lerped clock.)')
