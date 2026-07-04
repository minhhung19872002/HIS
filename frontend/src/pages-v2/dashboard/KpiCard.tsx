import React from 'react';
import type { Kpi } from './_shared';

/* ==========================================================================
   KPI card with SVG sparkline
   ========================================================================== */

export const KpiCard: React.FC<{ k: Kpi }> = ({ k }) => {
  const upish = k.delta.startsWith('+');
  const downish = k.delta.startsWith('-');
  const color = (upish && !k.negSpark) || (downish && k.negSpark) ? 'var(--s-ok)'
              : (downish && !k.negSpark) || (upish && k.negSpark) ? 'var(--s-crit)'
              : 'var(--t-2)';
  const max = Math.max(...k.spark);
  const min = Math.min(...k.spark);
  const w = 100, h = 28;
  const pts = k.spark.map((v, i) => {
    const x = (i / (k.spark.length - 1 || 1)) * w;
    const y = h - ((v - min) / ((max - min) || 1)) * h;
    return `${x},${y}`;
  }).join(' ');
  return (
    <div className="kpi">
      <div className="kpi-lbl">{k.k}</div>
      <div className="kpi-row">
        <div className="kpi-val tab-num">{k.v}</div>
        <div className="kpi-delta mono" style={{ color }}>{k.delta}</div>
      </div>
      <svg className="kpi-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} />
        <polyline points={`${pts} ${w},${h} 0,${h}`} fill={color} opacity={0.08} />
      </svg>
    </div>
  );
};
