/**
 * Extract crewmate frames from Player-sharedassets0.assets-55.png
 * Produces: idle.png, walk1.png, walk2.png, walk3.png
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PNG } from 'pngjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SPRITE_PATH = path.resolve(
  __dirname,
  '../assets/among us/among-us-assets-main/among-us-assets-main/Players/Player-sharedassets0.assets-55.png'
);
const OUT_DIR = path.resolve(__dirname, '../public/sprites');

fs.mkdirSync(OUT_DIR, { recursive: true });

const src = PNG.sync.read(fs.readFileSync(SPRITE_PATH));

interface Frame {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

// Verified frame positions from visual analysis:
const frames: Frame[] = [
  { name: 'idle',  x: 2,  y: 0,   w: 152, h: 204 },  // Large standing side-view
  { name: 'walk1', x: 13, y: 499,  w: 92,  h: 99  },  // Side-view walking (neutral)
  { name: 'walk2', x: 15, y: 744,  w: 84,  h: 93  },  // Side-view walking (stride A)
  { name: 'walk3', x: 10, y: 866,  w: 80,  h: 105 },  // Side-view walking (stride B)
];

for (const frame of frames) {
  const out = new PNG({ width: frame.w, height: frame.h });
  for (let y = 0; y < frame.h; y++) {
    for (let x = 0; x < frame.w; x++) {
      const srcIdx = ((frame.y + y) * src.width + (frame.x + x)) * 4;
      const dstIdx = (y * frame.w + x) * 4;
      out.data[dstIdx]     = src.data[srcIdx];
      out.data[dstIdx + 1] = src.data[srcIdx + 1];
      out.data[dstIdx + 2] = src.data[srcIdx + 2];
      out.data[dstIdx + 3] = src.data[srcIdx + 3];
    }
  }
  const outPath = path.join(OUT_DIR, `${frame.name}.png`);
  fs.writeFileSync(outPath, PNG.sync.write(out));
  console.log(`  ${frame.name}: ${frame.w}x${frame.h} -> ${path.basename(outPath)}`);
}

// Clean up any test files
const testFiles = fs.readdirSync(OUT_DIR).filter(f => f.startsWith('test_'));
for (const f of testFiles) {
  fs.unlinkSync(path.join(OUT_DIR, f));
  console.log(`  Cleaned up: ${f}`);
}

console.log('\nDone!');
