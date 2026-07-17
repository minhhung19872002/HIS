import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as file from '../../../services/file.service';
import dayjs from 'dayjs';
import { App as AntdApp, Alert, DatePicker } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  searchInsuranceClaims,
  testPortalConnection,
  validateClaimsBatch,
  lockInsuranceClaim,
  getMonthlyInsuranceReport,
  getDepartmentReport,
  getTreatmentTypeReport,
  getReportC79a,
  getReport80a,
  exportReportC79aToExcel,
  exportReport80aToExcel,
  exportXml,
  downloadXmlFile,
  createSettlementBatch,
  getSettlementBatches,
} from '../api/insurance';
import type {
  InsuranceClaimSummaryDto, PortalConnectionTestResult,
  XmlExportConfigDto, XmlExportResultDto, InsuranceSettlementBatchDto,
} from '../api/insurance';
import {
  KpiStrip, StatusTabs, SearchBox, DataTable, Pager,
  StatusBadge, ActBtn, Btn, DrawerShell, ModalShell, useListData, useTabCounts,
  TopTabs,
  type ColumnDef, type StatusTab, type TopTab,
} from '../../../pages-v2/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';
import { fmtVND } from '../../../utils/format';

/* BHYT v2 — claims management */

/** Tải CSV với BOM UTF-8 để Excel mở đúng tiếng Việt */
function downloadCsv(filename: string, lines: string[]): void {
  const blob = new Blob([`﻿${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
  file.downloadBlob(blob, filename);
}

function escapeCsvCell(v: unknown): string {
  const s = String(v ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
}

type PageTab = 'claims' | 'reports' | 'xml' | 'batch';
type StatusKey = 'draft' | 'pending' | 'submitted' | 'approved' | 'rejected' | 'locked';

const TOP_TABS: TopTab<PageTab>[] = [
  { v: 'claims',  l: 'Danh sách hồ sơ', ic: 'list' },
  { v: 'reports', l: 'Báo cáo BHYT',    ic: 'chart' },
  { v: 'xml',     l: 'Xuất XML QĐ4210', ic: 'download' },
  { v: 'batch',   l: 'Đợt quyết toán',  ic: 'archive' },
];

const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'draft',     l: 'Nháp',     tone: 'info' },
  { v: 'pending',   l: 'Chờ gửi',  tone: 'warn' },
  { v: 'submitted', l: 'Đã gửi',   tone: 'warn' },
  { v: 'approved',  l: 'Đã duyệt', tone: 'ok' },
  { v: 'rejected',  l: 'Từ chối',  tone: 'crit' },
  { v: 'locked',    l: 'Đã khóa',  tone: 'info' },
];

const statusKey = (s: number): StatusKey => {
  if (s === 5) return 'locked';
  if (s === 4) return 'rejected';
  if (s === 3) return 'approved';
  if (s === 2) return 'submitted';
  if (s === 1) return 'pending';
  return 'draft';
};
const statusTone = (s: StatusKey) => STATUS_TABS.find((t) => t.v === s)?.tone || 'info';
const fmtDMY = (iso?: string) => iso ? dayjs(iso).format('DD/MM/YYYY') : '—';

const REPORTS: { id: string; label: string; sub: string }[] = [
  { id: 'mau19', label: 'Báo cáo mẫu 19',      sub: 'Tổng hợp KCB BHYT' },
  { id: 'mau20', label: 'Báo cáo mẫu 20',      sub: 'Chi tiết chi phí KCB BHYT' },
  { id: 'mau21', label: 'Báo cáo mẫu 21',      sub: 'Chi tiết theo đối tượng KCB' },
  { id: 'mau79', label: 'Báo cáo mẫu 79',      sub: 'Chi tiết PTTT · Xuất Excel' },
  { id: 'mau80', label: 'Báo cáo mẫu 80',      sub: 'Tổng hợp thuốc BHYT · Xuất Excel' },
  { id: 'tt102', label: 'Báo cáo TT 102/2018', sub: 'Theo Thông tư 102/2018/TT-BTC' },
];

// ── XML export constants ───────────────────────────────────────────────────────
const XML_LABELS: Record<string, string> = {
  xml1: 'Bệnh án', xml2: 'Thuốc', xml3: 'DVKT', xml4: 'Thuốc khác', xml5: 'Đơn thuốc', xml7: 'Chuyển tuyến',
};

// ── Settlement batch columns (module-level — no closure) ─────────────────────
const BATCH_STATUS_MAP: Record<number, { l: string; tone: 'info' | 'warn' | 'ok' | 'crit' }> = {
  0: { l: 'Nháp',      tone: 'info' },
  1: { l: 'Chờ gửi',  tone: 'warn' },
  2: { l: 'Đã gửi',   tone: 'warn' },
  3: { l: 'Đã duyệt', tone: 'ok'   },
  4: { l: 'Từ chối',  tone: 'crit' },
};

const BATCH_COLS: ColumnDef<InsuranceSettlementBatchDto>[] = [
  { key: 'batchCode', label: 'Mã đợt',      mono: true, render: (r) => r.batchCode },
  { key: 'period',    label: 'Kỳ',           mono: true, render: (r) => `${String(r.month).padStart(2, '0')}/${r.year}` },
  { key: 'total',     label: 'Tổng HS',      render: (r) => String(r.totalRecords) },
  { key: 'valid',     label: 'Hợp lệ',       render: (r) => <span style={{ color: 'var(--s-ok)' }}>{r.validRecords}</span> },
  { key: 'invalid',   label: 'Không HLệ',    render: (r) => r.invalidRecords > 0
    ? <span style={{ color: 'var(--s-crit)' }}>{r.invalidRecords}</span>
    : <span>—</span> },
  { key: 'insAmt',    label: 'BHYT chi trả', mono: true, render: (r) => fmtVND(r.insuranceAmount) },
  { key: 'status',    label: 'Trạng thái',   render: (r) => {
    const s = BATCH_STATUS_MAP[r.status] ?? { l: '—', tone: 'info' as const };
    return <StatusBadge tone={s.tone}>{s.l}</StatusBadge>;
  }},
  { key: 'createdAt',  label: 'Ngày tạo',    mono: true, render: (r) => fmtDMY(r.createdAt) },
  { key: 'submitDate', label: 'Ngày gửi',    mono: true, render: (r) => fmtDMY(r.submitDate) },
];

const InsuranceV2: React.FC = () => {
  const { message, modal } = AntdApp.useApp();
  const navigate = useNavigate();
  const { rows, loading, reload } = useListData<InsuranceClaimSummaryDto>(
    useCallback(() => searchInsuranceClaims({
      fromDate: dayjs().subtract(60, 'day').format('YYYY-MM-DD'),
      toDate:   dayjs().format('YYYY-MM-DD'),
      pageNumber: 1, pageSize: 200,
    }).then((r) => Array.isArray(r.data?.items) ? r.data.items : []), []),
  );

  const [topTab, setTopTab]             = useState<PageTab>('claims');
  const [stab, setStab]                 = useState<StatusKey | 'all'>('all');
  const [search, setSearch]             = useState('');
  const [claimDateRange, setClaimDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [page, setPage]                 = useState(0);
  const [detail, setDetail]             = useState<InsuranceClaimSummaryDto | null>(null);
  const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set());
  const [syncLoading, setSyncLoading]   = useState(false);
  const [reportLoading, setReportLoading] = useState<string | null>(null);
  const PAGE_SIZE = 16;

  // ── XML export state ──────────────────────────────────────────────────────
  const [xmlMonth, setXmlMonth]       = useState(dayjs().month() + 1);
  const [xmlYear, setXmlYear]         = useState(dayjs().year());
  const [xmlIncludes, setXmlIncludes] = useState({
    xml1: true, xml2: true, xml3: true, xml4: true, xml5: true, xml7: true,
  });
  const [xmlResult, setXmlResult]     = useState<XmlExportResultDto | null>(null);
  const [xmlLoading, setXmlLoading]   = useState(false);

  // ── Batch state ───────────────────────────────────────────────────────────
  const [batchYear, setBatchYear]           = useState(dayjs().year());
  const [batches, setBatches]               = useState<InsuranceSettlementBatchDto[]>([]);
  const [batchLoading, setBatchLoading]     = useState(false);
  const [batchCreateOpen, setBatchCreateOpen] = useState(false);
  const [newBatchMonth, setNewBatchMonth]   = useState(dayjs().month() + 1);
  const [newBatchYear, setNewBatchYear]     = useState(dayjs().year());
  const [batchCreating, setBatchCreating]   = useState(false);

  const counts = useTabCounts(rows, STATUS_TABS, (r) => statusKey(r.status));

  const filtered = useMemo(() => rows.filter((r) => {
    if (stab !== 'all' && statusKey(r.status) !== stab) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const hay = [r.maLk, r.patientName, r.patientCode, r.insuranceNumber, r.diagnosisName]
        .filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (claimDateRange) {
      const [from, to] = claimDateRange;
      const admit = r.admissionDate ? dayjs(r.admissionDate) : null;
      if (!admit || admit.isBefore(from.startOf('day')) || admit.isAfter(to.endOf('day'))) return false;
    }
    return true;
  }), [rows, stab, search, claimDateRange]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const kpis = useMemo(() => {
    const totalAmount = rows.reduce((s, r) => s + (r.totalAmount || 0), 0);
    const insuranceAmount = rows.reduce((s, r) => s + (r.insuranceAmount || 0), 0);
    const approvalRate = rows.length > 0
      ? Math.round(rows.filter((r) => r.status === 3).length / rows.length * 100)
      : 0;
    return {
      total: rows.length,
      pending: (counts.pending || 0) + (counts.submitted || 0),
      approved: counts.approved || 0,
      rejected: counts.rejected || 0,
      totalAmount,
      insuranceAmount,
      approvalRate,
    };
  }, [rows, counts]);

  /* ── Batch load ── */

  const loadBatches = useCallback(async (year: number) => {
    setBatchLoading(true);
    try {
      const r = await getSettlementBatches(year);
      setBatches(Array.isArray(r.data) ? r.data : []);
    } catch { setBatches([]); }
    finally { setBatchLoading(false); }
  }, []);

  useEffect(() => {
    if (topTab === 'batch') loadBatches(batchYear);
  }, [topTab, batchYear, loadBatches]);

  /* ── Handlers ── */

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  const handleSync = async () => {
    setSyncLoading(true);
    try {
      const res = await testPortalConnection();
      const data = res as unknown as PortalConnectionTestResult;
      if (data?.isConnected) {
        message.success(`Đồng bộ thành công (${data.responseTimeMs ?? 0}ms)`);
        reload();
      } else {
        message.warning(`Không kết nối được cổng BHXH: ${data?.errorMessage || 'Không xác định'}`);
      }
    } catch {
      message.warning('Lỗi khi đồng bộ với cổng BHXH');
    } finally {
      setSyncLoading(false);
    }
  };

  const handleApproveClaims = () => {
    if (selectedIds.size === 0) { message.warning('Vui lòng chọn hồ sơ cần duyệt'); return; }
    modal.confirm({
      title: 'Xác nhận duyệt giám định',
      content: `Duyệt ${selectedIds.size} hồ sơ đã chọn?`,
      okText: 'Duyệt',
      cancelText: 'Hủy',
      onOk: async () => {
        const maLkList = rows.filter((r) => selectedIds.has(r.id)).map((r) => r.maLk);
        await validateClaimsBatch(maLkList);
        message.success(`Đã duyệt ${selectedIds.size} hồ sơ`);
        setSelectedIds(new Set());
        reload();
      },
    });
  };

  const handleLockClaims = () => {
    if (selectedIds.size === 0) { message.warning('Vui lòng chọn hồ sơ cần khóa'); return; }
    modal.confirm({
      title: 'Xác nhận khóa giám định',
      content: `Khóa ${selectedIds.size} hồ sơ? Hồ sơ sau khi khóa không thể chỉnh sửa.`,
      okText: 'Khóa',
      okButtonProps: { danger: true },
      cancelText: 'Hủy',
      onOk: async () => {
        const maLkList = rows.filter((r) => selectedIds.has(r.id)).map((r) => r.maLk);
        await Promise.all(maLkList.map((maLk) => lockInsuranceClaim(maLk)));
        message.success(`Đã khóa ${selectedIds.size} hồ sơ`);
        setSelectedIds(new Set());
        reload();
      },
    });
  };

  const handleReportClick = async (reportId: string, reportName: string) => {
    setReportLoading(reportId);
    try {
      const now = dayjs();
      const month = now.month() + 1;
      const year = now.year();
      switch (reportId) {
        case 'mau19': await getMonthlyInsuranceReport(month, year); break;
        case 'mau20': await getDepartmentReport(month, year); break;
        case 'mau21': await getTreatmentTypeReport(month, year); break;
        case 'mau79': await getReportC79a(month, year); break;
        case 'mau80': await getReport80a(month, year); break;
        case 'tt102': await getMonthlyInsuranceReport(month, year); break;
      }
      try {
        let blob: Blob | null = null;
        if (reportId === 'mau79') {
          const res = await exportReportC79aToExcel(month, year);
          blob = (res instanceof Blob ? res : (res as unknown as { data: Blob }).data) as Blob;
        } else if (reportId === 'mau80') {
          const res = await exportReport80aToExcel(month, year);
          blob = (res instanceof Blob ? res : (res as unknown as { data: Blob }).data) as Blob;
        }
        if (blob) file.downloadBlob(blob, `${reportId}-${month}-${year}.xlsx`);
      } catch { /* export not available for all types */ }
      message.success(`Đã tải ${reportName}`);
    } catch {
      message.warning(`Lỗi khi tải ${reportName}`);
    } finally {
      setReportLoading(null);
    }
  };

  const handleExportXml = async () => {
    setXmlLoading(true);
    setXmlResult(null);
    try {
      const config: XmlExportConfigDto = {
        month: xmlMonth, year: xmlYear,
        includeXml1: xmlIncludes.xml1, includeXml2: xmlIncludes.xml2,
        includeXml3: xmlIncludes.xml3, includeXml4: xmlIncludes.xml4,
        includeXml5: xmlIncludes.xml5, includeXml7: xmlIncludes.xml7,
        validateBeforeExport: true, compressOutput: true,
      };
      const r = await exportXml(config);
      const result = (r.data ?? r) as unknown as XmlExportResultDto;
      setXmlResult(result);
      message.success(`Xuất XML thành công — ${result.successRecords ?? 0} hồ sơ`);
    } catch {
      message.warning('Lỗi khi xuất XML QĐ4210');
    } finally {
      setXmlLoading(false);
    }
  };

  const handleDownloadXml = async (batchId: string) => {
    try {
      const r = await downloadXmlFile(batchId);
      const blob = r.data instanceof Blob
        ? r.data
        : new Blob([r.data as unknown as BlobPart], { type: 'application/zip' });
      file.downloadBlob(blob, `xml-4210-${xmlYear}${String(xmlMonth).padStart(2, '0')}.zip`);
      message.success('Đã tải file XML');
    } catch {
      message.warning('Lỗi khi tải file XML');
    }
  };

  const handleCreateBatch = async () => {
    setBatchCreating(true);
    try {
      await createSettlementBatch(newBatchMonth, newBatchYear);
      message.success(`Đã tạo đợt quyết toán ${String(newBatchMonth).padStart(2, '0')}/${newBatchYear}`);
      setBatchCreateOpen(false);
      loadBatches(batchYear);
    } catch {
      message.warning('Lỗi khi tạo đợt quyết toán');
    } finally {
      setBatchCreating(false);
    }
  };

  /* ── Columns ── */

  const columns: ColumnDef<InsuranceClaimSummaryDto>[] = [
    {
      key: 'select', label: '', width: 36,
      render: (r) => (
        <input
          type="checkbox"
          checked={selectedIds.has(r.id)}
          onChange={() => toggleSelect(r.id)}
          onClick={(e) => e.stopPropagation()}
          style={{ cursor: 'pointer', accentColor: 'var(--a-cy)' }}
        />
      ),
    },
    { key: 'maLk', label: 'Mã LK', mono: true, width: 130, render: (r) => r.maLk },
    {
      key: 'patient', label: 'Bệnh nhân',
      render: (r) => (
        <div className="cell-2l">
          <b>{r.patientName}</b>
          <i className="mono">{r.patientCode}</i>
        </div>
      ),
    },
    { key: 'bhyt', label: 'Số thẻ BHYT', mono: true, width: 160, render: (r) => r.insuranceNumber },
    {
      key: 'dx', label: 'Chẩn đoán',
      render: (r) => (
        <div className="cell-2l">
          <b>{r.diagnosisName}</b>
          <i className="mono">{r.diagnosisCode}</i>
        </div>
      ),
    },
    { key: 'admit',     label: 'Vào viện',       mono: true, width: 100, render: (r) => fmtDMY(r.admissionDate) },
    { key: 'discharge', label: 'Ra viện',         mono: true, width: 100, render: (r) => fmtDMY(r.dischargeDate) },
    { key: 'amount',    label: 'Tổng tiền',       mono: true, width: 120, render: (r) => fmtVND(r.totalAmount) },
    { key: 'bhyt-amt',  label: 'BHYT chi trả',   mono: true, width: 120, render: (r) => fmtVND(r.insuranceAmount) },
    {
      key: 'status', label: 'TT', width: 120,
      render: (r) => {
        const sk = statusKey(r.status);
        return <StatusBadge tone={statusTone(sk)} dot>{r.statusName || STATUS_TABS.find((t) => t.v === sk)?.l}</StatusBadge>;
      },
    },
  ];

  /* ── Render ── */

  const firstRejected = useMemo(() => rows.find((r) => r.status === 4), [rows]);

  return (
    <div className="ab">
      <KpiStrip
        items={[
          { lbl: 'Tổng hồ sơ',   val: kpis.total,       sub: '60 ngày' },
          { lbl: 'Chờ duyệt',    val: kpis.pending,      sub: 'đã gửi BHXH', tone: 'warn' },
          { lbl: 'Đã duyệt',     val: kpis.approved,     sub: `${kpis.approvalRate}% pass`, tone: 'ok' },
          { lbl: 'Từ chối',      val: kpis.rejected,     sub: 'cần sửa', tone: 'crit' },
          { lbl: 'Tổng tiền',    val: Math.round(kpis.totalAmount / 1_000_000),      unit: 'tr', sub: 'VND' },
          { lbl: 'BHYT chi trả', val: Math.round(kpis.insuranceAmount / 1_000_000),  unit: 'tr', sub: 'VND', tone: 'ok' },
        ]}
      />

      <TopTabs<PageTab> tab={topTab} setTab={setTopTab} tabs={TOP_TABS} />

      {topTab === 'claims' && (
        <>
          {kpis.rejected > 0 && firstRejected && (
            <Alert
              title={`Có ${kpis.rejected} hồ sơ bị từ chối cần xử lý`}
              type="warning"
              showIcon
              style={{ marginBottom: 8 }}
              action={
                <Btn variant="ghost" onClick={() => setDetail(firstRejected)}>
                  Xem chi tiết
                </Btn>
              }
            />
          )}

          <div className="ab-tools">
            <SearchBox value={search} onChange={setSearch} placeholder="Tìm BN / mã LK / số thẻ BHYT / CĐ…" />
            <DatePicker.RangePicker
              format="DD/MM/YYYY"
              value={claimDateRange}
              onChange={(dates) => {
                setClaimDateRange(dates ? [dates[0]!, dates[1]!] : null);
                setPage(0);
              }}
              placeholder={['Vào viện từ', 'đến ngày']}
              size="small"
              style={{ height: 28 }}
            />
            <Btn variant="ghost" onClick={() => { setSearch(''); setStab('all'); setClaimDateRange(null); setSelectedIds(new Set()); }}>
              <TermIcon name="refresh" size={12} /> Bỏ lọc
            </Btn>
            <span className="spacer" />
            {selectedIds.size > 0 && (
              <>
                <Btn variant="ghost" onClick={handleApproveClaims}>
                  <TermIcon name="check" size={12} /> Duyệt ({selectedIds.size})
                </Btn>
                <Btn variant="ghost" onClick={handleLockClaims}>
                  <TermIcon name="lock" size={12} /> Khóa ({selectedIds.size})
                </Btn>
              </>
            )}
            <Btn variant="ghost" onClick={handleSync} disabled={syncLoading}>
              <TermIcon name="refresh" size={12} /> {syncLoading ? 'Đang đồng bộ…' : 'Đồng bộ BHXH'}
            </Btn>
            <Btn variant="ghost" onClick={reload}>
              <TermIcon name="refresh" size={12} /> Làm mới
            </Btn>
            <Btn variant="ghost" onClick={() => navigate('/v2/bhxh-audit')}>
              <TermIcon name="check" size={12} /> Validate XML
            </Btn>
            <Btn variant="ghost" onClick={() => {
              const header = ['Ma LK', 'Ma BN', 'Ho ten', 'So the BHYT', 'Ngay vao vien', 'Ngay ra vien', 'Ma ICD', 'Chan doan', 'Tong tien', 'BHYT chi tra', 'BN dong chi tra', 'BN tu tra', 'Trang thai'];
              const csvRows = filtered.map((r) => [
                r.maLk, r.patientCode, r.patientName, r.insuranceNumber,
                r.admissionDate ? dayjs(r.admissionDate).format('DD/MM/YYYY') : '',
                r.dischargeDate ? dayjs(r.dischargeDate).format('DD/MM/YYYY') : '',
                r.diagnosisCode, r.diagnosisName,
                r.totalAmount, r.insuranceAmount, r.coPayAmount, r.patientAmount,
                r.statusName,
              ]);
              downloadCsv(
                `bhyt-claims-${dayjs().format('YYYYMMDD-HHmm')}.csv`,
                [header, ...csvRows].map((row) => row.map(escapeCsvCell).join(',')),
              );
              message.success(`Đã xuất ${filtered.length} hồ sơ BHYT`);
            }}>
              <TermIcon name="download" size={12} /> Xuất CSV
            </Btn>
            <Btn variant="primary" onClick={() => navigate('/v2/bhxh-config')}>
              <TermIcon name="send" size={12} /> Gửi BHXH
            </Btn>
          </div>

          <StatusTabs<StatusKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

          <DataTable<InsuranceClaimSummaryDto>
            columns={columns}
            data={paged}
            rowKey={(r) => r.id}
            onRowClick={(r) => setDetail(r)}
            actions={(r) => (
              <div className="ab-actions">
                <ActBtn ic="eye" title="Chi tiết" onClick={() => setDetail(r)} />
                <ActBtn ic="print" title="In phiếu BHYT" onClick={() => { setDetail(r); setTimeout(() => window.print(), 300); }} />
              </div>
            )}
            empty={loading ? 'Đang tải…' : (
              <div className="ab-empty">
                <TermIcon name="search" size={20} />
                <div>Không có hồ sơ BHYT nào</div>
              </div>
            )}
          />

          <Pager page={page} totalPages={totalPages} setPage={setPage} total={filtered.length} perPage={PAGE_SIZE} />
        </>
      )}

      {topTab === 'reports' && (
        <div style={{ padding: '16px 0' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 12,
          }}>
            {REPORTS.map((rep) => (
              <button
                key={rep.id}
                type="button"
                disabled={reportLoading === rep.id}
                onClick={() => handleReportClick(rep.id, rep.label)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                  gap: 4, padding: '14px 16px',
                  background: 'var(--surface-1)', border: '1px solid var(--border)',
                  borderRadius: 6, cursor: 'pointer', textAlign: 'left',
                  opacity: reportLoading === rep.id ? 0.6 : 1,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--surface-1)')}
              >
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--t-1)' }}>
                  {reportLoading === rep.id ? 'Đang tải…' : rep.label}
                </span>
                <span style={{ fontSize: 12, color: 'var(--t-3)' }}>{rep.sub}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {topTab === 'xml' && (
        <div style={{ padding: '16px 0', maxWidth: 700 }}>
          <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontSize: 13, color: 'var(--t-2)', whiteSpace: 'nowrap' }}>Tháng xuất:</label>
            <DatePicker
              picker="month"
              value={dayjs(`${xmlYear}-${String(xmlMonth).padStart(2, '0')}-01`)}
              onChange={(d) => {
                if (d) { setXmlMonth(d.month() + 1); setXmlYear(d.year()); setXmlResult(null); }
              }}
              format="MM/YYYY"
              size="small"
              style={{ width: 120 }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--t-2)', marginBottom: 8 }}>Bao gồm file XML:</div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {(Object.keys(xmlIncludes) as Array<keyof typeof xmlIncludes>).map((k) => (
                <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={xmlIncludes[k]}
                    onChange={(e) => setXmlIncludes((prev) => ({ ...prev, [k]: e.target.checked }))}
                    style={{ accentColor: 'var(--a-cy)', cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: 500 }}>{k.toUpperCase()}</span>
                  <span style={{ color: 'var(--t-3)', fontSize: 11 }}>({XML_LABELS[k]})</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
            <Btn variant="primary" loading={xmlLoading} icon="download" onClick={handleExportXml}>
              Xuất XML QĐ4210
            </Btn>
            {xmlResult?.batchId && (
              <Btn variant="ghost" icon="download" onClick={() => handleDownloadXml(xmlResult.batchId)}>
                Tải về (.zip)
              </Btn>
            )}
          </div>

          {xmlResult && (
            <div style={{
              background: 'var(--surface-1)', border: '1px solid var(--border)',
              borderRadius: 6, padding: 16,
            }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: 'var(--t-1)' }}>
                Kết quả xuất XML — đợt {String(xmlMonth).padStart(2, '0')}/{xmlYear}
              </div>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: xmlResult.errors.length > 0 ? 12 : 0 }}>
                <span style={{ fontSize: 13 }}>Tổng: <b>{xmlResult.totalRecords}</b></span>
                <span style={{ fontSize: 13, color: 'var(--s-ok)' }}>Thành công: <b>{xmlResult.successRecords}</b></span>
                {xmlResult.failedRecords > 0 && (
                  <span style={{ fontSize: 13, color: 'var(--s-crit)' }}>Thất bại: <b>{xmlResult.failedRecords}</b></span>
                )}
                {xmlResult.fileSize > 0 && (
                  <span style={{ fontSize: 13, color: 'var(--t-3)' }}>Kích thước: {Math.round(xmlResult.fileSize / 1024)} KB</span>
                )}
              </div>
              {xmlResult.errors.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, color: 'var(--t-2)', marginBottom: 4 }}>
                    Lỗi ({xmlResult.errors.length} hồ sơ):
                  </div>
                  <div style={{ maxHeight: 180, overflow: 'auto', fontSize: 12, color: 'var(--s-crit)', lineHeight: 1.6 }}>
                    {xmlResult.errors.slice(0, 30).map((e, i) => (
                      <div key={i}><span className="mono">{e.maLk}</span>: {e.errorMessage}</div>
                    ))}
                    {xmlResult.errors.length > 30 && (
                      <div style={{ color: 'var(--t-3)' }}>… và {xmlResult.errors.length - 30} lỗi khác</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {topTab === 'batch' && (
        <>
          <div className="ab-tools">
            <DatePicker
              picker="year"
              value={dayjs(String(batchYear))}
              onChange={(d) => { if (d) setBatchYear(d.year()); }}
              size="small"
              format="YYYY"
              style={{ width: 100 }}
            />
            <span className="spacer" />
            <Btn icon="plus" variant="primary" onClick={() => setBatchCreateOpen(true)}>
              Tạo đợt quyết toán
            </Btn>
            <Btn variant="ghost" onClick={() => loadBatches(batchYear)}>
              <TermIcon name="refresh" size={12} /> Làm mới
            </Btn>
          </div>

          <DataTable<InsuranceSettlementBatchDto>
            columns={BATCH_COLS}
            data={batches}
            rowKey={(r) => r.id}
            empty={batchLoading ? 'Đang tải…' : 'Chưa có đợt quyết toán nào'}
          />

          <ModalShell
            open={batchCreateOpen}
            onClose={() => setBatchCreateOpen(false)}
            title="Tạo đợt quyết toán"
            footer={
              <>
                <Btn onClick={() => setBatchCreateOpen(false)}>Hủy</Btn>
                <Btn icon="check" loading={batchCreating} onClick={handleCreateBatch}>Tạo đợt</Btn>
              </>
            }
          >
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '8px 0' }}>
              <label style={{ fontSize: 13, color: 'var(--t-2)', whiteSpace: 'nowrap' }}>Kỳ quyết toán:</label>
              <DatePicker
                picker="month"
                value={dayjs(`${newBatchYear}-${String(newBatchMonth).padStart(2, '0')}-01`)}
                onChange={(d) => { if (d) { setNewBatchMonth(d.month() + 1); setNewBatchYear(d.year()); } }}
                format="MM/YYYY"
                size="small"
                style={{ width: 130 }}
              />
            </div>
          </ModalShell>
        </>
      )}

      <DrawerShell
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail
          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-10)' }}>
              <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 'var(--fs-md)' }}>{detail.maLk}</span>
              <span style={{ fontSize: 14 }}>{detail.patientName}</span>
            </span>
          : ''}
        sub={detail ? `${detail.patientCode} · ${fmtDMY(detail.admissionDate)}` : ''}
        size="lg"
      >
        {detail && <InsuranceDrawerBody r={detail} />}
      </DrawerShell>
    </div>
  );
};

export default InsuranceV2;

const InsuranceDrawerBody: React.FC<{ r: InsuranceClaimSummaryDto }> = ({ r }) => {
  const sk = statusKey(r.status);
  const tone = statusTone(sk);
  const lbl = r.statusName || STATUS_TABS.find((t) => t.v === sk)?.l || '';
  return (
    <>
      <div className="rec-section">
        <h5><TermIcon name="check" size={11} /> TRẠNG THÁI</h5>
        <div className={`rec-status-banner ${tone}`}>
          <StatusBadge tone={tone} dot>{lbl}</StatusBadge>
          {r.submitDate && <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>Gửi {fmtDMY(r.submitDate)}</span>}
        </div>
      </div>

      <div className="rec-section">
        <h5><TermIcon name="user" size={11} /> BỆNH NHÂN & THẺ BHYT</h5>
        <div className="rec-kv">
          <span>Họ tên</span><b>{r.patientName}</b>
          <span>Mã BN</span><span className="mono" style={{ color: 'var(--a-cy)' }}>{r.patientCode}</span>
          <span>Số thẻ BHYT</span><span className="mono">{r.insuranceNumber}</span>
          <span>Mã LK</span><span className="mono">{r.maLk}</span>
        </div>
      </div>

      <div className="rec-section">
        <h5><TermIcon name="stethoscope" size={11} /> CHẨN ĐOÁN</h5>
        <div className="rec-kv">
          <span>Mã ICD</span><b className="mono">{r.diagnosisCode}</b>
          <span>Tên</span><span>{r.diagnosisName}</span>
          <span>Vào viện</span><span className="mono">{fmtDMY(r.admissionDate)}</span>
          <span>Ra viện</span><span className="mono">{fmtDMY(r.dischargeDate)}</span>
        </div>
      </div>

      <div className="rec-section">
        <h5><TermIcon name="dollar" size={11} /> CHI PHÍ</h5>
        <div className="rec-kv">
          <span>Tổng tiền</span><b className="mono">{fmtVND(r.totalAmount)}</b>
          <span>BHYT chi trả</span><b className="mono" style={{ color: '#15803d' }}>{fmtVND(r.insuranceAmount)}</b>
          <span>BN đồng chi trả</span><b className="mono">{fmtVND(r.coPayAmount)}</b>
          <span>BN tự trả</span><b className="mono" style={{ color: 'var(--s-warn)' }}>{fmtVND(r.patientAmount)}</b>
        </div>
      </div>

      {r.rejectReason && (
        <div className="rec-section">
          <h5><TermIcon name="alert" size={11} /> LÝ DO TỪ CHỐI</h5>
          <div style={{ fontSize: 12.5, color: 'var(--s-crit)', whiteSpace: 'pre-wrap' }}>{r.rejectReason}</div>
        </div>
      )}
    </>
  );
};
