import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  getPendingRequests, getSubmittedRequests, getHistory, getSigningStats,
  approveSigningRequest, rejectSigningRequest, cancelSigningRequest, cancelSigningChain,
} from '../api/signingWorkflow';
import type { SigningRequestItem, SigningWorkflowStats } from '../api/signingWorkflow';
import {
  KpiStrip, TopTabs, DataTable, DrawerShell, DrSec, DrField, StatusBadge, Btn, Filter, Ico,
  tk, te, type ColumnDef, type TopTab,
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

// Danh sách vai trò ký chuẩn để hiển thị trong dropdown filter
const SIGNER_ROLE_OPTIONS = [
  { v: 'KTV',        l: 'KTV xét nghiệm' },
  { v: 'BacSi',      l: 'Bác sĩ' },
  { v: 'TruongKhoa', l: 'Trưởng khoa' },
  { v: 'GiamDoc',    l: 'Giám đốc / PGĐ' },
  { v: 'DieuDuong',  l: 'Điều dưỡng' },
  { v: 'Duoc',       l: 'Dược sĩ' },
];

// LƯU Ý: KHÔNG có form "tạo trình ký" standalone ở trang này — phiếu trình ký phải được
// tạo từ luồng module thật (EMR/đơn thuốc/phiếu KQ) với documentId + assignedToId thật.
// BE đã nhận SignerRole trong SubmitSigningRequestDto cho các caller đó.

const SigningWorkflowV2: React.FC = () => {
  const [tab, setTab] = useState<Tab>('pending');
  const [items, setItems] = useState<SigningRequestItem[]>([]);
  const [stats, setStats] = useState<SigningWorkflowStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<SigningRequestItem | null>(null);
  const [fSignerRole, setFSignerRole] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const fn = tab === 'pending' ? getPendingRequests
        : tab === 'submitted' ? getSubmittedRequests
        : getHistory;
      const params = fSignerRole ? { signerRole: fSignerRole } : undefined;
      const list = await fn(params);
      setItems(Array.isArray(list) ? list : []);
      const s = await getSigningStats().catch(() => null);
      setStats(s);
    } catch { setItems([]); }
    finally { setLoading(false); }
  }, [tab, fSignerRole]);
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
      render: (r) => (
        <div>
          <div>{r.assignedToName}</div>
          {r.signerRole && (
            <div style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-2)' }}>
              {SIGNER_ROLE_OPTIONS.find((o) => o.v === r.signerRole)?.l || r.signerRole}
            </div>
          )}
        </div>
      ) },
    { key: 'stepOrder',     label: 'Cấp', mono: true,
      render: (r) => (r.chainId ? `${r.stepOrder}/${r.totalSteps}` : '—') },
    { key: 'createdAt',     label: 'Ngày tạo', mono: true,
      render: (r) => dayjs(r.createdAt).format('DD/MM HH:mm') },
    { key: 'status',        label: 'Trạng thái',
      render: (r) => {
        const m = STATUS_LABEL[r.status] || { label: r.statusText, tone: 'info' as const };
        return <StatusBadge tone={m.tone}>{m.label}</StatusBadge>;
      } },
  ];

  const doApprove = async (id: string) => {
    const r = await approveSigningRequest(id);
    if (r) { tk('Đã ký duyệt'); setDetail(null); void load(); }
    else te('Không thể ký duyệt');
  };
  const doReject = async (id: string) => {
    const reason = window.prompt('Lý do từ chối:');
    if (!reason || !reason.trim()) return;
    const r = await rejectSigningRequest(id, reason.trim());
    if (r) { tk('Đã từ chối yêu cầu'); setDetail(null); void load(); }
    else te('Không thể từ chối');
  };
  const doCancel = async (item: SigningRequestItem) => {
    if (!window.confirm(item.chainId ? 'Hủy cả chuỗi trình ký của tài liệu này?' : 'Hủy yêu cầu trình ký?')) return;
    const ok = item.chainId ? await cancelSigningChain(item.chainId) : await cancelSigningRequest(item.id);
    if (ok) { tk('Đã hủy'); setDetail(null); void load(); }
    else te('Không thể hủy');
  };

  return (
    <div className="ab">
      <KpiStrip items={kpis} />

      <div className="ab-tools">
        <TopTabs tab={tab} setTab={setTab} tabs={TABS} />
        <Filter
          value={fSignerRole}
          onChange={(v) => setFSignerRole(v)}
          options={SIGNER_ROLE_OPTIONS}
          placeholder="▾ Vai trò người ký"
        />
        {fSignerRole && (
          <Btn variant="ghost" onClick={() => setFSignerRole('')}>
            <Ico name="x" size={12} /> Bỏ lọc
          </Btn>
        )}
        <span className="spacer" />
        <Btn variant="ghost" onClick={load}>Làm mới</Btn>
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
              {detail.chainId && (
                <DrField lbl="Cấp ký">
                  Cấp {detail.stepOrder}/{detail.totalSteps} (chuỗi ký tuần tự — cấp sau chỉ thấy khi cấp trước đã ký)
                </DrField>
              )}
              <DrField lbl="Người gửi">{detail.submittedByName}</DrField>
              <DrField lbl="Người ký">
                {detail.assignedToName}
                {detail.signerRole && (
                  <span style={{ marginLeft: 6, fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>
                    ({SIGNER_ROLE_OPTIONS.find((o) => o.v === detail.signerRole)?.l || detail.signerRole})
                  </span>
                )}
              </DrField>
              {detail.signerRole && (
                <DrField lbl="Vai trò ký">
                  {SIGNER_ROLE_OPTIONS.find((o) => o.v === detail.signerRole)?.l || detail.signerRole}
                </DrField>
              )}
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
            {detail.documentContent && (
              <DrSec title="Nội dung tài liệu (snapshot lúc trình)">
                <div
                  style={{ maxHeight: 420, overflow: 'auto', background: 'var(--d-2)', color: '#111', borderRadius: 'var(--r-2)', padding: 10, fontSize: 'var(--fs-sm)' }}
                  // Snapshot HTML do chính PrintTemplateRenderer nội bộ sinh ra (không phải input người dùng tự do)
                  dangerouslySetInnerHTML={{ __html: detail.documentContent }}
                />
              </DrSec>
            )}
            <div style={{ display: 'flex', gap: 8, padding: '12px 0', justifyContent: 'flex-end' }}>
              {tab === 'pending' && detail.status === 0 && (
                <>
                  <Btn variant="ghost" onClick={() => void doReject(detail.id)}><Ico name="x" size={12} /> Từ chối</Btn>
                  <Btn variant="primary" onClick={() => void doApprove(detail.id)}><Ico name="check" size={12} /> Ký duyệt</Btn>
                </>
              )}
              {tab === 'submitted' && (detail.status === 0 || detail.status === 4) && (
                <Btn variant="ghost" onClick={() => void doCancel(detail)}><Ico name="x" size={12} /> Hủy trình ký</Btn>
              )}
            </div>
          </>
        )}
      </DrawerShell>

    </div>
  );
};

export default SigningWorkflowV2;
