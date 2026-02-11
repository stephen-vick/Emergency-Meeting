import { useState, useEffect, useMemo } from 'react';
import type { AssetEntry, Manifest, CategoryFilter } from './types';
import { CategoryNav } from './components/CategoryNav';
import { SearchBar } from './components/SearchBar';
import { AssetGrid } from './components/AssetGrid';
import { AssetModal } from './components/AssetModal';
import { SkeldView } from './components/SkeldView';

interface Props {
  onBack: () => void;
}

export default function AssetBrowser({ onBack }: Props) {
  const [assets, setAssets] = useState<AssetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('__all__');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<AssetEntry | null>(null);

  // Load manifest
  useEffect(() => {
    fetch('/manifest.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: Manifest) => {
        setAssets(data.assets);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Compute categories with counts
  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of assets) {
      map.set(a.category, (map.get(a.category) || 0) + 1);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, count]) => ({ name, count }));
  }, [assets]);

  // Skeld count
  const skeldCount = useMemo(
    () => assets.filter((a) => a.tags.includes('Skeld')).length,
    [assets]
  );

  // Filter assets
  const filteredAssets = useMemo(() => {
    let result = assets;

    // Category filter
    if (activeCategory === '__skeld__') {
      result = result.filter((a) => a.tags.includes('Skeld'));
    } else if (activeCategory !== '__all__') {
      result = result.filter((a) => a.category === activeCategory);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.displayName.toLowerCase().includes(q) ||
          a.path.toLowerCase().includes(q) ||
          a.tags.some((t) => t.toLowerCase().includes(q)) ||
          a.category.toLowerCase().includes(q)
      );
    }

    return result;
  }, [assets, activeCategory, searchQuery]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading asset manifest...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="loading-screen error">
        <h2>Failed to load manifest</h2>
        <p>{error}</p>
        <p>
          Run <code>npm run build:manifest</code> first, then restart the dev
          server.
        </p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <button className="back-button" onClick={onBack}>
          &#8592; Menu
        </button>
        <h1 className="app-title">
          <span className="title-icon">&#9784;</span>
          Among Us Asset Browser
        </h1>
        <div className="header-stats">
          {assets.length} assets &middot; {categories.length} categories
        </div>
      </header>

      <div className="app-body">
        <CategoryNav
          categories={categories}
          skeldCount={skeldCount}
          activeCategory={activeCategory}
          onSelect={setActiveCategory}
        />

        <main className="main-content">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            resultCount={filteredAssets.length}
          />

          {activeCategory === '__skeld__' && !searchQuery ? (
            <SkeldView
              assets={filteredAssets}
              onSelect={setSelectedAsset}
            />
          ) : (
            <AssetGrid
              assets={filteredAssets}
              onSelect={setSelectedAsset}
            />
          )}
        </main>
      </div>

      {selectedAsset && (
        <AssetModal
          asset={selectedAsset}
          onClose={() => setSelectedAsset(null)}
        />
      )}
    </div>
  );
}
