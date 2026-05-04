import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  getPendingRequests, getSubmittedRequests, getHistory, getSigningStats,
} from '../api/signingWorkflow';
import type { SigningRequestItem, SigningWorkflowStats } from '../api/signingWorkflow';
import {
  KpiStrip, TopTabs, DataTable, DrawerShell, DrSec, DrField, StatusBadge,
  type ColumnDef, type TopTab,
} from './_v2kit';

type Tab = 'pending' | 'submitted' | 'history';
const TABS: TopTab<Tab>[] = [
  { v: 'pending',   l: 'Chờ tôi ký',  ic: 'clock' },
  { v: 'submitted', l: 'Tôi đã gửi',  ic: 'send' },
  { v: 'history',   l: 'Lịch sử',     ic: 'archive' },
];

const STATUS_LABEL: Record<number, { label: string; tone: 'warn' | 'ok' | 'crit' | 'info' }> = {
  0: { label: 'Chờ ký',   tone: 'warn' },
  1: { label: 'Đã duyệt', tone: 'ok' },
  2: { label: 'Từ chối',  tone: 'crit' },
  3: { label: 'Hủy',      tone: 'info' },
};

const SigningWorkflowV2: React.FC = () => {
  const [tab, setTab] = useState<Tab>('pending');
  const [items, setItems] = useState<SigningRequestItem[]>([]);
  const [stats, setStats] = useState<SigningWorkflowStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<SigningRequestItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const fn = tab === 'pending' ? getPendingRequests
        : tab === 'submitted' ? getSubmittedRequests
        : getHistory;
      const list = await fn();
      setItems(Array.isArray(list) ? list : []);
      const s = await getSigningStats().catch(() => null);
      setStats(s);
    } catch { setItems([]); }
    finally { setLoading(false); }
  }, [tab]);
  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => ({
    pending: items.filter((i) => i.status === 0).length,
    approved: items.filter((i) => i.status === 1).length,
    rejected: items.filter((i) => i.status === 2).length,
  }), [items]);

  const kpis = useMemo(() => [
    { lbl: 'Trên trang', val: items.length },
    { lbl: 'Chờ ký',     val: counts.pending,  tone: 'warn' as const },
    { lbl: 'Đã duyệt',   val: counts.approved, tone: 'ok' as const },
    { lbl: 'Từ chối',    val: counts.rejected, tone: 'crit' as const },
    { lbl: 'Hôm nay gửi', val: stats?.todaySubmitted ?? 0, tone: 'info' as const },
    { lbl: 'Hôm nay ký', val: stats?.todayApproved ?? 0, tone: 'ok' as const },
  ], [items, counts, stats]);

  const columns: ColumnDef<SigningRequestItem>[] = [
    { key: 'documentType',  label: 'Loại',
      render: (r) => r.documentType },
    { key: 'documentTitle', label: 'Tiêu đề',
      render: (r) => r.documentTitle },
    { key: 'patientName',   label: 'Bệnh nhân',
      render: (r) => r.patientName || '—' },
    { key: 'submittedByName', label: 'Người gửi',
      render: (r) => r.submittedByName },
    { key: 'assignedToName',  label: 'Người ký',
      render: (r) => r.assignedToName },
    { key: 'createdAt',     label: 'Ngày tạo', mono: true,
      render: (r) => dayjs(r.createdAt).format('DD/MM HH:mm') },
    { key: 'status',        label: 'Trạng thái',
      render: (r) => {
        const m = STATUS_LABEL[r.status] || { label: r.statusText, tone: 'info' as const };
        return <StatusBadge tone={m.tone}>{m.label}</StatusBadge>;
      } },
  ];

  return (
    <div className="ab">
      <KpiStrip items={kpis} />

      <div className="ab-tools">
        <TopTabs tab={tab} setTab={setTab} tabs={TABS} />
        <span className="spacer" />
        <button type="button" className="ab-btn ghost" onClick={load}>Làm mới</button>
      </div>

      <DataTable<SigningRequestItem>
        columns={columns}
        data={items}
        rowKey={(r) => r.id}
        onRowClick={(r) => setDetail(r)}
        empty={loading ? 'Đang tải…' : 'Không có yêu cầu'}
      />

      <DrawerShell
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.documentTitle || ''}
        sub={detail ? `${detail.documentType} · ${dayjs(detail.createdAt).format('DD/MM/YYYY HH:mm')}` : ''}
        size="lg"
      >
        {detail && (
          <>
            <DrSec title="Tài liệu">
              <DrField lbl="Loại">{detail.documentType}</DrField>
              <DrField lbl="Tiêu đề">{detail.documentTitle}</DrField>
              {detail.patientName && <DrField lbl="Bệnh nhân">{detail.patientName}</DrField>}
              {detail.departmentName && <DrField lbl="Khoa">{detail.departmentName}</DrField>}
            </DrSec>
            <DrSec title="Quy trình">
              <DrField lbl="Người gửi">{detail.submittedByName}</DrField>
              <DrField lbl="Người ký">{detail.assignedToName}</DrField>
              <DrField lbl="Ngày tạo">{dayjs(detail.createdAt).format('DD/MM/YYYY HH:mm')}</DrField>
              {detail.signedAt && (
                <DrField lbl="Ngày ký">{dayjs(detail.signedAt).format('DD/MM/YYYY HH:mm')}</DrField>
              )}
              <DrField lbl="Trạng thái">
                {STATUS_LABEL[detail.status]?.label || detail.statusText || '—'}
              </DrField>
              {detail.rejectReason && (
                <DrField lbl="Lý do từ chối">
                  <span style={{ color: 'var(--s-crit)' }}>{detail.rejectReason}</span>
                </DrField>
              )}
            </DrSec>
          </>
        )}
      </DrawerShell>
    </div>
  );
};

export default SigningWorkflowV2;
