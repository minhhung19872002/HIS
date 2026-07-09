import React from 'react';
import TermIcon from '../../../layouts/terminal/Icon';

// ─────────────────────────── Search box ───────────────────────────

export const SearchBox: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minWidth?: number | string;
}> = ({ value, onChange, placeholder, minWidth = 280 }) => (
  <div className="ab-search" style={{ minWidth, flex: `1 1 ${typeof minWidth === 'number' ? minWidth + 'px' : minWidth}` }}>
    <TermIcon name="search" size={13} />
    <input placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    {value && (
      <button type="button" onClick={() => onChange('')}>
        <TermIcon name="x" size={11} />
      </button>
    )}
  </div>
);
