/**
 * Generate collision mask and space overlay for the Skeld map.
 *
 * Approach: Rectangle-based walkable areas.
 * All walkable rooms and corridors are defined as manual rectangles.
 * Everything outside these rectangles is non-walkable (walls / exterior space).
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

// ── Rectangle helper ────────────────────────────────────────────
interface Rect { x: number; y: number; w: number; h: number }

// ── Walkable room rectangles ────────────────────────────────────
// Coordinates are in full map-pixel space (2048×1872).

const ROOMS: Rect[] = [
  // Cafeteria (large octagonal room, upper-center)
  { x: 620,  y: 25,  w: 700, h: 360 },
  { x: 670,  y: 5,   w: 600, h: 405 },

  // Weapons (upper-right, pentagon-ish shape)
  { x: 1350, y: 10,  w: 360, h: 350 },

  // Navigation (bottom-right, rounded cockpit)
  { x: 1710, y: 1260, w: 270, h: 290 },

  // O2 (right side, tree room + equipment)
  { x: 1770, y: 810,  w: 220, h: 230 },

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

  // Electrical (left-center)
  { x: 380,  y: 700,  w: 330, h: 320 },

  // Storage (bottom-center)
  { x: 560,  y: 1070, w: 430, h: 400 },

  // Admin (center-right)
  { x: 1010, y: 540,  w: 350, h: 300 },

  // Shields (center, below admin)
  { x: 1070, y: 890,  w: 320, h: 310 },

  // Communications (bottom-center)
  { x: 700,  y: 1260, w: 340, h: 300 },
];

// Corridors connecting rooms
const CORRIDORS: Rect[] = [
  // Cafeteria south exits → main horizontal corridor
  { x: 920,  y: 380, w: 160, h: 100 },
  { x: 1180, y: 380, w: 140, h: 100 },

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

  // ── Left-side corridors ──

  // Upper Engine south → horizontal corridor
  { x: 300,  y: 440, w: 200, h: 80 },

  // MedBay south → horizontal corridor
  { x: 500,  y: 440, w: 200, h: 80 },

  // Main horizontal corridor (upper, left side)
  { x: 420,  y: 440, w: 600, h: 100 },

  // Main horizontal corridor (upper, center-right)
  { x: 920,  y: 440, w: 450, h: 100 },

  // Reactor east → Security / corridor
  { x: 280,  y: 620, w: 100, h: 100 },

  // Security → Electrical connector
  { x: 380,  y: 740, w: 50,  h: 120 },

  // Electrical south → Storage
  { x: 540,  y: 1000, w: 120, h: 100 },

  // Lower Engine east → corridor
  { x: 300,  y: 1200, w: 200, h: 80 },

  // Storage → Communications
  { x: 700,  y: 1380, w: 200, h: 80 },

  // Left vertical corridor (Upper Engine → Reactor → Security → Lower Engine)
  { x: 200,  y: 520, w: 120, h: 200 },
  { x: 200,  y: 930, w: 120, h: 200 },

  // Center vertical corridor (Cafeteria south → Admin → Shields → Storage)
  { x: 1000, y: 480, w: 120, h: 120 },
  { x: 1060, y: 820, w: 120, h: 100 },
  { x: 900,  y: 1050, w: 200, h: 100 },
];

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

// ── 3. Write space-overlay.png (inverted mask, dark fill) ───────
const overlayPng = new PNG({ width: MASK_W, height: MASK_H });

for (let i = 0; i < totalMaskPixels; i++) {
  const idx = i * 4;
  if (mask[i]) {
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

console.log('\nDone! Rectangle-based collision mask generated.');
