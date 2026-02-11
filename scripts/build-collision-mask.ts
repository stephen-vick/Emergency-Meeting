/**
 * Generate collision mask and space overlay for the Skeld map.
 *
 * Approach:
 *   1. Read the map PNG at full resolution (2048×1872)
 *   2. Auto-detect non-background pixels via brightness threshold
 *   3. Downscale to 512×468 (1/4 scale)
 *   4. Apply morphological opening (erode then dilate) to remove thin walls
 *   5. Union with manual rectangles for rooms on separate overlay layers
 *   6. Output collision-mask.png and space-overlay.png
 *
 * Produces:
 *   public/collision-mask.png  – walkable = white opaque, walls/exterior = transparent
 *   public/space-overlay.png   – non-walkable = dark opaque (#0a0a12), walkable = transparent
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PNG } from 'pngjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.resolve(PROJECT_ROOT, 'public');
fs.mkdirSync(OUT_DIR, { recursive: true });

// ── Map dimensions ──────────────────────────────────────────────
const MAP_W = 2048;
const MAP_H = 1872;
const SCALE = 4;
const MASK_W = Math.ceil(MAP_W / SCALE); // 512
const MASK_H = Math.ceil(MAP_H / SCALE); // 468

// Space overlay colour (#0a0a12)
const SPACE_R = 10;
const SPACE_G = 10;
const SPACE_B = 18;

// ── Pixel analysis parameters ───────────────────────────────────
// Pixels with average brightness above this are considered background (white atlas)
const BRIGHTNESS_THRESHOLD = 230;
// Minimum content pixels in a SCALE×SCALE block to mark mask pixel as content
const CONTENT_BLOCK_MIN = 6;
// Morphological radii (mask-pixel units; multiply by SCALE for map-pixel equiv.)
const ERODE_RADIUS = 3;   // removes walls ~12px at map scale
const DILATE_RADIUS = 4;  // restores floors, slightly forgiving
// Minimum connected component size to keep (mask pixels). Removes small decorative
// sprite fragments that survive the morphological opening.
const MIN_COMPONENT_SIZE = 80;

// ── Path to map image (read from the composite map built by build-composite-map.ts) ──
const MAP_IMAGE_PATH = path.join(PROJECT_ROOT, 'public', 'skeld-map.png');

// ── Rectangle helper ────────────────────────────────────────────
interface Rect { x: number; y: number; w: number; h: number }

// ── Manual rectangles for ALL rooms ─────────────────────────────
// Many rooms have significant transparent-pixel gaps in the base floor image
// (e.g. Electrical is 88% transparent, Admin 42%). The morphological opening
// removes sparse content, so these rooms get partially or entirely excluded
// from the auto-detected mask. Manual rectangles guarantee full room coverage.
//
// Coordinates are in full map-pixel space (2048×1872).

const OVERLAY_ROOMS: Rect[] = [
  // ── Overlay-layer rooms (separate sprite layers, not in base image) ──

  // Cafeteria (large octagonal room, upper-center)
  { x: 620,  y: 25,  w: 700, h: 360 },   // main body
  { x: 670,  y: 5,   w: 600, h: 405 },   // wider octagonal extent

  // Weapons (upper-right, pentagon-ish shape)
  { x: 1350, y: 10,  w: 360, h: 350 },

  // Navigation (bottom-right, rounded cockpit)
  { x: 1710, y: 1260, w: 270, h: 290 },

  // O2 (right side, tree room + equipment)
  { x: 1770, y: 810,  w: 220, h: 230 },

  // ── Base-image rooms (present but with large transparent gaps) ──

  // Reactor (far left, tall room)
  { x: 20,   y: 570,  w: 270, h: 350 },

  // Upper Engine (top-left)
  { x: 100,  y: 180,  w: 350, h: 360 },

  // Lower Engine (bottom-left)
  { x: 100,  y: 1100, w: 350, h: 360 },

  // Security (left side, between engines)
  { x: 290,  y: 700,  w: 240, h: 250 },

  // MedBay (upper-left, between cafeteria and upper engine)
  { x: 450,  y: 190,  w: 310, h: 280 },

  // Electrical (left-center, very sparse in base image ~12% content)
  { x: 380,  y: 700,  w: 330, h: 320 },

  // Storage (bottom-center)
  { x: 560,  y: 1070, w: 430, h: 400 },

  // Admin (center-right, ~51% content in base image)
  { x: 1010, y: 540,  w: 350, h: 300 },

  // Shields (center, below admin)
  { x: 1070, y: 890,  w: 320, h: 310 },

  // Communications (bottom-center)
  { x: 700,  y: 1260, w: 340, h: 300 },
];

// Corridors that connect overlay rooms to auto-detected areas.
// These ensure there are no gaps at room boundaries.
const OVERLAY_CORRIDORS: Rect[] = [
  // Cafeteria south exits → main horizontal corridor
  { x: 920,  y: 380, w: 160, h: 100 },   // centre-left exit
  { x: 1180, y: 380, w: 140, h: 100 },   // centre-right exit

  // Cafeteria east → Weapons
  { x: 1310, y: 80,  w: 60,  h: 240 },

  // Weapons south → right vertical corridor
  { x: 1620, y: 340, w: 120, h: 100 },

  // Right vertical corridor (Weapons → O2 → Navigation)
  { x: 1640, y: 280, w: 110, h: 320 },
  { x: 1660, y: 570, w: 110, h: 260 },
  { x: 1750, y: 700, w: 90,  h: 140 },
  { x: 1740, y: 1020, w: 100, h: 260 },

  // O2 west → right corridor
  { x: 1730, y: 860, w: 60,  h: 120 },

  // Navigation approach from above
  { x: 1730, y: 1190, w: 80,  h: 100 },

  // Right horizontal corridor (Admin → right side)
  { x: 1350, y: 480, w: 300, h: 90 },
  { x: 1440, y: 560, w: 230, h: 80 },

  // Right horizontal (Shields → right)
  { x: 1340, y: 830, w: 340, h: 80 },

  // Communications → bottom-right area
  { x: 990,  y: 1200, w: 420, h: 90 },

  // Admin south → lower corridors
  { x: 1100, y: 680, w: 120, h: 200 },
];

const ALL_OVERLAY: Rect[] = [...OVERLAY_ROOMS, ...OVERLAY_CORRIDORS];

// ── Morphological helpers ───────────────────────────────────────

/** Erode: pixel is 1 only if ALL neighbours within radius are 1 */
function erode(src: Uint8Array, w: number, h: number, r: number): Uint8Array {
  const dst = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let ok = true;
      outer:
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h || !src[ny * w + nx]) {
            ok = false;
            break outer;
          }
        }
      }
      dst[y * w + x] = ok ? 1 : 0;
    }
  }
  return dst;
}

/** Dilate: pixel is 1 if ANY neighbour within radius is 1 */
function dilate(src: Uint8Array, w: number, h: number, r: number): Uint8Array {
  const dst = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let hit = false;
      outer:
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < w && ny >= 0 && ny < h && src[ny * w + nx]) {
            hit = true;
            break outer;
          }
        }
      }
      dst[y * w + x] = hit ? 1 : 0;
    }
  }
  return dst;
}

/** Remove connected components smaller than minSize pixels */
function removeSmallComponents(src: Uint8Array, w: number, h: number, minSize: number): Uint8Array {
  const dst = new Uint8Array(src);
  const visited = new Uint8Array(w * h);

  for (let startY = 0; startY < h; startY++) {
    for (let startX = 0; startX < w; startX++) {
      const startIdx = startY * w + startX;
      if (!dst[startIdx] || visited[startIdx]) continue;

      // Flood-fill to find this component
      const queue: number[] = [startIdx];
      const component: number[] = [];
      visited[startIdx] = 1;

      while (queue.length > 0) {
        const idx = queue.pop()!;
        component.push(idx);
        const cx = idx % w;
        const cy = (idx - cx) / w;

        // 4-connected neighbours
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          const nIdx = ny * w + nx;
          if (!visited[nIdx] && dst[nIdx]) {
            visited[nIdx] = 1;
            queue.push(nIdx);
          }
        }
      }

      // Remove small components
      if (component.length < minSize) {
        for (const idx of component) {
          dst[idx] = 0;
        }
      }
    }
  }
  return dst;
}

// ═════════════════════════════════════════════════════════════════
//  MAIN
// ═════════════════════════════════════════════════════════════════

console.log('Building collision mask (pixel analysis)...');

// ── 1. Read map image ───────────────────────────────────────────
console.log(`  Reading: ${path.basename(MAP_IMAGE_PATH)}`);
const mapPng = PNG.sync.read(fs.readFileSync(MAP_IMAGE_PATH));
console.log(`  Map size: ${mapPng.width}×${mapPng.height}`);

// ── 2. Classify pixels: content (1) vs background (0) ──────────
const totalPixels = mapPng.width * mapPng.height;
const isContent = new Uint8Array(totalPixels);
let contentCount = 0;

for (let i = 0; i < totalPixels; i++) {
  const idx = i * 4;
  const r = mapPng.data[idx];
  const g = mapPng.data[idx + 1];
  const b = mapPng.data[idx + 2];
  const a = mapPng.data[idx + 3];

  // Transparent pixels are always background
  if (a < 128) {
    isContent[i] = 0;
    continue;
  }

  const brightness = (r + g + b) / 3;
  isContent[i] = brightness <= BRIGHTNESS_THRESHOLD ? 1 : 0;
  contentCount += isContent[i];
}

console.log(`  Content pixels: ${contentCount} / ${totalPixels} (${(100 * contentCount / totalPixels).toFixed(1)}%)`);

// ── 3. Downscale to mask resolution ─────────────────────────────
const rawMask = new Uint8Array(MASK_W * MASK_H);

for (let my = 0; my < MASK_H; my++) {
  for (let mx = 0; mx < MASK_W; mx++) {
    let cnt = 0;
    for (let dy = 0; dy < SCALE; dy++) {
      for (let dx = 0; dx < SCALE; dx++) {
        const px = mx * SCALE + dx;
        const py = my * SCALE + dy;
        if (px < mapPng.width && py < mapPng.height) {
          cnt += isContent[py * mapPng.width + px];
        }
      }
    }
    rawMask[my * MASK_W + mx] = cnt >= CONTENT_BLOCK_MIN ? 1 : 0;
  }
}

const rawCount = rawMask.reduce((s, v) => s + v, 0);
console.log(`  Downscaled content: ${rawCount} mask pixels`);

// ── 4. Morphological opening (erode then dilate) ────────────────
console.log(`  Erode(${ERODE_RADIUS}) → Dilate(${DILATE_RADIUS})...`);
const opened = dilate(erode(rawMask, MASK_W, MASK_H, ERODE_RADIUS), MASK_W, MASK_H, DILATE_RADIUS);

const openedCount = opened.reduce((s, v) => s + v, 0);
console.log(`  After opening: ${openedCount} mask pixels`);

// ── 4b. Remove small isolated components (decorative fragments) ─
console.log(`  Removing components < ${MIN_COMPONENT_SIZE}px...`);
const cleaned = removeSmallComponents(opened, MASK_W, MASK_H, MIN_COMPONENT_SIZE);
const cleanedCount = cleaned.reduce((s, v) => s + v, 0);
console.log(`  After cleanup: ${cleanedCount} mask pixels (removed ${openedCount - cleanedCount})`);

// ── 5. Union with overlay room / corridor rectangles ────────────
const finalMask = new Uint8Array(cleaned);

for (const rect of ALL_OVERLAY) {
  const sx = Math.max(0, Math.floor(rect.x / SCALE));
  const sy = Math.max(0, Math.floor(rect.y / SCALE));
  const ex = Math.min(MASK_W, Math.ceil((rect.x + rect.w) / SCALE));
  const ey = Math.min(MASK_H, Math.ceil((rect.y + rect.h) / SCALE));

  for (let y = sy; y < ey; y++) {
    for (let x = sx; x < ex; x++) {
      finalMask[y * MASK_W + x] = 1;
    }
  }
}

const finalCount = finalMask.reduce((s, v) => s + v, 0);
console.log(`  Final walkable: ${finalCount} mask pixels (with overlay rooms)`);

// ── 6. Write collision-mask.png ─────────────────────────────────
const maskPng = new PNG({ width: MASK_W, height: MASK_H });
maskPng.data.fill(0);

for (let i = 0; i < MASK_W * MASK_H; i++) {
  if (finalMask[i]) {
    const idx = i * 4;
    maskPng.data[idx]     = 255;
    maskPng.data[idx + 1] = 255;
    maskPng.data[idx + 2] = 255;
    maskPng.data[idx + 3] = 255;
  }
}

fs.writeFileSync(path.join(OUT_DIR, 'collision-mask.png'), PNG.sync.write(maskPng));
console.log(`  → collision-mask.png: ${MASK_W}×${MASK_H}`);

// ── 7. Write space-overlay.png (inverted mask, dark fill) ───────
const overlayPng = new PNG({ width: MASK_W, height: MASK_H });

for (let i = 0; i < MASK_W * MASK_H; i++) {
  const idx = i * 4;
  if (finalMask[i]) {
    overlayPng.data[idx]     = 0;
    overlayPng.data[idx + 1] = 0;
    overlayPng.data[idx + 2] = 0;
    overlayPng.data[idx + 3] = 0;
  } else {
    overlayPng.data[idx]     = SPACE_R;
    overlayPng.data[idx + 1] = SPACE_G;
    overlayPng.data[idx + 2] = SPACE_B;
    overlayPng.data[idx + 3] = 255;
  }
}

fs.writeFileSync(path.join(OUT_DIR, 'space-overlay.png'), PNG.sync.write(overlayPng));
console.log(`  → space-overlay.png: ${MASK_W}×${MASK_H}`);

console.log('\nDone! Pixel-analysis collision mask generated.');
