import React, { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { fmtNum as fmt } from '../../../utils/format';
import {
  getStock, getStockReceipts, approveStockReceipt, cancelStockReceipt,
} from '../api/warehouse';
import type { StockDto, StockReceiptDto } from '../api/warehouse';
import {
  TopTabs, KpiStrip, StatusTabs, SearchBox, DataTable, Pager,
  StatusBadge, ActBtn, Btn, DrawerShell, DrSec, DrField,
  SimpleV2Page, useTabCounts, tk, te, cf,
  type TopTab, type ColumnDef, type StatusTab, type KpiItem,
} from '@/_v2kit';
import { friendlyErrorMessage } from '../../../utils/friendlyError';

type Tab = 'stock' | 'receipts';
const TABS: TopTab<Tab>[] = [
  { v: 'stock',    l: 'Tồn kho',    ic: 'list' },
  { v: 'receipts', l: 'Phiếu nhập', ic: 'file-text' },
];

// ── Stock tab ──
type SKey = 'in-stock' | 'low' | 'expiring' | 'out';
const STOCK_TABS: StatusTab<SKey>[] = [
  { v: 'in-stock',  l: 'Còn tồn',     tone: 'ok' },
  { v: 'low',       l: 'Tồn thấp',    tone: 'warn' },
  { v: 'expiring',  l: 'Sắp hết hạn', tone: 'warn' },
  { v: 'out',       l: 'Hết',         tone: 'crit' },
];

// ── Receipt tab ──
type RKey = 'draft' | 'pending' | 'approved' | 'cancelled';
const RECEIPT_TABS: StatusTab<RKey>[] = [
  { v: 'draft',     l: 'Nháp',        tone: 'info' },
  { v: 'pending',   l: 'Chờ duyệt',   tone: 'warn' },
  { v: 'approved',  l: 'Đã duyệt',    tone: 'ok' },
  { v: 'cancelled', l: 'Đã hủy',      tone: 'crit' },
];
const rKey = (status: number): RKey =>
  status === 0 ? 'draft' : status === 1 ? 'pending' : status === 2 ? 'approved' : 'cancelled';
const RTONE: Record<RKey, 'ok' | 'warn' | 'info' | 'crit'> = {
  draft: 'info', pending: 'warn', approved: 'ok', cancelled: 'crit',
};
const RECEIPT_TYPE: Record<number, string> = {
  0: 'Nhập NCC', 1: 'Nguồn khác', 2: 'Chuyển kho', 3: 'Trả khoa',
};

const fmtDMY = (iso?: string) => iso ? dayjs(iso).format('DD/MM/YYYY') : '—';
const fmtVND = (n: number) => `${fmt(Math.round(n / 1000))}k`;
const PER = 20;

const MedicalSupplyV2: React.FC = () => {
  const [tab, setTab] = useState<Tab>('stock');
  const today = dayjs();

  // ── Receipts state ──
  const [receipts, setReceipts]     = useState<StockReceiptDto[]>([]);
  const [rTotal, setRTotal]         = useState(0);
  const [rLoad, setRLoad]           = useState(false);
  const [rLoaded, setRLoaded]       = useState(false);
  const [rSearch, setRSearch]       = useState('');
  const [rStab, setRStab]           = useState<RKey | 'all'>('all');
  const [rPage, setRPage]           = useState(0);
  const [rSel, setRSel]             = useState<StockReceiptDto | null>(null);

  const loadReceipts = useCallback(async (p = 0) => {
    setRLoad(true);
    try {
      const resp = await getStockReceipts({ keyword: rSearch || undefined, page: p + 1, pageSize: PER });
      setReceipts((resp.data?.items as StockReceiptDto[]) || []);
      setRTotal(resp.data?.totalCount ?? 0);
      setRLoaded(true);
    } catch (e) {
      te(friendlyErrorMessage(e, 'Tải danh sách phiếu nhập thất bại'));
    } finally { setRLoad(false); }
  }, [rSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tab === 'receipts' && !rLoaded) loadReceipts(0);
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApprove = (r: StockReceiptDto) =>
    cf(`Duyệt phiếu nhập ${r.receiptCode}?`, async () => {
      try { await approveStockReceipt(r.id); tk('Đã duyệt phiếu nhập'); loadReceipts(rPage); }
      catch { te('Duyệt thất bại'); }
    }, { tone: 'warn' });

  const handleCancel = (r: StockReceiptDto) =>
    cf(`Hủy phiếu nhập ${r.receiptCode}?`, async () => {
      try { await cancelStockReceipt(r.id, 'Hủy theo yêu cầu'); tk('Đã hủy phiếu nhập'); loadReceipts(rPage); }
      catch { te('Hủy thất bại'); }
    }, { tone: 'crit', confirm: 'Xác nhận hủy' });

  // ── Receipts counts by local status ──
  const rCounts = useTabCounts(receipts, RECEIPT_TABS, (r) => rKey(r.status));
  const rFiltered = rStab === 'all' ? receipts : receipts.filter((r) => rKey(r.status) === rStab);
  const rPages = Math.max(1, Math.ceil(rTotal / PER));

  // ── Stock (SimpleV2Page) ──
  const stockLoad = useCallback(async () => {
    const r = await getStock({ itemType: 2, page: 1, pageSize: 200 });
    return ((r.data?.items as StockDto[]) || (Array.isArray(r.data) ? (r.data as StockDto[]) : [])) as StockDto[];
  }, []);

  const stockStatus = (s: StockDto): SKey => {
    if (s.quantity <= 0) return 'out';
    if (s.isExpiringSoon) return 'expiring';
    if (s.isBelowMinimum) return 'low';
    return 'in-stock';
  };

  const stockCols: ColumnDef<StockDto>[] = [
    { key: 'code',    label: 'Mã', mono: true, width: 120, render: (r) => r.itemCode },
    { key: 'name',    label: 'Tên vật tư',   render: (r) => r.itemName },
    { key: 'unit',    label: 'ĐVT',          render: (r) => r.unit },
    { key: 'batch',   label: 'Lô', mono: true, width: 120, render: (r) => r.batchNumber || '—' },
    { key: 'expiry',  label: 'HSD', mono: true, width: 100, render: (r) => {
      if (!r.expiryDate) return '—';
      const d = dayjs(r.expiryDate);
      const diff = d.diff(today, 'day');
      const color = diff < 0 ? 'var(--s-crit)' : diff < 90 ? 'var(--s-warn)' : undefined;
      return <span style={{ color }}>{d.format('DD/MM/YYYY')}</span>;
    }},
    { key: 'qty',     label: 'Tồn', mono: true, width: 80, render: (r) => fmt(r.quantity) },
    { key: 'price',   label: 'Đơn giá', mono: true, width: 110, render: (r) => r.unitPrice ? fmtVND(r.unitPrice) : '—' },
    { key: 'value',   label: 'Thành tiền', mono: true, width: 110, render: (r) => fmtVND(r.quantity * (r.unitPrice || 0)) },
    { key: 'st',      label: 'TT', width: 120, render: (r) => {
      const sk = stockStatus(r);
      return <StatusBadge tone={STOCK_TABS.find((t) => t.v === sk)?.tone}>
        {STOCK_TABS.find((t) => t.v === sk)?.l}
      </StatusBadge>;
    }},
  ];
  const stockKpis = (rows: StockDto[]): KpiItem[] => [
    { lbl: 'Tổng SKU',     val: rows.length },
    { lbl: 'Còn tồn',      val: rows.filter((s) => s.quantity > 0).length, tone: 'ok' },
    { lbl: 'Sắp hết hạn',  val: rows.filter((s) => s.isExpiringSoon).length, tone: 'warn' },
    { lbl: 'Hết hàng',     val: rows.filter((s) => s.quantity <= 0).length, tone: 'crit' },
    { lbl: 'Tổng giá trị', val: Math.round(rows.reduce((sum, s) => sum + (s.quantity * (s.unitPrice || 0)), 0) / 1_000_000), unit: 'M₫' },
  ];

  // ── Receipts columns ──
  const rCols: ColumnDef<StockReceiptDto>[] = [
    { key: 'code',     label: 'Mã phiếu', mono: true, width: 140, render: (r) => r.receiptCode },
    { key: 'date',     label: 'Ngày nhập', mono: true, width: 100, render: (r) => fmtDMY(r.receiptDate) },
    { key: 'type',     label: 'Loại', width: 120, render: (r) => (
      <span className="chip info">{RECEIPT_TYPE[r.receiptType] ?? r.receiptTypeName}</span>
    )},
    { key: 'supplier', label: 'Nguồn', render: (r) =>
      r.supplierName || r.sourceWarehouseName || r.departmentName || '—'
    },
    { key: 'inv',      label: 'Hóa đơn', mono: true, width: 130, render: (r) => r.invoiceNumber || '—' },
    { key: 'items',    label: 'SKU', mono: true, width: 60, render: (r) => r.items?.length ?? '—' },
    { key: 'total',    label: 'Thành tiền', mono: true, width: 120, render: (r) => fmtVND(r.finalAmount) },
    { key: 'st',       label: 'TT', width: 120, render: (r) => {
      const k = rKey(r.status);
      return <StatusBadge tone={RTONE[k]}>{RECEIPT_TABS.find((t) => t.v === k)?.l}</StatusBadge>;
    }},
    { key: 'act', label: '', width: 80, render: (r) => (
      <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
        {r.status === 1 && <ActBtn ic="check" onClick={() => handleApprove(r)} title="Duyệt" />}
        {(r.status === 0 || r.status === 1) && <ActBtn ic="alert" onClick={() => handleCancel(r)} title="Hủy" />}
      </div>
    )},
  ];

  return (
    <div>
      <TopTabs<Tab>
        tab={tab}
        setTab={setTab}
        tabs={TABS}
        actions={tab === 'receipts' ? <Btn icon="refresh" onClick={() => loadReceipts(0)} loading={rLoad} /> : undefined}
      />
      <div style={{ paddingTop: 12 }}>

        {/* ── TAB 1: Tồn kho ── */}
        {tab === 'stock' && (
          <SimpleV2Page<StockDto>
            title=""
            load={stockLoad}
            rowKey={(r) => r.id}
            columns={stockCols}
            searchPlaceholder="Tìm theo mã / tên / lô…"
            searchOf={(r) => `${r.itemCode} ${r.itemName} ${r.batchNumber || ''}`}
            statusTabs={STOCK_TABS as unknown as StatusTab<string>[]}
            statusOf={stockStatus}
            kpis={stockKpis}
            pageSize={20}
            emptyMessage="Chưa có vật tư"
            drawerTitle={(r) => r.itemName}
            drawerSub={(r) => `${r.itemCode} · ${r.unit}`}
            drawer={(r) => (
              <>
                <DrSec title="Định danh">
                  <DrField lbl="Mã"><span className="mono" style={{ color: 'var(--a-cy)' }}>{r.itemCode}</span></DrField>
                  <DrField lbl="Tên">{r.itemName}</DrField>
                  <DrField lbl="ĐVT">{r.unit}</DrField>
                  <DrField lbl="Loại">{r.itemTypeName}</DrField>
                </DrSec>
                <DrSec title="Lô / Hạn dùng">
                  <DrField lbl="Số lô">{r.batchNumber || '—'}</DrField>
                  <DrField lbl="HSD">{r.expiryDate ? dayjs(r.expiryDate).format('DD/MM/YYYY') : '—'}</DrField>
                  {r.location && <DrField lbl="Vị trí">{r.location}</DrField>}
                </DrSec>
                <DrSec title="Tồn kho">
                  <DrField lbl="Tồn"><b>{fmt(r.quantity)} {r.unit}</b></DrField>
                  <DrField lbl="Đã giữ chỗ">{fmt(r.reservedQuantity)}</DrField>
                  <DrField lbl="Khả dụng"><b style={{ color: 'var(--s-ok)' }}>{fmt(r.availableQuantity)}</b></DrField>
                  <DrField lbl="Đơn giá">{r.unitPrice ? fmtVND(r.unitPrice) : '—'}</DrField>
                  <DrField lbl="Thành tiền"><b>{fmtVND(r.quantity * (r.unitPrice || 0))}</b></DrField>
                </DrSec>
                {(r.isBelowMinimum || r.isAboveMaximum || r.isExpiringSoon || r.isExpired) && (
                  <DrSec title="Cảnh báo">
                    <DrField lbl="">
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {r.isExpired     && <span className="chip crit">Hết hạn</span>}
                        {r.isExpiringSoon && <span className="chip warn">Sắp hết hạn</span>}
                        {r.isBelowMinimum && <span className="chip warn">Dưới mức tối thiểu</span>}
                        {r.isAboveMaximum && <span className="chip info">Trên mức tối đa</span>}
                      </div>
                    </DrField>
                  </DrSec>
                )}
              </>
            )}
          />
        )}

        {/* ── TAB 2: Phiếu nhập kho ── */}
        {tab === 'receipts' && (
          <div>
            <KpiStrip items={[
              { lbl: 'Tổng phiếu', val: rTotal },
              { lbl: 'Chờ duyệt', val: receipts.filter((r) => r.status === 1).length, tone: 'warn' },
              { lbl: 'Đã duyệt',  val: receipts.filter((r) => r.status === 2).length, tone: 'ok' },
              { lbl: 'Tổng giá trị', val: Math.round(
                receipts.filter((r) => r.status === 2).reduce((s, r) => s + (r.finalAmount || 0), 0) / 1_000_000,
              ), unit: 'M₫', tone: 'info' },
            ]} />
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <SearchBox
                value={rSearch}
                onChange={(v) => { setRSearch(v); setRPage(0); setRLoaded(false); }}
                placeholder="Tìm mã phiếu / NCC / số HĐ…"
              />
              <Btn icon="refresh" onClick={() => { setRLoaded(false); loadReceipts(0); }} loading={rLoad} />
            </div>
            <StatusTabs<RKey>
              value={rStab}
              onChange={(v) => { setRStab(v); }}
              tabs={RECEIPT_TABS}
              counts={rCounts}
            />
            <DataTable<StockReceiptDto>
              columns={rCols}
              data={rFiltered}
              rowKey={(r) => r.id}
              onRowClick={setRSel}
              empty={rLoad ? 'Đang tải…' : 'Chưa có phiếu nhập kho'}
            />
            <Pager
              page={rPage}
              totalPages={rPages}
              setPage={(p) => {
                const next = typeof p === 'function' ? p(rPage) : p;
                setRPage(next);
                loadReceipts(next);
              }}
              total={rTotal}
              perPage={PER}
            />

            <DrawerShell
              open={!!rSel}
              onClose={() => setRSel(null)}
              title={rSel?.receiptCode ?? ''}
              sub={rSel ? `${RECEIPT_TYPE[rSel.receiptType] ?? rSel.receiptTypeName} · ${fmtDMY(rSel.receiptDate)}` : ''}
              footer={
                <>
                  {rSel?.status === 1 && (
                    <Btn variant="primary" onClick={() => { handleApprove(rSel!); setRSel(null); }}>Duyệt</Btn>
                  )}
                  {(rSel?.status === 0 || rSel?.status === 1) && (
                    <Btn variant="ghost" onClick={() => { handleCancel(rSel!); setRSel(null); }}>Hủy phiếu</Btn>
                  )}
                </>
              }
            >
              {rSel && (
                <>
                  <DrSec title="Thông tin phiếu">
                    <DrField lbl="Mã phiếu">
                      <span className="mono" style={{ color: 'var(--a-cy)' }}>{rSel.receiptCode}</span>
                    </DrField>
                    <DrField lbl="Ngày nhập">{fmtDMY(rSel.receiptDate)}</DrField>
                    <DrField lbl="Loại nhập">{RECEIPT_TYPE[rSel.receiptType] ?? rSel.receiptTypeName}</DrField>
                    <DrField lbl="Kho nhập">{rSel.warehouseName}</DrField>
                    {rSel.supplierName && <DrField lbl="Nhà cung cấp">{rSel.supplierName}</DrField>}
                    {rSel.invoiceNumber && (
                      <DrField lbl="Số hóa đơn"><span className="mono">{rSel.invoiceNumber}</span></DrField>
                    )}
                    {rSel.invoiceDate && <DrField lbl="Ngày HĐ">{fmtDMY(rSel.invoiceDate)}</DrField>}
                    {rSel.contractNumber && (
                      <DrField lbl="Số HĐ mua">{rSel.contractNumber}</DrField>
                    )}
                  </DrSec>
                  <DrSec title="Tài chính">
                    <DrField lbl="Tổng tiền hàng">{fmtVND(rSel.totalAmount)}</DrField>
                    <DrField lbl="VAT">{fmtVND(rSel.vatAmount)}</DrField>
                    <DrField lbl="Chiết khấu">{fmtVND(rSel.discountAmount)}</DrField>
                    <DrField lbl="Thành tiền"><b>{fmtVND(rSel.finalAmount)}</b></DrField>
                  </DrSec>
                  {rSel.items?.length > 0 && (
                    <DrSec title={`Danh sách vật tư (${rSel.items.length} SKU)`}>
                      {rSel.items.map((item) => (
                        <div key={item.id} style={{
                          padding: '6px 10px', marginBottom: 4,
                          background: 'var(--bg-1)', border: '1px solid var(--line-soft)',
                          borderRadius: 'var(--r-2)',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                            <span style={{ fontWeight: 600, fontSize: 12.5 }}>{item.itemName}</span>
                            <span className="mono" style={{ fontSize: 12 }}>{fmt(item.quantity)} {item.unit}</span>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--t-3)', marginTop: 2 }}>
                            {item.itemCode}
                            {item.batchNumber && ` · Lô ${item.batchNumber}`}
                            {item.expiryDate && ` · HSD ${dayjs(item.expiryDate).format('MM/YYYY')}`}
                          </div>
                        </div>
                      ))}
                    </DrSec>
                  )}
                  <DrSec title="Xử lý">
                    <DrField lbl="Người tạo">{rSel.createdByName}</DrField>
                    {rSel.approvedByName && (
                      <DrField lbl="Người duyệt">
                        {rSel.approvedByName} · {fmtDMY(rSel.approvedAt)}
                      </DrField>
                    )}
                    {rSel.notes && <DrField lbl="Ghi chú">{rSel.notes}</DrField>}
                  </DrSec>
                </>
              )}
            </DrawerShell>
          </div>
        )}
      </div>
    </div>
  );
};

export default MedicalSupplyV2;
