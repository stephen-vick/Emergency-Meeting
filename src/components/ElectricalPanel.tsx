import { useState, useCallback, useRef, useEffect } from 'react';

const ROW_HEIGHT = 44;
const COL_HEADER_HEIGHT = 28;
const PANEL_PADDING = 16;
const COLUMN_WIDTH = 140;
const WIRE_GAP = 60;
const BODY_WIDTH = COLUMN_WIDTH * 2 + WIRE_GAP;

export interface ElectricalPanelConfig {
  title: string;
  attributes: readonly string[];
}

const PANEL_CONFIGS: Record<string, ElectricalPanelConfig> = {
  product: {
    title: 'Product',
    attributes: [
      'name',
      'color',
      'size',
      'weight',
      'uom',
      'shortDescription',
    ],
  },
  patient: {
    title: 'Patient',
    attributes: [
      'firstName',
      'lastName',
      'dob',
      'height',
      'weight',
      'bloodType',
      'medicalCondition',
    ],
  },
  donor: {
    title: 'Donor',
    attributes: ['firstName', 'lastName', 'dob', 'bloodType'],
  },
};

const DRAG_DATA_KEY = 'electrical-panel-attribute-index';

interface Props {
  config: ElectricalPanelConfig;
  onClose: () => void;
}

export function ElectricalPanel({ config, onClose }: Props) {
  const { title, attributes } = config;
  const nodeCount = attributes.length;
  const bodyHeight =
    PANEL_PADDING * 2 + COL_HEADER_HEIGHT + nodeCount * ROW_HEIGHT;

  const [connections, setConnections] = useState<number[]>(
    () => Array(nodeCount).fill(-1)
  );
  const [dragSource, setDragSource] = useState<{
    index: number;
    startX: number;
    startY: number;
  } | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [viewportSize, setViewportSize] = useState({ w: 1920, h: 1080 });

  useEffect(() => {
    const update = () => setViewportSize({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    e.dataTransfer.setData(DRAG_DATA_KEY, String(index));
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setDragImage(new Image(), 0, 0); // hide default image
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDragSource({
      index,
      startX: rect.left + rect.width / 2,
      startY: rect.top + rect.height / 2,
    });
    setDragPosition({ x: e.clientX, y: e.clientY });
  }, []);

  const handleDrag = useCallback((e: DragEvent) => {
    setDragPosition({ x: e.clientX, y: e.clientY });
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragSource(null);
    setDragPosition(null);
  }, []);

  useEffect(() => {
    if (dragSource === null) return;
    document.addEventListener('drag', handleDrag);
    document.addEventListener('dragend', handleDragEnd);
    return () => {
      document.removeEventListener('drag', handleDrag);
      document.removeEventListener('dragend', handleDragEnd);
    };
  }, [dragSource, handleDrag, handleDragEnd]);

  const handleDrop = useCallback(
    (e: React.DragEvent, rightIndex: number) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData(DRAG_DATA_KEY);
      if (raw === '') return;
      const leftIndex = parseInt(raw, 10);
      if (Number.isNaN(leftIndex) || leftIndex < 0 || leftIndex >= nodeCount) return;
      setConnections((prev) => {
        const next = [...prev];
        const existing = next.indexOf(rightIndex);
        if (existing >= 0) next[existing] = -1;
        next[leftIndex] = rightIndex;
        return next;
      });
      setDragSource(null);
      setDragPosition(null);
    },
    [nodeCount]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  const leftWireX = COLUMN_WIDTH - PANEL_PADDING;
  const rightWireX = COLUMN_WIDTH + WIRE_GAP;
  const wireYs = Array.from(
    { length: nodeCount },
    (_, i) =>
      PANEL_PADDING + COL_HEADER_HEIGHT + (i + 0.5) * ROW_HEIGHT
  );

  return (
    <div className="electrical-panel-overlay" onClick={handleOverlayClick}>
      {/* Dragging wire preview: line from source to cursor (viewport coordinates) */}
      {dragSource && dragPosition && (
        <svg
          className="electrical-panel-drag-wire"
          width="100%"
          height="100%"
          viewBox={`0 0 ${viewportSize.w} ${viewportSize.h}`}
          preserveAspectRatio="none"
          aria-hidden
        >
          <line
            x1={dragSource.startX}
            y1={dragSource.startY}
            x2={dragPosition.x}
            y2={dragPosition.y}
            stroke="var(--skeld-accent)"
            strokeWidth={3}
            strokeLinecap="round"
          />
        </svg>
      )}

      <div className="electrical-panel-modal electrical-panel-product">
        <div className="electrical-panel-header">
          <h3>{title}</h3>
          <p className="electrical-panel-subtitle">
            Select the available attributes in the desired order
          </p>
          <button
            type="button"
            className="electrical-panel-close"
            onClick={onClose}
            aria-label="Close panel"
          >
            ×
          </button>
        </div>

        <div
          className="electrical-panel-body electrical-panel-two-cols"
          style={{ height: bodyHeight }}
        >
          <svg
            className="electrical-panel-wires"
            viewBox={`0 0 ${BODY_WIDTH} ${bodyHeight}`}
            preserveAspectRatio="none"
          >
            {connections.map((rightIdx, leftIdx) => {
              if (rightIdx < 0) return null;
              const y1 = wireYs[leftIdx];
              const y2 = wireYs[rightIdx];
              const midX = (leftWireX + rightWireX) / 2;
              return (
                <path
                  key={leftIdx}
                  d={`M ${leftWireX} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${rightWireX} ${y2}`}
                  fill="none"
                  stroke="var(--skeld-accent)"
                  strokeWidth={3}
                  strokeLinecap="round"
                />
              );
            })}
          </svg>

          <div className="electrical-panel-col electrical-panel-available">
            <div className="electrical-panel-col-header">Available Attributes</div>
            {attributes.map((label, i) => (
              <div
                key={label}
                draggable
                role="button"
                tabIndex={0}
                className={`electrical-attribute-node ${dragSource?.index === i ? 'dragging' : ''} ${connections[i] >= 0 ? 'connected' : ''}`}
                onDragStart={(e) => handleDragStart(e, i)}
                onDragEnd={handleDragEnd}
                aria-label={`Drag ${label} to a selected slot`}
              >
                <span className="electrical-attribute-label">{label}</span>
              </div>
            ))}
          </div>

          <div className="electrical-panel-wire-gap" aria-hidden />
          <div className="electrical-panel-col electrical-panel-selected">
            <div className="electrical-panel-col-header">Selected Attributes</div>
            {Array.from({ length: nodeCount }, (_, rightIdx) => {
              const leftIdx = connections.indexOf(rightIdx);
              const label = leftIdx >= 0 ? attributes[leftIdx] : null;
              return (
                <div
                  key={rightIdx}
                  role="button"
                  tabIndex={0}
                  className={`electrical-attribute-slot ${dragSource ? 'drop-target' : ''}`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, rightIdx)}
                  aria-label={label ? `Connected: ${label}. Drop to replace.` : 'Empty slot — drop attribute here'}
                >
                  {label ? (
                    <span className="electrical-attribute-label">{label}</span>
                  ) : (
                    <span className="electrical-slot-empty">—</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export { PANEL_CONFIGS };
