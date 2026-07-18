import React from 'react';

interface Props {
  history: string;
  setHistory: (v: string) => void;
  exam: string;
  setExam: (v: string) => void;
  expandAbbr: (s: string) => string;
}

export const HistoryExamSection: React.FC<Props> = ({ history, setHistory, exam, setExam, expandAbbr }) => (
  <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
    <div style={{ background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 'var(--r-3)', padding: 'var(--space-12)' }}>
      <h4 style={{ margin: '0 0 8px', fontSize: 11.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--t-2)' }}>Bệnh sử · Lý do khám</h4>
      <textarea value={history} onChange={(e) => setHistory(expandAbbr(e.target.value))} placeholder="Lý do đến khám, diễn biến bệnh… (gõ từ viết tắt + space để bung)" style={{ width: '100%', minHeight: 80, padding: 'var(--space-8)', border: '1px solid var(--line)', borderRadius: 4, fontSize: 'var(--fs-sm)', background: 'var(--d-0)', color: 'var(--t-0)' }} />
    </div>
    <div style={{ background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 'var(--r-3)', padding: 'var(--space-12)' }}>
      <h4 style={{ margin: '0 0 8px', fontSize: 11.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--t-2)' }}>Khám lâm sàng</h4>
      <textarea value={exam} onChange={(e) => setExam(expandAbbr(e.target.value))} placeholder="Toàn thân, tim, phổi, bụng…" style={{ width: '100%', minHeight: 80, padding: 'var(--space-8)', border: '1px solid var(--line)', borderRadius: 4, fontSize: 'var(--fs-sm)', background: 'var(--d-0)', color: 'var(--t-0)' }} />
    </div>
  </section>
);
