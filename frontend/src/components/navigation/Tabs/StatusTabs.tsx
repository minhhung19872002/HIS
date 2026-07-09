// ───────────────────────── Status sub-tabs ─────────────────────────

export type StatusTone = 'ok' | 'info' | 'warn' | 'crit';

export interface StatusTab<T extends string> {
  v: T;
  l: string;
  tone: StatusTone;
}

export function StatusTabs<T extends string>({
  value, onChange, tabs, counts,
}: {
  value: T | 'all';
  onChange: (v: T | 'all') => void;
  tabs: StatusTab<T>[];
  counts: Record<string, number>;
}) {
  return (
    <div className="ab-stab">
      <button type="button" className={value === 'all' ? 'on' : ''} onClick={() => onChange('all')}>
        Tất cả <i>{counts.all || 0}</i>
      </button>
      {tabs.map((s) => (
        <button key={s.v} type="button" className={value === s.v ? 'on' : ''} onClick={() => onChange(s.v)}>
          <span className={`ab-dot ${s.tone}`} /> {s.l} <i>{counts[s.v] || 0}</i>
        </button>
      ))}
    </div>
  );
}
