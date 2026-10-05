/**
 * Autoplay QA: proves the guided run starts, actually drives the page, and
 * hands control back the moment the visitor touches anything.
 *
 * The full run is ~50s by design, so this checks the behaviour that can
 * actually regress — start, motion, cancellation, reduced-motion refusal —
 * rather than waiting out the whole timeline.
 *
 * Usage: node scripts/autoplay-check.mjs [baseUrl]
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

const results = []
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail })
  console.log(`${pass ? 'pass' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`)
}

const openSite = async (browser, opts = {}) => {
  const page = await browser.newPage()
  if (opts.reducedMotion) {
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  }
  await page.setViewport({ width: 1440, height: 810 })
  await page.goto(BASE, { waitUntil: 'load', timeout: 120000 })
  await page
    .waitForFunction(() => !document.querySelector('.loader'), { timeout: 90000 })
    .catch(() => {})
  await new Promise((r) => setTimeout(r, 1200))
  return page
}

const scrollY = (page) => page.evaluate(() => Math.round(window.scrollY))
const skipVisible = (page) => page.evaluate(() => !!document.querySelector('.autoplay-skip'))

const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ['--disable-gpu', '--hide-scrollbars'],
})

// ── 1. It starts, and it moves the page ──────────────────────────────
{
  const page = await openSite(browser)

  await page.click('.hero-actions .btn-ghost')
  await new Promise((r) => setTimeout(r, 300))
  check('skip control appears on click', await skipVisible(page))

  // Sample densely from the very first frames. A discontinuity in the easing
  // only shows up *between* samples — the original bug jumped from 51% of the
  // distance back to 2% at the ramp join, and a single late sample sails
  // straight past it.
  const samples = []
  for (let i = 0; i < 30; i++) {
    samples.push(await scrollY(page))
    await new Promise((r) => setTimeout(r, 200))
  }

  const first = samples[0]
  const last = samples[samples.length - 1]
  check('page scrolls on its own', last > first + 60, `${first} -> ${last}px over 6s`)

  let backsteps = 0
  let worstDrop = 0
  for (let i = 1; i < samples.length; i++) {
    const drop = samples[i - 1] - samples[i]
    if (drop > 2) {
      backsteps++
      worstDrop = Math.max(worstDrop, drop)
    }
  }
  check('scroll never runs backwards', backsteps === 0, backsteps ? `worst drop ${worstDrop}px` : 'monotonic')

  // ── 2. A real gesture takes control back ───────────────────────────
  await page.mouse.move(700, 400)
  await page.mouse.wheel({ deltaY: -120 })
  await new Promise((r) => setTimeout(r, 200))
  const atCancel = await scrollY(page)
  check('skip control removed on wheel', !(await skipVisible(page)))

  await new Promise((r) => setTimeout(r, 1200))
  const after = await scrollY(page)
  check('movement stops after cancelling', Math.abs(after - atCancel) <= 4, `${atCancel} -> ${after}px`)

  await page.close()
}

// ── 3. Keyboard cancels ─────────────────────────────────────────────
{
  const page = await openSite(browser)
  await page.click('.hero-actions .btn-ghost')
  await new Promise((r) => setTimeout(r, 600))
  await page.keyboard.press('Escape')
  await new Promise((r) => setTimeout(r, 250))
  check('skip control removed on keypress', !(await skipVisible(page)))
  await page.close()
}

// ── 4. Reduced motion: never autoscrolls, but the button still works ─
{
  const page = await openSite(browser, { reducedMotion: true })
  await page.click('.hero-actions .btn-ghost')
  await new Promise((r) => setTimeout(r, 1500))
  const y = await scrollY(page)
  check('reduced-motion never autoplays', !(await skipVisible(page)), `scrollY=${y}`)
  // The regression this guards: the button used to silently do nothing at all
  // for reduced-motion users, because the autoplay just refused to start.
  check(
    'reduced-motion still navigates via the button',
    y > 100,
    `scrollY=${y} (fallback jump to the services section)`
  )
  await page.close()
}

// ── 5. The run must be visibly moving almost immediately ─────────────
{
  const page = await openSite(browser)
  await page.click('.hero-actions .btn-ghost')
  await new Promise((r) => setTimeout(r, 600))
  const early = await scrollY(page)
  check(
    'the run is visibly moving within 600ms',
    early > 8,
    `${early}px after 600ms — a shorter ramp was needed or the click reads as dead`
  )
  await page.close()
}

await browser.close()

const failed = results.filter((r) => !r.pass)
console.log('\n' + '='.repeat(60))
if (failed.length) {
  console.log(`${failed.length}/${results.length} checks failed.`)
  process.exit(1)
}
console.log(`All ${results.length} autoplay checks passed.`)
