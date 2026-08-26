/**
 * Visual QA: loads the built site in headless Edge, scrolls through the
 * experience, and captures a screenshot at each scene. Output goes to
 * .qa-shots/ (gitignored).
 *
 * Usage: node scripts/visual-qa.mjs [baseUrl]
 */
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'fs'
import { join } from 'path'

const BASE = process.argv[2] ?? 'http://localhost:4173'
const OUT = join(import.meta.dirname, '..', '.qa-shots')
mkdirSync(OUT, { recursive: true })

// Find Edge (falls back to Chrome)
const candidates = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
]
const { existsSync } = await import('fs')
const executablePath = candidates.find((p) => existsSync(p))
if (!executablePath) {
  console.error('No Edge/Chrome found')
  process.exit(1)
}

const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
  defaultViewport: { width: 1440, height: 810 },
})

const page = await browser.newPage()
// 'load' fires before the frame preloading finishes, so the loader is still up
await page.goto(BASE, { waitUntil: 'load', timeout: 120000 })

// Capture the loader mid-animation (wordmark stagger + shimmer bar)
await new Promise((r) => setTimeout(r, 900))
await page.screenshot({ path: join(OUT, '00b-loader.png') })
console.log('shot: 00b-loader')

// Wait for the loader to lift (hero entrance plays)
await page
  .waitForFunction(() => !document.querySelector('.loader'), { timeout: 90000 })
  .then(() => console.log('loader lifted'))
  .catch(() => console.log('WARN: loader never lifted'))
await new Promise((r) => setTimeout(r, 1600))

const SHOTS = [
  { name: '00-hero', progress: 0 },
  { name: '01-about', progress: 0.17 },
  { name: '02-maintenance', progress: 0.27 },
  { name: '03-engine', progress: 0.38 },
  { name: '04-restoration', progress: 0.47 },
  { name: '05-wraps', progress: 0.55 },
  { name: '06-paint', progress: 0.66 },
  { name: '06b-exit-breather', progress: 0.8 },
  { name: '07-final-cta', progress: 0.96 },
  { name: '08-footer', progress: 1 },
]

const maxScroll = await page.evaluate(
  () => document.documentElement.scrollHeight - window.innerHeight
)
console.log('maxScroll:', maxScroll)

for (const shot of SHOTS) {
  await page.evaluate((top) => window.scrollTo(0, top), Math.round(shot.progress * maxScroll))
  // Wait for the lerp to settle on the target
  await new Promise((r) => setTimeout(r, shot.progress === 0 ? 300 : 1800))
  await page.screenshot({ path: join(OUT, `${shot.name}.png`) })
  console.log('shot:', shot.name)
}

// ── Mobile pass ──
await page.setViewport({ width: 390, height: 844 })
await new Promise((r) => setTimeout(r, 800))
const maxScrollM = await page.evaluate(
  () => document.documentElement.scrollHeight - window.innerHeight
)

const MOBILE_SHOTS = [
  { name: 'm0-hero', progress: 0 },
  { name: 'm1-engine-card', progress: 0.38 },
  { name: 'm2-footer', progress: 1 },
]
for (const shot of MOBILE_SHOTS) {
  await page.evaluate((top) => window.scrollTo(0, top), Math.round(shot.progress * maxScrollM))
  await new Promise((r) => setTimeout(r, shot.progress === 0 ? 300 : 1800))
  await page.screenshot({ path: join(OUT, `${shot.name}.png`) })
  console.log('shot:', shot.name)
}

// ── Reduced-motion pass: loader must still lift, nothing stuck ──
const rmPage = await browser.newPage()
await rmPage.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
await rmPage.setViewport({ width: 1440, height: 810 })
await rmPage.goto(BASE, { waitUntil: 'load', timeout: 120000 })
await new Promise((r) => setTimeout(r, 900))
await rmPage.screenshot({ path: join(OUT, 'r0-loader-reduced.png') })
console.log('shot: r0-loader-reduced')
const rmLifted = await rmPage
  .waitForFunction(() => !document.querySelector('.loader'), { timeout: 90000 })
  .then(() => true)
  .catch(() => false)
console.log('reduced-motion loader lifted:', rmLifted ? 'YES ✓' : 'NO ✗')
if (rmLifted) {
  await new Promise((r) => setTimeout(r, 1200))
  await rmPage.evaluate(() => window.scrollTo(0, 300))
  await new Promise((r) => setTimeout(r, 1200))
  await rmPage.screenshot({ path: join(OUT, 'r1-nav-reduced.png') })
  console.log('shot: r1-nav-reduced')
}
await rmPage.close()

await browser.close()
console.log('done →', OUT)
