import { useState } from 'react';
import type { AssetEntry } from '../types';

interface Props {
  asset: AssetEntry;
  onClick: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AssetCard({ asset, onClick }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  const isVideo = asset.type === 'video';

  return (
    <div className="asset-card" onClick={onClick} role="button" tabIndex={0}>
      <div className="card-thumbnail">
        {isVideo ? (
          <div className="video-placeholder">
            <span className="video-icon">&#9654;</span>
            <span className="video-ext">.{asset.ext}</span>
          </div>
        ) : errored ? (
          <div className="image-error">
            <span>&#9888;</span>
          </div>
        ) : (
          <>
            {!loaded && <div className="thumbnail-skeleton" />}
            <img
              src={encodeURI(asset.url)}
              alt={asset.displayName}
              loading="lazy"
              onLoad={() => setLoaded(true)}
              onError={() => setErrored(true)}
              className={loaded ? 'loaded' : 'loading'}
            />
          </>
        )}
      </div>
      <div className="card-info">
        <div className="card-name" title={asset.displayName}>
          {asset.displayName}
        </div>
        <div className="card-meta">
          <span className="card-size">{formatBytes(asset.bytes)}</span>
          {asset.width && asset.height && (
            <span className="card-dims">
              {asset.width}&times;{asset.height}
            </span>
          )}
        </div>
        <div className="card-category-badge">{asset.category}</div>
      </div>
    </div>
  );
}
