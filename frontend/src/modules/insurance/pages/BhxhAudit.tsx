import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useTabState } from '../../../hooks/useTabState';
import * as file from '../../../services/file.service';
import dayjs from 'dayjs';
import { App as AntdApp, DatePicker, InputNumber } from 'antd';
import {
  getAuditSessions,
  createAuditSession,
  runAuditSession,
  getAuditErrors,
  fixAuditError,
  approveAuditSession,
  submitToPortal,
  submitBatch,
  exportXml,
  exportBatchXml,
  printAuditForm,
  importAuditCsv,
  getImportedRows,
  type BhxhAuditSession,
  type BhxhAuditError,
  type BhxhAuditImportRow,
  type BhxhAuditImportResult,
} from '../api/bhxhAudit';
import { normalizeArrayResponse } from '../../../utils/apiNormalize';
import { openPrintWindow } from '../../../utils/printWindow';
import { friendlyErrorMessage } from '../../../utils/friendlyError';
import { HOSPITAL_NAME } from '../../../constants/hospital';
import {
  KpiStrip, SearchBox, DataTable, Pager, StatusBadge, ActBtn, Btn,
  StatusTabs, DrawerShell, DrSec, DrField, fmtVNDg, fmtDTg, ti, Ico, useListData,
  type ColumnDef,
} from '@/_v2kit';
import { RefreshButton } from '../../../components/actions';

// R3: màn này là PHIÊN GIÁM ĐỊNH (/bhxh-audit/sessions — mỗi phiên = 1 kỳ tháng, chạy kiểm tra trên hồ sơ BHYT của kỳ).
// Trước đây trang đọc kết quả phiên như danh sách HỒ SƠ (maLk/patientName/auditStatus…) → mọi dòng trống, tab/KPI sai,
// và các nút duyệt/gửi/xuất XML (vốn theo phiên) chạy trên dòng rỗng. Danh sách hồ sơ từng người bệnh nằm ở màn
// "Giám định BHYT" (/v2/insurance).

const PER = 18;

// BhxhAuditService.StatusNames: 0 nháp · 1 đang kiểm tra · 2 hoàn thành · 3 đã gửi cổng · 4 đã duyệt
type SessionKey = 'open' | 'done' | 'approved' | 'sent';
const STATUS_TABS = [
  { v: 'open' as SessionKey,     l: 'Chưa kiểm tra', tone: 'info' as const },
  { v: 'done' as SessionKey,     l: 'Chờ duyệt',     tone: 'warn' as const },
  { v: 'approved' as SessionKey, l: 'Đã duyệt',      tone: 'ok' as const },
  { v: 'sent' as SessionKey,     l: 'Đã gửi cổng',   tone: 'ok' as const },
];
const sessionKey = (s: number): SessionKey => s === 4 ? 'approved' : s === 3 ? 'sent' : s === 2 ? 'done' : 'open';
const STATUS_LABEL: Record<number, string> = { 0: 'Nháp', 1: 'Đang kiểm tra', 2: 'Hoàn thành', 3: 'Đã gửi cổng', 4: 'Đã duyệt' };
const statusTone = (s: number) => s === 4 || s === 3 ? 'ok' : s === 2 ? 'warn' : 'info';
const period = (r: BhxhAuditSession) => `${String(r.periodMonth).padStart(2, '0')}/${r.periodYear}`;

// Import tab status tabs
type ImportTabKey = 'all' | 'chuaDuyet' | 'daDuyet' | 'tuChoi';
const IMPORT_STATUS_TABS: Array<{ v: ImportTabKey; l: string; tone: 'ok' | 'warn' | 'crit' | 'info' }> = [
  { v: 'all',        l: 'Tất cả',      tone: 'info' },
  { v: 'chuaDuyet',  l: 'Chưa duyệt',  tone: 'warn' },
  { v: 'daDuyet',    l: 'Đã duyệt',    tone: 'ok' },
  { v: 'tuChoi',     l: 'Từ chối',     tone: 'crit' },
];
const importTabToInt = (t: ImportTabKey) => t === 'chuaDuyet' ? 0 : t === 'daDuyet' ? 1 : t === 'tuChoi' ? 2 : undefined;

const loadSessions = async (): Promise<BhxhAuditSession[]> => {
  const res = await getAuditSessions();
  return normalizeArrayResponse<BhxhAuditSession>(res.data);
};

const BhxhAuditV2: React.FC = () => {
  const { message, modal } = AntdApp.useApp();
  const { rows: items, loading, reload: load } = useListData<BhxhAuditSession>(
    loadSessions, useCallback(() => ti('Không tải được phiên giám định BHXH'), []));
  const [search, setSearch] = useState('');
  const [stab, setStab] = useTabState<SessionKey | 'all'>('all', 'tab');
  const [fYear, setFYear] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<BhxhAuditSession | null>(null);
  const [errors, setErrors] = useState<BhxhAuditError[]>([]);
  const [errorsLoading, setErrorsLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  // --- Import tab state ---
  const [activeMainTab, setActiveMainTab] = useState<'sessions' | 'import'>('sessions');
  const importFileRef = useRef<HTMLInputElement>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<BhxhAuditImportResult | null>(null);
  const [importedRows, setImportedRows] = useState<BhxhAuditImportRow[]>([]);
  const [importTotal, setImportTotal] = useState(0);
  const [importPage, setImportPage] = useState(0);
  const [importTab, setImportTab] = useTabState<ImportTabKey>('all', 'stab');
  const [importSearch, setImportSearch] = useState('');
  const [importCounts, setImportCounts] = useState({ all: 0, chuaDuyet: 0, daDuyet: 0, tuChoi: 0 });
  const [importRowsLoading, setImportRowsLoading] = useState(false);

  const loadImportedRows = useCallback(async (tab: ImportTabKey, pg: number, kw: string) => {
    setImportRowsLoading(true);
    try {
      const res = await getImportedRows({
        trangThai: importTabToInt(tab),
        pageIndex: pg,
        pageSize: 20,
        keyword: kw || undefined,
      });
      const d = (res as { data: { items: BhxhAuditImportRow[]; totalCount: number; countChuaDuyet: number; countDaDuyet: number; countTuChoi: number } }).data;
      setImportedRows(d.items ?? []);
      setImportTotal(d.totalCount ?? 0);
      setImportCounts({ all: d.totalCount ?? 0, chuaDuyet: d.countChuaDuyet ?? 0, daDuyet: d.countDaDuyet ?? 0, tuChoi: d.countTuChoi ?? 0 });
    } catch { ti('Không tải được danh sách hồ sơ import'); }
    finally { setImportRowsLoading(false); }
  }, []);

  const handleImportCsv = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    setImportResult(null);
    try {
      const res = await importAuditCsv(file);
      const r = (res as { data: BhxhAuditImportResult }).data;
      setImportResult(r);
      void message.success(`Import xong: ${r.importedRows} dong / ${r.totalRows}`);
      void loadImportedRows('all', 0, '');
      setImportTab('all');
      setImportPage(0);
    } catch {
      void message.error('Import that bai — kiem tra lai file CSV');
    } finally {
      setImportLoading(false);
      if (importFileRef.current) importFileRef.current.value = '';
    }
  }, [message, loadImportedRows]);

  const openSession = useCallback(async (r: BhxhAuditSession) => {
    setSel(r);
    setErrors([]);
    setErrorsLoading(true);
    try {
      const { data } = await getAuditErrors(r.id);
      setErrors(normalizeArrayResponse<BhxhAuditError>(data));
    } catch { ti('Không tải được danh sách lỗi của phiên'); }
    finally { setErrorsLoading(false); }
  }, []);

  /** Chạy 1 thao tác trên phiên, báo lỗi server nguyên văn, rồi tải lại danh sách + drawer. */
  const act = async (key: string, fn: () => Promise<unknown>, ok: string, refreshSel?: BhxhAuditSession) => {
    setBusy(key);
    try {
      await fn();
      void message.success(ok);
      load();
      if (refreshSel) {
        const { data } = await getAuditSessions({ periodYear: refreshSel.periodYear, periodMonth: refreshSel.periodMonth });
        const fresh = normalizeArrayResponse<BhxhAuditSession>(data).find((s) => s.id === refreshSel.id);
        if (fresh) void openSession(fresh);
      }
    } catch (err) {
      void message.error(friendlyErrorMessage(err, 'Thao tác thất bại'));
    } finally {
      setBusy(null);
    }
  };

  const handleCreate = () => {
    let picked = dayjs().subtract(1, 'month');
    modal.confirm({
      title: 'Tạo phiên giám định BHXH',
      content: (
        <div>
          <p style={{ marginBottom: 'var(--space-8)' }}>Chọn kỳ (tháng) — phiên sẽ kiểm tra hồ sơ BHYT có ngày KCB trong tháng.</p>
          <DatePicker picker="month" format="MM/YYYY" defaultValue={picked} allowClear={false}
            onChange={(d) => { if (d) picked = d; }} />
        </div>
      ),
      okText: 'Tạo và chạy kiểm tra',
      cancelText: 'Hủy',
      onOk: () => act('create', async () => {
        const { data } = await createAuditSession({ periodMonth: picked.month() + 1, periodYear: picked.year() });
        await runAuditSession(data.id);
      }, `Đã tạo và kiểm tra phiên ${picked.format('MM/YYYY')}`),
    });
  };

  const handleRun = (r: BhxhAuditSession) =>
    act(`run-${r.id}`, () => runAuditSession(r.id), `Đã chạy kiểm tra phiên ${r.sessionCode}`, r);

  const handleApprove = (r: BhxhAuditSession) => {
    let notes = '';
    modal.confirm({
      title: `Duyệt phiên giám định · ${r.sessionCode}`,
      content: (
        <div>
          <p style={{ marginBottom: 'var(--space-8)' }}>Kỳ {period(r)} · {r.totalRecords} hồ sơ · {r.errorCount} lỗi</p>
          <textarea
            placeholder="Ghi chú (tùy chọn)"
            rows={3}
            style={{ width: '100%', resize: 'vertical', padding: 'var(--space-6)', borderRadius: 4, border: '1px solid #d9d9d9' }}
            onChange={(e) => { notes = e.target.value; }}
          />
        </div>
      ),
      okText: 'Duyệt',
      cancelText: 'Hủy',
      onOk: () => act(`approve-${r.id}`, () => approveAuditSession(r.id, notes || undefined), `Đã duyệt phiên ${r.sessionCode}`, r),
    });
  };

  const handleSubmitToPortal = (r: BhxhAuditSession) =>
    act(`submit-${r.id}`, () => submitToPortal(r.id), `Đã gửi phiên ${r.sessionCode} lên cổng BHXH`, r);

  const handleFix = (e: BhxhAuditError) => {
    let amount = e.adjustedAmount;
    let notes = e.notes ?? '';
    modal.confirm({
      title: `Xử lý lỗi · ${e.errorTypeName ?? e.errorType}`,
      content: (
        <div>
          <p style={{ marginBottom: 'var(--space-8)' }}>{e.patientName} · {e.errorDescription}</p>
          <div style={{ marginBottom: 'var(--space-6)' }}>Số tiền còn được thanh toán (0 – {fmtVNDg(e.originalAmount)})</div>
          <InputNumber min={0} max={e.originalAmount} defaultValue={e.adjustedAmount} style={{ width: '100%' }}
            onChange={(v) => { amount = Number(v ?? 0); }} />
          <textarea placeholder="Ghi chú" rows={2} defaultValue={notes}
            style={{ width: '100%', marginTop: 'var(--space-8)', padding: 'var(--space-6)', borderRadius: 4, border: '1px solid #d9d9d9' }}
            onChange={(ev) => { notes = ev.target.value; }} />
        </div>
      ),
      okText: 'Lưu',
      cancelText: 'Hủy',
      onOk: () => sel && act(`fix-${e.id}`, () => fixAuditError(e.id, { adjustedAmount: amount, notes: notes || undefined }),
        'Đã ghi nhận xử lý lỗi', sel),
    });
  };

  const years = useMemo(() => Array.from(new Set(items.map((r) => r.periodYear))).sort((a, b) => b - a), [items]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    STATUS_TABS.forEach((s) => { c[s.v] = items.filter((r) => sessionKey(r.status) === s.v).length; });
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (stab !== 'all' && sessionKey(r.status) !== stab) return false;
      if (fYear && r.periodYear !== fYear) return false;
      if (!k) return true;
      return [r.sessionCode, period(r), r.auditorName, r.notes].some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fYear]);

  const handleBatchSubmit = () => {
    const ids = filtered.filter((r) => r.status === 2 || r.status === 4).map((r) => r.id);
    if (ids.length === 0) { void message.info('Không có phiên đã kiểm tra/đã duyệt nào chưa gửi trong bộ lọc hiện tại'); return; }
    modal.confirm({
      title: 'Gửi hàng loạt lên cổng BHXH',
      content: `Sẽ gửi ${ids.length} phiên đã kiểm tra chưa gửi (theo bộ lọc hiện tại).`,
      okText: 'Gửi hàng loạt',
      cancelText: 'Hủy',
      onOk: () => act('batch', async () => {
        const { data: res } = await submitBatch(ids);
        void message.info(`Gửi: ${res?.submitted ?? 0} · bỏ qua ${res?.skipped ?? 0} · lỗi ${res?.failed ?? 0}`);
      }, 'Đã xử lý gửi hàng loạt'),
    });
  };

  const handleBatchExportXml = () => {
    const ids = filtered.map((r) => r.id);
    if (ids.length === 0) { void message.info('Không có phiên nào trong bộ lọc hiện tại'); return; }
    return act('batch-xml', async () => {
      const { data: blob } = await exportBatchXml(ids);
      file.downloadBlob(blob as unknown as Blob, `BHXH_XML_batch_${dayjs().format('YYYYMMDD')}.zip`);
    }, `Đã tải ZIP XML ${ids.length} phiên`);
  };

  const handleExportXml = (r: BhxhAuditSession) => act(`xml-${r.id}`, async () => {
    const { data: blob } = await exportXml(r.id);
    file.downloadBlob(blob as unknown as Blob, `BHXH_XML_${r.sessionCode}_${dayjs().format('YYYYMMDD')}.xml`);
  }, `Đã tải XML phiên ${r.sessionCode}`);

  const handlePrintAuditForm = (r: BhxhAuditSession) => act(`print-${r.id}`, async () => {
    const { data: html } = await printAuditForm(r.id);
    openPrintWindow(html as unknown as string, { onBlocked: () => message.error('Trình duyệt chặn popup — cho phép popup để in') });
  }, 'Đã mở phiếu in');

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const totalAmount = items.reduce((s, r) => s + (r.totalAmount || 0), 0);
  const totalErrorAmount = items.reduce((s, r) => s + (r.errorAmount || 0), 0);

  const handlePrintList = () => {
    const esc = (v: string | number | undefined) => String(v ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch] as string));
    const rows = filtered.map((r, idx) => `
        <tr>
          <td>${idx + 1}</td><td>${esc(r.sessionCode)}</td><td>${period(r)}</td>
          <td style="text-align:right">${r.totalRecords}</td>
          <td style="text-align:right">${esc(fmtVNDg(r.totalAmount))}</td>
          <td style="text-align:right">${r.errorCount}</td>
          <td style="text-align:right">${esc(fmtVNDg(r.errorAmount))}</td>
          <td>${esc(STATUS_LABEL[r.status] ?? r.statusName)}</td>
        </tr>`).join('');
    openPrintWindow(`
      <html><head><title>Danh sách phiên giám định BHXH</title>
      <style>
        body { font-family: 'Times New Roman', serif; margin: 20px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border: 1px solid #333; padding: 4px 6px; }
        th { background: #f0f0f0; }
        h2 { text-align: center; }
        .header { text-align: center; margin-bottom: 20px; }
      </style></head><body>
        <div class="header">
          <p>${esc(HOSPITAL_NAME)}</p>
          <h2>DANH SÁCH PHIÊN GIÁM ĐỊNH BHXH</h2>
          <p>Ngày in: ${dayjs().format('DD/MM/YYYY HH:mm')}</p>
        </div>
        <table>
          <thead><tr>
            <th>STT</th><th>Mã phiên</th><th>Kỳ</th><th>Số hồ sơ</th><th>Tổng chi phí</th>
            <th>Số lỗi</th><th>Tiền lỗi</th><th>Trạng thái</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </body></html>
    `, { print: 'immediate', onBlocked: () => message.error('Trình duyệt chặn popup — cho phép popup để in') });
  };

  const cols: ColumnDef<BhxhAuditSession>[] = [
    { key: 'code', label: 'Mã phiên', code: true, render: (r) => r.sessionCode },
    { key: 'period', label: 'Kỳ', mono: true, render: (r) => period(r) },
    { key: 'records', label: 'Số hồ sơ', mono: true, render: (r) => r.totalRecords },
    { key: 'amt', label: 'Tổng chi phí', mono: true, render: (r) => fmtVNDg(r.totalAmount) },
    { key: 'errs', label: 'Số lỗi', mono: true, render: (r) => r.errorCount > 0
      ? <span style={{ color: 'var(--a-rd-text)', fontWeight: 600 }}>{r.errorCount}</span> : 0 },
    { key: 'errAmt', label: 'Tiền lỗi', mono: true, render: (r) => fmtVNDg(r.errorAmount) },
    { key: 'status', label: 'Trạng thái', render: (r) =>
      <StatusBadge tone={statusTone(r.status)} dot>{STATUS_LABEL[r.status] ?? r.statusName ?? '—'}</StatusBadge> },
    { key: 'auditor', label: 'Người giám định', render: (r) => r.auditorName || '—' },
    { key: 'created', label: 'Tạo lúc', render: (r) => fmtDTg(r.createdAt) },
  ];

  const actions = (r: BhxhAuditSession) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết / lỗi" onClick={() => void openSession(r)} />
      {r.status < 3 && (
        <ActBtn ic="refresh" title="Chạy kiểm tra" loading={busy === `run-${r.id}`} onClick={() => void handleRun(r)} />
      )}
      {r.status === 2 && (
        <ActBtn ic="check" title="Duyệt" loading={busy === `approve-${r.id}`} onClick={() => handleApprove(r)} />
      )}
      {(r.status === 2 || r.status === 4) && (
        <ActBtn ic="send" title="Gửi cổng BHXH" loading={busy === `submit-${r.id}`} onClick={() => void handleSubmitToPortal(r)} />
      )}
    </div>
  );

  const errCols: ColumnDef<BhxhAuditError>[] = [
    { key: 'type', label: 'Loại lỗi', render: (e) => e.errorTypeName ?? e.errorType },
    { key: 'pat', label: 'Người bệnh', render: (e) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{e.patientName || '—'}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{e.insuranceNumber}</div>
      </div>
    ) },
    { key: 'desc', label: 'Mô tả', render: (e) => e.errorDescription || '—' },
    { key: 'orig', label: 'Tiền gốc', mono: true, render: (e) => fmtVNDg(e.originalAmount) },
    { key: 'adj', label: 'Còn thanh toán', mono: true, render: (e) => fmtVNDg(e.adjustedAmount) },
    { key: 'fixed', label: 'Xử lý', render: (e) => e.isFixed
      ? <StatusBadge tone="ok" dot>Đã xử lý</StatusBadge> : <StatusBadge tone="warn" dot>Chưa</StatusBadge> },
  ];

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Phiên giám định', val: items.length, sub: 'tất cả kỳ' },
        { lbl: 'Chờ duyệt', val: counts.done || 0, sub: 'đã kiểm tra', tone: 'warn' },
        { lbl: 'Đã duyệt', val: counts.approved || 0, sub: 'chờ gửi cổng', tone: 'ok' },
        { lbl: 'Đã gửi cổng', val: counts.sent || 0, sub: `${Math.round(((counts.sent || 0) / Math.max(1, items.length)) * 100)}%`, tone: 'info' },
        { lbl: 'Tổng chi phí', val: Math.round(totalAmount / 1_000_000), unit: 'tr', sub: 'VND', tone: 'info' },
        { lbl: 'Tiền lỗi', val: Math.round(totalErrorAmount / 1_000_000), unit: 'tr', sub: 'VND', tone: totalErrorAmount > 0 ? 'crit' : 'ok' },
      ]} />

      {/* Main tab: Phien giam dinh vs Import CSV */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--line)', padding: '0 12px' }}>
        {(['sessions', 'import'] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setActiveMainTab(t);
              if (t === 'import') void loadImportedRows(importTab, importPage, importSearch);
            }}
            style={{
              padding: '8px 20px', border: 'none', background: 'none', cursor: 'pointer',
              fontWeight: activeMainTab === t ? 600 : 400,
              borderBottom: activeMainTab === t ? '2px solid var(--pri)' : '2px solid transparent',
              color: activeMainTab === t ? 'var(--pri)' : 'var(--t-1)',
              fontSize: 'var(--fs-md)',
            }}
          >
            {t === 'sessions' ? 'Phiên giám định' : 'Import CSV'}
          </button>
        ))}
      </div>

      {activeMainTab === 'sessions' && <>
      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={setSearch} placeholder="Tìm mã phiên / kỳ / người giám định…" />
        <DatePicker
          picker="year"
          size="small"
          placeholder="Năm"
          value={fYear ? dayjs(`${fYear}-01-01`) : null}
          onChange={(d) => { setFYear(d ? d.year() : undefined); setPage(0); }}
          disabledDate={(d) => years.length > 0 && !years.includes(d.year())}
        />
        <Btn variant="ghost" onClick={() => { setSearch(''); setStab('all'); setFYear(undefined); }}>
          <Ico name="refresh" size={12} /> Bỏ lọc
        </Btn>
        <span className="spacer" />
        <RefreshButton onRefresh={async () => { load(); }} />
        <Btn variant="ghost" onClick={handlePrintList} title="In danh sách phiên theo bộ lọc hiện tại">
          <Ico name="print" size={12} /> In danh sách
        </Btn>
        <Btn
          variant="ghost"
          loading={busy === 'batch-xml'}
          disabled={filtered.length === 0}
          onClick={() => void handleBatchExportXml()}
          title={`Xuất ZIP XML cho ${filtered.length} phiên trong bộ lọc hiện tại`}
        >
          <Ico name="download" size={12} /> Xuất XML hàng loạt
        </Btn>
        <Btn variant="ghost" loading={busy === 'batch'} onClick={handleBatchSubmit}>
          <Ico name="send" size={12} /> Gửi tất cả lên cổng
        </Btn>
        <Btn variant="primary" loading={busy === 'create'} onClick={handleCreate}>
          <Ico name="plus" size={12} /> Tạo phiên
        </Btn>
      </div>

      <StatusTabs<SessionKey> value={stab} onChange={setStab} tabs={STATUS_TABS} counts={counts} />

      <DataTable<BhxhAuditSession>
        columns={cols} data={filtered} page={page} perPage={PER} onSortChange={() => setPage(0)} rowKey={(r) => r.id}
        onRowClick={(r) => void openSession(r)} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có phiên giám định — bấm "Tạo phiên" để kiểm tra một kỳ'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="xl"
        title={sel ? `Phiên giám định · ${sel.sessionCode}` : ''}
        sub={sel ? `Kỳ ${period(sel)} · ${STATUS_LABEL[sel.status] ?? ''}` : ''}
        footer={sel ? <>
          <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
          <Btn loading={busy === `print-${sel.id}`} onClick={() => void handlePrintAuditForm(sel)}>
            <Ico name="print" size={12} /> In phiếu
          </Btn>
          <Btn variant="ghost" loading={busy === `xml-${sel.id}`} onClick={() => void handleExportXml(sel)}>
            <Ico name="download" size={12} /> Xuất XML
          </Btn>
          {sel.status < 3 && (
            <Btn variant="ghost" loading={busy === `run-${sel.id}`} onClick={() => void handleRun(sel)}>
              <Ico name="refresh" size={12} /> Chạy lại kiểm tra
            </Btn>
          )}
          {sel.status === 2 && (
            <Btn variant="primary" loading={busy === `approve-${sel.id}`} onClick={() => handleApprove(sel)}>
              <Ico name="check" size={12} /> Duyệt phiên
            </Btn>
          )}
          {(sel.status === 2 || sel.status === 4) && (
            <Btn variant="primary" loading={busy === `submit-${sel.id}`} onClick={() => void handleSubmitToPortal(sel)}>
              <Ico name="send" size={12} /> Gửi cổng BHXH
            </Btn>
          )}
        </> : null}
      >
        {sel && <>
          <DrSec title="Tổng quan">
            <DrField lbl="Mã phiên">{sel.sessionCode}</DrField>
            <DrField lbl="Kỳ">{period(sel)}</DrField>
            <DrField lbl="Số hồ sơ">{sel.totalRecords}</DrField>
            <DrField lbl="Tổng chi phí">{fmtVNDg(sel.totalAmount)}</DrField>
            <DrField lbl="Số lỗi">{sel.errorCount}</DrField>
            <DrField lbl="Tiền lỗi">{fmtVNDg(sel.errorAmount)}</DrField>
            <DrField lbl="Người giám định">{sel.auditorName || '—'}</DrField>
            <DrField lbl="Ghi chú">{sel.notes || '—'}</DrField>
          </DrSec>
          <DrSec title={`Lỗi phát hiện (${errors.length})`}>
            <DataTable<BhxhAuditError>
              columns={errCols} data={errors} page={0} perPage={200} rowKey={(e) => e.id}
              actions={sel.status < 3 ? (e) => (
                <div className="ab-actions">
                  <ActBtn ic="edit" title="Xử lý lỗi" loading={busy === `fix-${e.id}`} onClick={() => handleFix(e)} />
                </div>
              ) : undefined}
              empty={errorsLoading ? 'Đang tải…' : sel.status === 0 ? 'Phiên chưa chạy kiểm tra' : 'Không có lỗi'}
            />
          </DrSec>
        </>}
      </DrawerShell>
      </>}

      {activeMainTab === 'import' && (
        <div>
          {/* Toolbar import */}
          <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
            <SearchBox value={importSearch} onChange={v => { setImportSearch(v); setImportPage(0); void loadImportedRows(importTab, 0, v); }}
              placeholder="Tìm mã hồ sơ / họ tên / số thẻ…" />
            <span className="spacer" />
            <input
              ref={importFileRef}
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={handleImportCsv}
            />
            <Btn
              variant="primary"
              icon="upload"
              onClick={() => importFileRef.current?.click()}
              disabled={importLoading}
            >
              {importLoading ? 'Đang import…' : 'Upload CSV giám định'}
            </Btn>
          </div>

          {/* Ket qua import vua upload */}
          {importResult && (
            <div style={{ margin: '8px 12px', padding: 'var(--space-12)', background: 'var(--bg-1)', borderRadius: 'var(--r-2)', border: '1px solid var(--line)' }}>
              <div style={{ fontWeight: 600, fontSize: 'var(--fs-md)', marginBottom: 'var(--space-4)' }}>
                Batch: <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)' }}>{importResult.importBatchCode}</span>
                &nbsp;—&nbsp;{importResult.importedRows} dong / {importResult.totalRows} dong
                {importResult.skippedRows > 0 && <span style={{ color: 'var(--a-or-text)' }}> · {importResult.skippedRows} bo qua</span>}
              </div>
              {importResult.errors.length > 0 && (
                <details style={{ fontSize: 'var(--fs-sm)', color: 'var(--crit)' }}>
                  <summary style={{ cursor: 'pointer' }}>{importResult.errors.length} loi</summary>
                  <ul style={{ margin: '4px 0 0 16px' }}>
                    {importResult.errors.map((e, i) => (
                      <li key={i}>Dong {e.rowNumber} [{e.maHoSo}]: {e.errorMessage}</li>
                    ))}
                  </ul>
                </details>
              )}
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginTop: 'var(--space-4)' }}>
                Chi ho tro CSV. Excel can them thu vien ClosedXML/EPPlus o backend.
                <Btn variant="ghost" onClick={() => setImportResult(null)} style={{ marginLeft: 'var(--space-8)', height: 20, fontSize: 'var(--fs-xs)' }}>Dong</Btn>
              </div>
            </div>
          )}

          {/* StatusTabs + DataTable imported rows */}
          <StatusTabs<ImportTabKey>
            value={importTab}
            onChange={(t) => { setImportTab(t); setImportPage(0); void loadImportedRows(t, 0, importSearch); }}
            tabs={IMPORT_STATUS_TABS}
            counts={{ all: importCounts.all, chuaDuyet: importCounts.chuaDuyet, daDuyet: importCounts.daDuyet, tuChoi: importCounts.tuChoi }}
          />

          <DataTable<BhxhAuditImportRow>
            columns={[
              { key: 'rowNumber', label: '#', width: 50, render: (r) => r.rowNumber },
              { key: 'maHoSo', label: 'Mã hồ sơ', render: (r) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)' }}>{r.maHoSo}</span> },
              { key: 'hoTen', label: 'Họ tên', render: (r) => r.hoTen ?? '—' },
              { key: 'soTheBHYT', label: 'Số thẻ BHYT', render: (r) => r.soTheBHYT ?? '—' },
              { key: 'ngayVao', label: 'Ngày vào', render: (r) => r.ngayVao ? dayjs(r.ngayVao).format('DD/MM/YYYY') : '—' },
              { key: 'ngayRa', label: 'Ngày ra', render: (r) => r.ngayRa ? dayjs(r.ngayRa).format('DD/MM/YYYY') : '—' },
              { key: 'tenKhoa', label: 'Khoa', render: (r) => r.tenKhoa ?? r.maKhoa ?? '—' },
              { key: 'tienVienPhi', label: 'Viện phí', render: (r) => fmtVNDg(r.tienVienPhi) },
              { key: 'tienBHYT', label: 'BHYT', render: (r) => fmtVNDg(r.tienBHYT) },
              { key: 'trangThaiGiamDinh', label: 'Trạng thái', render: (r) => {
                const tone = r.trangThaiGiamDinh === 1 ? 'ok' : r.trangThaiGiamDinh === 2 ? 'crit' : 'warn';
                return <StatusBadge tone={tone} dot>{r.trangThaiName ?? (r.trangThaiGiamDinh === 1 ? 'Da duyet' : r.trangThaiGiamDinh === 2 ? 'Tu choi' : 'Chua duyet')}</StatusBadge>;
              }},
            ] as ColumnDef<BhxhAuditImportRow>[]}
            data={importedRows}
            rowKey={(r) => r.id}
            empty={importRowsLoading ? 'Dang tai...' : 'Chua co du lieu import'}
          />
          <Pager
            page={importPage}
            setPage={(next: number | ((p: number) => number)) => {
              const p = typeof next === 'function' ? next(importPage) : next;
              setImportPage(p);
              void loadImportedRows(importTab, p, importSearch);
            }}
            totalPages={Math.ceil(importTotal / 20)}
            total={importTotal}
            perPage={20}
          />
        </div>
      )}

    </div>
  );
};

export default BhxhAuditV2;
