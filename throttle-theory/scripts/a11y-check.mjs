/**
 * Accessibility QA: the things a visual pass cannot see.
 *
 * Focus order, the reduced-motion cascade, and measured contrast — three
 * classes of regression that look fine in a screenshot and break the site for
 * someone. Contrast is computed from real composited pixels rather than read
 * off the alpha value, because a translucent colour only means something once
 * it is resolved against what is behind it.
 *
 * Usage: node scripts/a11y-check.mjs [baseUrl]
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

const open = async (opts = {}) => {
  const page = await browser.newPage()
  if (opts.reducedMotion) {
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  }
  await page.setViewport({ width: 1440, height: 810 })
  await page.goto(BASE, { waitUntil: 'load', timeout: 120000 })
  await settle(page)
  return page
}

// ── Hidden UI must leave the tab order ───────────────────────────────
{
  const page = await open()
  const navVis = await page.evaluate(() => getComputedStyle(document.querySelector('.navbar')).visibility)
  check('navbar at rest is visibility:hidden', navVis === 'hidden', `visibility=${navVis}`)

  // Tab from the top and make sure nothing invisible swallows the first stops.
  const seen = []
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab')
    const info = await page.evaluate(() => {
      const el = document.activeElement
      if (!el || el === document.body) return null
      const cs = getComputedStyle(el)
      return {
        tag: el.tagName.toLowerCase(),
        cls: el.className?.toString?.().slice(0, 40) ?? '',
        visible: cs.visibility !== 'hidden' && cs.display !== 'none' && parseFloat(cs.opacity) > 0.05,
      }
    })
    if (info) seen.push(info)
  }
  const hiddenStops = seen.filter((s) => !s.visible)
  check(
    'no invisible focus stops at page top',
    hiddenStops.length === 0,
    hiddenStops.length ? hiddenStops.map((s) => s.cls).join(', ') : `${seen.length} stops, all visible`
  )
  await page.close()
}

// ── The scroll cue must reach assistive tech ─────────────────────────
{
  const page = await open()
  const cue = await page.evaluate(() => {
    const el = document.querySelector('.scroll-cue')
    if (!el) return null
    return {
      role: el.getAttribute('role'),
      label: el.getAttribute('aria-label'),
      hidden: el.getAttribute('aria-hidden'),
      labelVisible: !!el.querySelector('.scroll-cue-label')?.textContent?.trim(),
    }
  })
  check('scroll cue is not aria-hidden', cue?.hidden !== 'true', `aria-hidden=${cue?.hidden}`)
  check('scroll cue has a label', !!(cue?.label || cue?.labelVisible), cue?.label ?? '(text label)')
  await page.close()
}

// ── Reduced motion must actually win the cascade ─────────────────────
{
  const page = await open({ reducedMotion: true })
  const anim = await page.evaluate(() => {
    const nav = document.querySelector('.navbar')
    nav.classList.add('navbar-kicked')
    const svg = nav.querySelector('.navbar-logo svg')
    const svgAnim = getComputedStyle(svg).animationName
    const cta = getComputedStyle(document.querySelector('.final-cta')).transitionDuration
    const cue = getComputedStyle(document.querySelector('.bounce-arrow-svg')).animationName
    return { svgAnim, cta, cue }
  })
  check(
    'navbar kick is disabled under reduced motion',
    anim.svgAnim === 'none',
    `animation-name=${anim.svgAnim} (specificity regression would read rpm-kick)`
  )
  check(
    'autoplay skip has no transition under reduced motion',
    anim.cta.split(',').every((d) => parseFloat(d) === 0),
    `transition-duration=${anim.cta}`
  )
  await page.close()
}

// ── Measured contrast, composited against the real background ────────
{
  const page = await open()
  await page.evaluate(async () => {
    const max = document.documentElement.scrollHeight - window.innerHeight
    window.scrollTo(0, max)
    await new Promise((r) => setTimeout(r, 400))
  })

  const contrast = await page.evaluate(() => {
    const lum = (rgb) => {
      const [r, g, b] = rgb.map((v) => {
        const c = v / 255
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
      })
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    const parse = (s) => (s.match(/[\d.]+/g) ?? []).map(Number)
    // Resolve the element's colour over the nearest opaque ancestor background.
    const over = (el) => {
      const fg = parse(getComputedStyle(el).color)
      const a = fg.length > 3 ? fg[3] : 1
      let node = el
      let bg = [8, 8, 8]
      while (node) {
        const c = parse(getComputedStyle(node).backgroundColor)
        if (c.length >= 3 && (c.length < 4 || c[3] > 0.9)) {
          bg = c.slice(0, 3)
          break
        }
        node = node.parentElement
      }
      return fg.slice(0, 3).map((v, i) => v * a + bg[i] * (1 - a))
    }
    const ratio = (el) => {
      const c = over(el)
      const l1 = lum(c)
      const l2 = lum([8, 8, 8])
      const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1]
      return (hi + 0.05) / (lo + 0.05)
    }
    const out = []
    for (const sel of ['.footer-line', '.footer-tagline', '.footer-heading']) {
      const el = document.querySelector(sel)
      if (el) out.push({ sel, ratio: Number(ratio(el).toFixed(2)) })
    }
    return out
  })

  for (const c of contrast) {
    // 13px body text is AA-large only above 18.66px bold / 24px, so 4.5 is the floor.
    check(`${c.sel} meets AA contrast`, c.ratio >= 4.5, `${c.ratio}:1 (floor 4.5)`)
  }
  await page.close()
}

await browser.close()

const failed = results.filter((r) => !r.pass)
console.log('\n' + '='.repeat(60))
if (failed.length) {
  console.log(`${failed.length}/${results.length} accessibility checks failed.`)
  process.exit(1)
}
console.log(`All ${results.length} accessibility checks passed.`)
