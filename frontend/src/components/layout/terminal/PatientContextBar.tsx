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

type BreakGlassActive = {
  sessionId: string;
  patientId: string;
  expireAt: Date;
};

type TickerProps = {
  patient: TickerPatient | null;
  onClearPatient: () => void;
  /** #385: hiển thị nút break-glass khi bác sĩ đang chọn BN */
  canBreakGlass?: boolean;
  onBreakGlass?: () => void;
  breakGlass?: BreakGlassActive | null;
};

const Ticker: React.FC<TickerProps> = ({ patient, onClearPatient, canBreakGlass, onBreakGlass, breakGlass }) => (
  <div className="his-ticker">
    <div className="his-ticker-head"><span className="dot" />LIVE · HIS</div>
    {patient && (
      <div className="his-patient-pill" title="Bệnh nhân đang chọn">
        <span className="tk">BN</span>
        <span className="nm">{patient.name}</span>
        <span className="id">{patient.id} · {patient.age}T · {patient.gender === 'M' ? 'Nam' : 'Nữ'}</span>
        {canBreakGlass && onBreakGlass && !breakGlass && (
          <span
            className="bg-btn"
            onClick={(e) => { e.stopPropagation(); onBreakGlass(); }}
            title="Break-glass: yêu cầu truy cập khẩn cấp hồ sơ BN"
            style={{ marginLeft: 6, padding: '0 6px', fontSize: 11, color: '#ef4444', cursor: 'pointer', fontWeight: 700, border: '1px solid #ef4444', borderRadius: 3 }}
          >
            ⚠ BG
          </span>
        )}
        <span className="x" onClick={(e) => { e.stopPropagation(); onClearPatient(); }} title="Bỏ chọn BN">×</span>
      </div>
    )}
    {breakGlass && (
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px',
          background: '#ef4444', color: '#fff', fontWeight: 700, fontSize: 11,
          letterSpacing: '0.05em', flexShrink: 0,
        }}
        title={`Break-glass session ${breakGlass.sessionId}`}
      >
        ⚠ BREAK-GLASS ACTIVE — Hết lúc {breakGlass.expireAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
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
export type { TickerPatient, BreakGlassActive };
