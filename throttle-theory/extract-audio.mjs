import { execSync } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import { join } from 'path';

const VIDEO = 'D:\\Throttle_theory\\throttle_theory\\final_throttle_theory.mp4';
const OUT_DIR = join(import.meta.dirname, 'public', 'audio');
const OUT_FILE = join(OUT_DIR, 'video-audio.mp3');

console.log(`Extracting audio from: ${VIDEO}`);
console.log(`Output: ${OUT_FILE}`);

const cmd = `"${ffmpegPath}" -i "${VIDEO}" -vn -acodec libmp3lame -ab 192k -y "${OUT_FILE}"`;
console.log('Running:', cmd);
execSync(cmd, { stdio: 'inherit' });
console.log('\nDone! Audio extracted successfully.');
