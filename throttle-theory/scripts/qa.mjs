/**
 * Runs every QA suite against the running site and reports one verdict.
 *
 * Each suite is an independent process with its own browser, so a crash in
 * one is contained and the rest still report.
 *
 * Usage: npm run qa            (assumes a server on :4173)
 *        node scripts/qa.mjs [baseUrl]
 */
import { spawn } from 'child_process'
import { existsSync } from 'fs'

const BASE = process.argv[2] ?? 'http://localhost:4173'

const SUITES = [
  ['overlap', 'scripts/overlap-check.mjs', 'footer never collides with fixed overlays'],
  ['fonts', 'scripts/font-check.mjs', 'each text role resolves to the intended webfont'],
  ['autoplay', 'scripts/autoplay-check.mjs', 'guided run starts, moves, cancels, respects reduced motion'],
  ['audio', 'scripts/audio-sync-check.mjs', 'engine note tracks the frames'],
  ['a11y', 'scripts/a11y-check.mjs', 'focus order, reduced-motion cascade, measured contrast'],
  ['behaviour', 'scripts/behaviour-check.mjs', 'reload, hero timing, error-free scroll'],
]

const CANDIDATES = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
]
if (!CANDIDATES.some((p) => existsSync(p))) {
  console.error('No Edge/Chrome found')
  process.exit(1)
}

const run = (name, script) =>
  new Promise((resolve) => {
    const started = Date.now()
    const child = spawn(process.execPath, [script, BASE], { stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    child.stdout.on('data', (d) => (out += d))
    child.stderr.on('data', (d) => (out += d))
    child.on('close', (code) => resolve({ name, ok: code === 0, out, ms: Date.now() - started }))
  })

console.log(`QA against ${BASE}\n`)
const results = []
for (const [name, script, blurb] of SUITES) {
  process.stdout.write(`running ${name.padEnd(10)} ${blurb} ... `)
  const r = await run(name, script)
  results.push(r)
  console.log(r.ok ? `PASS (${(r.ms / 1000).toFixed(1)}s)` : `FAIL (${(r.ms / 1000).toFixed(1)}s)`)
}

console.log('\n' + '='.repeat(72))
for (const r of results) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}`)
  if (!r.ok) {
    console.log(
      r.out
        .split('\n')
        .filter((l) => l.trim())
        .map((l) => `        ${l}`)
        .join('\n')
    )
  }
}
console.log('='.repeat(72))

const failed = results.filter((r) => !r.ok)
if (failed.length) {
  console.log(`\n${failed.length}/${SUITES.length} suites failed: ${failed.map((f) => f.name).join(', ')}`)
  process.exit(1)
}
console.log(`\nAll ${SUITES.length} suites passed.`)
