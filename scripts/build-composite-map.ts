/**
 * Build a composite Skeld map by layering Unity-extracted game textures
 * onto the base map canvas at calibrated positions.
 *
 * Uses the REAL Unity game asset textures from Maps/ (not community sprite
 * sheet rips) for authentic room appearance matching the actual game.
 *
 * Produces: public/skeld-map.png (2048x1872)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PNG } from 'pngjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.resolve(PROJECT_ROOT, 'public');
fs.mkdirSync(OUT_DIR, { recursive: true });

// Unity-extracted game textures folder
const MAPS_DIR = path.join(
  PROJECT_ROOT,
  'assets', 'among us', 'among-us-assets-main', 'among-us-assets-main',
  'Maps',
);

// Base map (the floor/wall atlas layer – contains corridors, Electrical,
// Admin, Shields, Reactor, Engine rooms, and hallways)
const BASE_MAP_PATH = path.join(
  MAPS_DIR, 'Storage',
  'Admin_Comms_Elec_Engine_Halls_Shields_Storage-sharedassets0.assets-150.png',
);

const CANVAS_W = 2048;
const CANVAS_H = 1872;

// Dark floor fill colour
const FLOOR_R = 43;
const FLOOR_G = 43;
const FLOOR_B = 61;

// ── Room placement definitions ──────────────────────────────────
// Each entry specifies:
//   file   – path relative to MAPS_DIR
//   x, y   – destination position on the 2048x1872 canvas
//   scale  – resize factor applied AFTER cropping
//   cropX/cropY/cropW/cropH – optional source rectangle to extract
//            (used to isolate room content from animation frames)

interface RoomPlacement {
  file: string;
  x: number;
  y: number;
  scale: number;
  cropX?: number;
  cropY?: number;
  cropW?: number;
  cropH?: number;
}

// Unity texture dimensions (measured):
// Cafeteria:      1024x1024   (complete room render)
// Weapons:        1620x556    (turret room + sprites)
// Navigation:     344x944     (room outline + cockpit render)
// MedBay:         1104x520    (room + animation frames)
// Engine:         1024x1024   (3 engine variants stacked vertically, ~500x350 each)
// room_O2:        717x1196    (complete O2 room)
// Security:       264x996     (room + monitor animations)
// room_storage:   612x415     (complete storage room)
// room_broadcast: 423x673     (complete communications room)

const ROOM_PLACEMENTS: RoomPlacement[] = [
  // ── Engine rooms (composited FIRST – below corridors in z-order) ──

  // ── Upper Engine (1024x1024 – 3 variants stacked; crop top variant) ──
  // Target region: x=100 y=180 w=350 h=360
  { file: 'Engine-sharedassets0.assets-147.png',
    x: 100, y: 180, scale: 0.70,
    cropX: 0, cropY: 0, cropW: 500, cropH: 350 },

  // ── Lower Engine (same source texture, same crop) ──
  // Target region: x=100 y=1100 w=350 h=360
  { file: 'Engine-sharedassets0.assets-147.png',
    x: 100, y: 1100, scale: 0.70,
    cropX: 0, cropY: 0, cropW: 500, cropH: 350 },

  // ── Cafeteria (1024x1024 – clean complete room, no crop) ──
  // Fills the large transparent area at top-center of the base map.
  // Target region: x=620 y=5 w=710 h=~710
  { file: 'Cafeteria/Cafeteria-sharedassets0.assets-210.png',
    x: 635, y: 5, scale: 0.69 },

  // ── Weapons (1620x556 – turret room on left, animation sprites on right) ──
  // Crop the left portion: cross-shaped turret platform + dark weapons area.
  // Exclude firework animation sprites beyond x=630.
  // Target region: x=1350 y=10 w=360 h=350
  { file: 'Weapons-sharedassets0.assets-201.png',
    x: 1330, y: 0, scale: 0.55,
    cropX: 0, cropY: 0, cropW: 630, cropH: 500 },

  // ── Navigation (344x944 – room outline at top, cockpit render below) ──
  // Crop the assembled cockpit section (bottom portion).
  // Target region: x=1710 y=1260 w=270 h=290
  { file: 'Navigation-sharedassets0.assets-160.png',
    x: 1700, y: 1240, scale: 0.78,
    cropX: 0, cropY: 300, cropW: 344, cropH: 500 },

  // ── MedBay (1104x520 – room on left, animation frames on right) ──
  // Crop left portion to isolate the room.
  // Target region: x=450 y=190 w=310 h=280
  { file: 'MedBay-sharedassets0.assets-110.png',
    x: 435, y: 165, scale: 0.62,
    cropX: 0, cropY: 0, cropW: 500, cropH: 520 },

  // ── O2 (717x1196 – complete room: tree garden + equipment + water) ──
  // Target region: x=1770 y=810 w=220 h=230
  { file: 'room_O2-sharedassets0.assets-93.png',
    x: 1750, y: 780, scale: 0.31 },

  // ── Security (264x996 – room at top, monitor animations below) ──
  // Crop top portion to isolate the room.
  // Target region: x=290 y=700 w=240 h=250
  { file: 'Security/Security-sharedassets0.assets-203.png',
    x: 280, y: 688, scale: 0.91,
    cropX: 0, cropY: 0, cropW: 264, cropH: 370 },

  // ── Storage (612x415 – complete room render) ──
  // Overlays on top of base map storage area to add detail.
  // Target region: x=560 y=1070 w=430 h=400
  { file: 'Storage/room_storage-sharedassets0.assets-98.png',
    x: 555, y: 1070, scale: 0.70 },

  // ── Communications (423x673 – complete room with satellite dish) ──
  // Crop upper portion (room area, not antenna extension below).
  // Target region: x=700 y=1260 w=340 h=300
  { file: 'room_broadcast-sharedassets0.assets-57.png',
    x: 690, y: 1245, scale: 0.80,
    cropX: 0, cropY: 0, cropW: 423, cropH: 520 },
];

// ── Image helpers ───────────────────────────────────────────────

function loadPng(filePath: string): PNG {
  return PNG.sync.read(fs.readFileSync(filePath));
}

/** Bilinear-interpolation scale */
function scalePng(src: PNG, dstW: number, dstH: number): PNG {
  const dst = new PNG({ width: dstW, height: dstH });
  const xRatio = src.width / dstW;
  const yRatio = src.height / dstH;

  for (let y = 0; y < dstH; y++) {
    for (let x = 0; x < dstW; x++) {
      const srcX = x * xRatio;
      const srcY = y * yRatio;
      const x0 = Math.floor(srcX);
      const y0 = Math.floor(srcY);
      const x1 = Math.min(x0 + 1, src.width - 1);
      const y1 = Math.min(y0 + 1, src.height - 1);
      const fx = srcX - x0;
      const fy = srcY - y0;

      const dIdx = (y * dstW + x) * 4;
      for (let c = 0; c < 4; c++) {
        const v00 = src.data[(y0 * src.width + x0) * 4 + c];
        const v10 = src.data[(y0 * src.width + x1) * 4 + c];
        const v01 = src.data[(y1 * src.width + x0) * 4 + c];
        const v11 = src.data[(y1 * src.width + x1) * 4 + c];
        const top = v00 + (v10 - v00) * fx;
        const bot = v01 + (v11 - v01) * fx;
        dst.data[dIdx + c] = Math.round(top + (bot - top) * fy);
      }
    }
  }
  return dst;
}

/** Alpha-composite src over dst at (ox, oy) */
function compositeOver(dst: PNG, src: PNG, ox: number, oy: number): void {
  for (let sy = 0; sy < src.height; sy++) {
    const dy = oy + sy;
    if (dy < 0 || dy >= dst.height) continue;
    for (let sx = 0; sx < src.width; sx++) {
      const dx = ox + sx;
      if (dx < 0 || dx >= dst.width) continue;

      const sIdx = (sy * src.width + sx) * 4;
      const dIdx = (dy * dst.width + dx) * 4;
      const sa = src.data[sIdx + 3] / 255;
      if (sa === 0) continue;

      const da = dst.data[dIdx + 3] / 255;
      const outA = sa + da * (1 - sa);

      if (outA > 0) {
        dst.data[dIdx]     = Math.round((src.data[sIdx]     * sa + dst.data[dIdx]     * da * (1 - sa)) / outA);
        dst.data[dIdx + 1] = Math.round((src.data[sIdx + 1] * sa + dst.data[dIdx + 1] * da * (1 - sa)) / outA);
        dst.data[dIdx + 2] = Math.round((src.data[sIdx + 2] * sa + dst.data[dIdx + 2] * da * (1 - sa)) / outA);
        dst.data[dIdx + 3] = Math.round(outA * 255);
      }
    }
  }
}

/** Crop a PNG to a rectangle */
function cropPng(src: PNG, cx: number, cy: number, cw: number, ch: number): PNG {
  // Clamp to source bounds
  const ex = Math.min(cx + cw, src.width);
  const ey = Math.min(cy + ch, src.height);
  cx = Math.max(0, cx);
  cy = Math.max(0, cy);
  cw = ex - cx;
  ch = ey - cy;

  const dst = new PNG({ width: cw, height: ch });
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const sIdx = ((cy + y) * src.width + (cx + x)) * 4;
      const dIdx = (y * cw + x) * 4;
      dst.data[dIdx]     = src.data[sIdx];
      dst.data[dIdx + 1] = src.data[sIdx + 1];
      dst.data[dIdx + 2] = src.data[sIdx + 2];
      dst.data[dIdx + 3] = src.data[sIdx + 3];
    }
  }
  return dst;
}

interface Rect { x: number; y: number; w: number; h: number }

/** Find bounding box of non-transparent content */
function contentBounds(img: PNG): Rect {
  let minX = img.width, minY = img.height, maxX = 0, maxY = 0;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (img.data[(y * img.width + x) * 4 + 3] > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX) return { x: 0, y: 0, w: 0, h: 0 };
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

// ═════════════════════════════════════════════════════════════════
//  MAIN
// ═════════════════════════════════════════════════════════════════

function main() {
  console.log('Building composite Skeld map (Unity textures)...');

  // ── 1. Create canvas with dark floor fill ─────────────────────
  const canvas = new PNG({ width: CANVAS_W, height: CANVAS_H });
  for (let i = 0; i < CANVAS_W * CANVAS_H; i++) {
    const idx = i * 4;
    canvas.data[idx]     = FLOOR_R;
    canvas.data[idx + 1] = FLOOR_G;
    canvas.data[idx + 2] = FLOOR_B;
    canvas.data[idx + 3] = 255;
  }
  console.log(`  Canvas: ${CANVAS_W}x${CANVAS_H}`);

  // ── 2. Composite base map ─────────────────────────────────────
  if (fs.existsSync(BASE_MAP_PATH)) {
    console.log('  Loading base map...');
    const baseMap = loadPng(BASE_MAP_PATH);
    console.log(`  Base map: ${baseMap.width}x${baseMap.height}`);
    compositeOver(canvas, baseMap, 0, 0);
  } else {
    console.warn('  WARNING: Base map not found, skipping base layer');
  }

  // ── 3. Composite Unity room textures ──────────────────────────
  for (const room of ROOM_PLACEMENTS) {
    const filePath = path.join(MAPS_DIR, room.file);
    if (!fs.existsSync(filePath)) {
      console.warn(`  SKIP: ${room.file} not found`);
      continue;
    }

    let src = loadPng(filePath);
    console.log(`  ${room.file}: ${src.width}x${src.height}`);

    // Apply source crop (to isolate room from animation frames)
    if (room.cropX !== undefined && room.cropY !== undefined &&
        room.cropW !== undefined && room.cropH !== undefined) {
      src = cropPng(src, room.cropX, room.cropY, room.cropW, room.cropH);
      console.log(`    Cropped: (${room.cropX},${room.cropY}) ${room.cropW}x${room.cropH} → ${src.width}x${src.height}`);
    }

    // Auto-crop transparent padding (Unity textures have proper transparency)
    const bounds = contentBounds(src);
    if (bounds.w > 0 && bounds.h > 0 && (bounds.x > 2 || bounds.y > 2 ||
        bounds.w < src.width - 4 || bounds.h < src.height - 4)) {
      src = cropPng(src, bounds.x, bounds.y, bounds.w, bounds.h);
      console.log(`    Auto-cropped to ${src.width}x${src.height}`);
    }

    // Scale to target size
    const scaledW = Math.round(src.width * room.scale);
    const scaledH = Math.round(src.height * room.scale);
    if (scaledW < 1 || scaledH < 1) {
      console.warn(`    SKIP: scaled size too small (${scaledW}x${scaledH})`);
      continue;
    }
    const scaled = scalePng(src, scaledW, scaledH);
    console.log(`    Scaled to ${scaledW}x${scaledH} (scale ${room.scale})`);

    // Composite onto canvas
    compositeOver(canvas, scaled, room.x, room.y);
    console.log(`    Placed at (${room.x}, ${room.y})`);
  }

  // ── 4. Write output ───────────────────────────────────────────
  const outPath = path.join(OUT_DIR, 'skeld-map.png');
  const buffer = PNG.sync.write(canvas);
  fs.writeFileSync(outPath, buffer);
  const sizeKB = Math.round(buffer.length / 1024);
  console.log(`\n  → ${outPath}`);
  console.log(`    ${CANVAS_W}x${CANVAS_H}, ${sizeKB} KB`);
  console.log('\nComposite map built successfully!');
}

main();
