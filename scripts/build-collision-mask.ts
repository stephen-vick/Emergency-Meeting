/**
 * Generate collision mask and space overlay for the Skeld map.
 *
 * Approach: Rectangle-based walkable areas.
 * All walkable rooms and corridors are defined as manual rectangles.
 * Everything outside these rectangles is non-walkable (walls / exterior space).
 *
 * Produces:
 *   public/collision-mask.png  – walkable = white opaque, walls/exterior = transparent
 *   public/space-overlay.png   – full-res non-walkable dark overlay, walkable transparent
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PNG } from 'pngjs';
import {
  MAP_W,
  MAP_H,
  MASK_SCALE as SCALE,
  MASK_W,
  MASK_H,
  WALKABLE_ROOM_RECTS as ROOMS,
  CORRIDOR_RECTS as CORRIDORS,
  type Rect,
} from '../shared/skeldGeometry';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.resolve(PROJECT_ROOT, 'public');
fs.mkdirSync(OUT_DIR, { recursive: true });

// ── Map dimensions ──────────────────────────────────────────────
// Imported from shared geometry to keep runtime and build scripts aligned.

// Space overlay colour (#0a0a12)
const SPACE_R = 10;
const SPACE_G = 10;
const SPACE_B = 18;

// ── Geometry source ──────────────────────────────────────────────
// Rooms/corridors are imported from shared/skeldGeometry.ts.

const ALL_WALKABLE: Rect[] = [...ROOMS, ...CORRIDORS];

// ═════════════════════════════════════════════════════════════════
//  MAIN
// ═════════════════════════════════════════════════════════════════

console.log('Building collision mask (rectangle-based)...');
console.log(`  Mask resolution: ${MASK_W}×${MASK_H} (1/${SCALE} scale)`);
console.log(`  Rooms: ${ROOMS.length}, Corridors: ${CORRIDORS.length}`);

// ── 1. Build walkable mask from rectangles ──────────────────────
const mask = new Uint8Array(MASK_W * MASK_H);

for (const rect of ALL_WALKABLE) {
  const sx = Math.max(0, Math.floor(rect.x / SCALE));
  const sy = Math.max(0, Math.floor(rect.y / SCALE));
  const ex = Math.min(MASK_W, Math.ceil((rect.x + rect.w) / SCALE));
  const ey = Math.min(MASK_H, Math.ceil((rect.y + rect.h) / SCALE));

  for (let y = sy; y < ey; y++) {
    for (let x = sx; x < ex; x++) {
      mask[y * MASK_W + x] = 1;
    }
  }
}

const walkableCount = mask.reduce((s, v) => s + v, 0);
const totalMaskPixels = MASK_W * MASK_H;
console.log(`  Walkable: ${walkableCount} / ${totalMaskPixels} mask pixels (${(100 * walkableCount / totalMaskPixels).toFixed(1)}%)`);

// ── 2. Write collision-mask.png ─────────────────────────────────
const maskPng = new PNG({ width: MASK_W, height: MASK_H });
maskPng.data.fill(0);

for (let i = 0; i < totalMaskPixels; i++) {
  if (mask[i]) {
    const idx = i * 4;
    maskPng.data[idx]     = 255;
    maskPng.data[idx + 1] = 255;
    maskPng.data[idx + 2] = 255;
    maskPng.data[idx + 3] = 255;
  }
}

fs.writeFileSync(path.join(OUT_DIR, 'collision-mask.png'), PNG.sync.write(maskPng));
console.log(`  → collision-mask.png: ${MASK_W}×${MASK_H}`);

// ── 3. Write space-overlay.png (inverted mask, full map resolution) ──
// Keep collision semantics from the low-res mask, but render overlay at full
// map size to avoid blocky 4x upscaling artifacts in runtime.
const overlayPng = new PNG({ width: MAP_W, height: MAP_H });
for (let y = 0; y < MAP_H; y++) {
  for (let x = 0; x < MAP_W; x++) {
    const mx = Math.min(MASK_W - 1, Math.floor(x / SCALE));
    const my = Math.min(MASK_H - 1, Math.floor(y / SCALE));
    const walkable = mask[my * MASK_W + mx] === 1;
    const idx = (y * MAP_W + x) * 4;

    if (walkable) {
      overlayPng.data[idx] = 0;
      overlayPng.data[idx + 1] = 0;
      overlayPng.data[idx + 2] = 0;
      overlayPng.data[idx + 3] = 0;
    } else {
      overlayPng.data[idx] = SPACE_R;
      overlayPng.data[idx + 1] = SPACE_G;
      overlayPng.data[idx + 2] = SPACE_B;
      // Slight transparency retains space detail while still masking exterior.
      overlayPng.data[idx + 3] = 210;
    }
  }
}

fs.writeFileSync(path.join(OUT_DIR, 'space-overlay.png'), PNG.sync.write(overlayPng));
console.log(`  → space-overlay.png: ${MAP_W}×${MAP_H}`);

console.log('\nDone! Rectangle-based collision mask generated.');
