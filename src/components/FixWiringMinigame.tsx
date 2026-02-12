import { useState, useMemo, useCallback, useEffect, useRef } from 'react';

/* ── Among Us wire colours ─────────────────────────────────────── */

const WIRE_COLORS = ['#e53935', '#1e88e5', '#fdd835', '#ec407a'] as const;

/* ── Patient record pool ───────────────────────────────────────── */

interface PatientRecord {
  firstName: string;
  lastName: string;
  dob: string;
  bloodType: string;
}

const PATIENT_RECORDS: PatientRecord[] = [
  { firstName: 'Sarah', lastName: 'Johnson', dob: '04/12/1987', bloodType: 'AB+' },
  { firstName: 'Marcus', lastName: 'Chen', dob: '11/03/1992', bloodType: 'O-' },
  { firstName: 'Emily', lastName: 'Rodriguez', dob: '07/28/1975', bloodType: 'A+' },
  { firstName: 'James', lastName: 'Williams', dob: '01/22/2001', bloodType: 'B+' },
  { firstName: 'Olivia', lastName: 'Patel', dob: '09/05/1998', bloodType: 'A-' },
  { firstName: 'Daniel', lastName: 'Kim', dob: '06/17/1984', bloodType: 'O+' },
];

const FIELD_LABELS: (keyof PatientRecord)[] = [
  'firstName',
  'lastName',
  'dob',
  'bloodType',
];

const DISPLAY_LABELS: Record<keyof PatientRecord, string> = {
  firstName: 'First Name',
  lastName: 'Last Name',
  dob: 'Date of Birth',
  bloodType: 'Blood Type',
};

/* ── Helpers ───────────────────────────────────────────────────── */

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ── Layout constants ──────────────────────────────────────────── */

const NODE_COUNT = 4;
const NODE_R = 14;         // nub radius
const ROW_GAP = 100;       // vertical space between wire rows
const PAD_TOP = 80;        // top padding inside the panel SVG
const PAD_X = 32;          // horizontal inset for nubs
const PANEL_W = 520;       // internal coordinate width
const PANEL_H = PAD_TOP + NODE_COUNT * ROW_GAP + 40;
const HIT_R = NODE_R * 2.5; // generous hit radius for drop targets

/* ── Component ─────────────────────────────────────────────────── */

interface Props {
  onComplete: () => void;
  onClose: () => void;
}

export function FixWiringMinigame({ onComplete, onClose }: Props) {
  /* Pick a random patient + shuffle the right-side values once per mount */
  const { record, rightOrder } = useMemo(() => {
    const rec = pickRandom(PATIENT_RECORDS);
    const indices = shuffle(Array.from({ length: NODE_COUNT }, (_, i) => i));
    return { record: rec, rightOrder: indices };
  }, []);

  const values = FIELD_LABELS.map((key) => record[key]);

  /* connections[leftIdx] = rightIdx  (-1 = unconnected) */
  const [connections, setConnections] = useState<number[]>(
    () => Array(NODE_COUNT).fill(-1),
  );
  const [completed, setCompleted] = useState(false);

  /* Drag state */
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<{
    leftIdx: number;
    x: number;
    y: number;
  } | null>(null);

  /* Convert screen coords to SVG viewBox coords */
  const screenToSvg = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const svgPt = pt.matrixTransform(ctm.inverse());
    return { x: svgPt.x, y: svgPt.y };
  }, []);

  /* Coordinate helpers */
  const leftX = PAD_X;
  const rightX = PANEL_W - PAD_X;
  const rowY = useCallback((i: number) => PAD_TOP + i * ROW_GAP, []);

  /* ── Drag handlers ─────────────────────────────────────────── */

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, leftIdx: number) => {
      if (completed) return;
      e.preventDefault();
      (e.target as Element).setPointerCapture(e.pointerId);
      const pos = screenToSvg(e.clientX, e.clientY);
      setDragging({ leftIdx, x: pos.x, y: pos.y });
    },
    [completed, screenToSvg],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      const pos = screenToSvg(e.clientX, e.clientY);
      setDragging((prev) => prev ? { ...prev, x: pos.x, y: pos.y } : null);
    },
    [dragging, screenToSvg],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      const pos = screenToSvg(e.clientX, e.clientY);

      /* Check if we dropped on a right-side nub */
      let hitSlot = -1;
      for (let slot = 0; slot < NODE_COUNT; slot++) {
        const ny = rowY(slot);
        const dx = pos.x - rightX;
        const dy = pos.y - ny;
        if (Math.sqrt(dx * dx + dy * dy) < HIT_R) {
          hitSlot = slot;
          break;
        }
      }

      if (hitSlot >= 0) {
        setConnections((prev) => {
          const next = [...prev];
          /* Remove any existing connection to this right slot */
          const existing = next.indexOf(hitSlot);
          if (existing >= 0) next[existing] = -1;
          next[dragging.leftIdx] = hitSlot;
          return next;
        });
      }

      setDragging(null);
    },
    [dragging, screenToSvg, rowY, rightX],
  );

  /* ── Correctness check ─────────────────────────────────────── */

  const allConnected = connections.every((c) => c >= 0);
  const isCorrect = useMemo(
    () =>
      allConnected &&
      connections.every(
        (rightIdx, leftIdx) => rightOrder[rightIdx] === leftIdx,
      ),
    [connections, rightOrder, allConnected],
  );

  useEffect(() => {
    if (isCorrect && !completed) {
      setCompleted(true);
    }
  }, [isCorrect, completed]);

  /* ── Cursor class for the panel ────────────────────────────── */

  const panelCursorClass = dragging
    ? ' fix-wiring-dragging'
    : completed
      ? ''
      : ' fix-wiring-idle';

  /* ── Render ────────────────────────────────────────────────── */

  return (
    <div
      className="fix-wiring-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="fix-wiring-modal">
        {/* Header bar */}
        <div className="fix-wiring-header">
          <span className="fix-wiring-title">FIX WIRING</span>
          <span className="fix-wiring-subtitle">
            Match each patient field to its value
          </span>
        </div>

        {/* The wiring panel */}
        <div
          className={`fix-wiring-panel${completed ? ' fix-wiring-complete' : ''}${panelCursorClass}`}
        >
          <svg
            ref={svgRef}
            className="fix-wiring-svg"
            viewBox={`0 0 ${PANEL_W} ${PANEL_H}`}
            preserveAspectRatio="xMidYMid meet"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* Connected wires */}
            {connections.map((rightIdx, leftIdx) => {
              if (rightIdx < 0) return null;
              const y1 = rowY(leftIdx);
              const y2 = rowY(rightIdx);
              const midX = PANEL_W / 2;
              const color = WIRE_COLORS[leftIdx];
              return (
                <path
                  key={`wire-${leftIdx}`}
                  d={`M ${leftX} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${rightX} ${y2}`}
                  fill="none"
                  stroke={color}
                  strokeWidth={7}
                  strokeLinecap="round"
                  opacity={0.9}
                />
              );
            })}

            {/* Live drag wire — follows cursor from left nub */}
            {dragging && (
              <path
                d={`M ${leftX} ${rowY(dragging.leftIdx)} C ${(leftX + dragging.x) / 2} ${rowY(dragging.leftIdx)}, ${(leftX + dragging.x) / 2} ${dragging.y}, ${dragging.x} ${dragging.y}`}
                fill="none"
                stroke={WIRE_COLORS[dragging.leftIdx]}
                strokeWidth={7}
                strokeLinecap="round"
                opacity={0.85}
                className="fix-wiring-live-wire"
              />
            )}

            {/* LEFT nubs + labels */}
            {FIELD_LABELS.map((key, i) => {
              const y = rowY(i);
              const color = WIRE_COLORS[i];
              const isDraggingThis = dragging?.leftIdx === i;
              const isConnected = connections[i] >= 0;
              return (
                <g
                  key={`left-${i}`}
                  className="fix-wiring-node-group"
                  onPointerDown={(e) => handlePointerDown(e, i)}
                  style={{ cursor: completed ? 'default' : isDraggingThis ? 'grabbing' : 'grab' }}
                >
                  {/* Wire stub coming from left edge */}
                  <rect
                    x={0}
                    y={y - 5}
                    width={leftX}
                    height={10}
                    fill={color}
                    rx={2}
                  />
                  {/* Nub circle */}
                  <circle
                    cx={leftX}
                    cy={y}
                    r={NODE_R}
                    fill={color}
                    stroke={isDraggingThis ? '#fff' : '#1a1a2e'}
                    strokeWidth={isDraggingThis ? 3 : 2}
                    className={`fix-wiring-nub${isDraggingThis ? ' selected' : ''}${isConnected ? ' connected' : ''}`}
                  />
                  {/* Invisible larger hit area for easier grabbing */}
                  <circle
                    cx={leftX}
                    cy={y}
                    r={NODE_R * 2}
                    fill="transparent"
                  />
                  {/* Field label */}
                  <text
                    x={leftX + NODE_R + 12}
                    y={y + 1}
                    dominantBaseline="middle"
                    className="fix-wiring-label fix-wiring-label-left"
                  >
                    {DISPLAY_LABELS[key]}
                  </text>
                </g>
              );
            })}

            {/* RIGHT nubs + values (shuffled) */}
            {rightOrder.map((origIdx, slotIdx) => {
              const y = rowY(slotIdx);
              const color = WIRE_COLORS[origIdx];
              const isTarget = connections.indexOf(slotIdx) >= 0;
              /* Highlight when dragging near this nub */
              const isHovered = dragging
                ? Math.sqrt(
                    (dragging.x - rightX) ** 2 + (dragging.y - y) ** 2,
                  ) < HIT_R
                : false;
              return (
                <g
                  key={`right-${slotIdx}`}
                  className="fix-wiring-node-group"
                >
                  {/* Wire stub going to right edge */}
                  <rect
                    x={rightX}
                    y={y - 5}
                    width={PANEL_W - rightX}
                    height={10}
                    fill={color}
                    rx={2}
                  />
                  {/* Glow ring when hovered during drag */}
                  {isHovered && (
                    <circle
                      cx={rightX}
                      cy={y}
                      r={NODE_R + 6}
                      fill="none"
                      stroke="#fff"
                      strokeWidth={2}
                      opacity={0.6}
                      className="fix-wiring-drop-glow"
                    />
                  )}
                  {/* Nub circle */}
                  <circle
                    cx={rightX}
                    cy={y}
                    r={NODE_R}
                    fill={color}
                    stroke={isTarget || isHovered ? '#fff' : '#1a1a2e'}
                    strokeWidth={isTarget || isHovered ? 3 : 2}
                    className={`fix-wiring-nub${isTarget ? ' connected' : ''}`}
                  />
                  {/* Value label */}
                  <text
                    x={rightX - NODE_R - 12}
                    y={y + 1}
                    dominantBaseline="middle"
                    textAnchor="end"
                    className="fix-wiring-label fix-wiring-label-right"
                  >
                    {values[origIdx]}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Feedback messages */}
          {allConnected && !isCorrect && (
            <div className="fix-wiring-wrong">
              Wrong wires &mdash; try again!
            </div>
          )}
        </div>

        {/* Task Complete button — only visible after solving */}
        {completed && (
          <button
            type="button"
            className="fix-wiring-complete-btn"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onComplete();
            }}
            aria-label="Task complete — click to dismiss"
          >
            TASK COMPLETE
          </button>
        )}
      </div>
    </div>
  );
}
