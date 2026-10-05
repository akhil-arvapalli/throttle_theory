/**
 * Overlap QA: measures REAL bounding-box intersection between the fixed
 * overlays (.final-cta, .sound-toggle) and the in-flow <footer>, across a
 * spread of viewports and zoom levels.
 *
 * This replaces scroll-percentage guessing — a scroll % tells you nothing
 * about whether two boxes actually collide, because the footer's height
 * changes with viewport. This measures the collision itself.
 *
 * Usage: node scripts/overlap-check.mjs [baseUrl]
 * Exits 1 if any visible overlap is found.
 */
import puppeteer from 'puppeteer-core'
import { existsSync } from 'fs'

const BASE = process.argv[2] ?? 'http://localhost:4173'

const CANDIDATES = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
]
const executablePath = CANDIDATES.find((p) => existsSync(p))
if (!executablePath) {
  console.error('No Edge/Chrome found')
  process.exit(1)
}

// width, height, deviceScaleFactor, label
const VIEWPORTS = [
  { width: 360, height: 740, deviceScaleFactor: 2, label: 'iPhone SE (small)' },
  { width: 390, height: 844, deviceScaleFactor: 3, label: 'iPhone 14' },
  { width: 414, height: 896, deviceScaleFactor: 2, label: 'iPhone XR' },
  { width: 768, height: 1024, deviceScaleFactor: 2, label: 'iPad portrait' },
  { width: 1280, height: 720, deviceScaleFactor: 1, label: 'laptop small-height' },
  { width: 1440, height: 810, deviceScaleFactor: 1, label: 'laptop' },
  { width: 1920, height: 1080, deviceScaleFactor: 1, label: 'desktop full' },
  // Same CSS viewport, but browser-zoomed — this was one of the reported repros
  { width: 640, height: 405, deviceScaleFactor: 2, label: '1440x810 @200% zoom' },
  { width: 480, height: 270, deviceScaleFactor: 3, label: '1440x810 @300% zoom' },
]

// Scroll positions where the finale CTA is live and the footer is arriving.
const STEPS = [0.85, 0.88, 0.9, 0.92, 0.94, 0.95, 0.96, 0.97, 0.98, 0.99, 1]

/** Intersection height (px) of two viewport-relative rects, 0 if disjoint. */
const intersect = (page, selA, selB) =>
  page.evaluate(
    (a, b) => {
      const elA = document.querySelector(a)
      const elB = document.querySelector(b)
      if (!elA || !elB) return null
      const ra = elA.getBoundingClientRect()
      const rb = elB.getBoundingClientRect()
      const top = Math.max(ra.top, rb.top)
      const bottom = Math.min(ra.bottom, rb.bottom)
      return Math.max(0, Math.round(bottom - top))
    },
    selA,
    selB
  )

/** Is the element actually rendered (not faded to 0 / hidden)? */
const isVisible = (page, sel) =>
  page.evaluate((s) => {
    const el = document.querySelector(s)
    if (!el) return false
    const cs = getComputedStyle(el)
    return (
      cs.visibility !== 'hidden' &&
      cs.display !== 'none' &&
      parseFloat(cs.opacity) > 0.05
    )
  }, sel)

const opacityOf = (page, sel) =>
  page.evaluate((s) => {
    const el = document.querySelector(s)
    return el ? parseFloat(getComputedStyle(el).opacity) : 0
  }, sel)

const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  // No --no-sandbox: that is a Linux/CI necessity and is not needed for
  // headless Edge/Chrome on Windows, where the sandbox is on by default.
  args: ['--disable-gpu', '--hide-scrollbars'],
})

let failures = 0
const rows = []

for (const vp of VIEWPORTS) {
  const page = await browser.newPage()
  await page.setViewport(vp)
  await page.goto(BASE, { waitUntil: 'load', timeout: 120000 })

  // Skip the loader — it holds the page until frames preloaded
  await page
    .waitForFunction(() => !document.querySelector('.loader'), { timeout: 90000 })
    .catch(() => {})

  const maxScroll = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight
  )

  const { vh, footerH, sansLoaded, departureLoaded } = await page.evaluate(() => ({
    vh: window.innerHeight,
    footerH: Math.round(document.querySelector('.footer').getBoundingClientRect().height),
    sansLoaded: document.fonts.check('12px "IBM Plex Sans"'),
    departureLoaded: document.fonts.check('12px "Departure Mono"'),
  }))
  // IBM Plex Mono is only the fallback behind Departure Mono, so the browser
  // correctly never fetches it while Departure Mono satisfies every mono slot.
  // It is reported, not asserted — asserting it would fail on a working page.
  if (!sansLoaded || !departureLoaded) {
    failures++
    console.log(
      `FAIL  ${vp.label}  font not loaded ` +
        `(sans=${sansLoaded} departure=${departureLoaded})`
    )
  }

  let worstCta = 0
  let worstToggle = 0
  let peakCtaOpacity = 0

  for (const step of STEPS) {
    await page.evaluate((top) => window.scrollTo(0, top), Math.round(step * maxScroll))
    // Let the rAF lerp settle before measuring
    await new Promise((r) => setTimeout(r, 900))

    peakCtaOpacity = Math.max(peakCtaOpacity, await opacityOf(page, '.final-cta'))

    if (await isVisible(page, '.final-cta')) {
      const px = await intersect(page, '.final-cta', '.footer')
      if (px && px > worstCta) worstCta = px
    }
    if (await isVisible(page, '.sound-toggle')) {
      const px = await intersect(page, '.sound-toggle', '.footer')
      if (px && px > worstToggle) worstToggle = px
    }
  }

  // Hard requirement: the footer never collides with anything fixed on top of it.
  const collided = worstCta > 0 || worstToggle > 0

  // Soft requirement: the finale CTA still gets seen. Hiding it to dodge the
  // footer would be a regression — but on a viewport where the footer is
  // itself taller than the screen there is provably nowhere to put it, and
  // the footer's own booking button is the hand-off.
  const noRoom = footerH >= vh
  const finaleMissing = !noRoom && peakCtaOpacity < 0.15

  const bad = collided || finaleMissing
  if (bad) failures++

  rows.push({
    viewport: vp.label,
    dims: `${vp.width}x${vp.height}`,
    cta: worstCta,
    toggle: worstToggle,
    peak: peakCtaOpacity.toFixed(2),
    status: bad ? 'FAIL' : 'pass',
  })

  console.log(
    `${bad ? 'FAIL' : 'pass'}  ${vp.label.padEnd(24)} ${(`${vp.width}x${vp.height}`).padEnd(11)}` +
      `ctaOverlap=${String(worstCta).padStart(4)}px  soundOverlap=${String(worstToggle).padStart(4)}px  ` +
      `ctaPeakOpacity=${peakCtaOpacity.toFixed(2)}${noRoom ? '  (footer fills viewport — no room, by design)' : ''}`
  )

  await page.close()
}

await browser.close()

console.log('\n' + '='.repeat(78))
console.log(
  rows
    .map(
      (r) =>
        `${r.status.padEnd(5)} ${r.viewport.padEnd(24)} ${r.dims.padEnd(11)} cta=${String(r.cta).padStart(4)}  sound=${String(r.toggle).padStart(4)}  ctaPeak=${r.peak}`
    )
    .join('\n')
)
console.log('='.repeat(78))

if (failures) {
  console.log(`\n${failures}/${VIEWPORTS.length} viewports failed.`)
  process.exit(1)
}
console.log(`\nAll ${VIEWPORTS.length} viewports: zero overlap, fonts loaded, finale still visible.`)