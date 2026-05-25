// TEMPLATE — HIS v2 page dùng SimpleV2Page. Copy vào frontend/src/pages-v2/<Name>.tsx
// Thay: XName, getXList/XDto, cột, status, KPI, drawer. Xoá comment khi xong.
import React from 'react';
import dayjs from 'dayjs';
import { getXList } from '../api/xmodule';           // ← tạo trước bằng skill his-fe-api-client
import type { XDto } from '../api/xmodule';
import { SimpleV2Page, StatusBadge, type ColumnDef, type StatusTab } from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';

// 1) Status tabs (lọc data hiện tại) — tone chỉ: ok | info | warn | crit
type StatusKey = 'active' | 'pending' | 'done' | 'cancelled';
const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'active',    l: 'Đang xử lý', tone: 'ok' },
  { v: 'pending',   l: 'Chờ',        tone: 'warn' },
  { v: 'done',      l: 'Hoàn tất',   tone: 'info' },
  { v: 'cancelled', l: 'Đã huỷ',     tone: 'crit' },
];
// Map row → tab key. Lưu ý HIS có cả status int (NangCap<=23) lẫn string (NangCap24).
const statusKey = (s: number | string): StatusKey => {
  const v = String(s);
  if (v === '1' || v === 'pending')   return 'pending';
  if (v === '2' || v === 'done')      return 'done';
  if (v === '4' || v === 'cancelled') return 'cancelled';
  return 'active';
};
const fmtDMY = (iso?: string) => (iso ? dayjs(iso).format('DD/MM/YYYY') : '—');

const XNameV2: React.FC = () => {
  const columns: ColumnDef<XDto>[] = [
    {
      key: 'name', label: 'Tên / Mã',
      render: (r) => (
        <div className="cell-2l"><b>{r.name}</b><i className="mono">{r.code}</i></div>
      ),
    },
    { key: 'date', label: 'Ngày', mono: true, width: 110, render: (r) => fmtDMY(r.createdAt) },
    {
      key: 'status', label: 'TT', width: 130,
      render: (r) => {
        const sk = statusKey(r.status);
        const t = STATUS_TABS.find((x) => x.v === sk);
        return <StatusBadge tone={t?.tone} dot>{t?.l}</StatusBadge>;
      },
    },
  ];

  return (
    <SimpleV2Page<XDto>
      title="Tên màn hình"
      // API trả paged → .items ; trả mảng thuần → bỏ .items. Defensive nếu không chắc.
      load={async () => {
        const b: any = await getXList({ pageSize: 200 });
        return Array.isArray(b) ? b : (b?.items ?? []);
      }}
      rowKey={(r) => r.id}
      columns={columns}
      searchPlaceholder="Tìm tên / mã…"
      searchOf={(r) => `${r.name} ${r.code}`}
      statusTabs={STATUS_TABS as unknown as StatusTab<string>[]}
      statusOf={(r) => statusKey(r.status)}
      kpis={(rows) => [
        { lbl: 'Tổng', val: rows.length, sub: 'tất cả' },
        { lbl: 'Chờ', val: rows.filter((r) => statusKey(r.status) === 'pending').length, tone: 'warn' },
        { lbl: 'Hoàn tất', val: rows.filter((r) => statusKey(r.status) === 'done').length, tone: 'info' },
        { lbl: 'Đã huỷ', val: rows.filter((r) => statusKey(r.status) === 'cancelled').length, tone: 'crit' },
      ]}
      drawer={(r) => <XDrawerBody r={r} />}
      drawerTitle={(r) => <span style={{ fontSize: 14 }}>{r.name}</span>}
      drawerSub={(r) => `${r.code} · ${fmtDMY(r.createdAt)}`}
    />
  );
};

const XDrawerBody: React.FC<{ r: XDto }> = ({ r }) => (
  <>
    <div className="rec-section">
      <h5><TermIcon name="info" size={11} /> THÔNG TIN</h5>
      <div className="rec-kv">
        <span>Tên</span><b>{r.name}</b>
        <span>Mã</span><span className="mono">{r.code}</span>
        <span>Ngày</span><span>{fmtDMY(r.createdAt)}</span>
      </div>
    </div>
  </>
);

export default XNameV2;

/* ───── Đăng ký sau khi tạo file ─────
App.tsx:
  const XNameV2 = lazy(() => import('./pages-v2/XName'));
  <Route path="x-name" element={<XNameV2 />} />     // dưới khối /v2
TerminalLayout.tsx (đúng nhóm items):
  { id: 'x-name', path: '/v2/x-name', label: 'Tên màn hình' },
Verify: npm run build (tsc -b + vite) — 0 lỗi.
*/
