import { useState, useEffect, useCallback } from 'react';
import type { AssetEntry } from '../types';

interface Props {
  asset: AssetEntry;
  onClose: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AssetModal({ asset, onClose }: Props) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  async function copyToClipboard(text: string, field: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  }

  const fullUrl = `${window.location.origin}${encodeURI(asset.url)}`;
  const isVideo = asset.type === 'video';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          &#10005;
        </button>

        <div className="modal-preview">
          {isVideo ? (
            <video controls className="modal-video" src={encodeURI(asset.url)}>
              Your browser does not support video playback.
            </video>
          ) : (
            <img
              src={encodeURI(asset.url)}
              alt={asset.displayName}
              className="modal-image"
            />
          )}
        </div>

        <div className="modal-details">
          <h2 className="modal-title">{asset.displayName}</h2>

          <div className="modal-meta-grid">
            <div className="meta-item">
              <span className="meta-label">Category</span>
              <span className="meta-value">{asset.category}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Source</span>
              <span className="meta-value">
                {asset.source === 'sprites' ? 'Game Sprites' : 'Press Kit'}
              </span>
            </div>
            <div className="meta-item">
              <span className="meta-label">File Size</span>
              <span className="meta-value">{formatBytes(asset.bytes)}</span>
            </div>
            {asset.width && asset.height && (
              <div className="meta-item">
                <span className="meta-label">Dimensions</span>
                <span className="meta-value">
                  {asset.width} &times; {asset.height} px
                </span>
              </div>
            )}
            <div className="meta-item">
              <span className="meta-label">Format</span>
              <span className="meta-value">.{asset.ext.toUpperCase()}</span>
            </div>
          </div>

          {asset.tags.length > 0 && (
            <div className="modal-tags">
              {asset.tags.map((tag) => (
                <span key={tag} className="tag-pill">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="modal-copy-section">
            <div className="copy-row">
              <label>Relative Path</label>
              <div className="copy-field">
                <code>{asset.path}</code>
                <button
                  className={`copy-btn ${copiedField === 'path' ? 'copied' : ''}`}
                  onClick={() => copyToClipboard(asset.path, 'path')}
                >
                  {copiedField === 'path' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            <div className="copy-row">
              <label>Full URL</label>
              <div className="copy-field">
                <code>{fullUrl}</code>
                <button
                  className={`copy-btn ${copiedField === 'url' ? 'copied' : ''}`}
                  onClick={() => copyToClipboard(fullUrl, 'url')}
                >
                  {copiedField === 'url' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
