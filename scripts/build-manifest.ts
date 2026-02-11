import fs from 'fs';
import path from 'path';
import { imageSize } from 'image-size';

// ── Types ──────────────────────────────────────────────────────────────────

interface AssetEntry {
  path: string;
  url: string;
  category: string;
  tags: string[];
  ext: string;
  bytes: number;
  width: number | null;
  height: number | null;
  displayName: string;
  source: 'sprites' | 'presskit';
  type: 'image' | 'video';
}

// ── Config ─────────────────────────────────────────────────────────────────

const ROOT = path.resolve(import.meta.dirname, '..');
const ASSETS_DIR = path.join(ROOT, 'assets');
const OUTPUT = path.join(ROOT, 'public', 'manifest.json');

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
const VIDEO_EXTS = new Set(['.mp4']);
const SKIP_EXTS = new Set(['.psd', '.fla', '.zip', '.txt', '.md']);

// ── Skeld room keywords ───────────────────────────────────────────────────

const SKELD_ROOMS = [
  'cafeteria', 'admin', 'electrical', 'medbay', 'security',
  'reactor', 'o2', 'navigation', 'weapons', 'storage',
  'shields', 'comms', 'upperengine', 'lowerengine', 'hallway',
  'engines', 'communications',
];

// ── Asset sources ─────────────────────────────────────────────────────────

const SOURCES: { dir: string; source: 'sprites' | 'presskit'; categoryRoot: string }[] = [
  {
    dir: path.join(ASSETS_DIR, 'among us', 'among-us-assets-main', 'among-us-assets-main'),
    source: 'sprites',
    categoryRoot: '',
  },
  {
    dir: path.join(ASSETS_DIR, 'among us', 'Among Us Presskit'),
    source: 'presskit',
    categoryRoot: '',
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function walkDir(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath));
    } else if (entry.isFile()) {
      results.push(fullPath);
    }
  }
  return results;
}

function cleanDisplayName(filename: string): string {
  // Strip extension
  let name = filename.replace(/\.\w+$/, '');
  // Strip Unity export suffixes like "-sharedassets0.assets-123"
  name = name.replace(/-sharedassets\d+\.assets-\d+$/, '');
  // Replace underscores and hyphens with spaces
  name = name.replace(/[_-]/g, ' ').trim();
  return name || filename;
}

function inferCategory(relativePath: string, source: 'sprites' | 'presskit'): string {
  const parts = relativePath.split(/[/\\]/);
  // First meaningful directory segment
  const firstDir = parts.length > 1 ? parts[0] : '';

  if (source === 'presskit') {
    if (firstDir.toLowerCase().includes('logo')) return 'Logos';
    if (firstDir.toLowerCase().includes('promo') || firstDir.toLowerCase().includes('key art')) return 'Promo';
    if (firstDir.toLowerCase().includes('screenshot')) return 'Screenshots';
    if (firstDir.toLowerCase().includes('trailer')) return 'Trailers';
    if (firstDir.toLowerCase().includes('b-roll')) return 'B-Roll';
    return firstDir || 'Press Kit';
  }

  // Sprites source
  if (firstDir) return firstDir;
  return 'Other';
}

function inferTags(relativePath: string, category: string): string[] {
  const tags: string[] = [];
  const lower = relativePath.toLowerCase();

  // Skeld detection
  if (lower.includes('skeld')) {
    tags.push('Skeld');
  }

  // Room detection
  for (const room of SKELD_ROOMS) {
    if (lower.includes(room)) {
      if (!tags.includes('Skeld')) tags.push('Skeld');
      tags.push(room.charAt(0).toUpperCase() + room.slice(1));
    }
  }

  // Map / Minimap
  if (lower.includes('minimap') || (lower.includes('mini') && lower.includes('map'))) {
    tags.push('Minimap');
    if (!tags.includes('Skeld')) tags.push('Skeld');
  } else if (
    (category === 'Maps' || category === 'Gui') &&
    lower.includes('map')
  ) {
    tags.push('Map');
  }

  // Voting
  if (lower.includes('vote') || lower.includes('voting') || category === 'Voting') {
    tags.push('Voting');
  }

  // UI
  if (category === 'Gui' || lower.includes('button') || lower.includes('menu')) {
    tags.push('UI');
  }

  // Meeting / Emergency
  if (lower.includes('emergency') || lower.includes('meeting')) {
    tags.push('Meeting');
    if (!tags.includes('Skeld')) tags.push('Skeld');
  }

  // Discussion
  if (lower.includes('discuss')) {
    tags.push('Discussion');
  }

  // Impostor / SHHH
  if (lower.includes('shhh') || lower.includes('impostor') || lower.includes('kill')) {
    tags.push('Impostor');
  }

  // Lobby
  if (lower.includes('lobby')) {
    tags.push('Lobby');
  }

  // Player
  if (lower.includes('player') || lower.includes('crew') || lower.includes('hand')) {
    tags.push('Player');
  }

  // Task
  if (category === 'Tasks' || lower.includes('task')) {
    tags.push('Task');
  }

  // Deduplicate
  return [...new Set(tags)];
}

function getImageDimensions(filePath: string): { width: number; height: number } | null {
  try {
    const result = imageSize(filePath);
    if (result.width && result.height) {
      return { width: result.width, height: result.height };
    }
  } catch {
    // Skip files that can't be read
  }
  return null;
}

// ── Main ───────────────────────────────────────────────────────────────────

function main() {
  console.log('Building asset manifest...');

  // Ensure public/ exists
  const publicDir = path.join(ROOT, 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const assets: AssetEntry[] = [];

  for (const { dir, source } of SOURCES) {
    if (!fs.existsSync(dir)) {
      console.warn(`  ⚠ Source directory not found: ${dir}`);
      continue;
    }

    console.log(`  Scanning: ${dir}`);
    const files = walkDir(dir);

    for (const filePath of files) {
      const ext = path.extname(filePath).toLowerCase();
      if (SKIP_EXTS.has(ext) || (!IMAGE_EXTS.has(ext) && !VIDEO_EXTS.has(ext))) {
        continue;
      }

      const isImage = IMAGE_EXTS.has(ext);
      const relativePath = path.relative(ASSETS_DIR, filePath).replace(/\\/g, '/');
      const relativeFromSource = path.relative(dir, filePath).replace(/\\/g, '/');
      const stat = fs.statSync(filePath);
      const category = inferCategory(relativeFromSource, source);
      const tags = inferTags(relativeFromSource, category);
      const filename = path.basename(filePath);

      let width: number | null = null;
      let height: number | null = null;

      if (isImage) {
        const dims = getImageDimensions(filePath);
        if (dims) {
          width = dims.width;
          height = dims.height;
        }
      }

      assets.push({
        path: relativePath,
        url: '/assets/' + relativePath,
        category,
        tags,
        ext: ext.slice(1),
        bytes: stat.size,
        width,
        height,
        displayName: cleanDisplayName(filename),
        source,
        type: isImage ? 'image' : 'video',
      });
    }
  }

  // Sort by category then display name
  assets.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.displayName.localeCompare(b.displayName);
  });

  const manifest = {
    generatedAt: new Date().toISOString(),
    totalAssets: assets.length,
    assets,
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`\n✓ Manifest written to ${OUTPUT}`);
  console.log(`  Total assets: ${assets.length}`);

  // Print category summary
  const cats = new Map<string, number>();
  for (const a of assets) {
    cats.set(a.category, (cats.get(a.category) || 0) + 1);
  }
  console.log('  Categories:');
  for (const [cat, count] of [...cats.entries()].sort()) {
    console.log(`    ${cat}: ${count}`);
  }
}

main();
