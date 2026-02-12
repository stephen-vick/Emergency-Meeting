import { useEffect, useRef, useCallback, useState } from 'react';
import {
  MAP_W,
  MAP_H,
  MASK_SCALE,
  MASK_W,
  MASK_H,
  ROOM_REGION_RECTS as ROOM_REGIONS,
} from '../shared/skeldGeometry';
import { ElectricalPanelSelector } from './components/ElectricalPanelSelector';

interface Props {
  onBack: () => void;
}

const MAP_URL = '/skeld-map.png';

const SPACE_OVERLAY_URL = '/space-overlay.png';
const COLLISION_MASK_URL = '/collision-mask.png';

// Extracted individual crewmate frames (from Player sprite sheet)
const SPRITE_IDLE = '/sprites/idle.png';
const SPRITE_WALK = [
  '/sprites/walk1.png',
  '/sprites/walk2.png',
  '/sprites/walk3.png',
];

const PLAYER_W = 56;
const PLAYER_H = 72;
const SPEED = 3;
const WALK_FRAME_INTERVAL = 150; // ms per walk frame

// Player hitbox half-sizes (slightly smaller than sprite for forgiving collision)
const HIT_HW = 18; // half-width
const HIT_HH = 24; // half-height

// Spawn in Cafeteria (center of the large room in the upper-right area)
const SPAWN_X = 1250;
const SPAWN_Y = 220;

// ── Interactive objects on the map ──────────────────────────────
// Electrical panel: wall-mounted box the player clicks to open the mini-game.
// Positioned on the back (top) wall of the Electrical room.
const ELEC_PANEL_X = 545;
const ELEC_PANEL_Y = 730;
const ELEC_PANEL_W = 40;
const ELEC_PANEL_H = 48;
const ELEC_INTERACT_RANGE = 90; // px – how close the player must be to click

// ── Room regions for HUD display ────────────────────────────────
// Imported from shared/skeldGeometry.ts to keep runtime room detection aligned
// with collision geometry used by build-collision-mask.ts.

/** Determine which room the player is currently in (or null if in a corridor) */
function getCurrentRoom(px: number, py: number): string | null {
  for (const room of ROOM_REGIONS) {
    if (
      px >= room.x &&
      px <= room.x + room.w &&
      py >= room.y &&
      py <= room.y + room.h
    ) {
      return room.name;
    }
  }
  return null;
}

export default function SkeldMapTest({ onBack }: Props) {
  const [pos, setPos] = useState({ x: SPAWN_X, y: SPAWN_Y });
  const [facingLeft, setFacingLeft] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [walkFrame, setWalkFrame] = useState(0);
  const [showElectricalPanels, setShowElectricalPanels] = useState(false);
  const keysRef = useRef(new Set<string>());
  const posRef = useRef({ x: SPAWN_X, y: SPAWN_Y });
  const rafRef = useRef<number>(0);
  const walkTimerRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);

  // Collision mask pixel data (loaded once on mount)
  const collisionData = useRef<Uint8ClampedArray | null>(null);

  /** Check if a point on the map is walkable (returns true while mask is loading) */
  const isWalkable = useCallback((mapX: number, mapY: number): boolean => {
    const data = collisionData.current;
    if (!data) return true; // allow movement while mask loads
    const mx = Math.floor(mapX / MASK_SCALE);
    const my = Math.floor(mapY / MASK_SCALE);
    if (mx < 0 || mx >= MASK_W || my < 0 || my >= MASK_H) return false;
    const idx = (my * MASK_W + mx) * 4 + 3; // alpha channel
    return data[idx] > 0;
  }, []);

  /** Check if the player hitbox at (cx, cy) is entirely on walkable tiles */
  const canMoveTo = useCallback(
    (cx: number, cy: number): boolean => {
      // Sample 8 points around the hitbox perimeter + center
      return (
        isWalkable(cx, cy) &&                        // center
        isWalkable(cx - HIT_HW, cy - HIT_HH) &&     // top-left
        isWalkable(cx + HIT_HW, cy - HIT_HH) &&     // top-right
        isWalkable(cx - HIT_HW, cy + HIT_HH) &&     // bottom-left
        isWalkable(cx + HIT_HW, cy + HIT_HH) &&     // bottom-right
        isWalkable(cx,          cy - HIT_HH) &&      // top-center
        isWalkable(cx,          cy + HIT_HH) &&      // bottom-center
        isWalkable(cx - HIT_HW, cy) &&               // left-center
        isWalkable(cx + HIT_HW, cy)                  // right-center
      );
    },
    [isWalkable],
  );

  const gameLoop = useCallback(
    (timestamp: number) => {
      const keys = keysRef.current;
      let { x, y } = posRef.current;
      let moved = false;

      // Compute desired movement deltas
      let dx = 0;
      let dy = 0;

      if (keys.has('w') || keys.has('arrowup')) dy -= SPEED;
      if (keys.has('s') || keys.has('arrowdown')) dy += SPEED;
      if (keys.has('a') || keys.has('arrowleft')) {
        dx -= SPEED;
        setFacingLeft(true);
      }
      if (keys.has('d') || keys.has('arrowright')) {
        dx += SPEED;
        setFacingLeft(false);
      }

      // Apply X and Y independently for wall-sliding
      if (dx !== 0) {
        const nextX = Math.max(HIT_HW, Math.min(MAP_W - HIT_HW, x + dx));
        if (canMoveTo(nextX, y)) {
          x = nextX;
          moved = true;
        }
      }
      if (dy !== 0) {
        const nextY = Math.max(HIT_HH, Math.min(MAP_H - HIT_HH, y + dy));
        if (canMoveTo(x, nextY)) {
          y = nextY;
          moved = true;
        }
      }

      if (moved) {
        posRef.current = { x, y };
        setPos({ x, y });
      }

      setIsMoving(dx !== 0 || dy !== 0);

      // Advance walk frame on a timer
      if (dx !== 0 || dy !== 0) {
        if (timestamp - lastFrameTimeRef.current >= WALK_FRAME_INTERVAL) {
          lastFrameTimeRef.current = timestamp;
          setWalkFrame((prev) => (prev + 1) % SPRITE_WALK.length);
        }
      } else {
        setWalkFrame(0);
        lastFrameTimeRef.current = timestamp;
      }

      rafRef.current = requestAnimationFrame(gameLoop);
    },
    [canMoveTo],
  );

  // Load collision mask on mount
  useEffect(() => {
    const img = new Image();
    img.src = COLLISION_MASK_URL;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      collisionData.current = ctx.getImageData(0, 0, img.width, img.height).data;
    };
  }, []);

  // Set up input + game loop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (
        ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)
      ) {
        e.preventDefault();
        keysRef.current.add(key);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    rafRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(rafRef.current);
      clearInterval(walkTimerRef.current);
    };
  }, [gameLoop]);

  // Preload sprite images
  useEffect(() => {
    [SPRITE_IDLE, ...SPRITE_WALK].forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  // Camera offset: translate map so player is centered in viewport
  const cameraStyle = {
    transform: `translate(calc(50vw - ${pos.x}px), calc(50vh - ${pos.y}px))`,
  };

  // Player position on the map
  const playerStyle: React.CSSProperties = {
    left: pos.x - PLAYER_W / 2,
    top: pos.y - PLAYER_H / 2,
    width: PLAYER_W,
    height: PLAYER_H,
    transform: facingLeft ? 'scaleX(-1)' : 'none',
  };

  const currentSprite = isMoving ? SPRITE_WALK[walkFrame] : SPRITE_IDLE;
  const currentRoom = getCurrentRoom(pos.x, pos.y);

  // Distance from player to the electrical panel centre
  const panelCX = ELEC_PANEL_X + ELEC_PANEL_W / 2;
  const panelCY = ELEC_PANEL_Y + ELEC_PANEL_H / 2;
  const distToPanel = Math.sqrt(
    (pos.x - panelCX) ** 2 + (pos.y - panelCY) ** 2,
  );
  const nearPanel = distToPanel < ELEC_INTERACT_RANGE;

  const handlePanelClick = useCallback(() => {
    if (nearPanel) setShowElectricalPanels(true);
  }, [nearPanel]);

  return (
    <div className="skeld-viewport">
      {/* Map container moves to keep player centered */}
      <div className="skeld-map-container" style={cameraStyle}>
        {/* Map background */}
        <div
          className="skeld-map"
          style={{
            width: MAP_W,
            height: MAP_H,
            backgroundImage: `url(${MAP_URL})`,
          }}
        />

        {/* Dark space overlay – hides exterior areas */}
        <div
          className="skeld-space-overlay"
          style={{
            width: MAP_W,
            height: MAP_H,
            backgroundImage: `url(${SPACE_OVERLAY_URL})`,
          }}
        />

        {/* Interactive: Electrical panel box */}
        <div
          className={`map-interactive-panel${nearPanel ? ' map-interactive-panel--near' : ''}`}
          style={{
            left: ELEC_PANEL_X,
            top: ELEC_PANEL_Y,
            width: ELEC_PANEL_W,
            height: ELEC_PANEL_H,
          }}
          role="button"
          tabIndex={nearPanel ? 0 : -1}
          aria-label="Electrical panel — click to open"
          onClick={handlePanelClick}
        >
          <span className="panel-icon">&#9889;</span>
        </div>

        {/* Player character */}
        <div className="skeld-player" style={playerStyle}>
          <img
            src={currentSprite}
            alt="Crewmate"
            className={`player-sprite${isMoving ? ' walking' : ''}`}
            draggable={false}
          />
        </div>
      </div>

      {/* Atmospheric vignette */}
      <div className="skeld-vignette" />

      {/* HUD overlay */}
      <div className="skeld-hud">
        <button className="back-button" onClick={onBack}>
          &#8592; Menu
        </button>
        <div className="skeld-hud-info">
          <div className="hud-title">The Skeld</div>
          {currentRoom && (
            <div className="hud-room">{currentRoom}</div>
          )}
          <div className="hud-hint">
            WASD or Arrow Keys to move
            {nearPanel && !showElectricalPanels && (
              <span className="hud-task-hint"> · Click the panel to open electrical</span>
            )}
          </div>
          <div className="hud-coords">
            X: {Math.round(pos.x)} &nbsp; Y: {Math.round(pos.y)}
          </div>
        </div>
      </div>

      {showElectricalPanels && (
        <ElectricalPanelSelector onClose={() => setShowElectricalPanels(false)} />
      )}
    </div>
  );
}
