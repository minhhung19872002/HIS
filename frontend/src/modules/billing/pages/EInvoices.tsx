import React, { useCallback, useEffect, useState } from 'react';
import {
  KpiStrip, TopTabs, DataTable, SearchBox, Filter, StatusBadge, AbSelect, ActBtn, Btn,
  DrawerShell, ModalShell, DrSec, DrField, useListData,
  type ColumnDef, type TopTab, type KpiItem, type StatusTone,
  tk, te, tw, fmtDTg, fmtDMYg
} from '@/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';
import { fmtVND } from '../../../utils/format';
import {
  einvoice,
  type EInvoiceDto,
  type EInvoiceDetailDto,
  type EInvoiceConfigDto,
} from '../api/einvoice';
// #352: HĐĐT bảng kê viện phí — hệ /api/billing/e-invoices (bảng ElectronicInvoice,
// phát hành từ BẢNG KÊ đã thu), KHÁC hệ /api/einvoice (phát hành từ phiếu thu) phía trên.
import {
  searchElectronicInvoices, issueElectronicInvoice, cancelElectronicInvoice,
  sendElectronicInvoice, resendElectronicInvoice, exportElectronicInvoice,
  printRepresentativeInvoice, getElectronicInvoiceStats, searchInvoices,
} from '../api/billing';
import type { ElectronicInvoiceDto, ElectronicInvoiceStatsDto, InvoiceDto } from '../api/billing';

// ── Constants ──────────────────────────────────────────────────────────────

type TabKey = 'list' | 'stmt' | 'cfg';
const TOP_TABS: TopTab<TabKey>[] = [
  { v: 'list', l: 'Danh sách HĐĐT', ic: 'file' },
  { v: 'stmt', l: 'HĐĐT bảng kê',   ic: 'receipt' }, // #352: hệ /api/billing/e-invoices
  { v: 'cfg',  l: 'Cấu hình NCC',  ic: 'settings' },
];

const STATUS_MAP: { v: number; l: string; tone: StatusTone }[] = [
  { v: 0, l: 'Nháp',           tone: 'info' },
  { v: 1, l: 'Đã phát hành',   tone: 'ok'   },
  { v: 2, l: 'Đã ký',          tone: 'ok'   },
  { v: 3, l: 'Đã hủy',         tone: 'warn' },
  { v: 4, l: 'Lỗi',            tone: 'crit' },
];
const tone = (s: number): StatusTone => STATUS_MAP[s]?.tone ?? 'info';
const label = (s: number): string => STATUS_MAP[s]?.l ?? '—';

const PROVIDERS = ['VNPT', 'Viettel', 'MISA'];

// ── Root ──────────────────────────────────────────────────────────────────

const EInvoicesPage: React.FC = () => {
  const [tab, setTab] = useState<TabKey>('list');
  return (
    <div className="ab" data-testid="einvoice-page">
      <TopTabs<TabKey> tab={tab} setTab={setTab} tabs={TOP_TABS} />
      {tab === 'list' && <EInvoiceListPanel />}
      {tab === 'stmt' && <BillingEInvoicePanel />}
      {tab === 'cfg'  && <EInvoiceConfigPanel />}
    </div>
  );
};

// ── List Panel ─────────────────────────────────────────────────────────────

const EInvoiceListPanel: React.FC = () => {
  const { rows, reload } = useListData<EInvoiceDto>(
    useCallback(() => einvoice.getList({ pageSize: 200 }), []),
    useCallback(() => te('Không tải được danh sách HĐĐT'), []),
  );
  const [search, setSearch]   = useState('');
  const [fStatus, setFStatus] = useState('');
  const [detail, setDetail]   = useState<EInvoiceDetailDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);

  const openDetail = async (row: EInvoiceDto) => {
    setDetailLoading(true);
    try {
      const d = await einvoice.getDetail(row.id);
      setDetail(d);
    } catch { te('Không tải được chi tiết'); }
    finally { setDetailLoading(false); }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('Xác nhận hủy hóa đơn này?')) return;
    try {
      await einvoice.cancel(id);
      tk('Đã hủy hóa đơn');
      setDetail(null);
      reload();
    } catch (err: unknown) {
      te((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Hủy thất bại');
    }
  };

  const handleSyncStatus = async (id: string) => {
    try {
      const updated = await einvoice.syncStatus(id);
      tk(`Trạng thái: ${updated.statusName}`);
      setDetail((d) => d ? { ...d, ...updated } : d);
      reload();
    } catch { te('Không đồng bộ được'); }
  };

  const filtered = rows.filter((r) => {
    if (fStatus !== '' && r.status !== Number(fStatus)) return false;
    if (search) {
      const k = search.toLowerCase();
      return [r.invoiceNo ?? '', r.provider, r.invoiceCode ?? '']
        .some((x) => x.toLowerCase().includes(k));
    }
    return true;
  });

  const kpis: KpiItem[] = [
    { lbl: 'Tổng',           val: rows.length },
    { lbl: 'Đã phát hành',   val: rows.filter((r) => r.status === 1 || r.status === 2).length, tone: 'ok'   },
    { lbl: 'Nháp',           val: rows.filter((r) => r.status === 0).length, tone: 'info' },
    { lbl: 'Lỗi / Hủy',      val: rows.filter((r) => r.status === 3 || r.status === 4).length, tone: 'crit' },
  ];

  const columns: ColumnDef<EInvoiceDto>[] = [
    { key: 'createdAt',   label: 'Tạo lúc',    mono: true, width: 140,
      render: (r) => fmtDTg(r.createdAt) },
    { key: 'invoiceNo',   label: 'Số HĐ',      mono: true, width: 240,
      render: (r) => r.invoiceNo ?? '—' },
    { key: 'provider',    label: 'NCC',         width: 90 },
    { key: 'totalAmount', label: 'Tổng tiền',   mono: true, width: 130,
      render: (r) => r.totalAmount.toLocaleString('vi-VN') + 'đ' },
    { key: 'issuedAt',    label: 'Phát hành',   mono: true, width: 140,
      render: (r) => fmtDTg(r.issuedAt) },
    { key: 'status',      label: 'Trạng thái',  width: 140,
      render: (r) => <StatusBadge tone={tone(r.status)} dot>{r.statusName || label(r.status)}</StatusBadge> },
  ];

  return (
    <>
      <KpiStrip items={kpis} />
      <div className="ab-toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder="Tìm số HĐ / NCC / mã CQT…" />
        <Filter value={fStatus} onChange={setFStatus}
          options={STATUS_MAP.map((s) => ({ v: String(s.v), l: s.l }))}
          placeholder="▾ Trạng thái" />
        <span className="spacer" />
        <Btn variant="primary" onClick={() => setIssueOpen(true)}>
          <TermIcon name="plus" size={12} /> Phát hành HĐĐT
        </Btn>
      </div>

      <DataTable<EInvoiceDto>
        rowKey={(r) => r.id}
        data={filtered}
        columns={columns}
        onRowClick={openDetail}
      />

      {/* Issue modal */}
      <IssueModal
        open={issueOpen}
        onClose={() => setIssueOpen(false)}
        onIssued={() => { setIssueOpen(false); reload(); }}
      />

      {/* Detail drawer */}
      <DrawerShell
        open={!!detail || detailLoading}
        onClose={() => setDetail(null)}
        size="md"
        title={detail ? `HĐĐT · ${detail.invoiceNo ?? 'Chưa có số'}` : 'Đang tải…'}>
        {detail && (
          <>
            <DrSec title="THÔNG TIN HÓA ĐƠN">
              <DrField lbl="Số HĐ">
                <span className="mono">{detail.invoiceNo ?? '—'}</span>
              </DrField>
              <DrField lbl="Mã CQT">
                <span className="mono">{detail.invoiceCode ?? '—'}</span>
              </DrField>
              <DrField lbl="Ký hiệu"><span className="mono">{detail.serialNo ?? '—'}</span></DrField>
              <DrField lbl="NCC">{detail.provider}</DrField>
              <DrField lbl="Trạng thái">
                <StatusBadge tone={tone(detail.status)} dot>{detail.statusName}</StatusBadge>
              </DrField>
              <DrField lbl="Tổng tiền">
                {detail.totalAmount.toLocaleString('vi-VN')}đ
              </DrField>
              {detail.taxAmount != null && (
                <DrField lbl="Thuế GTGT">{detail.taxAmount.toLocaleString('vi-VN')}đ</DrField>
              )}
              <DrField lbl="Phát hành lúc">{fmtDTg(detail.issuedAt)}</DrField>
              {detail.errorMessage && (
                <DrField lbl="Lỗi">
                  <span style={{ color: 'var(--s-crit)' }}>{detail.errorMessage}</span>
                </DrField>
              )}
            </DrSec>

            {detail.portalResponse && (
              <DrSec title="PHẢN HỒI NCC (RAW)">
                <pre style={{
                  fontSize: 11, padding: 8, background: 'var(--d-1)',
                  borderRadius: 4, maxHeight: 200, overflow: 'auto',
                  fontFamily: 'var(--font-mono)'
                }}>
                  {(() => {
                    try { return JSON.stringify(JSON.parse(detail.portalResponse!), null, 2); }
                    catch { return detail.portalResponse; }
                  })()}
                </pre>
              </DrSec>
            )}

            <div style={{ display: 'flex', gap: 8, padding: '12px 16px' }}>
              {(detail.status === 1 || detail.status === 2) && (
                <Btn variant="ghost" onClick={() => handleCancel(detail.id)}>
                  <TermIcon name="x" size={12} /> Hủy HĐ
                </Btn>
              )}
              <Btn onClick={() => handleSyncStatus(detail.id)}>
                <TermIcon name="activity" size={12} /> Đồng bộ TT
              </Btn>
            </div>
          </>
        )}
      </DrawerShell>
    </>
  );
};

// ── Issue Modal ────────────────────────────────────────────────────────────

const IssueModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onIssued: () => void;
}> = ({ open, onClose, onIssued }) => {
  const [receiptId, setReceiptId] = useState('');
  const [provider, setProvider]   = useState('');

  const submit = async () => {
    if (!receiptId.trim()) { te('Vui lòng nhập ID phiếu thu'); return; }
    try {
      const result = await einvoice.issue({
        receiptId: receiptId.trim(),
        provider: provider || undefined,
      });
      tk(`Đã phát hành HĐĐT · ${result.invoiceNo ?? result.id}`);
      setReceiptId('');
      setProvider('');
      onIssued();
    } catch (err: unknown) {
      te((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Phát hành thất bại');
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Phát hành hóa đơn điện tử"
      size="md"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Hủy</Btn>
          <Btn variant="primary" onClick={submit}>
            <TermIcon name="check" size={12} /> Phát hành
          </Btn>
        </>
      }>
      <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 10, padding: 14, fontSize: 13 }}>
        <span>ID phiếu thu</span>
        <input
          className="ab-sel"
          value={receiptId}
          onChange={(e) => setReceiptId(e.target.value)}
          placeholder="UUID phiếu thu…"
        />
        <span>NCC (tùy chọn)</span>
        <AbSelect
          value={provider}
          onChange={setProvider}
          options={[{ value: '', label: '— Dùng mặc định server —' },
            ...PROVIDERS.map((p) => ({ value: p, label: p }))]}
          placeholder="— Dùng mặc định server —"
        />
        <span style={{ gridColumn: '1/-1', color: 'var(--t-3)', fontSize: 11 }}>
          MockMode: server sẽ sinh số HĐ giả (MOCK-…) nếu chưa cấu hình credential NCC thật.
        </span>
      </div>
    </ModalShell>
  );
};

// ── Config Panel ───────────────────────────────────────────────────────────

const EInvoiceConfigPanel: React.FC = () => {
  const [cfg, setCfg]     = useState<EInvoiceConfigDto | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    einvoice.getConfig().then(setCfg).catch(() => te('Không tải được cấu hình'));
  }, []);

  const set = <K extends keyof EInvoiceConfigDto>(k: K, v: EInvoiceConfigDto[K]) =>
    setCfg((c) => c ? { ...c, [k]: v } : c);

  const save = async () => {
    if (!cfg) return;
    setSaving(true);
    try {
      const r = await einvoice.saveConfig(cfg);
      tk(r.message);
    } catch { te('Lưu thất bại'); }
    finally { setSaving(false); }
  };

  if (!cfg) return <div style={{ padding: 20 }}>Đang tải cấu hình…</div>;

  return (
    <div style={{ padding: 20, maxWidth: 760 }} data-testid="einvoice-config-panel">
      <div className="hui-section-t" style={{ marginBottom: 14 }}>CẤU HÌNH HÓA ĐƠN ĐIỆN TỬ</div>
      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 10, fontSize: 13 }}>
        <span>NCC mặc định</span>
        <AbSelect
          value={cfg.provider}
          onChange={(v) => set('provider', v)}
          options={PROVIDERS.map((p) => ({ value: p, label: p }))}
        />
        <span>Mock mode</span>
        <label>
          <input
            type="checkbox"
            checked={cfg.mockMode}
            onChange={(e) => set('mockMode', e.target.checked)}
          />
          {' '}Bật mock (sinh số HĐ giả, không gọi NCC thật)
        </label>
        <span>Kích hoạt HĐĐT</span>
        <label>
          <input
            type="checkbox"
            checked={cfg.enabled}
            onChange={(e) => set('enabled', e.target.checked)}
          />
          {' '}Cho phép phát hành HĐĐT
        </label>
        <span style={{ gridColumn: '1/-1', color: 'var(--t-3)', fontSize: 11, lineHeight: 1.5 }}>
          Credential NCC (BaseUrl/Account/Password/Serial/Pattern/TaxCode) KHÔNG lưu qua UI —
          phải set bằng Cloud Run env vars:<br />
          <code>EInvoice__Vnpt__BaseUrl</code>, <code>EInvoice__Vnpt__Account</code>,
          <code>EInvoice__Vnpt__Password</code>, <code>EInvoice__Vnpt__Serial</code>,
          <code>EInvoice__Vnpt__Pattern</code>, <code>EInvoice__Vnpt__TaxCode</code><br />
          (tương tự <code>EInvoice__Viettel__*</code> và <code>EInvoice__MISA__*</code>)
        </span>
      </div>
      <div style={{ marginTop: 16 }}>
        <Btn variant="primary" onClick={save} disabled={saving}>
          <TermIcon name="check" size={12} /> {saving ? 'Đang lưu…' : 'Lưu cấu hình'}
        </Btn>
      </div>
    </div>
  );
};

// ── #352: HĐĐT bảng kê viện phí (port v1 pages/Billing.tsx tab E-invoice) ─────
// Status (BE billing): 0-Nháp · 1-Đã phát hành · 2-Đã gửi · 3-Đã hủy · 4-Thay thế.
// Gate nút theo v1 (1970-2028): Gửi khi 1 · Xuất khi 0|1 · In luôn · Hủy khi 1|2.

const STMT_STATUS: { v: number; l: string; tone?: StatusTone }[] = [
  { v: 0, l: 'Nháp' },
  { v: 1, l: 'Đã phát hành', tone: 'info' },
  { v: 2, l: 'Đã gửi',       tone: 'ok'   },
  { v: 3, l: 'Đã hủy',       tone: 'crit' },
  { v: 4, l: 'Thay thế',     tone: 'warn' },
];
const stmtTone = (s: number): StatusTone | undefined => STMT_STATUS.find((x) => x.v === s)?.tone;
const stmtLabel = (s: number): string => STMT_STATUS.find((x) => x.v === s)?.l ?? '—';

// Loader module-level để useListData không refetch-loop (pageIndex 0-based như v1)
const loadStmtEInvoices = async (): Promise<ElectronicInvoiceDto[]> => {
  const r = await searchElectronicInvoices({ pageIndex: 0, pageSize: 200 });
  return r.data?.items || [];
};
const onStmtLoadError = () => te('Không tải được danh sách HĐĐT bảng kê');

const BillingEInvoicePanel: React.FC = () => {
  const { rows, loading, reload } = useListData<ElectronicInvoiceDto>(loadStmtEInvoices, onStmtLoadError);
  const [stats, setStats] = useState<ElectronicInvoiceStatsDto | null>(null);
  const [search, setSearch] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [issueOpen, setIssueOpen] = useState(false);
  const [sendFor, setSendFor] = useState<ElectronicInvoiceDto | null>(null);
  const [cancelFor, setCancelFor] = useState<ElectronicInvoiceDto | null>(null);

  const loadStats = useCallback(() => {
    getElectronicInvoiceStats().then((r) => setStats(r.data)).catch(() => setStats(null));
  }, []);
  useEffect(() => { loadStats(); }, [loadStats]);

  const refreshAll = () => { reload(); loadStats(); };

  // #352: Xuất HĐ lên NCC — v1 handleExportEInvoice (gate status 0|1)
  const doExport = async (r: ElectronicInvoiceDto) => {
    try {
      await exportElectronicInvoice(r.id);
      tk('Xuất hóa đơn lên nhà cung cấp thành công');
      refreshAll();
    } catch { te('Không thể xuất hóa đơn'); }
  };

  // #352: In hóa đơn đại diện — blob HTML → window.open + print (v1 handlePrintRepresentative)
  const doPrintRep = async (r: ElectronicInvoiceDto) => {
    try {
      const res = await printRepresentativeInvoice(r.id);
      const blob = new Blob([res.data as BlobPart], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank');
      if (w) w.onload = () => w.print();
      else tw('Vui lòng cho phép popup để in hóa đơn');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch { te('Không thể in hóa đơn đại diện'); }
  };

  const filtered = rows.filter((r) => {
    if (fStatus !== '' && r.status !== Number(fStatus)) return false;
    if (search) {
      const k = search.toLowerCase();
      return [r.eInvoiceNumber ?? '', r.invoiceCode ?? '', r.patientName ?? '', r.buyerName ?? '', r.lookupCode ?? '']
        .some((x) => x.toLowerCase().includes(k));
    }
    return true;
  });

  const kpis: KpiItem[] = [
    { lbl: 'Tổng HĐ',      val: stats?.totalInvoices ?? rows.length },
    { lbl: 'Đã phát hành', val: stats?.issuedCount ?? rows.filter((r) => r.status === 1).length, tone: 'info' },
    { lbl: 'Đã gửi',       val: stats?.sentCount ?? rows.filter((r) => r.status === 2).length, tone: 'ok' },
    { lbl: 'Đã hủy',       val: stats?.cancelledCount ?? rows.filter((r) => r.status === 3).length, tone: 'crit' },
    { lbl: 'Tổng tiền',    val: Math.round((stats?.totalWithVat ?? 0) / 1_000_000), unit: 'tr', sub: 'VND', tone: 'ok' },
  ];

  const columns: ColumnDef<ElectronicInvoiceDto>[] = [
    { key: 'no', label: 'Số HĐ', mono: true, width: 150, render: (r) => <b>{r.eInvoiceNumber || '—'}</b> },
    { key: 'series', label: 'Ký hiệu', mono: true, width: 90, render: (r) => r.eInvoiceSeries || '—' },
    { key: 'date', label: 'Ngày', mono: true, width: 100, render: (r) => fmtDMYg(r.eInvoiceDate) },
    {
      key: 'buyer', label: 'BN / Người mua',
      render: (r) => (
        <div className="cell-2l">
          <b>{r.buyerName || r.patientName || '—'}</b>
          <i className="mono">{r.buyerTaxCode ? `MST: ${r.buyerTaxCode}` : r.invoiceCode}</i>
        </div>
      ),
    },
    { key: 'total', label: 'Tổng tiền', mono: true, width: 120, render: (r) => <b>{fmtVND(r.totalAmount)}</b> },
    {
      key: 'status', label: 'Trạng thái', width: 130,
      render: (r) => <StatusBadge tone={stmtTone(r.status)} dot>{r.statusName || stmtLabel(r.status)}</StatusBadge>,
    },
    {
      key: 'lookup', label: 'Mã tra cứu', mono: true, width: 110,
      render: (r) => r.lookupUrl
        ? <a href={r.lookupUrl} target="_blank" rel="noopener noreferrer">{r.lookupCode || 'Tra cứu'}</a>
        : (r.lookupCode || '—'),
    },
  ];

  return (
    <>
      <KpiStrip items={kpis} />
      <div className="ab-toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder="Tìm số HĐ / BN / người mua / mã tra cứu…" />
        <Filter value={fStatus} onChange={setFStatus}
          options={STMT_STATUS.map((s) => ({ v: String(s.v), l: s.l }))}
          placeholder="▾ Trạng thái" />
        <span className="spacer" />
        <Btn variant="ghost" onClick={refreshAll} loading={loading} icon="refresh">Làm mới</Btn>
        <Btn variant="primary" onClick={() => setIssueOpen(true)}>
          <TermIcon name="plus" size={12} /> Phát hành HĐĐT
        </Btn>
      </div>

      <DataTable<ElectronicInvoiceDto>
        rowKey={(r) => r.id}
        data={filtered}
        columns={columns}
        loading={loading}
        empty="Chưa có HĐĐT bảng kê"
        actions={(r) => (
          <div className="ab-actions">
            {/* Gửi email khi Đã phát hành; đã từng gửi (sentTo) → Gửi lại (resend) */}
            {r.status === 1 && (
              <ActBtn ic="mail" title={r.sentTo ? 'Gửi lại email' : 'Gửi email'} onClick={() => setSendFor(r)} />
            )}
            {(r.status === 0 || r.status === 1) && (
              <ActBtn ic="upload" title="Xuất lên NCC" onClick={() => doExport(r)} />
            )}
            <ActBtn ic="print" title="In đại diện" onClick={() => doPrintRep(r)} />
            {(r.status === 1 || r.status === 2) && (
              <ActBtn ic="x" title="Hủy HĐ" tone="crit" onClick={() => setCancelFor(r)} />
            )}
          </div>
        )}
      />

      <BillingIssueModal
        open={issueOpen}
        onClose={() => setIssueOpen(false)}
        onIssued={() => { setIssueOpen(false); refreshAll(); }}
      />
      <SendStmtModal
        inv={sendFor}
        onClose={() => setSendFor(null)}
        onDone={() => { setSendFor(null); refreshAll(); }}
      />
      <CancelStmtModal
        inv={cancelFor}
        onClose={() => setCancelFor(null)}
        onDone={() => { setCancelFor(null); refreshAll(); }}
      />
    </>
  );
};

// #352: Modal phát hành HĐĐT từ bảng kê — v1 Create E-Invoice Modal (2223-2291),
// đủ buyer-info theo IssueEInvoiceDto (billing.ts): buyerName/TaxCode/Address/Email + paymentMethod + sendEmail.

const STMT_PAY_METHODS = [
  { value: 'TM',    label: 'Tiền mặt (TM)' },
  { value: 'CK',    label: 'Chuyển khoản (CK)' },
  { value: 'TM/CK', label: 'TM/CK' },
  { value: 'THE',   label: 'Thẻ' },
];

const BillingIssueModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onIssued: () => void;
}> = ({ open, onClose, onIssued }) => {
  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [invoiceId, setInvoiceId] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerTaxCode, setBuyerTaxCode] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [payMethod, setPayMethod] = useState('TM');
  const [sendEmail, setSendEmail] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setInvoiceId(''); setBuyerName(''); setBuyerTaxCode(''); setBuyerAddress('');
    setBuyerEmail(''); setPayMethod('TM'); setSendEmail(false);
    // v1: chỉ bảng kê ĐÃ THU (paymentStatus=2) mới phát hành được HĐĐT
    searchInvoices({ paymentStatus: 2, pageSize: 100 })
      .then((r) => setInvoices(r.data?.items || []))
      .catch(() => setInvoices([]));
  }, [open]);

  const submit = async () => {
    if (!invoiceId) { tw('Vui lòng chọn bảng kê'); return; }
    setBusy(true);
    try {
      await issueElectronicInvoice({
        invoiceId,
        buyerName: buyerName.trim() || undefined,
        buyerTaxCode: buyerTaxCode.trim() || undefined,
        buyerAddress: buyerAddress.trim() || undefined,
        buyerEmail: buyerEmail.trim() || undefined,
        paymentMethod: payMethod,
        sendEmail,
      });
      tk('Tạo hóa đơn điện tử thành công');
      onIssued();
    } catch { te('Không thể tạo hóa đơn điện tử'); }
    finally { setBusy(false); }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Phát hành HĐĐT từ bảng kê viện phí"
      size="md"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Hủy</Btn>
          <Btn variant="primary" disabled={busy} onClick={submit}>
            <TermIcon name="check" size={12} /> {busy ? 'Đang phát hành…' : 'Phát hành'}
          </Btn>
        </>
      }>
      <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 10, padding: 14, fontSize: 13 }}>
        <span>Bảng kê đã thu *</span>
        <AbSelect
          value={invoiceId}
          onChange={setInvoiceId}
          options={[
            { value: '', label: '— Chọn bảng kê —' },
            ...invoices.map((inv) => ({
              value: inv.id,
              label: `${inv.invoiceCode} - ${inv.patientName} - ${fmtVND(inv.totalAmount)}`,
            })),
          ]}
          placeholder="— Chọn bảng kê —"
        />
        <span>Tên người mua</span>
        <input className="ab-sel" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="Họ tên người mua (tùy chọn)" />
        <span>Mã số thuế</span>
        <input className="ab-sel" value={buyerTaxCode} onChange={(e) => setBuyerTaxCode(e.target.value)} placeholder="MST (nếu có)" />
        <span>Địa chỉ</span>
        <input className="ab-sel" value={buyerAddress} onChange={(e) => setBuyerAddress(e.target.value)} placeholder="Địa chỉ người mua" />
        <span>Email</span>
        <input className="ab-sel" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} placeholder="Email nhận hóa đơn" />
        <span>Hình thức TT</span>
        <AbSelect value={payMethod} onChange={setPayMethod} options={STMT_PAY_METHODS} />
        <span>Gửi email</span>
        <label>
          <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
          {' '}Gửi email ngay sau khi tạo
        </label>
      </div>
    </ModalShell>
  );
};

// #352: Modal gửi / gửi lại HĐĐT qua email — prefill buyerEmail || sentTo (v1 Send E-Invoice Modal)
const SendStmtModal: React.FC<{
  inv: ElectronicInvoiceDto | null;
  onClose: () => void;
  onDone: () => void;
}> = ({ inv, onClose, onDone }) => {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const resend = !!inv?.sentTo;

  useEffect(() => { if (inv) setEmail(inv.buyerEmail || inv.sentTo || ''); }, [inv]);

  const submit = async () => {
    if (!inv) return;
    const e = email.trim();
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { tw('Email không hợp lệ'); return; }
    setBusy(true);
    try {
      await (resend ? resendElectronicInvoice(inv.id, e) : sendElectronicInvoice(inv.id, e));
      tk(resend ? 'Đã gửi lại hóa đơn qua email' : 'Đã gửi hóa đơn qua email');
      onDone();
    } catch { te('Không thể gửi hóa đơn điện tử'); }
    finally { setBusy(false); }
  };

  return (
    <ModalShell
      open={!!inv}
      onClose={onClose}
      size="sm"
      title={resend ? 'Gửi lại HĐĐT qua email' : 'Gửi HĐĐT qua email'}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Đóng</Btn>
          <Btn variant="primary" disabled={busy} onClick={submit}>
            <TermIcon name="mail" size={12} /> {busy ? 'Đang gửi…' : (resend ? 'Gửi lại' : 'Gửi hóa đơn')}
          </Btn>
        </>
      }>
      {inv && (
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10, padding: 14, fontSize: 13 }}>
          <span>Hóa đơn</span>
          <b className="mono">{inv.eInvoiceNumber || '—'}</b>
          <span>Người mua</span>
          <span>{inv.buyerName || inv.patientName || '—'}</span>
          <span>Email nhận *</span>
          <input className="ab-sel" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@email.com" />
        </div>
      )}
    </ModalShell>
  );
};

// #352: Modal hủy HĐĐT bảng kê — bắt buộc lý do (v1 Cancel E-Invoice Modal)
const CancelStmtModal: React.FC<{
  inv: ElectronicInvoiceDto | null;
  onClose: () => void;
  onDone: () => void;
}> = ({ inv, onClose, onDone }) => {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (inv) setReason(''); }, [inv]);

  const submit = async () => {
    if (!inv) return;
    if (!reason.trim()) { tw('Vui lòng nhập lý do hủy'); return; }
    setBusy(true);
    try {
      await cancelElectronicInvoice(inv.id, reason.trim());
      tk('Hủy hóa đơn điện tử thành công');
      onDone();
    } catch { te('Không thể hủy hóa đơn điện tử'); }
    finally { setBusy(false); }
  };

  return (
    <ModalShell
      open={!!inv}
      onClose={onClose}
      size="sm"
      tone="danger"
      title="Hủy hóa đơn điện tử"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Đóng</Btn>
          <Btn variant="primary" disabled={busy} onClick={submit}>
            <TermIcon name="x" size={12} /> {busy ? 'Đang hủy…' : 'Xác nhận hủy'}
          </Btn>
        </>
      }>
      {inv && (
        <div style={{ padding: 14, fontSize: 13 }}>
          <div style={{ marginBottom: 10, color: 'var(--t-2)' }}>
            Hóa đơn <b className="mono">{inv.eInvoiceNumber || '—'}</b>
            {' · '}<b className="mono">{fmtVND(inv.totalAmount)}</b>
          </div>
          <div style={{ marginBottom: 4, fontWeight: 600, fontSize: 12 }}>Lý do hủy *</div>
          <textarea
            className="ab-sel"
            rows={3}
            style={{ width: '100%', resize: 'vertical' }}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Nhập lý do hủy hóa đơn"
          />
        </div>
      )}
    </ModalShell>
  );
};

export default EInvoicesPage;
