import React, { useMemo } from 'react';
import { StatusBadge } from '../../../pages-v2/_v2kit';
import { VITAL_FIELDS, type Vitals } from './_shared';

interface VitalsSectionProps {
  vitals: Vitals;
  setVitals: React.Dispatch<React.SetStateAction<Vitals>>;
}

export const VitalsSection: React.FC<VitalsSectionProps> = ({ vitals, setVitals }) => {
  const bmi = vitals.weight && vitals.height ? (vitals.weight / ((vitals.height / 100) ** 2)) : null;
  const bmiStr = bmi ? bmi.toFixed(1) : '—';

  const news2 = useMemo(() => {
    const { respiratoryRate: rr, spO2, systolicBP: sbp, pulse, temperature: tmp } = vitals;
    const hasData = [rr, spO2, sbp, pulse, tmp].some((v) => v != null);
    if (!hasData) return null;
    let s = 0;
    if (rr != null) s += rr <= 8 ? 3 : rr <= 11 ? 1 : rr <= 20 ? 0 : rr <= 24 ? 2 : 3;
    if (spO2 != null) s += spO2 >= 96 ? 0 : spO2 >= 94 ? 1 : spO2 >= 92 ? 2 : 3;
    if (sbp != null) s += sbp <= 90 ? 3 : sbp <= 100 ? 2 : sbp <= 110 ? 1 : sbp <= 219 ? 0 : 3;
    if (pulse != null) s += pulse <= 40 ? 3 : pulse <= 50 ? 1 : pulse <= 90 ? 0 : pulse <= 110 ? 1 : pulse <= 130 ? 2 : 3;
    if (tmp != null) s += tmp <= 35.0 ? 3 : tmp <= 36.0 ? 1 : tmp <= 38.0 ? 0 : tmp <= 39.0 ? 1 : 2;
    return s;
  }, [vitals]);

  return (
    <section style={{ background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 'var(--r-3)', padding: 'var(--space-12)' }}>
      <h4 style={{ margin: '0 0 10px', fontSize: 11.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--t-2)' }}>Sinh hiệu</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 'var(--space-8)' }}>
        {VITAL_FIELDS.map((v) => (
          <div key={v.k}>
            <label style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-2)' }}>{v.l}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
              <input className="hui-inp mono" type="number" value={vitals[v.k] ?? ''} onChange={(e) => setVitals((s) => ({ ...s, [v.k]: e.target.value === '' ? undefined : +e.target.value }))} style={{ width: '100%', height: 28, fontSize: 'var(--fs-sm)' }} />
              <span style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-3)' }}>{v.unit}</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 'var(--space-8)', padding: 'var(--space-6)', background: 'var(--d-1)', borderRadius: 4, fontSize: 'var(--fs-xs)', fontFamily: 'var(--font-mono)', color: 'var(--t-2)', display: 'flex', alignItems: 'center', gap: 'var(--space-12)', flexWrap: 'wrap' }}>
        <span>BMI = <b style={{ color: bmi == null ? 'var(--t-2)' : bmi < 18.5 ? 'var(--s-info)' : bmi > 25 ? 'var(--s-crit)' : 'var(--s-ok)' }}>{bmiStr}</b>
          {bmi != null && <> ({bmi < 18.5 ? 'Gầy' : bmi > 25 ? 'Thừa cân' : 'Bình thường'})</>}
        </span>
        {news2 != null && (
          <span title="National Early Warning Score 2 — ≥7: nguy cấp, 5-6: cảnh báo, 3-4: chú ý, <3: bình thường">NEWS2 = <StatusBadge tone={news2 >= 7 ? 'crit' : news2 >= 5 ? 'warn' : news2 >= 3 ? 'info' : 'ok'}>{news2}</StatusBadge></span>
        )}
      </div>
    </section>
  );
};
