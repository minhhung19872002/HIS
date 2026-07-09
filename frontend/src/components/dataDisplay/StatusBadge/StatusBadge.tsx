import React from 'react';
import type { StatusTone } from '../../navigation/Tabs';

// ─────────────────────────── Status badge ───────────────────────────

export const StatusBadge: React.FC<{
  tone?: StatusTone;
  children: React.ReactNode;
  dot?: boolean;
}> = ({ tone = 'info', children, dot }) => (
  <span className={`ab-stat ${tone}`}>
    {dot && <span className={`ab-dot ${tone}`} />}
    {children}
  </span>
);
