/**
 * Behaviour QA: the regressions that are invisible in a static screenshot.
 *
 * Reload landing mid-story, the hero entrance playing behind the loader, a
 * console error that only fires at one scroll position — these need a driver.
 *
 * Usage: node scripts/behaviour-check.mjs [baseUrl]
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
  results.push({ name, pass })
  console.log(`${pass ? 'pass' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`)
}

const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ['--disable-gpu', '--hide-scrollbars'],
})

const settle = async (page) => {
  await page
    .waitForFunction(() => !document.querySelector('.loader'), { timeout: 90000 })
    .catch(() => {})
  await new Promise((r) => setTimeout(r, 1400))
}

// ── A reload must land on the hero, not mid-scrub ────────────────────
{
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 810 })
  await page.goto(BASE, { waitUntil: 'load', timeout: 120000 })
  await settle(page)

  const max = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(max * 0.5))
  await new Promise((r) => setTimeout(r, 900))
  const beforeReload = await page.evaluate(() => Math.round(window.scrollY))

  await page.reload({ waitUntil: 'load', timeout: 120000 })
  await settle(page)
  const afterReload = await page.evaluate(() => Math.round(window.scrollY))

  check(
    'reload returns to the top, not the previous position',
    afterReload < 5,
    `was ${beforeReload}px, reloaded at ${afterReload}px`
  )
  await page.close()
}

// ── The hero must not play its entrance behind the loader ────────────
{
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 810 })

  let peakBehindLoader = 0
  // Poll from the moment navigation starts: while the loader is on screen,
  // sample how visible the hero CTAs already are. Read `.hero-action` — the
  // framer-motion wrapper that actually carries the opacity; the button inside
  // it has its own opacity of 1, which is not what is animated.
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 120000 })
  for (let i = 0; i < 160; i++) {
    const s = await page.evaluate(() => {
      const loader = document.querySelector('.loader')
      const cta = document.querySelector('.hero-actions .hero-action')
      if (!cta) return null
      return {
        loaderUp: !!loader,
        opacity: parseFloat(getComputedStyle(cta).opacity),
      }
    })
    if (s?.loaderUp) peakBehindLoader = Math.max(peakBehindLoader, s.opacity)
    if (s && !s.loaderUp) break
    await new Promise((r) => setTimeout(r, 60))
  }
  check(
    'hero CTAs stay hidden while the loader covers them',
    peakBehindLoader < 0.5,
    `peak opacity behind loader ${peakBehindLoader.toFixed(2)}`
  )
  await page.close()
}

// ── The loader's instruments must tell the truth ─────────────────────
{
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 810 })
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 120000 })

  // Sample the readout while the panel is still up. The lift fires at
  // START_FRAMES, so the odometer must be at (or near) 100 by then — not
  // announcing "ready" while reading 002%.
  let peakOdo = 0
  let lastLoaderOdo = null
  for (let i = 0; i < 160; i++) {
    const s = await page.evaluate(() => {
      const loader = document.querySelector('.loader')
      if (!loader) return null
      // The percent readout is #pctDigits in the ported chrome.
      const raw = document.querySelector('#pctDigits')?.textContent
      return { odo: raw === null || raw === undefined ? null : Number(raw) }
    })
    if (!s) break
    if (s.odo !== null && Number.isFinite(s.odo)) {
      peakOdo = Math.max(peakOdo, s.odo)
      lastLoaderOdo = s.odo
    }
    await new Promise((r) => setTimeout(r, 60))
  }

  check(
    'loader odometer reaches 100% before it lifts',
    peakOdo >= 99,
    `peak ${peakOdo}% (reading ${lastLoaderOdo}% on the final sample before reveal)`
  )
  await page.close()
}

// ── The intro must play, not be skipped when frames are fast ────────
{
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 810 })

  const t0 = Date.now()
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await page
    .waitForFunction(() => !document.querySelector('.loader'), { timeout: 90000 })
    .catch(() => {})
  const fastMs = Date.now() - t0

  // The loader runs a SCRIPTED six-second window (SIM_DUR in EngineLoader), so
  // the narrative plays in full however fast the frames decoded. That makes the
  // floor ~6s and the whole sequence crank+loading+warm+blip+handoff+lift ~8s.
  check(
    'the intro plays its full scripted six seconds',
    fastMs >= 6000,
    `loader lifted in ${fastMs}ms (scripted window is 6000ms)`
  )
  check(
    'the intro does not drag past the scripted window',
    fastMs < 9500,
    `loader lifted in ${fastMs}ms`
  )
  await page.close()
}

// ── A slow network must still reveal correctly ───────────────────────
{
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 810 })
  const cdp = await page.createCDPSession()
  // Throttled hard enough that the frames genuinely cannot beat the crank.
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: (400 * 1024) / 8,
    uploadThroughput: (400 * 1024) / 8,
    latency: 300,
  })

  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 120000 })
  let peakOdo = 0
  let lifted = false
  for (let i = 0; i < 700; i++) {
    const s = await page.evaluate(() => {
      const loader = document.querySelector('.loader')
      if (!loader) return { gone: true }
      const raw = document.querySelector('#pctDigits')?.textContent
      return { gone: false, odo: raw === null || raw === undefined ? null : Number(raw) }
    })
    if (s.gone) {
      lifted = true
      break
    }
    if (s.odo !== null && Number.isFinite(s.odo)) peakOdo = Math.max(peakOdo, s.odo)
    await new Promise((r) => setTimeout(r, 60))
  }
  check('slow network still reveals the site', lifted, lifted ? 'loader lifted' : 'loader never lifted')
  check(
    'slow network still reads 100% on the odometer',
    peakOdo >= 99,
    `peak ${peakOdo}%`
  )
  await page.close()
}

// ── The payoff frame must name the business ──────────────────────────
{
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 810 })
  await page.goto(BASE, { waitUntil: 'load', timeout: 120000 })
  await settle(page)
  const hero = await page.evaluate(() => {
    const name = document.querySelector('.hero-name')
    const tag = document.querySelector('.hero-tagline')
    return {
      name: name?.textContent?.trim() ?? null,
      tagline: tag?.textContent?.trim() ?? null,
      nameOpacity: name ? parseFloat(getComputedStyle(name).opacity) : 0,
      // The sr-only h1 must remain the single semantic heading.
      headings: [...document.querySelectorAll('h1')].filter((h) => !h.classList.contains('sr-only')).length,
    }
  })
  check('hero shows the business name', !!hero.name, hero.name ?? 'missing')
  check('hero shows the tagline', !!hero.tagline, hero.tagline ?? 'missing')
  check('hero wordmark is visible', hero.nameOpacity > 0.9, `opacity ${hero.nameOpacity}`)
  check('no duplicate visible h1', hero.headings === 0, `${hero.headings} extra h1`)
  await page.close()
}

// ── A full scroll must not throw ─────────────────────────────────────
{
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.setViewport({ width: 1440, height: 810 })
  await page.goto(BASE, { waitUntil: 'load', timeout: 120000 })
  await settle(page)

  const max = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)
  for (let i = 0; i <= 24; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), Math.round((max * i) / 24))
    await new Promise((r) => setTimeout(r, 130))
  }
  // and back up
  for (let i = 24; i >= 0; i--) {
    await page.evaluate((y) => window.scrollTo(0, y), Math.round((max * i) / 24))
    await new Promise((r) => setTimeout(r, 130))
  }
  const real = errors.filter((e) => !/favicon|net::ERR_|Failed to load resource/i.test(e))
  check('full scroll down and up is error-free', real.length === 0, real.slice(0, 2).join(' | ') || 'clean')
  await page.close()
}

await browser.close()

const failed = results.filter((r) => !r.pass)
console.log('\n' + '='.repeat(60))
if (failed.length) {
  console.log(`${failed.length}/${results.length} behaviour checks failed.`)
  process.exit(1)
}
console.log(`All ${results.length} behaviour checks passed.`)
