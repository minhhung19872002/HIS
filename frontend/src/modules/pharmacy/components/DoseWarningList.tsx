/** Renders dose-range warnings (QA round 3) — shared by the OPD prescription editor and the inpatient Rx modal. */
import React from 'react';
import { StatusBadge } from '@/_v2kit';
import type { DoseWarningDto } from '../api/doseRange';

const label = (s: number) => (s >= 3 ? 'Quá liều nặng' : s === 2 ? 'Ngoài ngưỡng' : 'Chưa kiểm được');
const tone = (s: number): 'crit' | 'warn' | 'info' => (s >= 3 ? 'crit' : s === 2 ? 'warn' : 'info');

const DoseWarningList: React.FC<{ warnings: DoseWarningDto[]; style?: React.CSSProperties }> = ({ warnings, style }) => {
  if (warnings.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)', ...style }} data-testid="dose-warning-list">
      {warnings.map((w, i) => (
        <div key={`${w.medicineId}-${w.warningType}-${i}`} style={{
          padding: 'var(--space-10)', borderRadius: 'var(--r-3)',
          background: w.severity >= 3 ? 'var(--s-crit-bg)' : 'var(--d-0)',
          border: `1px solid ${w.severity >= 3 ? 'var(--s-crit-bd)' : 'var(--line)'}`,
          borderLeft: `3px solid ${w.severity >= 3 ? 'var(--s-crit)' : w.severity === 2 ? 'var(--s-warn)' : 'var(--a-cy)'}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-8)', marginBottom: 'var(--space-4)' }}>
            <span style={{ fontWeight: 700, fontSize: 'var(--fs-sm)' }}>Liều · {w.medicineName}</span>
            <StatusBadge tone={tone(w.severity)}>{label(w.severity)}</StatusBadge>
          </div>
          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-1)' }}>{w.message}</div>
          {w.recommendation && <div style={{ fontSize: 11.5, color: 'var(--t-2)', marginTop: 'var(--space-4)' }}>Khuyến nghị: {w.recommendation}</div>}
        </div>
      ))}
    </div>
  );
};

export default DoseWarningList;
