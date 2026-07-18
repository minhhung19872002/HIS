import React from 'react';
import type { ReactNode } from 'react';

/**
 * SplitLayout (#431) — VARIANT: master-detail 2 pane (worklist trái + vùng làm việc phải).
 * Dùng trong band (vd OPD/EMR/Billing editor). KHÔNG phải layout độc lập.
 */
export const SplitLayout: React.FC<{
  left: ReactNode;
  right: ReactNode;
  leftWidth?: number;
}> = ({ left, right, leftWidth = 320 }) => (
  <div style={{ display: 'grid', gridTemplateColumns: `${leftWidth}px 1fr`, height: '100%', minHeight: 0 }}>
    <div style={{ borderRight: '1px solid var(--line)', overflow: 'auto', minWidth: 0 }}>{left}</div>
    <div style={{ overflow: 'auto', minWidth: 0 }}>{right}</div>
  </div>
);

export default SplitLayout;
