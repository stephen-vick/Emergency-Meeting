/**
 * Build a composite Skeld map from Unity-extracted sprite layers.
 *
 * Usage:
 *   tsx scripts/build-composite-map.ts
 *   tsx scripts/build-composite-map.ts --debug
 *   tsx scripts/build-composite-map.ts --report
 *   tsx scripts/build-composite-map.ts --include-optional=compLabAdmin,compLabGreenhouse,lifeSupportTerminal
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PNG } from 'pngjs';
import { MAP_W as CANVAS_W, MAP_H as CANVAS_H, ROOM_REGION_RECTS, type Rect } from '../shared/skeldGeometry';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.resolve(PROJECT_ROOT, 'public');
const DEBUG_DIR = path.join(OUT_DIR, 'debug-layers');

fs.mkdirSync(OUT_DIR, { recursive: true });

// Unity-extracted game textures folder.
const MAPS_DIR = path.join(
  PROJECT_ROOT,
  'assets',
  'among us',
  'among-us-assets-main',
  'among-us-assets-main',
  'Maps',
);

const FLOOR_R = 43;
const FLOOR_G = 43;
const FLOOR_B = 61;

type StageName = 'base' | 'walls' | 'roomInteriors' | 'foreground' | 'optional';

interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface LayerConfig {
  id: string;
  stage: StageName;
  label: string;
  file: string;
  x: number;
  y: number;
  scale: number;
  crop?: CropRect;
  enabled: boolean;
  roomName?: string;
  notes?: string;
}

interface RenderedLayer {
  layer: LayerConfig;
  rect: Rect;
}

const STAGE_ORDER: StageName[] = ['base', 'walls', 'roomInteriors', 'foreground', 'optional'];

const LAYER_STACK: Record<StageName, LayerConfig[]> = {
  base: [
    {
      id: 'baseMap',
      stage: 'base',
      label: 'Base Map',
      file: 'Storage/Admin_Comms_Elec_Engine_Halls_Shields_Storage-sharedassets0.assets-150.png',
      x: 0,
      y: 0,
      scale: 1,
      enabled: true,
      notes: 'Primary floor/corridor atlas.',
    },
  ],
  walls: [
    {
      id: 'cafeteriaWalls',
      stage: 'walls',
      label: 'Cafeteria Walls',
      file: 'Cafeteria/cafeteriaWalls-sharedassets0.assets-152.png',
      x: 430,
      y: 0,
      scale: 1,
      enabled: true,
      notes: 'Adds cafeteria wall panels and top corridor details.',
    },
  ],
  roomInteriors: [
    {
      id: 'upperEngine',
      stage: 'roomInteriors',
      label: 'Upper Engine',
      roomName: 'Upper Engine',
      file: 'Engine-sharedassets0.assets-147.png',
      x: 100,
      y: 180,
      scale: 0.70,
      crop: { x: 0, y: 0, w: 500, h: 350 },
      enabled: true,
      notes: 'Top engine variant from stacked engine texture.',
    },
    {
      id: 'lowerEngine',
      stage: 'roomInteriors',
      label: 'Lower Engine',
      roomName: 'Lower Engine',
      file: 'Engine-sharedassets0.assets-147.png',
      x: 100,
      y: 1100,
      scale: 0.70,
      crop: { x: 0, y: 0, w: 500, h: 350 },
      enabled: true,
      notes: 'Reuses same source/crop as upper engine.',
    },
    {
      id: 'cafeteria',
      stage: 'roomInteriors',
      label: 'Cafeteria',
      roomName: 'Cafeteria',
      file: 'Cafeteria/Cafeteria-sharedassets0.assets-210.png',
      x: 635,
      y: 5,
      scale: 0.69,
      enabled: true,
      notes: 'Large top-center room render.',
    },
    {
      id: 'weapons',
      stage: 'roomInteriors',
      label: 'Weapons',
      roomName: 'Weapons',
      file: 'Weapons-sharedassets0.assets-201.png',
      x: 1330,
      y: 0,
      scale: 0.55,
      crop: { x: 0, y: 0, w: 630, h: 500 },
      enabled: true,
      notes: 'Crops out the left turret room from broader sheet.',
    },
    {
      id: 'navigation',
      stage: 'roomInteriors',
      label: 'Navigation',
      roomName: 'Navigation',
      file: 'Navigation-sharedassets0.assets-160.png',
      x: 1710,
      y: 1260,
      scale: 0.78,
      crop: { x: 0, y: 350, w: 344, h: 380 },
      enabled: true,
      notes: 'Tight cockpit crop aligned to Navigation bounds.',
    },
    {
      id: 'medBay',
      stage: 'roomInteriors',
      label: 'MedBay',
      roomName: 'MedBay',
      file: 'MedBay-sharedassets0.assets-110.png',
      x: 435,
      y: 165,
      scale: 0.62,
      crop: { x: 0, y: 0, w: 500, h: 520 },
      enabled: true,
      notes: 'Removes right-side animation frames.',
    },
    {
      id: 'o2',
      stage: 'roomInteriors',
      label: 'O2',
      roomName: 'O2',
      file: 'room_O2-sharedassets0.assets-93.png',
      x: 1770,
      y: 810,
      scale: 0.31,
      crop: { x: 0, y: 0, w: 717, h: 770 },
      enabled: true,
      notes: 'Top crop isolates O2 room geometry from extra content.',
    },
    {
      id: 'security',
      stage: 'roomInteriors',
      label: 'Security',
      roomName: 'Security',
      file: 'Security/Security-sharedassets0.assets-203.png',
      x: 290,
      y: 700,
      scale: 0.91,
      crop: { x: 0, y: 0, w: 264, h: 280 },
      enabled: true,
      notes: 'Crops out lower monitor animation frames.',
    },
    {
      id: 'storage',
      stage: 'roomInteriors',
      label: 'Storage',
      roomName: 'Storage',
      file: 'Storage/room_storage-sharedassets0.assets-98.png',
      x: 555,
      y: 1070,
      scale: 0.70,
      enabled: true,
      notes: 'Full storage room detail pass.',
    },
    {
      id: 'communications',
      stage: 'roomInteriors',
      label: 'Communications',
      roomName: 'Communications',
      file: 'room_broadcast-sharedassets0.assets-57.png',
      x: 700,
      y: 1260,
      scale: 0.80,
      crop: { x: 0, y: 0, w: 423, h: 400 },
      enabled: true,
      notes: 'Tighter crop aligned to Communications target room.',
    },
  ],
  foreground: [
    {
      id: 'weaponsDetail',
      stage: 'foreground',
      label: 'Weapons Detail',
      roomName: 'Weapons',
      file: 'room_weapon-sharedassets0.assets-80.png',
      x: 1350,
      y: 10,
      scale: 0.60,
      enabled: true,
      notes: 'Asteroid-shooter interior pass.',
    },
    {
      id: 'dropshipTop',
      stage: 'foreground',
      label: 'Dropship Top',
      roomName: 'Cafeteria',
      file: 'dropshipTop-sharedassets0.assets-134.png',
      x: 850,
      y: -10,
      scale: 0.60,
      enabled: false,
      notes: 'Disabled by default to avoid covering cafeteria tables; enable via --include-optional=dropshipTop when needed.',
    },
  ],
  optional: [
    {
      id: 'hull',
      stage: 'optional',
      label: 'Hull (Exterior Sprite)',
      file: 'Hull-sharedassets0.assets-159.png',
      x: 120,
      y: 144,
      scale: 1,
      enabled: false,
      notes: 'Exterior ship art; disabled by default.',
    },
    {
      id: 'compLabAdmin',
      stage: 'optional',
      label: 'CompLab Admin Floor Slice',
      file: 'compLabGreenHouseAdminWalls-sharedassets0.assets-67.png',
      x: 1010,
      y: 540,
      scale: 0.70,
      crop: { x: 0, y: 760, w: 500, h: 560 },
      roomName: 'Admin',
      enabled: false,
      notes: 'Admin floor/wall slice from compLab sheet aligned to Admin bounds.',
    },
    {
      id: 'compLabGreenhouse',
      stage: 'optional',
      label: 'CompLab Greenhouse Slice',
      roomName: 'O2',
      file: 'compLabGreenHouseAdminWalls-sharedassets0.assets-67.png',
      x: 1770,
      y: 810,
      scale: 0.42,
      crop: { x: 500, y: 760, w: 520, h: 560 },
      enabled: false,
      notes: 'Greenhouse floor slice from compLab sheet aligned to O2 room.',
    },
    {
      id: 'lifeSupportTerminal',
      stage: 'optional',
      label: 'LifeSupport Terminal Slice',
      roomName: 'O2',
      file: 'LifeSupport-sharedassets0.assets-119.png',
      x: 1760,
      y: 760,
      scale: 0.50,
      crop: { x: 230, y: 0, w: 430, h: 360 },
      enabled: false,
      notes: 'Terminal/equipment portion only; avoids barrel scatter flooding.',
    },
  ],
};

const argv = process.argv.slice(2);
const DEBUG = argv.includes('--debug');
const REPORT = argv.includes('--report');
const includeOptionalArg = argv.find((arg) => arg.startsWith('--include-optional='));
const includeOptional = new Set(
  includeOptionalArg
    ? includeOptionalArg.split('=')[1].split(',').map((id) => id.trim()).filter(Boolean)
    : [],
);

function loadPng(filePath: string): PNG {
  return PNG.sync.read(fs.readFileSync(filePath));
}

function clonePng(src: PNG): PNG {
  const dst = new PNG({ width: src.width, height: src.height });
  src.data.copy(dst.data);
  return dst;
}

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
      if (outA === 0) continue;

      dst.data[dIdx] = Math.round((src.data[sIdx] * sa + dst.data[dIdx] * da * (1 - sa)) / outA);
      dst.data[dIdx + 1] = Math.round((src.data[sIdx + 1] * sa + dst.data[dIdx + 1] * da * (1 - sa)) / outA);
      dst.data[dIdx + 2] = Math.round((src.data[sIdx + 2] * sa + dst.data[dIdx + 2] * da * (1 - sa)) / outA);
      dst.data[dIdx + 3] = Math.round(outA * 255);
    }
  }
}

function cropPng(src: PNG, crop: CropRect): PNG {
  const cx = Math.max(0, crop.x);
  const cy = Math.max(0, crop.y);
  const ex = Math.min(src.width, crop.x + crop.w);
  const ey = Math.min(src.height, crop.y + crop.h);
  const cw = Math.max(0, ex - cx);
  const ch = Math.max(0, ey - cy);
  const dst = new PNG({ width: cw, height: ch });

  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const sIdx = ((cy + y) * src.width + (cx + x)) * 4;
      const dIdx = (y * cw + x) * 4;
      dst.data[dIdx] = src.data[sIdx];
      dst.data[dIdx + 1] = src.data[sIdx + 1];
      dst.data[dIdx + 2] = src.data[sIdx + 2];
      dst.data[dIdx + 3] = src.data[sIdx + 3];
    }
  }

  return dst;
}

function contentBounds(img: PNG): Rect {
  let minX = img.width;
  let minY = img.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (img.data[(y * img.width + x) * 4 + 3] > 0) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (maxX < minX || maxY < minY) return { x: 0, y: 0, w: 0, h: 0 };
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function createCanvas(): PNG {
  const canvas = new PNG({ width: CANVAS_W, height: CANVAS_H });
  for (let i = 0; i < CANVAS_W * CANVAS_H; i++) {
    const idx = i * 4;
    canvas.data[idx] = FLOOR_R;
    canvas.data[idx + 1] = FLOOR_G;
    canvas.data[idx + 2] = FLOOR_B;
    canvas.data[idx + 3] = 255;
  }
  return canvas;
}

function getFilePath(layer: LayerConfig): string {
  return path.join(MAPS_DIR, layer.file);
}

function shouldRenderLayer(layer: LayerConfig): boolean {
  if (!layer.enabled && layer.stage !== 'optional') return false;
  if (layer.stage !== 'optional') return true;
  return layer.enabled || includeOptional.has(layer.id);
}

function saveDebugImage(fileName: string, png: PNG): void {
  fs.mkdirSync(DEBUG_DIR, { recursive: true });
  fs.writeFileSync(path.join(DEBUG_DIR, fileName), PNG.sync.write(png));
}

function saveDebugLayer(layer: LayerConfig, src: PNG): void {
  const canvas = createCanvas();
  compositeOver(canvas, src, layer.x, layer.y);
  const safeId = layer.id.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  saveDebugImage(`layer-${safeId}.png`, canvas);
}

function saveDebugStage(stageIndex: number, stage: StageName, canvas: PNG): void {
  const safeStage = stage.toLowerCase();
  saveDebugImage(`stage-${stageIndex + 1}-${safeStage}.png`, clonePng(canvas));
}

function renderLayer(layer: LayerConfig): { image: PNG; rect: Rect } | null {
  const filePath = getFilePath(layer);
  if (!fs.existsSync(filePath)) {
    console.warn(`  SKIP: ${layer.id} missing (${layer.file})`);
    return null;
  }

  let src = loadPng(filePath);
  console.log(`  ${layer.id}: ${src.width}x${src.height} (${layer.file})`);

  if (layer.crop) {
    src = cropPng(src, layer.crop);
    console.log(
      `    crop (${layer.crop.x},${layer.crop.y}) ${layer.crop.w}x${layer.crop.h} -> ${src.width}x${src.height}`,
    );
  }

  const bounds = contentBounds(src);
  if (bounds.w > 0 && bounds.h > 0 && (bounds.x > 2 || bounds.y > 2 || bounds.w < src.width - 4 || bounds.h < src.height - 4)) {
    src = cropPng(src, { x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h });
    console.log(`    auto-crop -> ${src.width}x${src.height}`);
  }

  if (layer.scale !== 1) {
    const scaledW = Math.round(src.width * layer.scale);
    const scaledH = Math.round(src.height * layer.scale);
    if (scaledW < 1 || scaledH < 1) {
      console.warn(`    SKIP: scaled size too small (${scaledW}x${scaledH})`);
      return null;
    }
    src = scalePng(src, scaledW, scaledH);
    console.log(`    scale ${layer.scale} -> ${scaledW}x${scaledH}`);
  }

  return {
    image: src,
    rect: { x: layer.x, y: layer.y, w: src.width, h: src.height },
  };
}

function area(rect: Rect): number {
  return rect.w * rect.h;
}

function intersectRect(a: Rect, b: Rect): Rect | null {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);
  if (x2 <= x1 || y2 <= y1) return null;
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

function unionByRoomName(): Map<string, Rect> {
  const map = new Map<string, Rect>();
  for (const room of ROOM_REGION_RECTS) {
    const existing = map.get(room.name);
    if (!existing) {
      map.set(room.name, { x: room.x, y: room.y, w: room.w, h: room.h });
      continue;
    }
    const minX = Math.min(existing.x, room.x);
    const minY = Math.min(existing.y, room.y);
    const maxX = Math.max(existing.x + existing.w, room.x + room.w);
    const maxY = Math.max(existing.y + existing.h, room.y + room.h);
    map.set(room.name, { x: minX, y: minY, w: maxX - minX, h: maxY - minY });
  }
  return map;
}

function printAlignmentReport(renderedLayers: RenderedLayer[]): void {
  const targetByRoom = unionByRoomName();
  const reportLayers = renderedLayers.filter((entry) => !!entry.layer.roomName);

  console.log('\nAlignment report (room-mapped layers):');
  for (const { layer, rect } of reportLayers) {
    const target = targetByRoom.get(layer.roomName!);
    if (!target) {
      console.log(`  ${layer.id}: no target room found for "${layer.roomName}"`);
      continue;
    }

    const overlap = intersectRect(rect, target);
    const overlapArea = overlap ? area(overlap) : 0;
    const layerArea = area(rect);
    const overlapRatio = layerArea > 0 ? overlapArea / layerArea : 0;
    const outOfBoundsRatio = 1 - overlapRatio;
    console.log(
      `  ${layer.id}: bbox=(${rect.x},${rect.y},${rect.w},${rect.h}) ` +
        `target=(${target.x},${target.y},${target.w},${target.h}) ` +
        `overlap=${overlapRatio.toFixed(3)} oob=${outOfBoundsRatio.toFixed(3)}`,
    );
  }
}

function main() {
  console.log('Building composite Skeld map from sprite layers...');
  if (DEBUG) console.log('  DEBUG: writing per-layer and stage composite images');
  if (REPORT) console.log('  REPORT: printing alignment metrics');
  if (includeOptional.size > 0) {
    console.log(`  Optional enabled by CLI: ${Array.from(includeOptional).join(', ')}`);
  }

  const canvas = createCanvas();
  const renderedLayers: RenderedLayer[] = [];

  STAGE_ORDER.forEach((stage, stageIndex) => {
    const layers = LAYER_STACK[stage];
    const active = layers.filter(shouldRenderLayer);
    console.log(`\n── Stage ${stageIndex + 1}: ${stage} (${active.length} active layers) ──`);

    for (const layer of active) {
      const result = renderLayer(layer);
      if (!result) continue;
      compositeOver(canvas, result.image, layer.x, layer.y);
      renderedLayers.push({ layer, rect: result.rect });
      console.log(`    placed @ (${layer.x}, ${layer.y})`);
      if (DEBUG) saveDebugLayer(layer, result.image);
    }

    if (DEBUG) saveDebugStage(stageIndex, stage, canvas);
  });

  const outPath = path.join(OUT_DIR, 'skeld-map.png');
  const buffer = PNG.sync.write(canvas);
  fs.writeFileSync(outPath, buffer);
  console.log(`\n  -> ${outPath}`);
  console.log(`     ${CANVAS_W}x${CANVAS_H}, ${Math.round(buffer.length / 1024)} KB`);

  if (REPORT) {
    printAlignmentReport(renderedLayers);
  }

  console.log('\nComposite map built successfully.');
}

main();
