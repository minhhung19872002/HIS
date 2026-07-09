import React from 'react';

// ─────────────────────────── Filter (select) ───────────────────────────

export const Filter: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: { v: string; l: string }[];
  placeholder?: string;
}> = ({ value, onChange, options, placeholder }) => (
  <select className="ab-sel" value={value} onChange={(e) => onChange(e.target.value)}>
    {placeholder && <option value="">{placeholder}</option>}
    {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
  </select>
);
