interface Props {
  value: string;
  onChange: (val: string) => void;
  resultCount: number;
}

export function SearchBar({ value, onChange, resultCount }: Props) {
  return (
    <div className="search-bar">
      <div className="search-input-wrapper">
        <span className="search-icon">&#128269;</span>
        <input
          type="text"
          className="search-input"
          placeholder="Search by name, path, or tag..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {value && (
          <button className="search-clear" onClick={() => onChange('')}>
            &#10005;
          </button>
        )}
      </div>
      <div className="search-count">
        {resultCount} asset{resultCount !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
