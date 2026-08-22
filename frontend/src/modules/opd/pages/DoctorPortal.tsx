import React, { useCallback, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import * as examApi from '../api/examination';
import type { ExaminationDto } from '../api/examination';
import * as inpatientApi from '../../inpatient/api/inpatient';
import type { InpatientListDto } from '../../inpatient/api/inpatient';
import * as digitalSignApi from '../../emr/api/digitalSignature';
import * as hrApi from '../../hr/api/medicalHR';
import type { RosterAssignmentDto } from '../../hr/api/medicalHR';
import { apiClient } from '../../../services/apiClient';
import { storage, STORAGE_KEYS } from '../../../services/storage.service';
import {
  KpiStrip, TopTabs, StatusTabs, SearchBox, DataTable, Pager, StatusBadge, Btn, ActBtn,
  DrawerShell, DrField, ModalShell, tk, ti, tw, cf, fmtDTg, Ico,
  useListData, useTabCounts, makeStatus,
  type ColumnDef, type TopTab, type StatusTone,
} from '@/_v2kit';
import { RefreshButton } from '../../../components/actions';
import { useTabState } from '../../../hooks/useTabState';

// ============================================================================
// Local types (ported 1:1 from v1 pages/DoctorPortal.tsx)
// ============================================================================

interface PendingDocument {
  id: string;
  documentId: string;
  documentType: string;
  documentCode: string;
  patientName?: string;
  title: string;
  createdAt: string;
  status: string;
}

interface DutyShift {
  date: string;
  shiftName: string;
  shiftStart: string;
  shiftEnd: string;
  location?: string;
  isOnCall: boolean;
  isNightShift: boolean;
}

// ============================================================================
// Block (top-tab) definition
// ============================================================================

type BlockKey = 'outpatient' | 'inpatient' | 'signature' | 'schedule';
const BLOCKS: TopTab<BlockKey>[] = [
  { v: 'outpatient', l: 'Ngoại trú', ic: 'stethoscope' },
  { v: 'inpatient', l: 'Nội trú', ic: 'bed' },
  { v: 'signature', l: 'Ký số', ic: 'file-text' },
  { v: 'schedule', l: 'Lịch trực', ic: 'calendar' },
];

const PER = 16;

// ============================================================================
// Status maps (authoritative — matches backend ExaminationDto/InpatientListDto
// status codes; see v1 getOpdStatusTag/getIpdStatusTag for the source mapping)
// ============================================================================

const opdStatus = makeStatus<'waiting' | 'inProgress' | 'waitingResult' | 'completed' | 'locked'>([
  { value: 0, key: 'waiting', tab: 'Chờ khám', tone: 'info' },
  { value: 1, key: 'inProgress', tab: 'Đang khám', tone: 'warn' },
  { value: 2, key: 'waitingResult', tab: 'Chờ KQ CLS', tone: 'warn' },
  { value: 3, key: 'completed', tab: 'Hoàn thành', tone: 'ok' },
  { value: 4, key: 'locked', tab: 'Đã khóa', tone: 'crit' },
]);

const ipdStatus = makeStatus<'active' | 'pendingDischarge' | 'discharged' | 'transferred'>([
  { value: 1, key: 'active', tab: 'Đang điều trị', tone: 'info' },
  { value: 2, key: 'pendingDischarge', tab: 'Chờ xuất viện', tone: 'warn' },
  { value: 3, key: 'discharged', tab: 'Đã xuất viện', tone: 'ok' },
  { value: 4, key: 'transferred', tab: 'Chuyển viện', tone: 'crit' },
]);

const DOC_TYPE_LABEL: Record<string, string> = {
  EMR: 'Hồ sơ BA', PRESCRIPTION: 'Đơn thuốc', LAB: 'Xét nghiệm',
  RADIOLOGY: 'CĐHA', DISCHARGE: 'Ra viện',
};
const DOC_TYPE_TONE: Record<string, StatusTone> = {
  EMR: 'info', PRESCRIPTION: 'ok', LAB: 'warn', RADIOLOGY: 'info', DISCHARGE: 'ok',
};

function shiftTone(name?: string): StatusTone {
  const l = (name || '').toLowerCase();
  if (l.includes('sang') || l.includes('morning')) return 'ok';
  if (l.includes('chieu') || l.includes('afternoon')) return 'warn';
  if (l.includes('dem') || l.includes('night')) return 'info';
  if (l.includes('24') || l.includes('truc')) return 'crit';
  return 'info';
}

const handleUnavailableAction = (actionName: string): void => {
  ti(`${actionName} chưa được triển khai trong cổng bác sĩ. Vui lòng thực hiện tại phân hệ chuyên biệt.`);
};

// ============================================================================
// Component
// ============================================================================

const DoctorPortalV2: React.FC = () => {
  const [block, setBlock] = useTabState<BlockKey>('outpatient', 'tab');

  // ── Outpatient ──────────────────────────────────────────────────────────
  const [opdSearch, setOpdSearch] = useState('');
  const [opdStab, setOpdStab] = useTabState<string>('all', 'stab');
  const [opdPage, setOpdPage] = useState(0);
  const [opdDetail, setOpdDetail] = useState<ExaminationDto | null>(null);
  const [opdTotal, setOpdTotal] = useState(0); // totalCount thật từ server (KPI không bị trần 200)

  const opd = useListData<ExaminationDto>(
    useCallback(async () => {
      const r = await examApi.searchExaminations({
        // ToDate được parse là 00:00 nên các ca trong hôm nay sẽ bị lọc mất — cộng thêm 1 ngày để bao gồm.
        fromDate: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
        toDate: dayjs().add(1, 'day').format('YYYY-MM-DD'),
        pageIndex: 1, pageSize: 200,
        keyword: opdSearch || undefined,
      });
      const items = r.data?.items || [];
      setOpdTotal(r.data?.totalCount ?? items.length);
      return items;
    }, [opdSearch]),
    useCallback(() => tw('Không thể tải danh sách bệnh nhân ngoại trú'), []),
  );

  const opdFiltered = useMemo(() => opd.rows.filter((r) => {
    if (opdStab !== 'all' && opdStatus.keyOf(r.status) !== opdStab) return false;
    return true;
  }), [opd.rows, opdStab]);
  const opdTotalPages = Math.max(1, Math.ceil(opdFiltered.length / PER));
  const opdPaged = opdFiltered.slice(opdPage * PER, (opdPage + 1) * PER);
  const opdTabCounts = useTabCounts(opd.rows, opdStatus.tabs, (r) => opdStatus.keyOf(r.status));

  // ── Inpatient ────────────────────────────────────────────────────────────
  const [ipdSearch, setIpdSearch] = useState('');
  const [ipdPage, setIpdPage] = useState(0);
  const [ipdDetail, setIpdDetail] = useState<InpatientListDto | null>(null);
  const [ipdTotal, setIpdTotal] = useState(0); // totalCount thật từ server

  const ipd = useListData<InpatientListDto>(
    useCallback(async () => {
      const r = await inpatientApi.getInpatientList({ status: 1, page: 1, pageSize: 200, keyword: ipdSearch || undefined });
      const items = r.data?.items || [];
      setIpdTotal(r.data?.totalCount ?? items.length);
      return items;
    }, [ipdSearch]),
    useCallback(() => tw('Không thể tải danh sách bệnh nhân nội trú'), []),
  );

  const ipdFiltered = ipd.rows;
  const ipdTotalPages = Math.max(1, Math.ceil(ipdFiltered.length / PER));
  const ipdPaged = ipdFiltered.slice(ipdPage * PER, (ipdPage + 1) * PER);

  // ── Digital signature ────────────────────────────────────────────────────
  const sig = useListData<PendingDocument>(
    useCallback(async () => {
      const r = await apiClient.get<PendingDocument[]>('/digital-signature/pending');
      return Array.isArray(r.data) ? r.data : [];
    }, []),
    useCallback(() => tw('Không thể tải danh sách tài liệu chờ ký'), []),
  );
  const [sigSearch, setSigSearch] = useState('');
  const [sigPage, setSigPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [signTarget, setSignTarget] = useState<PendingDocument | null>(null);
  const [signing, setSigning] = useState(false);        // chống double-click "Ký số" (không hoàn tác)
  const [batchSigning, setBatchSigning] = useState(false); // chống ký hàng loạt lần 2 khi lần 1 chưa xong

  const sigFiltered = useMemo(() => sig.rows.filter((r) => {
    if (!sigSearch.trim()) return true;
    const q = sigSearch.toLowerCase();
    return `${r.documentCode} ${r.title} ${r.patientName || ''}`.toLowerCase().includes(q);
  }), [sig.rows, sigSearch]);
  const sigTotalPages = Math.max(1, Math.ceil(sigFiltered.length / PER));
  const sigPaged = sigFiltered.slice(sigPage * PER, (sigPage + 1) * PER);

  const selectedDocs = useMemo(() => sig.rows.filter((d) => selectedIds.has(d.id)), [sig.rows, selectedIds]);
  const selectedDocTypes = useMemo(() => Array.from(new Set(selectedDocs.map((d) => d.documentType))), [selectedDocs]);
  const hasMixedSelectedDocTypes = selectedDocTypes.length > 1;

  const toggleSig = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  // parity v1: chọn tất cả trên TOÀN BỘ danh sách đã lọc (không chỉ trang hiện tại)
  const toggleAllSig = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (sigFiltered.every((r) => next.has(r.id))) sigFiltered.forEach((r) => next.delete(r.id));
      else sigFiltered.forEach((r) => next.add(r.id));
      return next;
    });
  };

  const handleConfirmSign = async () => {
    if (!signTarget || signing) return;
    setSigning(true);
    try {
      await digitalSignApi.signDocument({
        documentId: signTarget.documentId,
        documentType: signTarget.documentType,
        reason: 'Ký xác nhận',
        location: 'Bệnh viện',
      });
      tk('Ký số thành công');
      setSignTarget(null);
      sig.reload();
    } catch {
      tw('Không thể ký số tài liệu');
    } finally {
      setSigning(false);
    }
  };

  const doBatchSign = async () => {
    if (batchSigning) return;
    setBatchSigning(true);
    try {
      const docType = selectedDocs[0]?.documentType || 'EMR';
      await digitalSignApi.batchSign({
        documentIds: Array.from(selectedIds),
        documentType: docType,
        reason: 'Ký hàng loạt',
      });
      tk(`Đã ký ${selectedIds.size} tài liệu`);
      setSelectedIds(new Set());
      sig.reload();
    } catch {
      tw('Ký hàng loạt thất bại');
    } finally {
      setBatchSigning(false);
    }
  };

  const handleBatchSign = () => {
    if (batchSigning) return;
    if (selectedIds.size === 0) { tw('Vui lòng chọn tài liệu cần ký'); return; }
    if (hasMixedSelectedDocTypes) { tw('Chỉ có thể ký hàng loạt các tài liệu cùng loại'); return; }
    cf(`Ký hàng loạt ${selectedIds.size} tài liệu đã chọn?`, doBatchSign, {
      title: 'Xác nhận ký hàng loạt', tone: 'warn', confirm: 'Ký ngay',
    });
  };

  // ── Duty schedule ────────────────────────────────────────────────────────
  const [dutyMonth, setDutyMonth] = useState(() => dayjs());
  const userId = useMemo(() => {
    try {
      const raw = storage.getRaw(STORAGE_KEYS.user);
      return raw ? (JSON.parse(raw) as { id?: string }).id ?? null : null;
    } catch {
      return null;
    }
  }, []);
  const duty = useListData<DutyShift>(
    useCallback(async () => {
      if (!userId) return [];
      const r = await hrApi.getStaffRoster(userId, dutyMonth.year(), dutyMonth.month() + 1);
      return (r.data || []).map((a: RosterAssignmentDto) => ({
        date: a.date,
        shiftName: a.shiftName,
        shiftStart: a.shiftStart,
        shiftEnd: a.shiftEnd,
        location: a.location,
        isOnCall: a.isOnCall,
        isNightShift: (a.shiftName || '').toLowerCase().includes('dem'),
      }));
    }, [userId, dutyMonth]),
    useCallback(() => tw('Không thể tải lịch trực'), []),
  );
  const todayShift = useMemo(
    () => duty.rows.find((s) => dayjs(s.date).isSame(dayjs(), 'day')),
    [duty.rows],
  );

  // ── Refresh (Làm mới ở TopTabs) ──────────────────────────────────────────
  const reloadCurrent = () => {
    if (block === 'outpatient') opd.reload();
    else if (block === 'inpatient') ipd.reload();
    else if (block === 'signature') sig.reload();
    else duty.reload();
  };

  // ── KPIs theo khối đang chọn ─────────────────────────────────────────────
  const kpis = useMemo(() => {
    if (block === 'outpatient') {
      const today = dayjs().startOf('day');
      return [
        { lbl: 'Hôm nay', val: opd.rows.filter((r) => dayjs(r.examinationDate).isSame(today, 'day')).length, sub: 'lượt khám', tone: 'info' as const },
        { lbl: 'Đang khám', val: opd.rows.filter((r) => r.status === 1).length, tone: 'warn' as const },
        { lbl: 'Chờ KQ CLS', val: opd.rows.filter((r) => r.status === 2).length, tone: 'warn' as const },
        { lbl: 'Hoàn thành', val: opd.rows.filter((r) => r.status === 3).length, tone: 'ok' as const },
        { lbl: 'Tổng cộng', val: opdTotal || opd.rows.length, sub: '7 ngày', tone: undefined },
      ];
    }
    if (block === 'inpatient') {
      const alerts = ipd.rows.filter((r) => r.hasPendingOrders || r.hasPendingLabResults || r.hasUnclaimedMedicine || r.isDebtWarning).length;
      return [
        { lbl: 'Đang điều trị', val: ipdTotal || ipd.rows.length, tone: 'info' as const },
        { lbl: 'Chờ xuất viện', val: ipd.rows.filter((r) => r.status === 2).length, tone: 'warn' as const },
        { lbl: 'Có cảnh báo', val: alerts, tone: alerts > 0 ? 'crit' as const : 'ok' as const },
        { lbl: 'Nợ viện phí', val: ipd.rows.filter((r) => r.isDebtWarning).length, tone: 'crit' as const },
      ];
    }
    if (block === 'signature') {
      return [
        { lbl: 'Chờ ký', val: sig.rows.length, tone: sig.rows.length > 0 ? 'warn' as const : 'ok' as const },
        { lbl: 'Đã chọn', val: selectedIds.size, tone: 'info' as const },
        { lbl: 'Loại đã chọn', val: selectedDocTypes.length, tone: hasMixedSelectedDocTypes ? 'crit' as const : 'ok' as const },
      ];
    }
    return [
      { lbl: 'Tổng ca trực', val: duty.rows.length, tone: 'info' as const },
      { lbl: 'Ca đêm', val: duty.rows.filter((s) => s.isNightShift).length, tone: 'info' as const },
      { lbl: 'Trực', val: duty.rows.filter((s) => s.isOnCall).length, tone: 'warn' as const },
      { lbl: 'Hôm nay', val: todayShift ? todayShift.shiftName : 'Nghỉ', tone: todayShift ? 'ok' as const : undefined },
    ];
  }, [block, opd.rows, ipd.rows, sig.rows, selectedIds.size, selectedDocTypes.length, hasMixedSelectedDocTypes, duty.rows, todayShift, opdTotal, ipdTotal]);

  // ── Columns ──────────────────────────────────────────────────────────────
  const opdColumns: ColumnDef<ExaminationDto>[] = [
    { key: 'queue', label: 'STT', mono: true, width: 70, render: (r) => <span className="chip cy">{r.queueNumber}</span> },
    { key: 'patient', label: 'Bệnh nhân', render: (r) => (
      <div className="cell-2l"><b>{r.patientName}</b><i className="mono">{r.patientCode}</i></div>
    ) },
    { key: 'room', label: 'Phòng khám', width: 140, render: (r) => r.roomName || '—' },
    { key: 'doctor', label: 'Bác sĩ', width: 160, render: (r) => r.doctorName || 'Chưa phân' },
    { key: 'dx', label: 'Chẩn đoán', render: (r) => r.diagnosisName ? (
      <div className="cell-2l"><b>{r.diagnosisName}</b><i className="mono">{r.diagnosisCode}</i></div>
    ) : <span style={{ color: 'var(--t-3)' }}>Chưa có</span> },
    { key: 'status', label: 'Trạng thái', width: 130, render: (r) => (
      <StatusBadge tone={opdStatus.toneOf(r.status)} dot>{r.statusName || opdStatus.labelOf(r.status)}</StatusBadge>
    ) },
  ];

  const ipdColumns: ColumnDef<InpatientListDto>[] = [
    { key: 'bed', label: 'Giường', width: 90, render: (r) => (
      <StatusBadge tone={r.isDebtWarning ? 'crit' : 'info'}>{r.bedName || '—'}</StatusBadge>
    ) },
    { key: 'patient', label: 'Bệnh nhân', render: (r) => (
      <div className="cell-2l">
        <b>{r.patientName}</b>
        <i className="mono">
          {r.patientCode}
          {r.hasPendingOrders && <span title="Y lệnh chưa thực hiện" style={{ marginLeft: 6, color: 'var(--s-warn)' }}>●</span>}
          {r.hasPendingLabResults && <span title="Chờ KQ xét nghiệm" style={{ marginLeft: 4, color: 'var(--s-warn)' }}>●</span>}
          {r.hasUnclaimedMedicine && <span title="Thuốc chưa nhận" style={{ marginLeft: 4, color: 'var(--s-crit)' }}>●</span>}
        </i>
      </div>
    ) },
    { key: 'dept', label: 'Khoa', width: 150, render: (r) => r.departmentName || '—' },
    { key: 'days', label: 'Ngày NV', width: 90, mono: true, render: (r) => (
      <span style={{ color: r.daysOfStay > 14 ? 'var(--s-warn)' : undefined }}>{r.daysOfStay} ngày</span>
    ) },
    { key: 'diag', label: 'Chẩn đoán', render: (r) => r.mainDiagnosis || <span style={{ color: 'var(--t-3)' }}>—</span> },
    { key: 'status', label: 'TT', width: 120, render: (r) => (
      <StatusBadge tone={ipdStatus.toneOf(r.status)} dot>{r.statusName || ipdStatus.labelOf(r.status)}</StatusBadge>
    ) },
  ];

  const sigColumns: ColumnDef<PendingDocument>[] = [
    { key: 'code', label: 'Mã', code: true, width: 130, render: (r) => r.documentCode },
    { key: 'type', label: 'Loại', width: 120, render: (r) => (
      <StatusBadge tone={DOC_TYPE_TONE[r.documentType] || 'info'}>{DOC_TYPE_LABEL[r.documentType] || r.documentType}</StatusBadge>
    ) },
    { key: 'title', label: 'Tiêu đề', render: (r) => r.title },
    { key: 'patient', label: 'Bệnh nhân', width: 170, render: (r) => r.patientName || '—' },
    { key: 'date', label: 'Ngày tạo', width: 140, mono: true, render: (r) => fmtDTg(r.createdAt) },
  ];

  const scheduleColumns: ColumnDef<DutyShift>[] = [
    { key: 'date', label: 'Ngày', width: 130, mono: true, render: (r) => {
      const d = dayjs(r.date);
      const isToday = d.isSame(dayjs(), 'day');
      return (
        <span style={{ color: isToday ? 'var(--a-cy)' : undefined, fontWeight: isToday ? 700 : undefined }}>
          {d.format('DD/MM/YYYY')}{isToday ? ' · Hôm nay' : ''}
        </span>
      );
    } },
    { key: 'shift', label: 'Ca trực', width: 130, render: (r) => (
      <StatusBadge tone={shiftTone(r.shiftName)} dot>{r.shiftName}</StatusBadge>
    ) },
    { key: 'time', label: 'Thời gian', width: 120, mono: true, render: (r) => `${r.shiftStart || ''} - ${r.shiftEnd || ''}` },
    { key: 'loc', label: 'Địa điểm', render: (r) => r.location || '—' },
    { key: 'flags', label: 'Ghi chú', width: 140, render: (r) => (
      <>
        {r.isOnCall && <StatusBadge tone="crit">Trực</StatusBadge>}
        {r.isNightShift && <span style={{ marginLeft: 4 }}><StatusBadge tone="info">Đêm</StatusBadge></span>}
      </>
    ) },
  ];

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="ab">
      <KpiStrip items={kpis} />

      <TopTabs<BlockKey>
        tab={block}
        setTab={setBlock}
        tabs={BLOCKS}
        actions={
          <RefreshButton
            onRefresh={reloadCurrent}
            loading={block === 'outpatient' ? opd.loading : block === 'inpatient' ? ipd.loading : block === 'signature' ? sig.loading : duty.loading}
          />
        }
      />

      {block === 'outpatient' && (
        <>
          <div className="ab-tools">
            <SearchBox value={opdSearch} onChange={(v) => { setOpdSearch(v); setOpdPage(0); }} placeholder="Tìm BN / mã / chẩn đoán…" />
            <span className="spacer" />
          </div>
          <StatusTabs value={opdStab} onChange={(v) => { setOpdStab(v); setOpdPage(0); }} tabs={opdStatus.tabs} counts={opdTabCounts} />
          <DataTable<ExaminationDto>
            columns={opdColumns}
            data={opdPaged}
            rowKey={(r) => r.id}
            onRowClick={(r) => setOpdDetail(r)}
            loading={opd.loading}
            empty={opd.error ? 'Không tải được dữ liệu' : 'Không có bệnh nhân ngoại trú nào'}
          />
          <Pager page={opdPage} setPage={setOpdPage} totalPages={opdTotalPages} total={opdFiltered.length} perPage={PER} />

          <DrawerShell
            open={!!opdDetail}
            onClose={() => setOpdDetail(null)}
            size="md"
            title={opdDetail ? `${opdDetail.patientCode} · ${opdDetail.patientName}` : ''}
            sub={opdDetail ? `${opdDetail.roomName || '—'} · STT ${opdDetail.queueNumber}` : ''}
            footer={<>
              <Btn variant="ghost" onClick={() => setOpdDetail(null)}>Đóng</Btn>
              <Btn onClick={() => handleUnavailableAction('Lưu')}><Ico name="check" size={12} /> Lưu</Btn>
              <Btn onClick={() => handleUnavailableAction('Chỉ định CLS')}><Ico name="flask" size={12} /> Chỉ định CLS</Btn>
              <Btn variant="primary" onClick={() => handleUnavailableAction('Kê đơn')}><Ico name="edit" size={12} /> Kê đơn</Btn>
            </>}
          >
            {opdDetail && <>
              <DrField lbl="Mã BN">{opdDetail.patientCode}</DrField>
              <DrField lbl="Họ tên">{opdDetail.patientName}</DrField>
              <DrField lbl="Số TT">{opdDetail.queueNumber}</DrField>
              <DrField lbl="Trạng thái"><StatusBadge tone={opdStatus.toneOf(opdDetail.status)} dot>{opdDetail.statusName || opdStatus.labelOf(opdDetail.status)}</StatusBadge></DrField>
              <DrField lbl="Phòng khám">{opdDetail.roomName || '—'}</DrField>
              <DrField lbl="Bác sĩ">{opdDetail.doctorName || '—'}</DrField>
              <DrField lbl="Ngày khám">{dayjs(opdDetail.examinationDate).format('DD/MM/YYYY HH:mm')}</DrField>
              <DrField lbl="Chẩn đoán">
                {opdDetail.diagnosisCode ? `${opdDetail.diagnosisCode} - ${opdDetail.diagnosisName}` : 'Chưa có chẩn đoán'}
              </DrField>
            </>}
          </DrawerShell>
        </>
      )}

      {block === 'inpatient' && (
        <>
          <div className="ab-tools">
            <SearchBox value={ipdSearch} onChange={(v) => { setIpdSearch(v); setIpdPage(0); }} placeholder="Tìm BN / mã / giường…" />
            <span className="spacer" />
          </div>
          <DataTable<InpatientListDto>
            columns={ipdColumns}
            data={ipdPaged}
            rowKey={(r) => r.admissionId}
            onRowClick={(r) => setIpdDetail(r)}
            loading={ipd.loading}
            empty={ipd.error ? 'Không tải được dữ liệu' : 'Không có bệnh nhân nội trú nào'}
          />
          <Pager page={ipdPage} setPage={setIpdPage} totalPages={ipdTotalPages} total={ipdFiltered.length} perPage={PER} />

          <DrawerShell
            open={!!ipdDetail}
            onClose={() => setIpdDetail(null)}
            size="md"
            title={ipdDetail ? `${ipdDetail.patientCode} · ${ipdDetail.patientName}` : ''}
            sub={ipdDetail ? `${ipdDetail.departmentName} · ${ipdDetail.roomName}${ipdDetail.bedName ? ' · ' + ipdDetail.bedName : ''}` : ''}
            footer={<>
              <Btn variant="ghost" onClick={() => setIpdDetail(null)}>Đóng</Btn>
              <Btn variant="crit" onClick={() => handleUnavailableAction('Xuất viện')}><Ico name="logout" size={12} /> Xuất viện</Btn>
              <Btn onClick={() => handleUnavailableAction('Phiếu điều trị')}><Ico name="file-text" size={12} /> Phiếu điều trị</Btn>
              <Btn variant="primary" onClick={() => handleUnavailableAction('Y lệnh')}><Ico name="edit" size={12} /> Y lệnh</Btn>
            </>}
          >
            {ipdDetail && <>
              <DrField lbl="Mã BN">{ipdDetail.patientCode}</DrField>
              <DrField lbl="Họ tên">{ipdDetail.patientName}</DrField>
              <DrField lbl="Giới tính">{ipdDetail.gender === 1 ? 'Nam' : ipdDetail.gender === 2 ? 'Nữ' : '—'}</DrField>
              <DrField lbl="Tuổi">{ipdDetail.age ?? '—'}</DrField>
              <DrField lbl="Khoa">{ipdDetail.departmentName}</DrField>
              <DrField lbl="Phòng">{ipdDetail.roomName}</DrField>
              <DrField lbl="Giường">{ipdDetail.bedName || '—'}</DrField>
              <DrField lbl="Số ngày ĐT"><span style={{ color: ipdDetail.daysOfStay > 14 ? 'var(--s-warn)' : undefined }}>{ipdDetail.daysOfStay} ngày</span></DrField>
              <DrField lbl="Ngày nhập viện">{dayjs(ipdDetail.admissionDate).format('DD/MM/YYYY HH:mm')}</DrField>
              <DrField lbl="Trạng thái"><StatusBadge tone={ipdStatus.toneOf(ipdDetail.status)} dot>{ipdDetail.statusName || ipdStatus.labelOf(ipdDetail.status)}</StatusBadge></DrField>
              <DrField lbl="Chẩn đoán">{ipdDetail.mainDiagnosis || 'Chưa có chẩn đoán'}</DrField>
              <DrField lbl="BS điều trị">{ipdDetail.attendingDoctorName || '—'}</DrField>
              <DrField lbl="Bảo hiểm">
                {ipdDetail.isInsurance ? `BHYT: ${ipdDetail.insuranceNumber || ''}` : 'Thu phí'}
              </DrField>
              <DrField lbl="Cảnh báo">
                {[
                  ipdDetail.hasPendingOrders && 'Y lệnh chưa TH',
                  ipdDetail.hasPendingLabResults && 'Chờ KQ XN',
                  ipdDetail.hasUnclaimedMedicine && 'Thuốc chưa nhận',
                  ipdDetail.isDebtWarning && `Nợ: ${(ipdDetail.totalDebt ?? 0).toLocaleString('vi-VN')} VND`,
                ].filter(Boolean).join(' · ') || 'Không có cảnh báo'}
              </DrField>
            </>}
          </DrawerShell>
        </>
      )}

      {block === 'signature' && (
        <>
          <div className="ab-tools">
            <SearchBox value={sigSearch} onChange={(v) => { setSigSearch(v); setSigPage(0); }} placeholder="Tìm mã TL / tiêu đề / BN…" />
            <span className="spacer" />
            {selectedIds.size > 0 && (
              <Btn variant="primary" disabled={hasMixedSelectedDocTypes || batchSigning} onClick={handleBatchSign}
                title={hasMixedSelectedDocTypes ? 'Chỉ có thể ký hàng loạt khi tất cả tài liệu cùng loại' : undefined}>
                <Ico name="file-text" size={12} /> {batchSigning ? 'Đang ký…' : `Ký hàng loạt (${selectedIds.size})`}
              </Btn>
            )}
          </div>
          {hasMixedSelectedDocTypes && (
            <div style={{ padding: '0 14px 10px', color: 'var(--s-warn)', fontSize: 12.5 }}>
              Đang chọn {selectedDocTypes.length} loại tài liệu. Hãy chọn các tài liệu cùng loại để ký hàng loạt.
            </div>
          )}
          <DataTable<PendingDocument>
            columns={sigColumns}
            data={sigPaged}
            rowKey={(r) => r.id}
            selected={selectedIds}
            onToggle={toggleSig}
            onToggleAll={toggleAllSig}
            actions={(r) => (
              <ActBtn ic="file-text" title="Ký tài liệu" onClick={() => setSignTarget(r)} />
            )}
            loading={sig.loading}
            empty={sig.error ? 'Không tải được dữ liệu' : 'Không có tài liệu chờ ký'}
          />
          <Pager page={sigPage} setPage={setSigPage} totalPages={sigTotalPages} total={sigFiltered.length} perPage={PER} />

          <ModalShell
            open={!!signTarget}
            onClose={() => setSignTarget(null)}
            size="sm"
            title="Xác nhận ký số"
            footer={<>
              <Btn variant="ghost" disabled={signing} onClick={() => setSignTarget(null)}>Hủy</Btn>
              <Btn variant="primary" disabled={signing} onClick={handleConfirmSign}>
                <Ico name="check" size={12} /> {signing ? 'Đang ký…' : 'Ký số'}
              </Btn>
            </>}
          >
            {signTarget && <>
              <DrField lbl="Mã">{signTarget.documentCode}</DrField>
              <DrField lbl="Loại">{DOC_TYPE_LABEL[signTarget.documentType] || signTarget.documentType}</DrField>
              <DrField lbl="Tiêu đề">{signTarget.title}</DrField>
              <DrField lbl="Bệnh nhân">{signTarget.patientName || '—'}</DrField>
              <DrField lbl="Ngày tạo">{fmtDTg(signTarget.createdAt)}</DrField>
              <div style={{ marginTop: 12, padding: 10, border: '1px solid var(--s-warn)', borderRadius: 6, color: 'var(--s-warn)', fontSize: 12.5 }}>
                <Ico name="alert" size={12} /> Bạn sắp ký số tài liệu này. Hành động này không thể hoàn tác.
              </div>
            </>}
          </ModalShell>
        </>
      )}

      {block === 'schedule' && (
        <>
          <div className="ab-tools">
            <Btn variant="ghost" onClick={() => setDutyMonth((m) => m.subtract(1, 'month'))}>
              <Ico name="chevron-left" size={12} />
            </Btn>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, padding: '0 4px' }}>
              Tháng {dutyMonth.format('MM/YYYY')}
            </span>
            <Btn variant="ghost" onClick={() => setDutyMonth((m) => m.add(1, 'month'))}>
              <Ico name="chevron-right" size={12} />
            </Btn>
            <span className="spacer" />
          </div>
          <DataTable<DutyShift>
            columns={scheduleColumns}
            data={[...duty.rows].sort((a, b) => a.date.localeCompare(b.date))}
            rowKey={(r) => `${r.date}-${r.shiftName}`}
            loading={duty.loading}
            empty={duty.error ? 'Không tải được dữ liệu' : !userId ? 'Không xác định được người dùng hiện tại' : 'Không có ca trực trong tháng này'}
          />
        </>
      )}
    </div>
  );
};

export default DoctorPortalV2;
