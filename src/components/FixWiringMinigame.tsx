import { useState, useMemo, useCallback, useEffect } from 'react';

const WIRE_COLORS = ['red', 'blue', 'yellow', 'magenta'] as const;
type WireColor = (typeof WIRE_COLORS)[number];

const COLOR_VALUES: Record<WireColor, string> = {
  red: '#e53935',
  blue: '#1e88e5',
  yellow: '#fdd835',
  magenta: '#ec407a',
};

function shuffle<T>(array: T[]): T[] {
  const out = [...array];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

interface Props {
  onComplete: () => void;
  onClose: () => void;
}

const NODE_COUNT = 4;
const NODE_SIZE = 28;
const PANEL_PADDING = 24;
const GAP = 56;

export function FixWiringMinigame({ onComplete, onClose }: Props) {
  const rightColors = useMemo(() => shuffle([...WIRE_COLORS]), []);

  const [connections, setConnections] = useState<number[]>(
    () => Array(NODE_COUNT).fill(-1)
  );
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);

  const handleLeftClick = useCallback((index: number) => {
    setSelectedLeft((prev) => (prev === index ? null : index));
  }, []);

  const handleRightClick = useCallback(
    (rightIndex: number) => {
      if (selectedLeft === null) return;
      setConnections((prev) => {
        const next = [...prev];
        next[selectedLeft] = rightIndex;
        return next;
      });
      setSelectedLeft(null);
    },
    [selectedLeft]
  );

  const allConnected = connections.every((c) => c >= 0);
  const isCorrect = useMemo(
    () =>
      allConnected &&
      connections.every(
        (rightIdx, leftIdx) => rightColors[rightIdx] === WIRE_COLORS[leftIdx]
      ),
    [connections, rightColors, allConnected]
  );

  useEffect(() => {
    if (isCorrect) onComplete();
  }, [isCorrect, onComplete]);

  const boxWidth = 200;
  const boxHeight = NODE_COUNT * GAP + PANEL_PADDING * 2;
  const leftX = PANEL_PADDING + NODE_SIZE / 2;
  const rightX = boxWidth - PANEL_PADDING - NODE_SIZE / 2;
  const nodeYs = Array.from(
    { length: NODE_COUNT },
    (_, i) => PANEL_PADDING + NODE_SIZE / 2 + i * GAP
  );

  return (
    <div className="fix-wiring-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="fix-wiring-modal">
        <div className="fix-wiring-header">
          <h3>Fix Wiring</h3>
          <p className="fix-wiring-hint">Connect each wire to the matching color</p>
          <button type="button" className="fix-wiring-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div
          className="fix-wiring-panel"
          style={{ width: boxWidth, height: boxHeight }}
        >
          <svg
            className="fix-wiring-wires"
            width={boxWidth}
            height={boxHeight}
          >
            {connections.map((rightIdx, leftIdx) => {
              if (rightIdx < 0) return null;
              const y1 = nodeYs[leftIdx];
              const y2 = nodeYs[rightIdx];
              const midX = (leftX + rightX) / 2;
              const color = COLOR_VALUES[WIRE_COLORS[leftIdx]];
              return (
                <path
                  key={leftIdx}
                  d={`M ${leftX} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${rightX} ${y2}`}
                  fill="none"
                  stroke={color}
                  strokeWidth={4}
                  strokeLinecap="round"
                />
              );
            })}
          </svg>

          <div className="fix-wiring-nodes fix-wiring-left">
            {WIRE_COLORS.map((color, i) => (
              <button
                key={i}
                type="button"
                className={`fix-wiring-node ${selectedLeft === i ? 'selected' : ''}`}
                style={{
                  left: PANEL_PADDING,
                  top: PANEL_PADDING + i * GAP,
                  width: NODE_SIZE,
                  height: NODE_SIZE,
                  backgroundColor: COLOR_VALUES[color],
                }}
                onClick={() => handleLeftClick(i)}
                aria-label={`Connect ${color} wire`}
              />
            ))}
          </div>

          <div className="fix-wiring-nodes fix-wiring-right">
            {rightColors.map((color, i) => (
              <button
                key={i}
                type="button"
                className="fix-wiring-node"
                style={{
                  right: PANEL_PADDING,
                  top: PANEL_PADDING + i * GAP,
                  width: NODE_SIZE,
                  height: NODE_SIZE,
                  backgroundColor: COLOR_VALUES[color],
                }}
                onClick={() => handleRightClick(i)}
                aria-label={`Connect to ${color}`}
              />
            ))}
          </div>
        </div>

        {allConnected && !isCorrect && (
          <p className="fix-wiring-wrong">Wrong connection — try again.</p>
        )}
      </div>
    </div>
  );
}
