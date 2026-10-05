/**
 * Font QA: reports which face each text role actually resolves to, and
 * whether each webfont really loaded (vs silently falling back to a system
 * font). A font "applied" in CSS but failing to load still *renders* — it
 * just looks wrong — so both halves are checked.
 *
 * Usage: node scripts/font-check.mjs [baseUrl]
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

const ROLES = [
  { sel: '.hero-kicker', role: 'hero kicker (mono caps)' },
  { sel: '.hero-title, .hero-headline, h1', role: 'hero wordmark (display)' },
  { sel: '.hero-sub', role: 'hero tagline (body)' },
  { sel: '.btn', role: 'button label' },
  { sel: '.service-subtitle', role: 'card label REBUILT/TUNE/REMAP' },
  { sel: '.service-index', role: 'card counter 01/06' },
  { sel: '.service-description', role: 'card paragraph' },
  { sel: '.service-items li', role: 'card bullet list' },
  { sel: '.footer-tagline', role: 'footer tagline' },
  { sel: '.footer-line', role: 'footer line' },
  { sel: '.sound-toggle', role: 'sound toggle' },
]

const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ['--disable-gpu', '--hide-scrollbars'],
})

const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 810 })
await page.goto(BASE, { waitUntil: 'load', timeout: 120000 })
await page
  .waitForFunction(() => !document.querySelector('.loader'), { timeout: 90000 })
  .catch(() => {})

// Walk the whole page so lazy/scroll-driven text is in the DOM and measurable
await page.evaluate(async () => {
  const max = document.documentElement.scrollHeight - window.innerHeight
  for (let i = 0; i <= 10; i++) {
    window.scrollTo(0, (max * i) / 10)
    await new Promise((r) => setTimeout(r, 220))
  }
  window.scrollTo(0, 0)
})
await new Promise((r) => setTimeout(r, 1500))

const loaded = await page.evaluate(() => ({
  'Departure Mono': document.fonts.check('12px "Departure Mono"'),
  'IBM Plex Sans': document.fonts.check('12px "IBM Plex Sans"'),
  'IBM Plex Mono': document.fonts.check('12px "IBM Plex Mono"'),
  Rajdhani: document.fonts.check('12px "Rajdhani"'),
}))

console.log('webfont loaded:')
for (const [name, ok] of Object.entries(loaded)) {
  console.log(`  ${ok ? 'YES' : 'no '}  ${name}${name === 'IBM Plex Mono' ? '  (fallback — not fetched while Departure Mono is first)' : ''}`)
}

console.log('\nresolved font-family per role:')
let missing = 0
for (const { sel, role } of ROLES) {
  const info = await page.evaluate((s) => {
    const el = document.querySelector(s)
    if (!el) return null
    const cs = getComputedStyle(el)
    return { family: cs.fontFamily, size: cs.fontSize, weight: cs.fontWeight }
  }, sel)
  if (!info) {
    console.log(`  --   ${role.padEnd(34)} (selector ${sel} not found)`)
    missing++
    continue
  }
  console.log(`  ${info.family.split(',')[0].replace(/'/g, '').padEnd(18)} ${String(info.size).padEnd(6)} w${info.weight.padEnd(4)} ${role}`)
}

await browser.close()
console.log(missing ? `\n${missing} selector(s) not found — check names.` : '\nAll roles resolved.')
