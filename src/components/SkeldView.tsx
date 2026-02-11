import type { AssetEntry } from '../types';
import { AssetCard } from './AssetCard';

interface Props {
  assets: AssetEntry[];
  onSelect: (asset: AssetEntry) => void;
}

interface SkeldGroup {
  label: string;
  assets: AssetEntry[];
}

const ROOM_KEYWORDS = [
  'cafeteria', 'admin', 'electrical', 'medbay', 'security',
  'reactor', 'o2', 'navigation', 'weapons', 'storage',
  'shields', 'comms', 'upperengine', 'lowerengine', 'hallway',
  'engines', 'communications',
];

function groupSkeldAssets(assets: AssetEntry[]): SkeldGroup[] {
  const mapAssets: AssetEntry[] = [];
  const minimapAssets: AssetEntry[] = [];
  const roomAssets: AssetEntry[] = [];
  const meetingAssets: AssetEntry[] = [];
  const uiAssets: AssetEntry[] = [];
  const otherSkeld: AssetEntry[] = [];

  for (const asset of assets) {
    const tags = asset.tags;
    const lower = asset.path.toLowerCase();

    if (tags.includes('Minimap')) {
      minimapAssets.push(asset);
    } else if (tags.includes('Map') || (asset.category === 'Maps' && !ROOM_KEYWORDS.some((r) => lower.includes(r)))) {
      mapAssets.push(asset);
    } else if (tags.includes('Meeting') || tags.includes('Voting') || tags.includes('Discussion')) {
      meetingAssets.push(asset);
    } else if (ROOM_KEYWORDS.some((r) => lower.includes(r))) {
      roomAssets.push(asset);
    } else if (tags.includes('UI')) {
      uiAssets.push(asset);
    } else {
      otherSkeld.push(asset);
    }
  }

  const groups: SkeldGroup[] = [];
  if (mapAssets.length) groups.push({ label: 'Map', assets: mapAssets });
  if (minimapAssets.length) groups.push({ label: 'Minimap', assets: minimapAssets });
  if (roomAssets.length) groups.push({ label: 'Rooms', assets: roomAssets });
  if (meetingAssets.length) groups.push({ label: 'Meeting / Voting', assets: meetingAssets });
  if (uiAssets.length) groups.push({ label: 'Related UI', assets: uiAssets });
  if (otherSkeld.length) groups.push({ label: 'Other Skeld Assets', assets: otherSkeld });

  return groups;
}

export function SkeldView({ assets, onSelect }: Props) {
  const groups = groupSkeldAssets(assets);

  if (groups.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">&#9733;</div>
        <p>No Skeld-related assets found.</p>
      </div>
    );
  }

  return (
    <div className="skeld-view">
      <div className="skeld-header">
        <h2>The Skeld — Curated Assets</h2>
        <p className="skeld-subtitle">
          Assets detected via path heuristics (room names, map keywords, meeting/voting references).
        </p>
      </div>

      {groups.map((group) => (
        <div key={group.label} className="skeld-group">
          <h3 className="skeld-group-title">
            {group.label}
            <span className="skeld-group-count">{group.assets.length}</span>
          </h3>
          <div className="asset-grid">
            {group.assets.map((asset) => (
              <AssetCard
                key={asset.path}
                asset={asset}
                onClick={() => onSelect(asset)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
