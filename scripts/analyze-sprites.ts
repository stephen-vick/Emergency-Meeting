/**
 * Analyze Player sprite sheet to find individual sprite bounding boxes
 * using connected component labeling with a small gap tolerance.
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

const png = PNG.sync.read(fs.readFileSync(SPRITE_PATH));
const { width, height, data } = png;
console.log(`Image: ${width}x${height}`);

// Create a binary grid: 1 = opaque, 0 = transparent
const ALPHA_THRESHOLD = 10;
const grid = new Uint8Array(width * height);
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const idx = (y * width + x) * 4;
    grid[y * width + x] = data[idx + 3] > ALPHA_THRESHOLD ? 1 : 0;
  }
}

// Dilate the grid slightly (2px) to merge closely-spaced sprites that belong together
const GAP = 2;
const dilated = new Uint8Array(grid);
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    if (grid[y * width + x]) {
      for (let dy = -GAP; dy <= GAP; dy++) {
        for (let dx = -GAP; dx <= GAP; dx++) {
          const ny = y + dy, nx = x + dx;
          if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
            dilated[ny * width + nx] = 1;
          }
        }
      }
    }
  }
}

// Connected component labeling using BFS on dilated grid
const labels = new Int32Array(width * height).fill(-1);
let nextLabel = 0;

interface BBox { minX: number; minY: number; maxX: number; maxY: number; }
const bboxes: BBox[] = [];

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    if (dilated[y * width + x] && labels[y * width + x] === -1) {
      // BFS
      const label = nextLabel++;
      const queue: [number, number][] = [[x, y]];
      labels[y * width + x] = label;
      const bb: BBox = { minX: x, minY: y, maxX: x, maxY: y };

      while (queue.length > 0) {
        const [cx, cy] = queue.shift()!;
        // Only update bbox if the ORIGINAL grid has a pixel here
        if (grid[cy * width + cx]) {
          bb.minX = Math.min(bb.minX, cx);
          bb.minY = Math.min(bb.minY, cy);
          bb.maxX = Math.max(bb.maxX, cx);
          bb.maxY = Math.max(bb.maxY, cy);
        }
        for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          const nx = cx + dx, ny = cy + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height &&
              dilated[ny * width + nx] && labels[ny * width + nx] === -1) {
            labels[ny * width + nx] = label;
            queue.push([nx, ny]);
          }
        }
      }

      bboxes.push(bb);
    }
  }
}

// Sort by area descending
const sprites = bboxes.map((bb, i) => ({
  id: i,
  x: bb.minX,
  y: bb.minY,
  w: bb.maxX - bb.minX + 1,
  h: bb.maxY - bb.minY + 1,
  area: (bb.maxX - bb.minX + 1) * (bb.maxY - bb.minY + 1),
}));

sprites.sort((a, b) => b.area - a.area);

console.log(`\nFound ${sprites.length} components. Top 40 by area:\n`);
sprites.slice(0, 40).forEach((s, i) => {
  console.log(`  ${i}: x=${s.x}, y=${s.y}, w=${s.w}, h=${s.h}, area=${s.area}`);
});

// Also group sprites that look like side-view crewmates (roughly 50-80px wide, 60-120px tall)
console.log('\n--- Potential side-view walking frames (w:40-100, h:50-130, aspect 0.5-1.2) ---\n');
const sideViews = sprites.filter(s =>
  s.w >= 40 && s.w <= 100 &&
  s.h >= 50 && s.h <= 130 &&
  s.w / s.h >= 0.4 && s.w / s.h <= 1.2
);
sideViews.sort((a, b) => a.y - b.y);
sideViews.forEach((s, i) => {
  console.log(`  ${i}: x=${s.x}, y=${s.y}, w=${s.w}, h=${s.h}`);
});
