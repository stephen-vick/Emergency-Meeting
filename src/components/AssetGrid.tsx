import type { AssetEntry } from '../types';
import { AssetCard } from './AssetCard';

interface Props {
  assets: AssetEntry[];
  onSelect: (asset: AssetEntry) => void;
}

export function AssetGrid({ assets, onSelect }: Props) {
  if (assets.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">&#128269;</div>
        <p>No assets found matching your criteria.</p>
      </div>
    );
  }

  return (
    <div className="asset-grid">
      {assets.map((asset) => (
        <AssetCard
          key={asset.path}
          asset={asset}
          onClick={() => onSelect(asset)}
        />
      ))}
    </div>
  );
}
