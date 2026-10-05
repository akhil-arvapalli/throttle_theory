/**
 * Captures the loader mid-sequence so the mechanism can be eyeballed, and
 * asserts the drawing actually has geometry — a green test suite cannot tell
 * you the piston is a blank box.
 *
 * Usage: node scripts/loader-shots.mjs [baseUrl]
 */
import puppeteer from 'puppeteer-core'
import { mkdirSync, existsSync } from 'fs'
import { join } from 'path'

const BASE = process.argv[2] ?? 'http://localhost:4173'
const OUT = join(import.meta.dirname, '..', '.qa-shots')
mkdirSync(OUT, { recursive: true })

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
  args: ['--disable-gpu', '--hide-scrollbars'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 120000 })

// The intro runs ~2.7s: crank (stall) → catch → warm → blip → handoff.
const marks = [
  { name: 'L1-crank', at: 700 },
  { name: 'L2-catch', at: 1700 },
  { name: 'L3-idle', at: 2400 },
]

const t0 = Date.now()
for (const m of marks) {
  const wait = m.at - (Date.now() - t0)
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  await page.screenshot({ path: join(OUT, `${m.name}.png`) })

  const geo = await page.evaluate(() => {
    const svg = document.querySelector('#engine')
    if (!svg) return null
    const r = svg.getBoundingClientRect()
    const box = svg.getBBox()
    return {
      w: Math.round(r.width),
      h: Math.round(r.height),
      bbox: [Math.round(box.width), Math.round(box.height)],
      parts: svg.querySelectorAll('g, ellipse, rect, circle, path').length,
      crankT: document.querySelector('#crank')?.getAttribute('transform') ?? null,
      pistonT: document.querySelector('#piston')?.getAttribute('transform') ?? null,
      rotorT: document.querySelector('#rotor')?.getAttribute('transform') ?? null,
    }
  })
  console.log(`${m.name}: svg ${geo?.w}x${geo?.h}  bbox ${geo?.bbox?.join('x')}  parts ${geo?.parts}`)
  console.log(`   crank  ${geo?.crankT}`)
  console.log(`   piston ${geo?.pistonT}`)
  console.log(`   rotor  ${geo?.rotorT}`)
}

await browser.close()
console.log(`\nshots → ${OUT}`)