import React from 'react';
import type { ReactNode } from 'react';

/**
 * WizardLayout (#431) — VARIANT (mode), KHÔNG phải layout độc lập. Stepper + content.
 * Render BÊN TRONG một band shell (vd Reception/đăng ký trong WorkstationLayout). Không tự bọc chrome.
 */
export interface WizardStep { key: string; label: string }

export const WizardLayout: React.FC<{
  steps: WizardStep[];
  current: number;
  children?: ReactNode;
  onStep?: (i: number) => void;
}> = ({ steps, current, children, onStep }) => (
  <div className="ab" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    <ol style={{ display: 'flex', gap: 8, listStyle: 'none', padding: 0, margin: 0, flexWrap: 'wrap' }}>
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li
            key={s.key}
            onClick={() => onStep?.(i)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, cursor: onStep ? 'pointer' : 'default',
              color: active ? 'var(--t-0)' : done ? 'var(--s-ok)' : 'var(--t-2)',
              fontSize: 13, fontWeight: active ? 700 : 500,
            }}
          >
            <span style={{
              width: 22, height: 22, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 12,
              background: active ? 'var(--a-cy)' : done ? 'var(--s-ok)' : 'var(--d-3)',
              color: active || done ? '#fff' : 'var(--t-2)',
            }}>{done ? '✓' : i + 1}</span>
            {s.label}
            {i < steps.length - 1 && <span style={{ color: 'var(--t-3)', marginLeft: 6 }}>›</span>}
          </li>
        );
      })}
    </ol>
    <div>{children}</div>
  </div>
);

export default WizardLayout;
