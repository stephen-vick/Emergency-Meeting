import { useCallback } from 'react';
import { PANEL_CONFIGS } from './ElectricalPanel';

type PanelId = 'patient' | 'donor' | 'product';

interface Props {
  onSelect: (panelId: PanelId) => void;
  onClose: () => void;
}

const PANEL_IDS: PanelId[] = ['patient', 'donor', 'product'];

export function ElectricalPanelSelector({ onSelect, onClose }: Props) {
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  return (
    <div
      className="electrical-panel-overlay electrical-selector-overlay"
      onClick={handleOverlayClick}
    >
      <div
        className="electrical-selector-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="electrical-selector-header">
          <h3>Electrical Panels</h3>
          <p className="electrical-selector-subtitle">
            Click a panel to open it
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

        <div className="electrical-selector-cards">
          {PANEL_IDS.map((id) => {
            const config = PANEL_CONFIGS[id];
            return (
              <button
                key={id}
                type="button"
                className="electrical-selector-card"
                onClick={() => onSelect(id)}
                aria-label={`Open ${config.title} panel`}
              >
                <span className="electrical-selector-card-title">
                  {config.title}
                </span>
                <span className="electrical-selector-card-attrs">
                  {config.attributes.length} attributes
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
