"use client";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  resultCount?: number;
  resultLabel?: string;
};

export function SearchBox({ value, onChange, placeholder, resultCount, resultLabel = "találat" }: Props) {
  return (
    <div className="filter-toolbar">
      <label className="search-box">
        <span>Keresés</span>
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          suppressHydrationWarning
        />
      </label>
      {resultCount !== undefined ? (
        <span className="result-count">
          {resultCount} {resultLabel}
        </span>
      ) : null}
    </div>
  );
}
