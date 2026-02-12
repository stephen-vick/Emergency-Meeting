/**
 * Build a Skeld map from collision geometry with procedural space-station textures.
 *
 * Instead of layering Unity sprites (which introduces alignment drift), this
 * generates the map directly from the room / corridor rectangles defined in
 * shared/skeldGeometry.ts.  The walkable area, visual floors, and collision
 * mask are therefore pixel-perfect by construction.
 *
 * Usage:
 *   tsx scripts/build-composite-map.ts
 *   tsx scripts/build-composite-map.ts --debug   (saves intermediate stage images)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PNG } from 'pngjs';
import {
  MAP_W,
  MAP_H,
  ROOM_REGION_RECTS,
  WALKABLE_ROOM_RECTS,
  CORRIDOR_RECTS,
  type Rect,
  type NamedRect,
} from '../shared/skeldGeometry';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'public');
const DEBUG_DIR = path.join(OUT_DIR, 'debug-layers');
const DEBUG = process.argv.includes('--debug');

// Path to the Unity base atlas that contains Electrical (and other rooms)
const ASSET_DIR = path.join(
  __dirname, '..', 'assets', 'among us', 'among-us-assets-main',
  'among-us-assets-main', 'Maps',
);
const BASE_ATLAS = path.join(
  ASSET_DIR, 'Storage',
  'Admin_Comms_Elec_Engine_Halls_Shields_Storage-sharedassets0.assets-150.png',
);

// ── Colour helpers ──────────────────────────────────────────────────────

type RGB = [number, number, number];

function clamp(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function lerpRGB(a: RGB, b: RGB, t: number): RGB {
  return [
    clamp(a[0] + (b[0] - a[0]) * t),
    clamp(a[1] + (b[1] - a[1]) * t),
    clamp(a[2] + (b[2] - a[2]) * t),
  ];
}

function brighten(c: RGB, amt: number): RGB {
  return [clamp(c[0] + amt), clamp(c[1] + amt), clamp(c[2] + amt)];
}

function darken(c: RGB, amt: number): RGB {
  return brighten(c, -amt);
}

// Simple deterministic hash for pseudo-random variation
function hash(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) >>> 0;
  h = ((h ^ (h >> 13)) * 1274126177) >>> 0;
  return (h ^ (h >> 16)) >>> 0;
}

// ── Canvas helpers ──────────────────────────────────────────────────────

function createCanvas(): PNG {
  return new PNG({ width: MAP_W, height: MAP_H, filterType: -1 });
}

function setPixel(png: PNG, x: number, y: number, r: number, g: number, b: number, a = 255): void {
  if (x < 0 || x >= MAP_W || y < 0 || y >= MAP_H) return;
  const idx = (y * MAP_W + x) * 4;
  png.data[idx] = clamp(r);
  png.data[idx + 1] = clamp(g);
  png.data[idx + 2] = clamp(b);
  png.data[idx + 3] = clamp(a);
}

function fillRect(png: PNG, rx: number, ry: number, rw: number, rh: number, r: number, g: number, b: number, a = 255): void {
  for (let y = ry; y < ry + rh; y++) {
    for (let x = rx; x < rx + rw; x++) {
      setPixel(png, x, y, r, g, b, a);
    }
  }
}

function savePng(name: string, png: PNG): void {
  const p = path.join(DEBUG_DIR, name);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, PNG.sync.write(png));
}

// ── Room style definitions ──────────────────────────────────────────────

type PatternFn = 'checkered' | 'grid' | 'grating' | 'diamond' | 'hex' | 'plating';

interface RoomStyle {
  floor: RGB;
  floorAlt: RGB;
  trim: RGB;           // wall-side accent colour
  pattern: PatternFn;
  tileSize: number;
}

const ROOM_STYLES: Record<string, RoomStyle> = {
  Cafeteria:      { floor: [178, 176, 166], floorAlt: [162, 160, 150], trim: [200, 120, 130], pattern: 'checkered', tileSize: 28 },
  Weapons:        { floor: [128, 136, 108], floorAlt: [116, 124, 98],  trim: [170, 180, 120], pattern: 'grid',      tileSize: 22 },
  Navigation:     { floor: [82, 102, 142],  floorAlt: [72, 92, 128],   trim: [100, 140, 200], pattern: 'diamond',   tileSize: 20 },
  O2:             { floor: [115, 152, 115], floorAlt: [104, 138, 104], trim: [100, 190, 100], pattern: 'hex',       tileSize: 24 },
  Reactor:        { floor: [152, 92, 92],   floorAlt: [138, 82, 82],   trim: [220, 80, 80],   pattern: 'grating',   tileSize: 18 },
  'Upper Engine': { floor: [88, 98, 108],   floorAlt: [76, 86, 96],    trim: [120, 140, 170], pattern: 'grating',   tileSize: 16 },
  'Lower Engine': { floor: [88, 98, 108],   floorAlt: [76, 86, 96],    trim: [120, 140, 170], pattern: 'grating',   tileSize: 16 },
  Security:       { floor: [68, 73, 80],    floorAlt: [58, 63, 70],    trim: [110, 110, 130], pattern: 'plating',   tileSize: 18 },
  MedBay:         { floor: [135, 172, 182], floorAlt: [122, 158, 168], trim: [100, 200, 220], pattern: 'checkered', tileSize: 22 },
  Electrical:     { floor: [142, 148, 98],  floorAlt: [130, 136, 88],  trim: [200, 200, 80],  pattern: 'grid',      tileSize: 20 },
  Storage:        { floor: [138, 118, 98],  floorAlt: [126, 108, 88],  trim: [180, 150, 110], pattern: 'plating',   tileSize: 24 },
  Admin:          { floor: [125, 146, 125], floorAlt: [114, 133, 114], trim: [130, 180, 130], pattern: 'diamond',   tileSize: 18 },
  Shields:        { floor: [98, 108, 158],  floorAlt: [86, 96, 144],   trim: [120, 130, 210], pattern: 'hex',       tileSize: 22 },
  Communications: { floor: [98, 133, 133],  floorAlt: [88, 120, 120],  trim: [80, 180, 180],  pattern: 'grid',      tileSize: 20 },
};

const CORRIDOR_STYLE: RoomStyle = {
  floor: [130, 130, 136], floorAlt: [120, 120, 126], trim: [155, 155, 165], pattern: 'grid', tileSize: 28,
};

// ── Wall / space colours ────────────────────────────────────────────────

const SPACE_BG: RGB = [12, 14, 22];
const WALL_OUTER: RGB = [35, 38, 46];
const WALL_MID: RGB = [50, 54, 64];
const WALL_INNER: RGB = [68, 72, 84];
const WALL_THICKNESS = 8;

// ── Floor pattern generators ────────────────────────────────────────────

function patternColor(style: RoomStyle, px: number, py: number): RGB {
  const { floor, floorAlt, pattern, tileSize } = style;
  const ts = tileSize;

  // Small pseudo-random variation to avoid flat look
  const noise = ((hash(px, py) & 7) - 3); // -3 to +4

  let base: RGB;

  switch (pattern) {
    case 'checkered': {
      const cx = Math.floor(px / ts) & 1;
      const cy = Math.floor(py / ts) & 1;
      base = (cx ^ cy) ? floor : floorAlt;
      break;
    }
    case 'grid': {
      const gx = px % ts;
      const gy = py % ts;
      if (gx === 0 || gy === 0) {
        base = darken(floor, 20);
      } else if (gx === 1 || gy === 1) {
        base = brighten(floor, 6);
      } else {
        base = floor;
      }
      break;
    }
    case 'grating': {
      const gy = py % ts;
      if (gy <= 1) {
        base = darken(floorAlt, 10);
      } else if (gy === ts - 1) {
        base = brighten(floor, 12);
      } else {
        base = floor;
      }
      break;
    }
    case 'diamond': {
      const dx = Math.abs((px % ts) - ts / 2);
      const dy = Math.abs((py % ts) - ts / 2);
      base = (dx + dy) < ts / 2 ? floor : floorAlt;
      break;
    }
    case 'hex': {
      const hRow = Math.floor(py / ts);
      const offset = (hRow & 1) ? ts / 2 : 0;
      const hx = ((px + offset) % ts);
      const hy = (py % ts);
      const onEdge = hx <= 2 || hy <= 2;
      base = onEdge ? floorAlt : floor;
      break;
    }
    case 'plating': {
      // Large metal plate panels with subtle rivet dots
      const px2 = px % (ts * 2);
      const py2 = py % (ts * 2);
      const borderX = px2 <= 1 || px2 >= ts * 2 - 2;
      const borderY = py2 <= 1 || py2 >= ts * 2 - 2;
      if (borderX || borderY) {
        base = darken(floor, 18);
      } else {
        // Rivet dots near corners
        const cornerDist = Math.min(px2, ts * 2 - px2, py2, ts * 2 - py2);
        if (cornerDist >= 4 && cornerDist <= 6 && (px2 <= 6 || px2 >= ts * 2 - 6) && (py2 <= 6 || py2 >= ts * 2 - 6)) {
          base = brighten(floor, 15);
        } else {
          base = floor;
        }
      }
      break;
    }
    default:
      base = floor;
  }

  return [clamp(base[0] + noise), clamp(base[1] + noise), clamp(base[2] + noise)];
}

// ── Lookup maps (built once, O(1) per-pixel queries) ────────────────────

// Walkability bitmap: 1 = walkable, 0 = not
const walkMap = new Uint8Array(MAP_W * MAP_H);

// Room index for each pixel: >=0 → index into ROOM_REGION_RECTS, -1 → corridor, -2 → non-walkable
const roomIdx = new Int8Array(MAP_W * MAP_H).fill(-2);

function buildLookups(): void {
  // Mark room pixels
  for (let i = 0; i < ROOM_REGION_RECTS.length; i++) {
    const r = ROOM_REGION_RECTS[i];
    const x1 = Math.max(0, r.x);
    const y1 = Math.max(0, r.y);
    const x2 = Math.min(MAP_W, r.x + r.w);
    const y2 = Math.min(MAP_H, r.y + r.h);
    for (let y = y1; y < y2; y++) {
      const rowOff = y * MAP_W;
      for (let x = x1; x < x2; x++) {
        const off = rowOff + x;
        walkMap[off] = 1;
        roomIdx[off] = i;
      }
    }
  }
  // Mark corridor pixels (only if not already a room)
  for (const c of CORRIDOR_RECTS) {
    const x1 = Math.max(0, c.x);
    const y1 = Math.max(0, c.y);
    const x2 = Math.min(MAP_W, c.x + c.w);
    const y2 = Math.min(MAP_H, c.y + c.h);
    for (let y = y1; y < y2; y++) {
      const rowOff = y * MAP_W;
      for (let x = x1; x < x2; x++) {
        const off = rowOff + x;
        walkMap[off] = 1;
        if (roomIdx[off] === -2) roomIdx[off] = -1;
      }
    }
  }
}

function isWalk(x: number, y: number): boolean {
  if (x < 0 || x >= MAP_W || y < 0 || y >= MAP_H) return false;
  return walkMap[y * MAP_W + x] === 1;
}

// ── Distance-to-edge field ──────────────────────────────────────────────

// Chebyshev distance from each walkable pixel to the nearest non-walkable pixel.
// Non-walkable pixels have dist = 0.  Capped at WALL_THICKNESS + 4 for perf.

const distField = new Uint8Array(MAP_W * MAP_H);
const DIST_CAP = WALL_THICKNESS + 4;

function buildDistField(): void {
  const W = MAP_W;
  const H = MAP_H;
  // Initialize: walkable pixels get max, non-walkable get 0
  for (let i = 0; i < W * H; i++) {
    distField[i] = walkMap[i] ? DIST_CAP : 0;
  }

  // Forward pass (top-left to bottom-right)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x;
      if (distField[idx] === 0) continue;
      let d = distField[idx];
      if (y > 0) {
        d = Math.min(d, distField[(y - 1) * W + x] + 1);
        if (x > 0) d = Math.min(d, distField[(y - 1) * W + (x - 1)] + 1);
        if (x < W - 1) d = Math.min(d, distField[(y - 1) * W + (x + 1)] + 1);
      }
      if (x > 0) d = Math.min(d, distField[y * W + (x - 1)] + 1);
      distField[idx] = d;
    }
  }

  // Backward pass (bottom-right to top-left)
  for (let y = H - 1; y >= 0; y--) {
    for (let x = W - 1; x >= 0; x--) {
      const idx = y * W + x;
      if (distField[idx] === 0) continue;
      let d = distField[idx];
      if (y < H - 1) {
        d = Math.min(d, distField[(y + 1) * W + x] + 1);
        if (x > 0) d = Math.min(d, distField[(y + 1) * W + (x - 1)] + 1);
        if (x < W - 1) d = Math.min(d, distField[(y + 1) * W + (x + 1)] + 1);
      }
      if (x < W - 1) d = Math.min(d, distField[y * W + (x + 1)] + 1);
      distField[idx] = d;
    }
  }
}

// ── Stage 1: Space background with stars ────────────────────────────────

function drawSpaceBackground(canvas: PNG): void {
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      // Slight gradient for depth
      const grad = Math.floor((y / MAP_H) * 6);
      const r = SPACE_BG[0] + grad;
      const g = SPACE_BG[1] + grad;
      const b = SPACE_BG[2] + Math.floor(grad * 1.5);

      setPixel(canvas, x, y, r, g, b);

      // Stars
      const h = hash(x, y);
      if ((h & 0xFFF) < 3) {
        // Bright star
        const brightness = 140 + (h >> 12 & 0x7F);
        const tint = (h >> 20) & 3;
        const sr = tint === 0 ? brightness : brightness - 20;
        const sg = brightness - 10;
        const sb = tint === 2 ? brightness : brightness - 20;
        setPixel(canvas, x, y, sr, sg, sb);
      } else if ((h & 0xFFF) < 8) {
        // Dim star
        const brightness = 50 + (h >> 12 & 0x3F);
        setPixel(canvas, x, y, brightness, brightness, brightness + 10);
      }
    }
  }
}

// ── Stage 2: Floor patterns ─────────────────────────────────────────────

function drawFloors(canvas: PNG): void {
  for (let y = 0; y < MAP_H; y++) {
    const rowOff = y * MAP_W;
    for (let x = 0; x < MAP_W; x++) {
      const ri = roomIdx[rowOff + x];
      if (ri === -2) continue; // non-walkable

      let style: RoomStyle;
      if (ri >= 0) {
        const roomName = ROOM_REGION_RECTS[ri].name;
        style = ROOM_STYLES[roomName] || CORRIDOR_STYLE;
      } else {
        style = CORRIDOR_STYLE;
      }

      const [r, g, b] = patternColor(style, x, y);
      setPixel(canvas, x, y, r, g, b);
    }
  }
}

// ── Stage 2b: Real texture overlays for specific rooms ──────────────────

/** Composite src onto dst with alpha blending. */
function compositeOver(dst: PNG, src: PNG, ox: number, oy: number): void {
  for (let sy = 0; sy < src.height; sy++) {
    const dy = oy + sy;
    if (dy < 0 || dy >= dst.height) continue;
    for (let sx = 0; sx < src.width; sx++) {
      const dx = ox + sx;
      if (dx < 0 || dx >= dst.width) continue;
      const si = (sy * src.width + sx) * 4;
      const sa = src.data[si + 3] / 255;
      if (sa === 0) continue;
      const di = (dy * dst.width + dx) * 4;
      const da = dst.data[di + 3] / 255;
      const outA = sa + da * (1 - sa);
      if (outA === 0) continue;
      dst.data[di]     = clamp((src.data[si]     * sa + dst.data[di]     * da * (1 - sa)) / outA);
      dst.data[di + 1] = clamp((src.data[si + 1] * sa + dst.data[di + 1] * da * (1 - sa)) / outA);
      dst.data[di + 2] = clamp((src.data[si + 2] * sa + dst.data[di + 2] * da * (1 - sa)) / outA);
      dst.data[di + 3] = clamp(outA * 255);
    }
  }
}

/**
 * Overlay the real Unity texture for the Electrical room.
 * The base atlas was originally placed at (0,0) so the Electrical region
 * at the collision-rect coords can be cropped directly and composited.
 */
function overlayElectricalTexture(canvas: PNG): void {
  if (!fs.existsSync(BASE_ATLAS)) {
    console.log('    WARN: Base atlas not found, skipping Electrical texture overlay');
    return;
  }
  const atlas = PNG.sync.read(fs.readFileSync(BASE_ATLAS));

  // Find the Electrical collision rect
  const elecRect = ROOM_REGION_RECTS.find(r => r.name === 'Electrical');
  if (!elecRect) return;

  // Crop the region from the atlas
  const { x: rx, y: ry, w: rw, h: rh } = elecRect;
  const cropped = new PNG({ width: rw, height: rh });
  for (let py = 0; py < rh; py++) {
    const srcY = ry + py;
    if (srcY < 0 || srcY >= atlas.height) continue;
    for (let px = 0; px < rw; px++) {
      const srcX = rx + px;
      if (srcX < 0 || srcX >= atlas.width) continue;
      const si = (srcY * atlas.width + srcX) * 4;
      const di = (py * rw + px) * 4;
      cropped.data[di]     = atlas.data[si];
      cropped.data[di + 1] = atlas.data[si + 1];
      cropped.data[di + 2] = atlas.data[si + 2];
      cropped.data[di + 3] = atlas.data[si + 3];
    }
  }

  // Only composite onto walkable pixels inside the Electrical rect
  for (let py = 0; py < rh; py++) {
    const mapY = ry + py;
    for (let px = 0; px < rw; px++) {
      const mapX = rx + px;
      if (walkMap[mapY * MAP_W + mapX] === 0) continue;
      const si = (py * rw + px) * 4;
      if (cropped.data[si + 3] === 0) continue;
      setPixel(canvas, mapX, mapY,
        cropped.data[si], cropped.data[si + 1], cropped.data[si + 2], cropped.data[si + 3]);
    }
  }

  console.log(`    Electrical texture: cropped (${rx},${ry}) ${rw}x${rh} from atlas`);
}

// ── Stage 3: Walls with shading + trim ──────────────────────────────────

function drawWalls(canvas: PNG): void {
  for (let y = 0; y < MAP_H; y++) {
    const rowOff = y * MAP_W;
    for (let x = 0; x < MAP_W; x++) {
      const off = rowOff + x;
      if (walkMap[off] === 0) continue; // non-walkable, already space

      const d = distField[off];
      if (d > WALL_THICKNESS) continue; // interior floor, no wall needed

      // Determine room style for trim colour
      const ri = roomIdx[off];
      let trim: RGB;
      if (ri >= 0) {
        const roomName = ROOM_REGION_RECTS[ri].name;
        trim = (ROOM_STYLES[roomName] || CORRIDOR_STYLE).trim;
      } else {
        trim = CORRIDOR_STYLE.trim;
      }

      if (d <= 2) {
        // Outer wall: very dark
        setPixel(canvas, x, y, ...WALL_OUTER);
      } else if (d <= 4) {
        // Mid wall with subtle trim tint
        const t = (d - 2) / 2;
        const base = lerpRGB(WALL_OUTER, WALL_MID, t);
        // Mix in a little trim colour
        const mixed = lerpRGB(base, trim, 0.12);
        setPixel(canvas, x, y, ...mixed);
      } else if (d <= 6) {
        // Inner wall / trim band
        const t = (d - 4) / 2;
        const base = lerpRGB(WALL_MID, WALL_INNER, t);
        const mixed = lerpRGB(base, trim, 0.25);
        setPixel(canvas, x, y, ...mixed);
      } else {
        // Transition zone: blend wall→floor (ambient occlusion)
        const t = (d - 6) / (WALL_THICKNESS - 6);

        // Get the floor colour at this pixel
        let style: RoomStyle;
        if (ri >= 0) {
          style = ROOM_STYLES[ROOM_REGION_RECTS[ri].name] || CORRIDOR_STYLE;
        } else {
          style = CORRIDOR_STYLE;
        }
        const floorC = patternColor(style, x, y);
        const wallC = lerpRGB(WALL_INNER, trim, 0.15);
        const blended = lerpRGB(wallC, floorC, t);
        setPixel(canvas, x, y, ...blended);
      }
    }
  }
}

// ── Stage 4: Details – corridor lights, door markers, hull glow ─────────

function drawDetails(canvas: PNG): void {
  // Corridor ceiling lights: bright spots every ~80px along corridor centres
  for (const c of CORRIDOR_RECTS) {
    const cx = c.x + Math.floor(c.w / 2);
    const cy = c.y + Math.floor(c.h / 2);

    // Horizontal corridor (wider than tall) or vertical
    const horizontal = c.w > c.h;

    if (horizontal) {
      for (let lx = c.x + 20; lx < c.x + c.w - 20; lx += 80) {
        drawLight(canvas, lx, cy, 6);
      }
    } else {
      for (let ly = c.y + 20; ly < c.y + c.h - 20; ly += 80) {
        drawLight(canvas, cx, ly, 6);
      }
    }
  }

  // Room centre lights (larger, dimmer)
  const roomCenters = new Map<string, { sx: number; sy: number; count: number }>();
  for (const r of ROOM_REGION_RECTS) {
    const existing = roomCenters.get(r.name);
    if (existing) {
      // Weighted average for multi-rect rooms
      existing.sx += (r.x + r.w / 2) * (r.w * r.h);
      existing.sy += (r.y + r.h / 2) * (r.w * r.h);
      existing.count += r.w * r.h;
    } else {
      roomCenters.set(r.name, {
        sx: (r.x + r.w / 2) * (r.w * r.h),
        sy: (r.y + r.h / 2) * (r.w * r.h),
        count: r.w * r.h,
      });
    }
  }
  for (const [, { sx, sy, count }] of roomCenters) {
    const cx = Math.round(sx / count);
    const cy = Math.round(sy / count);
    drawLight(canvas, cx, cy, 10);
  }

  // Hull glow: slight brightening of non-walkable pixels adjacent to walkable pixels
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (walkMap[y * MAP_W + x] === 1) continue;

      // Check if near a walkable pixel
      let minDist = 20;
      for (let dy = -12; dy <= 12; dy++) {
        for (let dx = -12; dx <= 12; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < MAP_W && ny >= 0 && ny < MAP_H && walkMap[ny * MAP_W + nx] === 1) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDist) minDist = dist;
          }
        }
      }

      if (minDist < 12) {
        // Subtle hull glow
        const intensity = Math.max(0, (12 - minDist) / 12) * 18;
        const idx = (y * MAP_W + x) * 4;
        canvas.data[idx] = clamp(canvas.data[idx] + intensity * 0.6);
        canvas.data[idx + 1] = clamp(canvas.data[idx + 1] + intensity * 0.7);
        canvas.data[idx + 2] = clamp(canvas.data[idx + 2] + intensity);
      }
    }
  }
}

function drawLight(canvas: PNG, cx: number, cy: number, radius: number): void {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const px = cx + dx;
      const py = cy + dy;
      if (px < 0 || px >= MAP_W || py < 0 || py >= MAP_H) continue;
      if (walkMap[py * MAP_W + px] === 0) continue;

      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > radius) continue;

      const intensity = (1 - dist / radius) * 35;
      const idx = (py * MAP_W + px) * 4;
      canvas.data[idx] = clamp(canvas.data[idx] + intensity);
      canvas.data[idx + 1] = clamp(canvas.data[idx + 1] + intensity);
      canvas.data[idx + 2] = clamp(canvas.data[idx + 2] + intensity * 0.8);
    }
  }
}

// ── Main ────────────────────────────────────────────────────────────────

function main(): void {
  console.log('Building Skeld map from collision geometry...');
  console.log(`  Canvas: ${MAP_W}x${MAP_H}`);
  console.log(`  Rooms:  ${ROOM_REGION_RECTS.length} rects`);
  console.log(`  Corridors: ${CORRIDOR_RECTS.length} rects`);

  // Build spatial lookup tables
  console.log('  Building spatial lookups...');
  buildLookups();
  buildDistField();

  const walkableCount = walkMap.reduce((s, v) => s + v, 0);
  console.log(`  Walkable pixels: ${walkableCount.toLocaleString()} / ${(MAP_W * MAP_H).toLocaleString()} (${(walkableCount / (MAP_W * MAP_H) * 100).toFixed(1)}%)`);

  const canvas = createCanvas();

  // Stage 1: Space background
  console.log('  Stage 1: Space background with stars...');
  drawSpaceBackground(canvas);
  if (DEBUG) savePng('stage-1-space.png', canvas);

  // Stage 2: Floor patterns
  console.log('  Stage 2: Room and corridor floors...');
  drawFloors(canvas);
  if (DEBUG) savePng('stage-2-floors.png', canvas);

  // Stage 2b: Real texture overlays for specific rooms
  console.log('  Stage 2b: Room texture overlays...');
  overlayElectricalTexture(canvas);
  if (DEBUG) savePng('stage-2b-textures.png', canvas);

  // Stage 3: Wall shading
  console.log('  Stage 3: Wall shading and trim...');
  drawWalls(canvas);
  if (DEBUG) savePng('stage-3-walls.png', canvas);

  // Stage 4: Details
  console.log('  Stage 4: Lights and hull glow...');
  drawDetails(canvas);
  if (DEBUG) savePng('stage-4-details.png', canvas);

  // Save final
  const outPath = path.join(OUT_DIR, 'skeld-map.png');
  const buffer = PNG.sync.write(canvas);
  fs.writeFileSync(outPath, buffer);
  console.log(`\n  -> ${outPath}`);
  console.log(`     ${MAP_W}x${MAP_H}, ${Math.round(buffer.length / 1024)} KB`);
  console.log('\nMap built successfully.');
}

main();
