/**
 * Re-encodes public/frames/*.webp at a sane quality level.
 *
 * Originals were extracted at -quality 95 (~100KB avg / 119MB total).
 * This transcodes every frame IN PLACE at -quality 75 (~3x smaller),
 * one frame at a time so timing/count can never drift.
 *
 * Safety: writes to a temp dir first, verifies the count matches,
 * and only then swaps. Originals stay recoverable via git history.
 *
 * Usage: npm run optimize-frames
 */
import { execFileSync } from 'child_process'
import ffmpegPath from 'ffmpeg-static'
import { existsSync, mkdirSync, readdirSync, rmSync, renameSync, statSync } from 'fs'
import { join } from 'path'

const FRAMES_DIR = join(import.meta.dirname, '..', 'public', 'frames')
const TMP_DIR = join(import.meta.dirname, '..', 'public', 'frames-optimizing')
const QUALITY = 75
const COMPRESSION_LEVEL = 5

if (!existsSync(FRAMES_DIR)) {
  console.error(`No frames dir at ${FRAMES_DIR}`)
  process.exit(1)
}

const frames = readdirSync(FRAMES_DIR).filter((f) => f.endsWith('.webp')).sort()
const beforeBytes = frames.reduce((n, f) => n + statSync(join(FRAMES_DIR, f)).size, 0)
console.log(`Optimizing ${frames.length} frames (${(beforeBytes / 1e6).toFixed(1)} MB) at quality ${QUALITY}...`)

rmSync(TMP_DIR, { recursive: true, force: true })
mkdirSync(TMP_DIR, { recursive: true })

let done = 0
let failed = 0

for (const file of frames) {
  const src = join(FRAMES_DIR, file)
  const dst = join(TMP_DIR, file)
  try {
    // -frames:v 1 guards against any input oddities producing multi-frame output
    execFileSync(ffmpegPath, [
      '-y', '-loglevel', 'error',
      '-i', src,
      '-c:v', 'libwebp',
      '-quality', String(QUALITY),
      '-compression_level', String(COMPRESSION_LEVEL),
      '-frames:v', '1',
      dst,
    ])
    if (!existsSync(dst) || statSync(dst).size === 0) throw new Error('empty output')
  } catch (err) {
    failed++
    console.error(`FAILED ${file}: ${err.message}`)
  }
  done++
  if (done % 200 === 0) console.log(`  ${done}/${frames.length}`)
}

const outFiles = readdirSync(TMP_DIR).filter((f) => f.endsWith('.webp'))

if (outFiles.length !== frames.length || failed > 0) {
  console.error(`Verification failed (${outFiles.length}/${frames.length} encoded, ${failed} errors) — aborting, originals untouched.`)
  process.exit(1)
}

const afterBytes = outFiles.reduce((n, f) => n + statSync(join(TMP_DIR, f)).size, 0)

// Swap: move old frames aside, new ones in, then delete old
const OLD_DIR = `${FRAMES_DIR}-original`
rmSync(OLD_DIR, { recursive: true, force: true })
renameSync(FRAMES_DIR, OLD_DIR)
renameSync(TMP_DIR, FRAMES_DIR)
rmSync(OLD_DIR, { recursive: true, force: true })

console.log(`\nDone. ${(beforeBytes / 1e6).toFixed(1)} MB → ${(afterBytes / 1e6).toFixed(1)} MB (${(100 - (afterBytes / beforeBytes) * 100).toFixed(0)}% smaller)`)