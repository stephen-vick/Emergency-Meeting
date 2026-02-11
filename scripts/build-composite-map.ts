/**
 * Build a composite Skeld map by layering room background renders
 * onto the base map canvas at calibrated positions.
 *
 * Many of the downloaded room images are sprite sheets (not assembled renders).
 * For each one, a source crop rectangle isolates just the room floor/background
 * portion, which is then cleaned, scaled, and composited.
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

const ROOM_DIR = path.resolve(PROJECT_ROOT, 'assets', 'room-backgrounds');

// Base map (the sparse floor/wall atlas layer)
const BASE_MAP_PATH = path.join(
  PROJECT_ROOT,
  'assets', 'among us', 'among-us-assets-main', 'among-us-assets-main',
  'Maps', 'Storage',
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
//   file   – filename in assets/room-backgrounds/
//   x, y   – destination position on the 2048x1872 canvas
//   scale  – resize factor applied AFTER cropping
//   layer  – 'hallway' rendered first, 'room' rendered on top
//   cropX/cropY/cropW/cropH – optional source rectangle to extract
//            from the sprite sheet (native image pixels)

interface RoomPlacement {
  file: string;
  x: number;
  y: number;
  scale: number;
  layer: 'hallway' | 'room';
  cropX?: number;
  cropY?: number;
  cropW?: number;
  cropH?: number;
}

// Source image dimensions (measured):
// admin.png: 1966x701       cafeteria.png: 986x989
// communications.png: 1040x905  electrical.png: 825x1000
// engines.png: 1270x1611    hallway-cafe-ue-med.png: 749x329
// hallway-o2-nav-shi.png: 800x794  hallway-react-sec.png: 386x683
// hallway-stor-com-shi.png: 490x320  medbay.png: 803x551
// navigation.png: 1050x732  o2.png: 1268x1204
// reactor.png: 3200x2500    security.png: 1030x1067
// shields.png: 1920x1080    storage.png: 595x1175
// weapons.png: 2402x1652

const ROOM_PLACEMENTS: RoomPlacement[] = [
  // ── Hallways (render first as base corridors) ──
  // Each has coloured borders + watermark text; crop to room content only.
  // hallway-cafe-ue-med (749x329): cyan border, watermark at bottom
  { file: 'hallway-cafe-ue-med.png',  x: 330,  y: 385,  scale: 0.90, layer: 'hallway',
    cropX: 95, cropY: 25, cropW: 575, cropH: 250 },
  // hallway-react-sec (386x683): magenta border, sprites+text at bottom
  { file: 'hallway-react-sec.png',    x: 180,  y: 540,  scale: 0.85, layer: 'hallway',
    cropX: 35, cropY: 15, cropW: 315, cropH: 575 },
  // hallway-o2-nav-shi (800x794): hot pink DDMPlayer area on right half
  { file: 'hallway-o2-nav-shi.png',   x: 1510, y: 720,  scale: 0.80, layer: 'hallway',
    cropX: 0, cropY: 0, cropW: 510, cropH: 794 },
  // hallway-stor-com-shi (490x320): red border, text at bottom
  { file: 'hallway-stor-com-shi.png', x: 710,  y: 1060, scale: 0.85, layer: 'hallway',
    cropX: 20, cropY: 15, cropW: 435, cropH: 265 },

  // ── Cafeteria (986x989 - clean assembled render, no crop needed) ──
  // Target room region: x=620 y=5 w=710 h=400
  { file: 'cafeteria.png', x: 635, y: 5, scale: 0.72, layer: 'room' },

  // ── MedBay (803x551 - room on left, hot pink border+area on right) ──
  // Target room region: x=450 y=190 w=310 h=280
  // Crop inside the pink frame border (starts ~25px in on each side)
  { file: 'medbay.png', x: 440, y: 170, scale: 0.55, layer: 'room',
    cropX: 25, cropY: 20, cropW: 520, cropH: 520 },

  // ── Electrical (825x1000 - mostly assembled room in top ~75%, loose sprites below) ──
  // Target room region: x=380 y=700 w=330 h=320
  { file: 'electrical.png', x: 355, y: 675, scale: 0.45, layer: 'room',
    cropX: 80, cropY: 0, cropW: 745, cropH: 750 },

  // ── Storage (595x1175 - room in top ~65%, sprites + blue bg below) ──
  // Target room region: x=560 y=1070 w=430 h=400
  { file: 'storage.png', x: 540, y: 1035, scale: 0.72, layer: 'room',
    cropX: 0, cropY: 0, cropW: 595, cropH: 780 },

  // ── Engines (1270x1611 sprite sheet, first engine room at top-left ~430x330) ──
  // Target Upper Engine region: x=100 y=180 w=350 h=360
  { file: 'engines.png', x: 90, y: 170, scale: 0.90, layer: 'room',
    cropX: 85, cropY: 5, cropW: 430, cropH: 330 },
  // Target Lower Engine region: x=100 y=1100 w=350 h=360
  { file: 'engines.png', x: 90, y: 1090, scale: 0.90, layer: 'room',
    cropX: 85, cropY: 5, cropW: 430, cropH: 330 },

  // ── Security (1030x1067 sprite sheet, room at top-left ~290x420 on blue bg) ──
  // Target room region: x=290 y=700 w=240 h=250
  { file: 'security.png', x: 275, y: 688, scale: 0.62, layer: 'room',
    cropX: 100, cropY: 5, cropW: 290, cropH: 410 },

  // ── Reactor (3200x2500 sprite sheet, first render top-left ~800x480) ──
  // Target room region: x=20 y=570 w=270 h=350
  { file: 'reactor.png', x: 5, y: 545, scale: 0.35, layer: 'room',
    cropX: 0, cropY: 20, cropW: 800, cropH: 480 },

  // ── O2 (1268x1204 sprite sheet, room floor at top-left ~380x250) ──
  // Target room region: x=1770 y=810 w=220 h=230
  { file: 'o2.png', x: 1755, y: 795, scale: 0.58, layer: 'room',
    cropX: 55, cropY: 0, cropW: 380, cropH: 250 },

  // NOTE: weapons.png, navigation.png, admin.png, shields.png, communications.png
  // are sprite sheets with fragmented, unassembled layers. They cannot be composited
  // as single images. These rooms rely on the base map content instead.
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

/**
 * Remove sprite-rip background/artifact colours by setting them transparent.
 *
 * Targets: magenta, hot pink, purple (transparency keys), orange/red (watermarks),
 * cyan/aqua (layer borders), bright blue (layer artifacts).
 */
function removeBackgroundColors(img: PNG): number {
  let removed = 0;
  for (let i = 0; i < img.width * img.height; i++) {
    const idx = i * 4;
    const r = img.data[idx];
    const g = img.data[idx + 1];
    const b = img.data[idx + 2];
    const a = img.data[idx + 3];

    if (a === 0) continue;

    let shouldRemove = false;

    // Pure magenta (#FF00FF) and near-magenta
    if (r > 200 && g < 80 && b > 200) shouldRemove = true;

    // Hot pink / bright pink / deep pink (broadened to catch #FF1493 etc.)
    if (r > 200 && g < 120 && b > 100 && b < 220) shouldRemove = true;

    // Saturated pink-magenta (catches border colours)
    if (r > 180 && g < 80 && b > 100) shouldRemove = true;

    // Purple-ish (transparency keys)
    if (r > 120 && r < 200 && g < 60 && b > 180) shouldRemove = true;

    // Bright orange (watermarks like "RIPPED BY...")
    if (r > 200 && g > 100 && g < 200 && b < 80) shouldRemove = true;

    // Bright red (watermark variants)
    if (r > 220 && g < 60 && b < 60) shouldRemove = true;

    // Cyan / aqua (layer border lines)
    if (r < 80 && g > 200 && b > 200) shouldRemove = true;

    // Bright blue (layer artifacts and outlines)
    if (r < 100 && g < 100 && b > 200) shouldRemove = true;

    // Medium blue artifacts
    if (r < 80 && g < 130 && b > 180 && (b - r) > 120) shouldRemove = true;

    // Saturated blue backgrounds (like security/storage/communications sheets)
    if (r < 50 && g < 50 && b > 220) shouldRemove = true;

    if (shouldRemove) {
      img.data[idx + 3] = 0;
      removed++;
    }
  }
  return removed;
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
  console.log('Building composite Skeld map...');

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

  // ── 3. Sort: hallways first, then rooms ───────────────────────
  const hallways = ROOM_PLACEMENTS.filter(r => r.layer === 'hallway');
  const rooms = ROOM_PLACEMENTS.filter(r => r.layer === 'room');
  const orderedPlacements = [...hallways, ...rooms];

  // ── 4. Composite each room render ─────────────────────────────
  for (const room of orderedPlacements) {
    const filePath = path.join(ROOM_DIR, room.file);
    if (!fs.existsSync(filePath)) {
      console.warn(`  SKIP: ${room.file} not found`);
      continue;
    }

    let src = loadPng(filePath);
    console.log(`  ${room.file}: ${src.width}x${src.height}`);

    // Apply source crop FIRST (before background removal)
    if (room.cropX !== undefined && room.cropY !== undefined &&
        room.cropW !== undefined && room.cropH !== undefined) {
      src = cropPng(src, room.cropX, room.cropY, room.cropW, room.cropH);
      console.log(`    Source crop: (${room.cropX},${room.cropY}) ${room.cropW}x${room.cropH} → ${src.width}x${src.height}`);
    }

    // Remove background/artifact colours
    const removedCount = removeBackgroundColors(src);
    if (removedCount > 0) {
      console.log(`    Removed ${removedCount} artifact pixels`);
    }

    // Auto-crop to content bounds (removes transparent padding)
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

  // ── 5. Write output ───────────────────────────────────────────
  const outPath = path.join(OUT_DIR, 'skeld-map.png');
  const buffer = PNG.sync.write(canvas);
  fs.writeFileSync(outPath, buffer);
  const sizeKB = Math.round(buffer.length / 1024);
  console.log(`\n  → ${outPath}`);
  console.log(`    ${CANVAS_W}x${CANVAS_H}, ${sizeKB} KB`);
  console.log('\nComposite map built successfully!');
}

main();
