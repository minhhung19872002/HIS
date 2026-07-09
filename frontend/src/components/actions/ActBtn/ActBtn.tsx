import React from 'react';
import TermIcon from '../../../layouts/terminal/Icon';

// ─────────────────────────── Action icon button ───────────────────────────

export const ActBtn: React.FC<{
  ic: string;
  title: string;
  onClick: (e: React.MouseEvent) => void;
  tone?: 'crit' | 'warn';
  loading?: boolean;
}> = ({ ic, title, onClick, tone, loading }) => (
  <button
    type="button"
    className="ab-iconbtn"
    title={title}
    disabled={loading}
    onClick={(e) => { e.stopPropagation(); onClick(e); }}
    style={tone === 'crit' ? { color: 'var(--s-crit)' } : tone === 'warn' ? { color: 'var(--s-warn)' } : undefined}
  >
    {loading ? <TermIcon name="refresh" size={12} /> : <TermIcon name={ic} size={12} />}
  </button>
);
