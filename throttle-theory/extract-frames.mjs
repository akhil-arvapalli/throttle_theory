import { execSync } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import { existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';

const VIDEO = 'D:\\Throttle_theory\\throttle_theory\\final_throttle_theory.mp4';
const OUT_DIR = join(import.meta.dirname, 'public', 'frames');
const TOTAL_FRAMES = 1202; // every frame from the 50.17s @ 23.96fps video

// Clean old frames
if (existsSync(OUT_DIR)) {
  for (const f of readdirSync(OUT_DIR)) {
    unlinkSync(join(OUT_DIR, f));
  }
} else {
  mkdirSync(OUT_DIR, { recursive: true });
}

// Get video duration
const probeCmd = `"${ffmpegPath}" -i "${VIDEO}" 2>&1`;
let duration;
try {
  execSync(probeCmd, { encoding: 'utf-8' });
} catch (e) {
  // ffmpeg prints info to stderr and exits 1 when no output specified
  const match = e.stderr?.match(/Duration:\s*(\d+):(\d+):(\d+)\.(\d+)/) ||
                e.stdout?.match(/Duration:\s*(\d+):(\d+):(\d+)\.(\d+)/);
  if (match) {
    duration = parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]) + parseInt(match[4]) / 100;
  }
}

if (!duration) {
  // Try combined output
  try {
    const out = execSync(`"${ffmpegPath}" -i "${VIDEO}" 2>&1 || true`, { encoding: 'utf-8', shell: true });
    const m = out.match(/Duration:\s*(\d+):(\d+):(\d+)\.(\d+)/);
    if (m) {
      duration = parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseInt(m[3]) + parseInt(m[4]) / 100;
    }
  } catch (_) {}
}

console.log(`Video duration: ${duration}s`);
console.log(`Extracting ${TOTAL_FRAMES} frames...`);

// Calculate fps to get desired number of frames
const fps = TOTAL_FRAMES / duration;
console.log(`Using fps: ${fps.toFixed(4)}`);

// Extract frames as webp
const cmd = `"${ffmpegPath}" -i "${VIDEO}" -vf "fps=${fps.toFixed(4)}" -c:v libwebp -quality 95 "${join(OUT_DIR, 'frame_%04d.webp')}"`;
console.log('Running:', cmd);
execSync(cmd, { stdio: 'inherit' });

// Count output
const count = readdirSync(OUT_DIR).filter(f => f.endsWith('.webp')).length;
console.log(`\nDone! Extracted ${count} frames to ${OUT_DIR}`);
