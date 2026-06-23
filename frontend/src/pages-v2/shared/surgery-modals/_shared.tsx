/**
 * surgery-modals/_shared.tsx
 * Shared layout helpers and option constants used by ≥2 surgery-modal files.
 */

import React from 'react';

// ---------------------------------------------------------------------------
// Local layout helpers
// ---------------------------------------------------------------------------

export const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ marginBottom: 'var(--space-14)' }}>
    <div style={{
      fontSize: 10.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
      color: 'var(--t-2)', marginBottom: 'var(--space-8)', letterSpacing: '.05em',
    }}>{title}</div>
    {children}
  </div>
);

export const Row2: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', alignItems: 'start', gap: 'var(--space-8)', marginBottom: 'var(--space-6)' }}>
    <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', paddingTop: 5 }}>{label}</span>
    <div>{children}</div>
  </div>
);

// ---------------------------------------------------------------------------
// Shared option constants
// ---------------------------------------------------------------------------

export const ASA_OPTIONS = [
  { value: 1, label: 'ASA I — bình thường' },
  { value: 2, label: 'ASA II — bệnh lý nhẹ' },
  { value: 3, label: 'ASA III — bệnh lý nặng' },
  { value: 4, label: 'ASA IV — đe doạ tính mạng' },
  { value: 5, label: 'ASA V — hấp hối' },
];

export const MALLAMPATI_OPTIONS = [
  { value: 1, label: 'Mallampati I — nhìn thấy toàn bộ' },
  { value: 2, label: 'Mallampati II — nhìn thấy phần lớn' },
  { value: 3, label: 'Mallampati III — chỉ thấy đáy lưỡi' },
  { value: 4, label: 'Mallampati IV — không nhìn thấy' },
];

export const ANESTHESIA_TYPE_OPTIONS = [
  { value: 'Gây mê toàn thân', label: 'Gây mê toàn thân' },
  { value: 'Gây tê tủy sống', label: 'Gây tê tủy sống' },
  { value: 'Gây tê ngoài màng cứng', label: 'Gây tê ngoài màng cứng' },
  { value: 'Gây tê đám rối thần kinh', label: 'Gây tê đám rối thần kinh' },
  { value: 'Gây tê tại chỗ', label: 'Gây tê tại chỗ' },
  { value: 'Không vô cảm', label: 'Không vô cảm' },
];
