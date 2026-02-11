export interface AssetEntry {
  /** Relative path from assets root, e.g. "among us/among-us-assets-main/..." */
  path: string;
  /** URL to load the asset, e.g. "/assets/among us/..." */
  url: string;
  /** Top-level category derived from folder structure */
  category: string;
  /** Inferred tags from path heuristics */
  tags: string[];
  /** File extension without dot, e.g. "png" */
  ext: string;
  /** File size in bytes */
  bytes: number;
  /** Image width in pixels (null for video) */
  width: number | null;
  /** Image height in pixels (null for video) */
  height: number | null;
  /** Cleaned-up display name */
  displayName: string;
  /** Asset source collection */
  source: 'sprites' | 'presskit';
  /** Asset type */
  type: 'image' | 'video';
}

export interface Manifest {
  generatedAt: string;
  totalAssets: number;
  assets: AssetEntry[];
}

/** Categories that appear in the nav */
export type CategoryFilter = string | '__all__' | '__skeld__';
