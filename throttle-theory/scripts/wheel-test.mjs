/**
 * Reproduces real wheel/trackpad input (not programmatic scrollTo) and
 * checks whether the page actually scrolls and the scrubber advances.
 */
import puppeteer from 'puppeteer-core'
import { existsSync } from 'fs'

const candidates = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
]
const executablePath = candidates.find((p) => existsSync(p))

const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
  defaultViewport: { width: 1440, height: 810 },
})
const page = await browser.newPage()

// Surface console errors
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') console.log('[console]', m.type(), m.text())
})
page.on('pageerror', (e) => console.log('[pageerror]', e.message))

await page.goto('http://localhost:4173', { waitUntil: 'networkidle2', timeout: 120000 })
await page.waitForSelector('.hero-in', { timeout: 90000 })
await new Promise((r) => setTimeout(r, 800))

const before = await page.evaluate(() => ({
  scrollY: window.scrollY,
  maxScroll: document.documentElement.scrollHeight - window.innerHeight,
  bodyHeight: document.body.scrollHeight,
  htmlOverflowY: getComputedStyle(document.documentElement).overflowY,
  bodyOverflowY: getComputedStyle(document.body).overflowY,
  htmlHeight: getComputedStyle(document.documentElement).height,
  bodyHeight2: getComputedStyle(document.body).height,
}))
console.log('before:', JSON.stringify(before))

// Simulate real trackpad wheel: several small deltas like a trackpad emits
for (let i = 0; i < 15; i++) {
  await page.mouse.wheel(0, 100)
  await new Promise((r) => setTimeout(r, 40))
}
await new Promise((r) => setTimeout(r, 1500))

const after = await page.evaluate(() => ({
  scrollY: window.scrollY,
  progress: window.localStorage.getItem('x'),
}))
console.log('after wheel:', JSON.stringify(after))
console.log('scrollY moved:', after.scrollY > 0 ? 'YES ✓' : 'NO ✗ — WHEEL SCROLL BROKEN')

// Also test keyboard
await page.keyboard.press('PageDown')
await new Promise((r) => setTimeout(r, 1200))
const afterKey = await page.evaluate(() => window.scrollY)
console.log('after PageDown scrollY:', afterKey, afterKey > after.scrollY ? '✓' : '✗ keyboard broken')

await browser.close()
