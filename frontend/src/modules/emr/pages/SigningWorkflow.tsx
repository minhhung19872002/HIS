import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  getPendingRequests, getSubmittedRequests, getHistory, getSigningStats,
  approveSigningRequest, rejectSigningRequest, cancelSigningRequest, cancelSigningChain,
} from '../api/signingWorkflow';
import type { SigningRequestItem, SigningWorkflowStats } from '../api/signingWorkflow';
import {
  KpiStrip, TopTabs, DataTable, DrawerShell, DrSec, DrField, StatusBadge, Btn, Filter, SearchBox, Ico,
  tk, te, tw, cf, type ColumnDef, type TopTab,
} from '@/_v2kit';
import { useDebounce } from '../../../hooks';
import { RefreshButton } from '../../../components/actions';
import { useTabState } from '../../../hooks/useTabState';

type Tab = 'pending' | 'submitted' | 'history' | 'stats';
const TABS: TopTab<Tab>[] = [
  { v: 'pending',   l: 'Chờ tôi ký',  ic: 'clock' },
  { v: 'submitted', l: 'Tôi đã gửi',  ic: 'send' },
  { v: 'history',   l: 'Lịch sử',     ic: 'archive' },
  { v: 'stats',     l: 'Thống kê',    ic: 'chart' },
];

// Ngưỡng cảnh báo tuổi yêu cầu chờ ký (v1 verbatim): >48h = quá hạn, >24h = sắp quá hạn
const OVERDUE_MS = 48 * 60 * 60 * 1000;
const WARNING_MS = 24 * 60 * 60 * 1000;

const STATUS_LABEL: Record<number, { label: string; tone: 'warn' | 'ok' | 'crit' | 'info' }> = {
  0: { label: 'Chờ ký',   tone: 'warn' },
  1: { label: 'Đã duyệt', tone: 'ok' },
  2: { label: 'Từ chối',  tone: 'crit' },
  3: { label: 'Hủy',      tone: 'info' },
};

// #421: loại tài liệu chuẩn (labels đồng bộ v1 DOCUMENT_TYPE_LABELS) — backend filter DocumentType
const DOC_TYPE_OPTIONS = [
  { v: 'TreatmentSheet',   l: 'Phiếu điều trị' },
  { v: 'NursingCare',      l: 'Phiếu chăm sóc' },
  { v: 'Prescription',     l: 'Đơn thuốc' },
  { v: 'LabReport',        l: 'Kết quả XN' },
  { v: 'RadiologyReport',  l: 'Kết quả CĐHA' },
  { v: 'DischargeSummary', l: 'Giấy ra viện' },
  { v: 'SurgeryRecord',    l: 'Phiếu phẫu thuật' },
  { v: 'Consultation',     l: 'Biên bản hội chẩn' },
  { v: 'MedicalRecord',    l: 'Hồ sơ bệnh án' },
  { v: 'Other',            l: 'Khác' },
];

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
  const [tab, setTab] = useTabState<Tab>('pending');
  const [items, setItems] = useState<SigningRequestItem[]>([]);
  const [stats, setStats] = useState<SigningWorkflowStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<SigningRequestItem | null>(null);
  const [fSignerRole, setFSignerRole] = useState('');
  // #421: search keyword + filter documentType (server-side — SigningRequestSearchDto sẵn hỗ trợ)
  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebounce(keyword, 400);
  const [fDocType, setFDocType] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchApproving, setBatchApproving] = useState(false);
  const [approving, setApproving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab !== 'stats') {
        const fn = tab === 'pending' ? getPendingRequests
          : tab === 'submitted' ? getSubmittedRequests
          : getHistory;
        const params: Record<string, unknown> = {};
        if (fSignerRole) params.signerRole = fSignerRole;
        if (fDocType) params.documentType = fDocType;
        if (debouncedKeyword.trim()) params.keyword = debouncedKeyword.trim();
        const list = await fn(Object.keys(params).length ? params : undefined);
        setItems(Array.isArray(list) ? list : []);
      }
      const s = await getSigningStats().catch(() => null);
      setStats(s);
    } catch { tw('Không tải được danh sách yêu cầu trình ký'); setItems([]); }
    finally { setLoading(false); }
  }, [tab, fSignerRole, fDocType, debouncedKeyword]);
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

  // Tab Thống kê: số liệu toàn hệ thống từ /signing-workflow/stats (v1 tab "Thống kê")
  const statKpis = useMemo(() => [
    { lbl: 'Chờ duyệt',     val: stats?.pendingCount ?? 0,   tone: 'info' as const },
    { lbl: 'Đã duyệt',      val: stats?.approvedCount ?? 0,  tone: 'ok' as const },
    { lbl: 'Từ chối',       val: stats?.rejectedCount ?? 0,  tone: 'crit' as const },
    { lbl: 'Đã hủy',        val: stats?.cancelledCount ?? 0 },
    { lbl: 'Tổng cộng',     val: stats?.totalCount ?? 0 },
    { lbl: 'Gửi hôm nay',   val: stats?.todaySubmitted ?? 0, tone: 'info' as const },
    { lbl: 'Duyệt hôm nay', val: stats?.todayApproved ?? 0,  tone: 'ok' as const },
  ], [stats]);

  // Cảnh báo tab "Chờ tôi ký" (logic v1 verbatim): quá hạn >48h + trùng lặp cùng loại+bệnh nhân
  const pendingItems = tab === 'pending' ? items : [];
  const overdueItems = pendingItems.filter((item) => {
    if (!item.createdAt) return false;
    const created = new Date(item.createdAt).getTime();
    return Date.now() - created > OVERDUE_MS; // >48h
  });
  const duplicateGroups = pendingItems.reduce<Record<string, SigningRequestItem[]>>((acc, item) => {
    const key = `${item.documentType}-${item.patientName || ''}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
  const duplicateCount = Object.values(duplicateGroups).filter((g) => g.length > 1).reduce((sum, g) => sum + g.length, 0);

  // Badge tuổi yêu cầu trên từng dòng chờ ký (thay rowClassName highlight của v1)
  const ageBadge = (r: SigningRequestItem): React.ReactNode => {
    if (tab !== 'pending' || !r.createdAt) return null;
    const age = Date.now() - new Date(r.createdAt).getTime();
    if (age > OVERDUE_MS) return <StatusBadge tone="crit">Quá hạn</StatusBadge>;
    if (age > WARNING_MS) return <StatusBadge tone="warn">&gt;24h</StatusBadge>;
    return null;
  };

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
      render: (r) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-6)' }}>
          {dayjs(r.createdAt).format('DD/MM HH:mm')}
          {ageBadge(r)}
        </span>
      ) },
    { key: 'status',        label: 'Trạng thái',
      render: (r) => {
        const m = STATUS_LABEL[r.status] || { label: r.statusText, tone: 'info' as const };
        return <StatusBadge tone={m.tone}>{m.label}</StatusBadge>;
      } },
  ];

  const doApprove = async (id: string) => {
    if (approving) return; // chặn double-click gọi approveSigningRequest 2 lần
    setApproving(true);
    try {
      const r = await approveSigningRequest(id);
      if (r) { tk('Đã ký duyệt'); setDetail(null); void load(); }
      else te('Không thể ký duyệt');
    } finally {
      setApproving(false);
    }
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

  // Ký duyệt hàng loạt (logic v1 verbatim): duyệt tuần tự từng yêu cầu đã chọn, đếm số thành công
  const doBatchApprove = async () => {
    setBatchApproving(true);
    let successCount = 0;
    for (const id of selected) {
      const r = await approveSigningRequest(id);
      if (r) successCount++;
    }
    setBatchApproving(false);
    if (successCount > 0) {
      tk(`Đã phê duyệt ${successCount}/${selected.size} yêu cầu`);
      setSelected(new Set());
      void load();
    } else {
      te('Không thể phê duyệt');
    }
  };
  const askBatchApprove = () => {
    if (selected.size === 0) { tw('Vui lòng chọn ít nhất 1 yêu cầu'); return; }
    cf(`Phê duyệt ${selected.size} yêu cầu cùng lúc?`, () => { void doBatchApprove(); },
      { title: 'Ký duyệt hàng loạt', confirm: 'Duyệt tất cả' });
  };
  const toggleOne = (k: string) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(k)) next.delete(k); else next.add(k);
    return next;
  });
  const toggleAll = () => setSelected((prev) => {
    const all = items.length > 0 && items.every((i) => prev.has(i.id));
    return all ? new Set() : new Set(items.map((i) => i.id));
  });

  return (
    <div className="ab">
      {tab !== 'stats' && <KpiStrip items={kpis} />}

      <div className="ab-tools">
        <TopTabs tab={tab} setTab={(v) => { setTab(v); setSelected(new Set()); }} tabs={TABS} />
        {tab !== 'stats' && (
          <>
            <SearchBox value={keyword} onChange={setKeyword} placeholder="Tìm tiêu đề / bệnh nhân…" />
            <Filter
              value={fDocType}
              onChange={(v) => setFDocType(v)}
              options={DOC_TYPE_OPTIONS}
              placeholder="▾ Loại tài liệu"
            />
            <Filter
              value={fSignerRole}
              onChange={(v) => setFSignerRole(v)}
              options={SIGNER_ROLE_OPTIONS}
              placeholder="▾ Vai trò người ký"
            />
          </>
        )}
        {tab !== 'stats' && (fSignerRole || fDocType || keyword) && (
          <Btn variant="ghost" onClick={() => { setFSignerRole(''); setFDocType(''); setKeyword(''); }}>
            <Ico name="x" size={12} /> Bỏ lọc
          </Btn>
        )}
        <span className="spacer" />
        <RefreshButton onRefresh={load} loading={loading} />
      </div>

      {/* Cảnh báo quá hạn ký / trùng lặp — chỉ ở tab Chờ tôi ký (port từ v1) */}
      {tab === 'pending' && overdueItems.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-8)', padding: '8px 14px',
          marginBottom: 'var(--space-8)', border: '1px solid var(--line)', borderRadius: 'var(--r-2)',
          color: 'var(--s-warn)', fontSize: 'var(--fs-sm)',
        }}>
          <Ico name="alert" size={14} />
          <b>{overdueItems.length} yêu cầu quá hạn</b>
          <span style={{ color: 'var(--t-2)' }}>&gt;48h chưa duyệt</span>
        </div>
      )}
      {tab === 'pending' && duplicateCount > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-8)', padding: '8px 14px',
          marginBottom: 'var(--space-8)', border: '1px solid var(--line)', borderRadius: 'var(--r-2)',
          color: 'var(--t-2)', fontSize: 'var(--fs-sm)',
        }}>
          <Ico name="info" size={14} />
          <b>{duplicateCount} yêu cầu trùng lặp</b>
          <span>cùng loại + bệnh nhân</span>
        </div>
      )}

      {/* Thanh ký duyệt hàng loạt — hiện khi đã chọn ≥1 yêu cầu chờ ký (port từ v1) */}
      {tab === 'pending' && selected.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)', marginBottom: 'var(--space-8)' }}>
          <Ico name="users" size={14} />
          <span style={{ fontSize: 'var(--fs-sm)' }}>Đã chọn {selected.size} yêu cầu</span>
          <Btn variant="primary" loading={batchApproving} icon="check" onClick={askBatchApprove}>
            Duyệt đồng loạt
          </Btn>
          <Btn variant="ghost" onClick={() => setSelected(new Set())}>Bỏ chọn</Btn>
        </div>
      )}

      {tab === 'stats' ? (
        <KpiStrip items={statKpis} />
      ) : (
        <DataTable<SigningRequestItem>
          columns={columns}
          data={items}
          rowKey={(r) => r.id}
          onRowClick={(r) => setDetail(r)}
          selected={tab === 'pending' ? selected : null}
          onToggle={toggleOne}
          onToggleAll={toggleAll}
          empty={loading ? 'Đang tải…' : 'Không có yêu cầu'}
        />
      )}

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
                  <span style={{ marginLeft: 'var(--space-6)', fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>
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
                  style={{ maxHeight: 420, overflow: 'auto', background: 'var(--d-2)', color: '#111', borderRadius: 'var(--r-2)', padding: 'var(--space-10)', fontSize: 'var(--fs-sm)' }}
                  // Snapshot HTML do chính PrintTemplateRenderer nội bộ sinh ra (không phải input người dùng tự do)
                  dangerouslySetInnerHTML={{ __html: detail.documentContent }}
                />
              </DrSec>
            )}
            <div style={{ display: 'flex', gap: 'var(--space-8)', padding: '12px 0', justifyContent: 'flex-end' }}>
              {tab === 'pending' && detail.status === 0 && (
                <>
                  <Btn variant="ghost" disabled={approving} onClick={() => void doReject(detail.id)}><Ico name="x" size={12} /> Từ chối</Btn>
                  <Btn
                    variant="primary" disabled={approving}
                    onClick={() => cf(
                      `Ký duyệt "${detail.documentTitle}"? Tài liệu sẽ được xác nhận đã ký.`,
                      () => void doApprove(detail.id),
                      { confirm: 'Ký duyệt' },
                    )}
                  >
                    <Ico name="check" size={12} /> {approving ? 'Đang ký…' : 'Ký duyệt'}
                  </Btn>
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
