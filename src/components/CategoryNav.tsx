import type { CategoryFilter } from '../types';

interface Props {
  categories: { name: string; count: number }[];
  skeldCount: number;
  activeCategory: CategoryFilter;
  onSelect: (cat: CategoryFilter) => void;
}

export function CategoryNav({ categories, skeldCount, activeCategory, onSelect }: Props) {
  return (
    <nav className="category-nav">
      <div className="nav-section-label">Browse</div>

      <button
        className={`nav-item ${activeCategory === '__all__' ? 'active' : ''}`}
        onClick={() => onSelect('__all__')}
      >
        <span className="nav-icon">&#9632;</span>
        <span className="nav-label">All Assets</span>
        <span className="nav-count">
          {categories.reduce((sum, c) => sum + c.count, 0)}
        </span>
      </button>

      <div className="nav-divider" />
      <div className="nav-section-label">Curated</div>

      <button
        className={`nav-item skeld-item ${activeCategory === '__skeld__' ? 'active' : ''}`}
        onClick={() => onSelect('__skeld__')}
      >
        <span className="nav-icon">&#9733;</span>
        <span className="nav-label">Skeld</span>
        <span className="nav-count">{skeldCount}</span>
      </button>

      <div className="nav-divider" />
      <div className="nav-section-label">Categories</div>

      {categories.map(({ name, count }) => (
        <button
          key={name}
          className={`nav-item ${activeCategory === name ? 'active' : ''}`}
          onClick={() => onSelect(name)}
        >
          <span className="nav-icon">{getCategoryIcon(name)}</span>
          <span className="nav-label">{name}</span>
          <span className="nav-count">{count}</span>
        </button>
      ))}
    </nav>
  );
}

function getCategoryIcon(category: string): string {
  const lower = category.toLowerCase();
  if (lower.includes('map')) return '\u{1F5FA}';
  if (lower.includes('player')) return '\u{1F464}';
  if (lower.includes('task')) return '\u{1F527}';
  if (lower.includes('gui') || lower.includes('ui')) return '\u{1F5B5}';
  if (lower.includes('voting')) return '\u{1F5F3}';
  if (lower.includes('logo')) return '\u{1F3F7}';
  if (lower.includes('background')) return '\u{1F30C}';
  if (lower.includes('kill')) return '\u{1F5E1}';
  if (lower.includes('font')) return '\u{1F524}';
  if (lower.includes('screenshot')) return '\u{1F4F7}';
  if (lower.includes('promo')) return '\u{1F3AC}';
  if (lower.includes('trailer')) return '\u{1F3AC}';
  if (lower.includes('discuss')) return '\u{2757}';
  if (lower.includes('shhh')) return '\u{1F910}';
  if (lower.includes('pet') || lower.includes('accessor')) return '\u{1F3A9}';
  return '\u{1F4C1}';
}
