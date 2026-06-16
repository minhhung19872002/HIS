import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { App as AntdApp } from 'antd';
import {
  getAuditSessions,
  approveAuditSession,
  submitToPortal,
  submitBatch,
  exportXml,
  exportBatchXml,
  printAuditForm,
  importAuditCsv,
  getImportedRows,
  type BhxhAuditImportRow,
  type BhxhAuditImportResult,
} from '../api/bhxhAudit';
import { normalizeArrayResponse } from '../utils/apiNormalize';
import {
  KpiStrip, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn, Btn,
  StatusTabs, DrawerShell, DrSec, DrField, fmtVNDg, tk, ti, Ico,
  type ColumnDef,
} from './_v2kit';

interface AuditRecord {
  id: string;
  maLk: string;
  patientCode: string;
  patientName: string;
  insuranceNumber: string;
  admissionDate: string;
  dischargeDate?: string;
  departmentName: string;
  diagnosisCode: string;
  diagnosisName: string;
  totalAmount: number;
  insuranceAmount: number;
  patientAmount: number;
  auditStatus: number;
  paymentStatus: number;
  sentToPortal: boolean;
}

const PER = 18;

type AuditKey = 'pending' | 'approved' | 'rejected';
const STATUS_TABS = [
  { v: 'pending' as AuditKey,  l: 'Chờ duyệt',     tone: 'warn' as const },
  { v: 'approved' as AuditKey, l: 'Đã duyệt',      tone: 'ok' as const },
  { v: 'rejected' as AuditKey, l: 'Bị từ chối',    tone: 'crit' as const },
];

const auditKey = (n: number): AuditKey => n === 1 ? 'approved' : n === 2 ? 'rejected' : 'pending';

// Import tab status tabs
type ImportTabKey = 'all' | 'chuaDuyet' | 'daDuyet' | 'tuChoi';
const IMPORT_STATUS_TABS: Array<{ v: ImportTabKey; l: string; tone: 'ok' | 'warn' | 'crit' | 'info' }> = [
  { v: 'all',        l: 'Tất cả',      tone: 'info' },
  { v: 'chuaDuyet',  l: 'Chưa duyệt',  tone: 'warn' },
  { v: 'daDuyet',    l: 'Đã duyệt',    tone: 'ok' },
  { v: 'tuChoi',     l: 'Từ chối',     tone: 'crit' },
];
const importTabToInt = (t: ImportTabKey) => t === 'chuaDuyet' ? 0 : t === 'daDuyet' ? 1 : t === 'tuChoi' ? 2 : undefined;

const BhxhAuditV2: React.FC = () => {
  const { message, modal } = AntdApp.useApp();
  const [items, setItems] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<AuditKey | 'all'>('all');
  const [fDept, setFDept] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<AuditRecord | null>(null);
  const [approveLoading, setApproveLoading] = useState<string | null>(null);

  // --- Import tab state ---
  const [activeMainTab, setActiveMainTab] = useState<'sessions' | 'import'>('sessions');
  const importFileRef = useRef<HTMLInputElement>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<BhxhAuditImportResult | null>(null);
  const [importedRows, setImportedRows] = useState<BhxhAuditImportRow[]>([]);
  const [importTotal, setImportTotal] = useState(0);
  const [importPage, setImportPage] = useState(0);
  const [importTab, setImportTab] = useState<ImportTabKey>('all');
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
    } catch { /* silent */ }
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
  const [submitLoading, setSubmitLoading] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchXmlLoading, setBatchXmlLoading] = useState(false);
  const [xmlLoading, setXmlLoading] = useState<string | null>(null);
  const [printLoading, setPrintLoading] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getAuditSessions();
      // BE trả mảng thô hoặc { items: [] } — field name alias do BHXH XML evolve
      interface RawAuditRow {
        id?: string; maLk?: string;
        patientCode?: string; patientName?: string;
        insuranceNumber?: string;
        admissionDate?: string; dischargeDate?: string;
        departmentName?: string;
        diagnosisCode?: string; diagnosisName?: string;
        totalAmount?: number; insuranceAmount?: number; patientAmount?: number;
        auditStatus?: number; paymentStatus?: number;
        sentToPortal?: boolean;
      }
      const data = normalizeArrayResponse<RawAuditRow>(res.data);
      const rows: AuditRecord[] = data.map((r, i) => ({
        id: r.id || `r-${i}`,
        maLk: r.maLk || '',
        patientCode: r.patientCode || '',
        patientName: r.patientName || '',
        insuranceNumber: r.insuranceNumber || '',
        admissionDate: r.admissionDate || '',
        dischargeDate: r.dischargeDate,
        departmentName: r.departmentName || '',
        diagnosisCode: r.diagnosisCode || '',
        diagnosisName: r.diagnosisName || '',
        totalAmount: r.totalAmount || 0,
        insuranceAmount: r.insuranceAmount || 0,
        patientAmount: r.patientAmount || 0,
        auditStatus: r.auditStatus ?? 0,
        paymentStatus: r.paymentStatus ?? 0,
        sentToPortal: r.sentToPortal ?? false,
      }));
      setItems(rows);
    } catch { setItems([]); ti('Không tải được hồ sơ giám định BHYT'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const handleApprove = (r: AuditRecord) => {
    let notes = '';
    modal.confirm({
      title: `Duyệt hồ sơ giám định · ${r.maLk}`,
      content: (
        <div>
          <p style={{ marginBottom: 8 }}>Bệnh nhân: <b>{r.patientName}</b></p>
          <textarea
            placeholder="Ghi chú (tùy chọn)"
            rows={3}
            style={{ width: '100%', resize: 'vertical', padding: 6, borderRadius: 4, border: '1px solid #d9d9d9' }}
            onChange={(e) => { notes = e.target.value; }}
          />
        </div>
      ),
      okText: 'Duyệt',
      cancelText: 'Hủy',
      onOk: async () => {
        setApproveLoading(r.id);
        try {
          await approveAuditSession(r.id, notes || undefined);
          message.success(`Đã duyệt hồ sơ ${r.maLk}`);
          if (sel?.id === r.id) setSel(null);
          load();
        } catch {
          message.error('Duyệt thất bại — vui lòng thử lại');
        } finally {
          setApproveLoading(null);
        }
      },
    });
  };

  const handleSubmitToPortal = async (r: AuditRecord) => {
    setSubmitLoading(r.id);
    try {
      await submitToPortal(r.id);
      message.success(`Đã gửi ${r.maLk} lên cổng BHXH`);
      load();
    } catch {
      message.error('Gửi cổng thất bại — vui lòng thử lại');
    } finally {
      setSubmitLoading(null);
    }
  };

  const handleBatchSubmit = async () => {
    const ids = filtered.filter((r) => !r.sentToPortal).map((r) => r.id);
    if (ids.length === 0) { message.info('Không có hồ sơ nào chưa gửi trong bộ lọc hiện tại'); return; }
    modal.confirm({
      title: 'Gửi hàng loạt lên cổng BHXH',
      content: `Sẽ gửi ${ids.length} hồ sơ chưa gửi (theo bộ lọc hiện tại).`,
      okText: 'Gửi hàng loạt',
      cancelText: 'Hủy',
      onOk: async () => {
        setBatchLoading(true);
        try {
          const { data: res } = await submitBatch(ids);
          message.success(`Gửi xong: ${res?.submitted ?? ids.length} hồ sơ — bỏ qua ${res?.skipped ?? 0} — lỗi ${res?.failed ?? 0}`);
          load();
        } catch {
          message.error('Gửi hàng loạt thất bại — vui lòng thử lại');
        } finally {
          setBatchLoading(false);
        }
      },
    });
  };

  const handleBatchExportXml = async () => {
    const ids = filtered.map((r) => r.id);
    if (ids.length === 0) { message.info('Không có hồ sơ nào trong bộ lọc hiện tại'); return; }
    setBatchXmlLoading(true);
    try {
      const { data: blob } = await exportBatchXml(ids);
      const url = URL.createObjectURL(blob as unknown as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BHXH_XML_batch_${dayjs().format('YYYYMMDD')}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      message.success(`Đã tải ZIP ${ids.length} XML hồ sơ`);
    } catch {
      message.error('Xuất XML hàng loạt thất bại');
    } finally {
      setBatchXmlLoading(false);
    }
  };

  const handleExportXml = async (sessionId: string, maLk: string) => {
    setXmlLoading(sessionId);
    try {
      const { data: blob } = await exportXml(sessionId);
      const url = URL.createObjectURL(blob as unknown as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BHXH_XML_${maLk}_${dayjs().format('YYYYMMDD')}.xml`;
      a.click();
      URL.revokeObjectURL(url);
      message.success(`Đã tải XML hồ sơ ${maLk}`);
    } catch {
      message.error('Xuất XML thất bại');
    } finally {
      setXmlLoading(null);
    }
  };

  const handlePrintAuditForm = async (sessionId: string) => {
    setPrintLoading(sessionId);
    try {
      const { data: html } = await printAuditForm(sessionId);
      const win = window.open('', '_blank');
      if (!win) { message.error('Trình duyệt chặn popup — cho phép popup để in'); return; }
      win.document.write(html as unknown as string);
      win.document.close();
    } catch {
      message.error('In phiếu thất bại');
    } finally {
      setPrintLoading(null);
    }
  };

  const depts = useMemo(() => {
    const set = new Set(items.map((r) => r.departmentName).filter(Boolean));
    return Array.from(set).map((d) => ({ v: d, l: d }));
  }, [items]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    STATUS_TABS.forEach((s) => { c[s.v] = items.filter((r) => auditKey(r.auditStatus) === s.v).length; });
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (stab !== 'all' && auditKey(r.auditStatus) !== stab) return false;
      if (fDept && r.departmentName !== fDept) return false;
      if (!k) return true;
      return [r.patientName, r.maLk, r.insuranceNumber, r.patientCode].some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fDept]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const totalIns = items.reduce((s, r) => s + (r.insuranceAmount || 0), 0);
  // totalAmt removed - không dùng trong KPI strip hiện tại (chỉ hiển thị totalIns)
  const sentCount = items.filter((r) => r.sentToPortal).length;

  const cols: ColumnDef<AuditRecord>[] = [
    { key: 'malk', label: 'Mã LK', code: true, render: (r) => r.maLk || '—' },
    { key: 'pat', label: 'Bệnh nhân', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.patientName}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.patientCode}</div>
      </div>
    ) },
    { key: 'bhyt', label: 'Số BHYT', mono: true, render: (r) => r.insuranceNumber },
    { key: 'dept', label: 'Khoa', render: (r) => r.departmentName },
    { key: 'icd', label: 'ICD', mono: true, render: (r) => (
      <span title={r.diagnosisName}>{r.diagnosisCode}</span>
    ) },
    { key: 'amt', label: 'Tổng tiền', mono: true, render: (r) => fmtVNDg(r.totalAmount) },
    { key: 'ins', label: 'BHYT', mono: true, render: (r) => <span style={{ color: 'var(--a-cy-text)' }}>{fmtVNDg(r.insuranceAmount)}</span> },
    { key: 'status', label: 'Trạng thái', render: (r) => {
      const s = auditKey(r.auditStatus);
      const tone = s === 'approved' ? 'ok' : s === 'rejected' ? 'crit' : 'warn';
      return <StatusBadge tone={tone} dot>{STATUS_TABS.find((x) => x.v === s)?.l}</StatusBadge>;
    } },
  ];

  const actions = (r: AuditRecord) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      {auditKey(r.auditStatus) === 'pending' && (
        <ActBtn
          ic="check"
          title="Duyệt"
          loading={approveLoading === r.id}
          onClick={() => handleApprove(r)}
        />
      )}
      {!r.sentToPortal && (
        <ActBtn
          ic="send"
          title="Gửi cổng BHXH"
          loading={submitLoading === r.id}
          onClick={() => handleSubmitToPortal(r)}
        />
      )}
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng hồ sơ', val: items.length, sub: 'kỳ này' },
        { lbl: 'Chờ duyệt', val: counts.pending || 0, sub: 'cần xử lý', tone: 'warn' },
        { lbl: 'Đã duyệt', val: counts.approved || 0, sub: `${Math.round(((counts.approved || 0) / Math.max(1, items.length)) * 100)}%`, tone: 'ok' },
        { lbl: 'Bị từ chối', val: counts.rejected || 0, sub: 'cần sửa', tone: 'crit' },
        { lbl: 'BHYT chi trả', val: Math.round(totalIns / 1_000_000), unit: 'tr', sub: 'VND', tone: 'info' },
        { lbl: 'Đã gửi cổng', val: sentCount, sub: `${Math.round((sentCount / Math.max(1, items.length)) * 100)}%`, tone: sentCount === items.length ? 'ok' : 'warn' },
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
              fontSize: 13,
            }}
          >
            {t === 'sessions' ? 'Phiên giám định' : 'Import CSV'}
          </button>
        ))}
      </div>

      {activeMainTab === 'sessions' && <>
      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={setSearch} placeholder="Tìm mã LK / BN / số BHYT…" />
        <Filter value={fDept} onChange={setFDept} options={depts} placeholder="▾ Khoa" />
        <Btn variant="ghost" onClick={() => { setSearch(''); setFDept(''); setStab('all'); }}>
          <Ico name="refresh" size={12} /> Bỏ lọc
        </Btn>
        <span className="spacer" />
        <Btn variant="ghost" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </Btn>
        <Btn
          variant="ghost"
          disabled={!sel}
          onClick={() => sel && handleExportXml(sel.id, sel.maLk)}
          title="Xuất XML hồ sơ đang chọn trong drawer"
        >
          <Ico name="download" size={12} /> Xuất XML
        </Btn>
        <Btn
          variant="ghost"
          loading={batchXmlLoading}
          disabled={filtered.length === 0}
          onClick={handleBatchExportXml}
          title={`Xuất ZIP XML cho ${filtered.length} hồ sơ trong bộ lọc hiện tại`}
        >
          <Ico name="download" size={12} /> Xuất XML hàng loạt
        </Btn>
        <Btn variant="primary" loading={batchLoading} onClick={handleBatchSubmit}>
          <Ico name="send" size={12} /> Gửi tất cả lên cổng
        </Btn>
      </div>

      <StatusTabs<AuditKey> value={stab} onChange={setStab} tabs={STATUS_TABS} counts={counts} />

      <DataTable<AuditRecord>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có hồ sơ giám định'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="xl"
        title={sel ? `Hồ sơ giám định · ${sel.maLk}` : ''}
        sub={sel ? `${sel.patientName} · BHYT ${sel.insuranceNumber}` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
          <Btn
            loading={sel ? printLoading === sel.id : false}
            onClick={() => sel && handlePrintAuditForm(sel.id)}
          >
            <Ico name="print" size={12} /> In phiếu
          </Btn>
          <Btn
            variant="ghost"
            loading={sel ? xmlLoading === sel.id : false}
            onClick={() => sel && handleExportXml(sel.id, sel.maLk)}
          >
            <Ico name="download" size={12} /> Xuất XML
          </Btn>
          {sel && auditKey(sel.auditStatus) === 'pending' && (
            <Btn
              variant="primary"
              loading={approveLoading === sel.id}
              onClick={() => handleApprove(sel)}
            >
              <Ico name="check" size={12} /> Duyệt hồ sơ
            </Btn>
          )}
        </>}
      >
        {sel && <>
          <DrSec title="Thông tin bệnh nhân">
            <DrField lbl="Mã LK">{sel.maLk}</DrField>
            <DrField lbl="Mã BN">{sel.patientCode}</DrField>
            <DrField lbl="Họ tên">{sel.patientName}</DrField>
            <DrField lbl="Số BHYT"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.insuranceNumber}</span></DrField>
            <DrField lbl="Khoa">{sel.departmentName}</DrField>
            <DrField lbl="Vào viện">{sel.admissionDate ? dayjs(sel.admissionDate).format('DD/MM/YYYY') : '—'}</DrField>
            <DrField lbl="Ra viện">{sel.dischargeDate ? dayjs(sel.dischargeDate).format('DD/MM/YYYY') : '—'}</DrField>
          </DrSec>
          <DrSec title="Chẩn đoán">
            <DrField lbl="Mã ICD"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.diagnosisCode}</span></DrField>
            <DrField lbl="Tên bệnh">{sel.diagnosisName}</DrField>
          </DrSec>
          <DrSec title="Tài chính">
            <div style={{ padding: 14, background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 6 }}>
              <Line label="Tổng tiền" value={fmtVNDg(sel.totalAmount)} />
              <Line label="BHYT chi trả" value={`−${fmtVNDg(sel.insuranceAmount)}`} tone="info" />
              <Line label="Người bệnh trả" value={fmtVNDg(sel.patientAmount)} />
              <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '8px 0' }} />
              <Line label="Tỷ lệ BHYT" value={`${Math.round((sel.insuranceAmount / Math.max(1, sel.totalAmount)) * 100)}%`} />
            </div>
          </DrSec>
          <DrSec title="Trạng thái">
            <DrField lbl="Giám định">
              <StatusBadge tone={auditKey(sel.auditStatus) === 'approved' ? 'ok' : auditKey(sel.auditStatus) === 'rejected' ? 'crit' : 'warn'} dot>
                {STATUS_TABS.find((x) => x.v === auditKey(sel.auditStatus))?.l}
              </StatusBadge>
            </DrField>
            <DrField lbl="Thanh toán">{sel.paymentStatus === 1 ? 'Đã thanh toán' : 'Chưa thanh toán'}</DrField>
            <DrField lbl="Cổng BHXH">
              <StatusBadge tone={sel.sentToPortal ? 'ok' : 'warn'} dot>
                {sel.sentToPortal ? 'Đã gửi' : 'Chưa gửi'}
              </StatusBadge>
            </DrField>
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
            <div style={{ margin: '8px 12px', padding: 12, background: 'var(--bg-1)', borderRadius: 6, border: '1px solid var(--line)' }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                Batch: <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{importResult.importBatchCode}</span>
                &nbsp;—&nbsp;{importResult.importedRows} dong / {importResult.totalRows} dong
                {importResult.skippedRows > 0 && <span style={{ color: 'var(--a-or-text)' }}> · {importResult.skippedRows} bo qua</span>}
              </div>
              {importResult.errors.length > 0 && (
                <details style={{ fontSize: 12, color: 'var(--crit)' }}>
                  <summary style={{ cursor: 'pointer' }}>{importResult.errors.length} loi</summary>
                  <ul style={{ margin: '4px 0 0 16px' }}>
                    {importResult.errors.map((e, i) => (
                      <li key={i}>Dong {e.rowNumber} [{e.maHoSo}]: {e.errorMessage}</li>
                    ))}
                  </ul>
                </details>
              )}
              <div style={{ fontSize: 11, color: 'var(--t-2)', marginTop: 4 }}>
                Chi ho tro CSV. Excel can them thu vien ClosedXML/EPPlus o backend.
                <Btn variant="ghost" onClick={() => setImportResult(null)} style={{ marginLeft: 8, height: 20, fontSize: 11 }}>Dong</Btn>
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
              { key: 'maHoSo', label: 'Mã hồ sơ', render: (r) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{r.maHoSo}</span> },
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

const Line: React.FC<{ label: string; value: React.ReactNode; tone?: 'ok' | 'crit' | 'info' | 'warn' }> = ({ label, value, tone }) => {
  const color = tone === 'ok' ? 'var(--a-em-text)'
    : tone === 'crit' ? 'var(--a-rd-text)'
    : tone === 'info' ? 'var(--a-cy-text)'
    : tone === 'warn' ? 'var(--a-or-text)'
    : 'var(--t-0)';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, color }}>
      <span>{label}</span><span style={{ fontFamily: 'var(--font-mono)' }}>{value}</span>
    </div>
  );
};

export default BhxhAuditV2;
