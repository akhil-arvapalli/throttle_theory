/**
 * Diagnose wheel handling: do wheel events arrive? are they defaultPrevented?
 * Also isolates puppeteer's mouse.wheel against a plain page (control test).
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

// ── Control: plain page, no app code ──
await page.goto('data:text/html,<div style="height:5000px">plain</div>')
await new Promise((r) => setTimeout(r, 300))
await page.mouse.wheel(0, 200)
await new Promise((r) => setTimeout(r, 500))
const controlScroll = await page.evaluate(() => window.scrollY)
console.log('CONTROL plain page scrollY after wheel:', controlScroll, controlScroll > 0 ? '✓ wheel works in env' : '✗ wheel broken in env itself')

// ── Our site ──
await page.goto('http://localhost:4173', { waitUntil: 'networkidle2', timeout: 120000 })
await page.waitForSelector('.hero-in', { timeout: 90000 })
await new Promise((r) => setTimeout(r, 500))

await page.evaluate(() => {
  window.__wheelLog = []
  for (const phase of ['capture', 'bubble']) {
    window.addEventListener(
      'wheel',
      (e) => {
        window.__wheelLog.push({
          phase,
          target: e.target.constructor.name + (e.target.className ? '.' + String(e.target.className).split(' ')[0] : ''),
          defaultPrevented: e.defaultPrevented,
          deltaY: e.deltaY,
          cancelled: e.cancelable,
        })
      },
      { capture: phase === 'capture', passive: true }
    )
  }
})

await page.mouse.wheel(0, 200)
await new Promise((r) => setTimeout(r, 600))

const log = await page.evaluate(() => ({
  wheels: window.__wheelLog,
  scrollY: window.scrollY,
  elementAtCenter: (() => {
    const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2)
    return el ? el.tagName + '.' + String(el.className).split(' ')[0] : 'none'
  })(),
  elementAtOrigin: (() => {
    const el = document.elementFromPoint(1, 1)
    return el ? el.tagName + '.' + String(el.className).split(' ')[0] : 'none'
  })(),
}))
console.log('SITE wheel log:', JSON.stringify(log.wheels.slice(0, 5)))
console.log('SITE scrollY after wheel:', log.scrollY)
console.log('element at center:', log.elementAtCenter, '| at origin:', log.elementAtOrigin)

await browser.close()
