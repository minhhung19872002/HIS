import React from 'react';
import TermIcon from '../../layout/terminal/Icon';

// ─────────────────────────── Top tabs ───────────────────────────

export interface TopTab<T extends string> {
  v: T;
  l: string;
  ic?: string;
}

export function TopTabs<T extends string>({
  tab, setTab, tabs, actions,
}: {
  tab: T;
  setTab: (v: T) => void;
  tabs: TopTab<T>[];
  actions?: React.ReactNode;
}) {
  return (
    <div className="ab-toptabs">
      {tabs.map((t) => (
        <button key={t.v} className={tab === t.v ? 'on' : ''} onClick={() => setTab(t.v)} type="button">
          {t.ic && <TermIcon name={t.ic} size={13} />} {t.l}
        </button>
      ))}
      <span className="spacer" />
      {actions}
    </div>
  );
}
