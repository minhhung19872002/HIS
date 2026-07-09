import React from 'react';

// ─────────────────────────── KPI strip ───────────────────────────

export type KpiTone = 'ok' | 'info' | 'warn' | 'crit' | undefined;

export interface KpiItem {
  lbl: string;
  val: number | string;
  unit?: string;
  sub?: string;
  tone?: KpiTone;
}

export const KpiStrip: React.FC<{ items: KpiItem[] }> = ({ items }) => (
  <div className="ab-kpis">
    {items.map((k, i) => (
      <div key={i} className={`ab-kpi ${k.tone ?? ''}`}>
        <div className="lbl">{k.lbl}</div>
        <div className="val">
          {k.val}
          {k.unit && <small style={{ fontSize: 'var(--fs-md)', color: 'var(--t-2)', marginLeft: 'var(--space-3)' }}>{k.unit}</small>}
        </div>
        {k.sub && <div className="sub">{k.sub}</div>}
      </div>
    ))}
  </div>
);
