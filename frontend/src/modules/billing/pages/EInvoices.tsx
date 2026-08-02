import React, { useCallback, useEffect, useState } from 'react';
import {
  KpiStrip, TopTabs, DataTable, SearchBox, Filter, StatusBadge, AbSelect, Btn,
  DrawerShell, ModalShell, DrSec, DrField, useListData,
  type ColumnDef, type TopTab, type KpiItem, type StatusTone,
  tk, te, fmtDTg
} from '@/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';
import {
  einvoice,
  type EInvoiceDto,
  type EInvoiceDetailDto,
  type EInvoiceConfigDto,
} from '../api/einvoice';

// ── Constants ──────────────────────────────────────────────────────────────

type TabKey = 'list' | 'cfg';
const TOP_TABS: TopTab<TabKey>[] = [
  { v: 'list', l: 'Danh sách HĐĐT', ic: 'file' },
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

export default EInvoicesPage;
