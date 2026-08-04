/* eslint-disable react-refresh/only-export-components -- RIS shared barrel intentionally includes the stable FormRow component. */
import React from 'react';
import dayjs from 'dayjs';
import * as risApi from '../api/ris';
import { type StatusTab } from '@/_v2kit';
import type { StatusKey } from './radiologyMappers';

export { MODALITIES, detectModality, statusKey } from './radiologyMappers';
export type { StatusKey } from './radiologyMappers';

export type ApiErr = { response?: { data?: { message?: string } } };

/** Mở phiếu kết quả CĐHA (PDF blob) ở tab mới. Throw nếu lỗi để caller xử lý. */
export const printResultBlob = async (resultId: string): Promise<void> => {
  const res = await risApi.printRadiologyResult(resultId);
  const url = URL.createObjectURL(res.data as Blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

/* ────────────────────────────────────────────────────────────
   RIS v2 — port of design-system-v2/his/project/RIS v2.html
   ──────────────────────────────────────────────────────────── */

export const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'scheduled', l: 'Đã lên lịch',  tone: 'info' },
  { v: 'imaging',   l: 'Đang chụp',    tone: 'warn' },
  { v: 'reading',   l: 'Chờ đọc phim', tone: 'warn' },
  { v: 'reported',  l: 'Đã đọc',       tone: 'ok' },
  { v: 'cancelled', l: 'Hủy',          tone: 'crit' },
];
export const statusTone = (s: StatusKey) => STATUS_TABS.find((t) => t.v === s)?.tone || 'info';

export const fmtHM = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
export const fmtDT = (iso?: string) => iso ? dayjs(iso).format('DD/MM HH:mm') : '—';

// ─────────────── Nhập kết quả CĐHA (enter → final-approve → in) ───────────────

export const FormRow: React.FC<{ label: string; extra?: React.ReactNode; children: React.ReactNode }> = ({ label, extra, children }) => (
  <div>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)', minHeight: 18 }}>
      <span style={{
        fontSize: 'var(--fs-xs)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
        letterSpacing: '0.05em', color: 'var(--t-2)',
      }}>{label}</span>
      {extra}
    </div>
    {children}
  </div>
);
