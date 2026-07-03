// TEMPLATE — HIS v2 page using SimpleV2Page. Copy into frontend/src/pages-v2/<Name>.tsx
// Replace: XName, getXList/XDto, columns, status, KPI, drawer. Delete comments when done.
import React from 'react';
import dayjs from 'dayjs';
import { getXList } from '../api/xmodule';           // ← create it first with skill his-fe-api-client
import type { XDto } from '../api/xmodule';
import { SimpleV2Page, StatusBadge, type ColumnDef, type StatusTab } from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';

// 1) Status tabs (filter the current data) — tone only: ok | info | warn | crit
type StatusKey = 'active' | 'pending' | 'done' | 'cancelled';
const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'active',    l: 'In progress', tone: 'ok' },
  { v: 'pending',   l: 'Pending',     tone: 'warn' },
  { v: 'done',      l: 'Done',        tone: 'info' },
  { v: 'cancelled', l: 'Cancelled',   tone: 'crit' },
];
// Map row → tab key. Note HIS has both int status (NangCap<=23) and string (NangCap24).
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
      key: 'name', label: 'Name / Code',
      render: (r) => (
        <div className="cell-2l"><b>{r.name}</b><i className="mono">{r.code}</i></div>
      ),
    },
    { key: 'date', label: 'Date', mono: true, width: 110, render: (r) => fmtDMY(r.createdAt) },
    {
      key: 'status', label: 'Status', width: 130,
      render: (r) => {
        const sk = statusKey(r.status);
        const t = STATUS_TABS.find((x) => x.v === sk);
        return <StatusBadge tone={t?.tone} dot>{t?.l}</StatusBadge>;
      },
    },
  ];

  return (
    <SimpleV2Page<XDto>
      title="Screen name"
      // API returns paged → .items ; returns a plain array → drop .items. Defensive if unsure.
      load={async () => {
        const b: any = await getXList({ pageSize: 200 });
        return Array.isArray(b) ? b : (b?.items ?? []);
      }}
      rowKey={(r) => r.id}
      columns={columns}
      searchPlaceholder="Search name / code…"
      searchOf={(r) => `${r.name} ${r.code}`}
      statusTabs={STATUS_TABS as unknown as StatusTab<string>[]}
      statusOf={(r) => statusKey(r.status)}
      kpis={(rows) => [
        { lbl: 'Total', val: rows.length, sub: 'all' },
        { lbl: 'Pending', val: rows.filter((r) => statusKey(r.status) === 'pending').length, tone: 'warn' },
        { lbl: 'Done', val: rows.filter((r) => statusKey(r.status) === 'done').length, tone: 'info' },
        { lbl: 'Cancelled', val: rows.filter((r) => statusKey(r.status) === 'cancelled').length, tone: 'crit' },
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
      <h5><TermIcon name="info" size={11} /> INFO</h5>
      <div className="rec-kv">
        <span>Name</span><b>{r.name}</b>
        <span>Code</span><span className="mono">{r.code}</span>
        <span>Date</span><span>{fmtDMY(r.createdAt)}</span>
      </div>
    </div>
  </>
);

export default XNameV2;

/* ───── Register after creating the file ─────
App.tsx:
  const XNameV2 = lazy(() => import('./pages-v2/XName'));
  <Route path="x-name" element={<XNameV2 />} />     // under the /v2 block
TerminalLayout.tsx (the right items group):
  { id: 'x-name', path: '/v2/x-name', label: 'Screen name' },
Verify: npm run build (tsc -b + vite) — 0 errors.
*/
