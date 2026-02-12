import { useState, useCallback } from 'react';
import { PANEL_CONFIGS } from './ElectricalPanel';
import { ElectricalPanelContent } from './ElectricalPanel';

export type PanelId = 'patient' | 'donor' | 'product';

const PANEL_IDS: PanelId[] = ['patient', 'donor', 'product'];

interface Props {
  onClose: () => void;
}

export function ElectricalPanelSelector({ onClose }: Props) {
  const [openPanelId, setOpenPanelId] = useState<PanelId | null>(null);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  const handleClosePanel = useCallback(() => {
    setOpenPanelId(null);
  }, []);

  return (
    <div
      className="electrical-panel-overlay electrical-selector-overlay"
      onClick={handleOverlayClick}
    >
      <div
        className="electrical-cabinets-container"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="electrical-cabinets-header">
          <h3>Electrical Room — Panels</h3>
          <p className="electrical-selector-subtitle">
            Select a panel to open its door
          </p>
          <button
            type="button"
            className="electrical-panel-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="electrical-cabinets">
          {PANEL_IDS.map((id) => {
            const config = PANEL_CONFIGS[id];
            const isOpen = openPanelId === id;
            return (
              <div
                key={id}
                className={`electrical-cabinet ${isOpen ? 'electrical-cabinet-open' : ''}`}
              >
                <div className="electrical-cabinet-frame">
                  <div className="electrical-cabinet-label">
                    {config.title.toUpperCase()}
                  </div>
                  <div className="electrical-cabinet-content-wrap">
                    <div className="electrical-cabinet-content">
                      <p className="electrical-cabinet-subtitle">
                        Select the available attributes in the desired order
                      </p>
                      <ElectricalPanelContent
                        config={config}
                        onClose={handleClosePanel}
                      />
                    </div>
                    <button
                      type="button"
                      className={`electrical-cabinet-door ${isOpen ? 'electrical-cabinet-door-open' : ''}`}
                      aria-expanded={isOpen}
                      aria-label={isOpen ? `Close ${config.title} panel` : `Open ${config.title} panel`}
                      onClick={() => setOpenPanelId((prev) => (prev === id ? null : id))}
                    >
                      <span className="electrical-cabinet-door-inner">
                        {config.title}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          <button
            type="button"
            className="electrical-complete-task-btn"
            onClick={onClose}
            aria-label="Complete task and exit Electrical Room panels"
          >
            Complete Task
          </button>
        </div>
      </div>
    </div>
  );
}
