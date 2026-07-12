import React from 'react';

/* Auto-extracted from TerminalLayout.tsx (#376 split) — behavior-preserving verbatim move. */

/* ==========================================================================
   Ticker — LIVE badge + optional patient pill + scrolling realtime metrics
   ========================================================================== */

const TICKER_ITEMS: { label: string; val: string; unit?: string; cls?: 'up' | 'down' | 'warn' }[] = [
  { label: 'OPD',     val: '164', unit: 'BN',   cls: 'up' },
  { label: 'CẤP CỨU', val: '6',   unit: 'BN',   cls: 'warn' },
  { label: 'NỘI TRÚ', val: '34',  unit: 'BN' },
  { label: 'XN CHỜ',  val: '47' },
  { label: 'CĐHA',    val: '9' },
  { label: 'MỔ',      val: '7',   cls: 'up' },
  { label: 'GIƯỜNG',  val: '60%', cls: 'warn' },
  { label: 'BHYT',    val: '98.2%', cls: 'up' },
  { label: 'DOANH THU', val: '64M', unit: 'VNĐ' },
  { label: 'DƯỢC CHỜ', val: '3' },
  { label: 'HL7',     val: 'OK',  cls: 'up' },
  { label: 'PACS',    val: 'OK',  cls: 'up' },
];

type TickerPatient = {
  id: string;
  name: string;
  age: number;
  gender: 'M' | 'F';
};

const Ticker: React.FC<{ patient: TickerPatient | null; onClearPatient: () => void }> = ({ patient, onClearPatient }) => (
  <div className="his-ticker">
    <div className="his-ticker-head"><span className="dot" />LIVE · HIS</div>
    {patient && (
      <div className="his-patient-pill" title="Bệnh nhân đang chọn">
        <span className="tk">BN</span>
        <span className="nm">{patient.name}</span>
        <span className="id">{patient.id} · {patient.age}T · {patient.gender === 'M' ? 'Nam' : 'Nữ'}</span>
        <span className="x" onClick={(e) => { e.stopPropagation(); onClearPatient(); }} title="Bỏ chọn BN">×</span>
      </div>
    )}
    <div className="his-ticker-scroll">
      {[...TICKER_ITEMS, ...TICKER_ITEMS].map((t, i) => (
        <span key={i} className={'his-ticker-item ' + (t.cls || '')}>
          <span>{t.label}</span>
          <b>{t.val}{t.unit ? <span style={{ color: '#64748b', fontWeight: 400 }}> {t.unit}</span> : null}</b>
        </span>
      ))}
    </div>
  </div>
);

export { Ticker };
export type { TickerPatient };
