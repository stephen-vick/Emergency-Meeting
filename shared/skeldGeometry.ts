export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface NamedRect extends Rect {
  name: string;
}

export const MAP_W = 2048;
export const MAP_H = 1872;

export const MASK_SCALE = 4;
export const MASK_W = Math.ceil(MAP_W / MASK_SCALE); // 512
export const MASK_H = Math.ceil(MAP_H / MASK_SCALE); // 468

// Room bounds in full map-pixel space.
// Rects should match the visual floor boundaries of the room textures so that
// walkable areas, visual walls, and collision all agree.
export const ROOM_REGION_RECTS: NamedRect[] = [
  // Cafeteria – two rects approximate the octagonal floor.
  // Wide rect covers the main body; narrower rect covers the top/bottom necks.
  { name: 'Cafeteria', x: 650, y: 80, w: 650, h: 550 },
  { name: 'Cafeteria', x: 700, y: 20, w: 560, h: 660 },
  { name: 'Weapons', x: 1350, y: 10, w: 360, h: 350 },
  { name: 'Navigation', x: 1710, y: 1260, w: 270, h: 290 },
  { name: 'O2', x: 1770, y: 810, w: 220, h: 230 },
  { name: 'Reactor', x: 20, y: 570, w: 270, h: 350 },
  { name: 'Upper Engine', x: 100, y: 180, w: 350, h: 360 },
  { name: 'Lower Engine', x: 100, y: 1100, w: 350, h: 360 },
  { name: 'Security', x: 290, y: 700, w: 240, h: 250 },
  { name: 'MedBay', x: 440, y: 180, w: 325, h: 295 },
  { name: 'Electrical', x: 380, y: 700, w: 330, h: 320 },
  { name: 'Storage', x: 560, y: 1070, w: 430, h: 300 },
  { name: 'Admin', x: 1010, y: 540, w: 355, h: 310 },
  { name: 'Shields', x: 1070, y: 890, w: 320, h: 310 },
  { name: 'Communications', x: 700, y: 1260, w: 340, h: 300 },
];

export const WALKABLE_ROOM_RECTS: Rect[] = ROOM_REGION_RECTS.map(({ x, y, w, h }) => ({
  x,
  y,
  w,
  h,
}));

// Corridors connecting rooms, in full map-pixel space.
export const CORRIDOR_RECTS: Rect[] = [
  // Cafeteria south exits to main horizontal corridor
  { x: 750, y: 670, w: 180, h: 80 },
  { x: 1020, y: 670, w: 180, h: 80 },
  // Main horizontal corridor (upper)
  { x: 300, y: 440, w: 200, h: 80 },
  { x: 500, y: 440, w: 200, h: 80 },
  { x: 420, y: 440, w: 600, h: 100 },
  { x: 920, y: 440, w: 450, h: 100 },
  // Cafeteria to weapons connector
  { x: 1310, y: 80, w: 60, h: 280 },
  // Weapons to right corridor
  { x: 1620, y: 340, w: 120, h: 100 },
  { x: 1640, y: 280, w: 110, h: 320 },
  // Right vertical corridor (weapons → admin → shields → nav)
  { x: 1350, y: 480, w: 300, h: 90 },
  { x: 1440, y: 560, w: 230, h: 80 },
  { x: 1660, y: 570, w: 110, h: 260 },
  { x: 1750, y: 700, w: 90, h: 140 },
  { x: 1730, y: 860, w: 60, h: 120 },
  { x: 1340, y: 830, w: 340, h: 80 },
  { x: 1740, y: 1020, w: 100, h: 260 },
  { x: 1730, y: 1190, w: 80, h: 100 },
  // Admin → shields vertical link
  { x: 1100, y: 680, w: 120, h: 220 },
  // Left vertical corridor (engines → reactor → security)
  { x: 200, y: 520, w: 120, h: 200 },
  { x: 280, y: 620, w: 100, h: 100 },
  { x: 380, y: 740, w: 50, h: 120 },
  { x: 200, y: 930, w: 120, h: 200 },
  // Storage → comms link
  { x: 540, y: 1000, w: 120, h: 100 },
  { x: 700, y: 1350, w: 200, h: 80 },
  // Lower engine → storage
  { x: 300, y: 1200, w: 200, h: 80 },
  // Shields → lower corridor
  { x: 990, y: 1200, w: 420, h: 90 },
  // Admin → hall
  { x: 1000, y: 480, w: 120, h: 120 },
  // Shields → lower
  { x: 1060, y: 820, w: 120, h: 100 },
  { x: 900, y: 1050, w: 200, h: 100 },
];
