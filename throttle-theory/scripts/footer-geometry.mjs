/**
 * Geometry probe: dumps the real numbers the CTA/footer collision depends on —
 * footer height as a share of the viewport, and where the footer's top edge
 * actually sits at the finale scroll positions. Used to design the hand-off
 * against measured values instead of assumed ones.
 *
 * Usage: node scripts/footer-geometry.mjs [baseUrl]
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

const VIEWPORTS = [
  { width: 360, height: 740, label: 'iPhone SE' },
  { width: 390, height: 844, label: 'iPhone 14' },
  { width: 768, height: 1024, label: 'iPad' },
  { width: 1440, height: 810, label: 'laptop' },
  { width: 1920, height: 1080, label: 'desktop' },
]

const STEPS = [0.85, 0.9, 0.94, 0.97, 1]

const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ['--disable-gpu', '--hide-scrollbars'],
})

for (const vp of VIEWPORTS) {
  const page = await browser.newPage()
  await page.setViewport(vp)
  await page.goto(BASE, { waitUntil: 'load', timeout: 120000 })
  await page
    .waitForFunction(() => !document.querySelector('.loader'), { timeout: 90000 })
    .catch(() => {})

  const base = await page.evaluate(() => {
    const f = document.querySelector('.footer')
    return {
      vh: window.innerHeight,
      footerH: Math.round(f.getBoundingClientRect().height),
      scrollH: document.documentElement.scrollHeight,
    }
  })

  const maxScroll = base.scrollH - base.vh
  console.log(
    `\n${vp.label} ${vp.width}x${vp.height}  footer=${base.footerH}px ` +
      `(${(base.footerH / base.vh * 100).toFixed(0)}% of viewport)  maxScroll=${maxScroll}`
  )
  console.log('  step   footerTop   gapToCtaBottom   ctaTop..ctaBottom   ctaHeight')

  for (const step of STEPS) {
    await page.evaluate((top) => window.scrollTo(0, top), Math.round(step * maxScroll))
    await new Promise((r) => setTimeout(r, 900))
    const m = await page.evaluate(() => {
      const f = document.querySelector('.footer').getBoundingClientRect()
      const c = document.querySelector('.final-cta').getBoundingClientRect()
      return {
        footerTop: Math.round(f.top),
        ctaTop: Math.round(c.top),
        ctaBottom: Math.round(c.bottom),
        ctaH: Math.round(c.height),
      }
    })
    const gap = m.footerTop - m.ctaBottom
    console.log(
      `  ${step.toFixed(2)}  ${String(m.footerTop).padStart(9)}   ` +
        `${String(gap).padStart(13)}   ${String(m.ctaTop).padStart(6)}..${String(m.ctaBottom).padEnd(6)}` +
        `   ${String(m.ctaH).padStart(6)}`
    )
  }
  await page.close()
}

await browser.close()
