import React, { useEffect, useState } from 'react';
import api from '../../../services/apiClient';

/* Auto-extracted from TerminalLayout.tsx (#376 split) — behavior-preserving verbatim move. */

/* ==========================================================================
   Ticker — LIVE badge + optional patient pill + scrolling realtime metrics
   ========================================================================== */

type TickerItem = { label: string; val: string; unit?: string; cls?: 'up' | 'down' | 'warn' };

/** Shape trả về của GET /reception/opd-flow-stats (đã unwrap envelope bởi interceptor). */
type OpdFlowStats = {
  registered: number; waiting: number; inProgress: number;
  waitingCls: number; clsResultReady: number; completed: number; paid: number;
};

/**
 * Dải số liệu đầu màn hình gắn nhãn "LIVE" nên BẮT BUỘC là số thật.
 * Trước đây đây là mảng hằng số (OPD 164 BN · BHYT 98.2% · DOANH THU 64M…) hiển thị trên
 * MỌI màn v2, đá nhau với bảng dữ liệu ngay bên dưới — người dùng đối chiếu là thấy sai ngay.
 * Nay chỉ hiển thị các chỉ số lấy được từ API thật; chỉ số nào chưa có nguồn thì KHÔNG hiện
 * (thà thiếu còn hơn bịa). Thêm chỉ số mới => phải kèm endpoint có thật.
 */
const buildItems = (s: OpdFlowStats): TickerItem[] => [
  { label: 'TIẾP ĐÓN', val: String(s.registered ?? 0), unit: 'BN', cls: 'up' },
  { label: 'CHỜ KHÁM', val: String(s.waiting ?? 0), unit: 'BN', cls: (s.waiting ?? 0) > 0 ? 'warn' : undefined },
  { label: 'ĐANG KHÁM', val: String(s.inProgress ?? 0), unit: 'BN' },
  { label: 'CHỜ KQ CLS', val: String(s.waitingCls ?? 0) },
  { label: 'CÓ KQ CLS', val: String(s.clsResultReady ?? 0) },
  { label: 'KHÁM XONG', val: String(s.completed ?? 0), cls: 'up' },
  { label: 'ĐÃ THU', val: String(s.paid ?? 0) },
];

/** Số liệu tiếp đón trong ngày, tự làm mới mỗi 60s. Lỗi => trả mảng rỗng, KHÔNG giữ số cũ. */
const useLiveTickerItems = (): TickerItem[] => {
  const [items, setItems] = useState<TickerItem[]>([]);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await api.get<OpdFlowStats>('/reception/opd-flow-stats');
        if (alive && res.data) setItems(buildItems(res.data));
      } catch {
        if (alive) setItems([]); // không có số thật thì không hiện gì
      }
    };
    load();
    const t = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  return items;
};

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

const Ticker: React.FC<TickerProps> = ({ patient, onClearPatient, canBreakGlass, onBreakGlass, breakGlass }) => {
  const tickerItems = useLiveTickerItems();
  return (
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
      {[...tickerItems, ...tickerItems].map((t, i) => (
        <span key={i} className={'his-ticker-item ' + (t.cls || '')}>
          <span>{t.label}</span>
          <b>{t.val}{t.unit ? <span style={{ color: '#64748b', fontWeight: 400 }}> {t.unit}</span> : null}</b>
        </span>
      ))}
    </div>
  </div>
  );
};

export { Ticker };
export type { TickerPatient, BreakGlassActive };
