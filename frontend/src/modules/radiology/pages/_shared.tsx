import React from 'react';
import dayjs from 'dayjs';
import * as risApi from '../api/ris';
import type { RadiologyOrderItemDto } from '../api/ris';
import { type StatusTab } from '../../../pages-v2/_v2kit';

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

export type StatusKey = 'scheduled' | 'imaging' | 'reading' | 'reported' | 'cancelled';

export const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'scheduled', l: 'Đã lên lịch',  tone: 'info' },
  { v: 'imaging',   l: 'Đang chụp',    tone: 'warn' },
  { v: 'reading',   l: 'Chờ đọc phim', tone: 'warn' },
  { v: 'reported',  l: 'Đã đọc',       tone: 'ok' },
  { v: 'cancelled', l: 'Hủy',          tone: 'crit' },
];

export const MODALITIES: { v: string; l: string; color: string }[] = [
  { v: 'XR',  l: 'X-Quang',       color: '#0891b2' },
  { v: 'CT',  l: 'CT-Scanner',    color: 'var(--s-mag)' },
  { v: 'MRI', l: 'Cộng hưởng từ', color: '#db2777' },
  { v: 'US',  l: 'Siêu âm',       color: 'var(--s-ok)' },
  { v: 'MAM', l: 'Nhũ ảnh',       color: '#ea580c' },
];

export const detectModality = (item?: RadiologyOrderItemDto): { v: string; color: string } => {
  const t = (item?.serviceType || item?.serviceCode || '').toUpperCase();
  if (t.includes('CT'))   return { v: 'CT',  color: 'var(--s-mag)' };
  if (t.includes('MRI'))  return { v: 'MRI', color: '#db2777' };
  if (t.includes('US') || t.includes('SIEU') || t.includes('SIÊU')) return { v: 'US', color: 'var(--s-ok)' };
  if (t.includes('MAM')) return { v: 'MAM', color: '#ea580c' };
  return { v: 'XR', color: '#0891b2' };
};

export const statusKey = (s: string): StatusKey => {
  const x = (s || '').toLowerCase();
  if (x.includes('cancel') || x.includes('hủy')) return 'cancelled';
  if (x.includes('read') || x.includes('xong') || x.includes('approve') || x.includes('duyệt') || x.includes('reported')) return 'reported';
  if (x.includes('reading') || x.includes('chờ đọc')) return 'reading';
  if (x.includes('imaging') || x.includes('progress') || x.includes('chạy') || x.includes('đang')) return 'imaging';
  return 'scheduled';
};
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
