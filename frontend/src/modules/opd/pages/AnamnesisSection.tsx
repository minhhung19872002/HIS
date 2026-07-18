import React from 'react';
import { SEVERITY_LABEL } from './_shared';
import type { AllergyDto } from '../api/examination';

interface AnamnesisProps {
  allergies: AllergyDto[];
  pastHist: string;
  setPastHist: React.Dispatch<React.SetStateAction<string>>;
  familyHist: string;
  setFamilyHist: React.Dispatch<React.SetStateAction<string>>;
  allergyHist: string;
  setAllergyHist: React.Dispatch<React.SetStateAction<string>>;
  medHist: string;
  setMedHist: React.Dispatch<React.SetStateAction<string>>;
  expandAbbr: (s: string) => string;
}

export const AnamnesisSection: React.FC<AnamnesisProps> = ({
  allergies, pastHist, setPastHist, familyHist, setFamilyHist,
  allergyHist, setAllergyHist, medHist, setMedHist, expandAbbr,
}) => (
  <section style={{ background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 'var(--r-3)', padding: 'var(--space-12)' }}>
    <h4 style={{ margin: '0 0 8px', fontSize: 11.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--t-2)' }}>Tiền sử · Dị ứng</h4>
    {allergies.length > 0 && (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-6)', marginBottom: 'var(--space-8)' }}>
        {allergies.map((a) => (
          <span key={a.id} className="chip crit" title={a.reaction || ''}>
            ⚠ {a.allergenName}{SEVERITY_LABEL[a.severity] ? ` · ${SEVERITY_LABEL[a.severity]}` : ''}
          </span>
        ))}
      </div>
    )}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 'var(--space-8)' }}>
      <div>
        <label style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-2)' }}>Tiền sử bệnh bản thân</label>
        <textarea value={pastHist} onChange={(e) => setPastHist(expandAbbr(e.target.value))} placeholder="Bệnh nền, phẫu thuật cũ…" style={{ width: '100%', minHeight: 56, padding: 'var(--space-8)', border: '1px solid var(--line)', borderRadius: 4, fontSize: 'var(--fs-sm)', background: 'var(--d-0)', color: 'var(--t-0)' }} />
      </div>
      <div>
        <label style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-2)' }}>Tiền sử gia đình</label>
        <textarea value={familyHist} onChange={(e) => setFamilyHist(expandAbbr(e.target.value))} placeholder="Bệnh di truyền, dịch tễ gia đình…" style={{ width: '100%', minHeight: 56, padding: 'var(--space-8)', border: '1px solid var(--line)', borderRadius: 4, fontSize: 'var(--fs-sm)', background: 'var(--d-0)', color: 'var(--t-0)' }} />
      </div>
      <div>
        <label style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-2)' }}>Dị ứng (thuốc / thức ăn)</label>
        <textarea value={allergyHist} onChange={(e) => setAllergyHist(expandAbbr(e.target.value))} placeholder="Thuốc, thức ăn, tác nhân dị ứng…" style={{ width: '100%', minHeight: 56, padding: 'var(--space-8)', border: '1px solid var(--line)', borderRadius: 4, fontSize: 'var(--fs-sm)', background: 'var(--d-0)', color: 'var(--t-0)' }} />
      </div>
      <div>
        <label style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-2)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: 'var(--s-warn)', fontSize: 10 }}>⚠</span> Thuốc đang dùng
        </label>
        <textarea value={medHist} onChange={(e) => setMedHist(e.target.value)} placeholder="Liệt kê thuốc BN đang dùng (tên, liều, thời gian)…" style={{ width: '100%', minHeight: 56, padding: 'var(--space-8)', border: '1px solid var(--s-warn)', borderRadius: 4, fontSize: 'var(--fs-sm)', background: 'var(--d-0)', color: 'var(--t-0)' }} />
      </div>
    </div>
  </section>
);
