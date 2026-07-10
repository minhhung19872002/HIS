/**
 * PharmacyStockIn — Nhập kho Dược từ nhà cung cấp (v2 native ab-* design).
 *
 * Layout: KpiStrip + StatusTabs + toolbar (filter/search/date) + DataTable + Pager
 * Create: ModalShell — header fields + line-items sub-table
 * Detail: DrawerShell — read-only header + items table
 * Actions: Approve (status 0 only) · Cancel (window.prompt pattern) · Print (blob)
 *
 * Supplier receipt type: determined from API endpoint — uses createSupplierReceipt()
 * which maps to /warehouse/receipts/supplier on the backend. receiptType in the DTO
 * is set by the server; we read it back in StockReceiptDto.
 *
 * Status gate (from warehouse.ts DTO numeric field):
 *   status 0 → draft/pending  → can Approve + Cancel
 *   status 1 → approved        → Print only
 *   status 2 → cancelled       → no actions
 * (verified by reading StockReceiptDto.status field in warehouse.ts)
 *
 * Supplier list: system.ts catalog.getSuppliers() → SupplierCatalogDto[] {id, code, name}
 * Item search:   examination.ts searchMedicines(keyword, warehouseId?, limit) → MedicineDto[]
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { App as AntdApp, AutoComplete, DatePicker, Form, Input, InputNumber } from 'antd';
import dayjs from 'dayjs';
import * as wh from '../api/warehouse';
import type {
  StockReceiptDto,
  StockReceiptItemDto,
  CreateStockReceiptDto,
  CreateStockReceiptItemDto,
  StockReceiptSearchDto,
  WarehouseDto,
} from '../api/warehouse';
import { searchMedicines } from '../api/examination';
import type { MedicineDto } from '../api/examination';
import systemApi from '../modules/system/api/system';
import type { SupplierCatalogDto } from '../modules/system/api/system';
import {
  KpiStrip,
  StatusTabs,
  SearchBox,
  Filter,
  DataTable,
  Pager,
  StatusBadge,
  ActBtn,
  Btn,
  DrawerShell,
  ModalShell,
  DrSec,
  DrField,
  AbSelect,
  applyServerErrors,
  type ColumnDef,
  type StatusTab,
} from './_v2kit';

// ─── Constants ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

/** Receipt status numeric values (from StockReceiptDto.status) */
const STATUS_DRAFT = 0;
const STATUS_APPROVED = 1;
const STATUS_CANCELLED = 2;

type StatusKey = 'draft' | 'approved' | 'cancelled';

const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'draft',     l: 'Chờ duyệt', tone: 'warn' },
  { v: 'approved',  l: 'Đã duyệt',  tone: 'ok' },
  { v: 'cancelled', l: 'Đã hủy',    tone: 'crit' },
];

const fmtVND = (n: number | null | undefined) =>
  n != null ? `${n.toLocaleString('vi-VN')} ₫` : '—';

const fmtDate = (iso?: string | null) =>
  iso ? dayjs(iso).format('DD/MM/YYYY') : '—';

// ─── Line-item row state (local — not the DTO shape) ─────────────────────────

interface LineItem {
  _key: string;        // local unique key for table rowKey
  itemId: string;
  itemCode: string;
  itemName: string;
  unit: string;
  batchNumber: string;
  expiryDate: string;  // YYYY-MM-DD
  quantity: number;
  unitPrice: number;
  vatRate: number;
  discountRate: number;
}

function emptyLine(): LineItem {
  return {
    _key: Math.random().toString(36).slice(2),
    itemId: '',
    itemCode: '',
    itemName: '',
    unit: '',
    batchNumber: '',
    expiryDate: '',
    quantity: 1,
    unitPrice: 0,
    vatRate: 0,
    discountRate: 0,
  };
}

function lineAmount(row: LineItem): number {
  const base = row.quantity * row.unitPrice;
  const vat = base * (row.vatRate / 100);
  const disc = base * (row.discountRate / 100);
  return base + vat - disc;
}

// ─── Item picker (AutoComplete with debounced search) ────────────────────────

interface ItemPickerProps {
  warehouseId: string;
  onSelect: (med: MedicineDto) => void;
  value: string;
  onChange: (v: string) => void;
}

const ItemPicker: React.FC<ItemPickerProps> = ({ warehouseId, onSelect, value, onChange }) => {
  const [options, setOptions] = useState<{ value: string; label: string; med: MedicineDto }[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (kw: string) => {
    onChange(kw);
    if (timer.current) clearTimeout(timer.current);
    if (!kw.trim()) { setOptions([]); return; }
    timer.current = setTimeout(async () => {
      try {
        const res = await searchMedicines(kw.trim(), warehouseId || undefined, 20);
        const meds = (res.data as MedicineDto[]) || [];
        setOptions(meds.map((m) => ({
          value: m.name,
          label: `[${m.code}] ${m.name}${m.unit ? ` · ${m.unit}` : ''}`,
          med: m,
        })));
      } catch {
        setOptions([]);
      }
    }, 280);
  };

  return (
    <AutoComplete
      value={value}
      options={options}
      onChange={onChange}
      onSearch={handleSearch}
      onSelect={(_v, opt) => { onSelect((opt as typeof options[number]).med); }}
      placeholder="Tìm tên / mã thuốc…"
      allowClear
      filterOption={false}
      style={{ width: '100%' }}
    />
  );
};

// ─── Line-items sub-table inside ModalShell ───────────────────────────────────

interface LineItemsTableProps {
  rows: LineItem[];
  warehouseId: string;
  onChange: (rows: LineItem[]) => void;
}

const LineItemsTable: React.FC<LineItemsTableProps> = ({ rows, warehouseId, onChange }) => {
  const update = (key: string, patch: Partial<LineItem>) => {
    onChange(rows.map((r) => (r._key === key ? { ...r, ...patch } : r)));
  };
  const remove = (key: string) => onChange(rows.filter((r) => r._key !== key));
  const add = () => onChange([...rows, emptyLine()]);

  return (
    <div style={{ marginTop: 'var(--space-8)' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 'var(--space-6)', fontSize: 'var(--fs-xs)', fontFamily: 'var(--font-mono)',
        textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--t-2)',
      }}>
        <span>Danh sách thuốc / vật tư ({rows.length} dòng)</span>
        <Btn variant="ghost" size="sm" icon="plus" onClick={add}>Thêm dòng</Btn>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-sm)' }}>
          <thead>
            <tr style={{ background: 'var(--bg-2)', borderBottom: '1px solid var(--line)' }}>
              {['Thuốc / Vật tư', 'Số lô', 'HSD', 'SL', 'Đơn giá', 'VAT%', 'CK%', 'Thành tiền', ''].map((h) => (
                <th key={h} style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: '20px', textAlign: 'center', color: 'var(--t-3)', fontSize: 'var(--fs-sm)' }}>
                  Chưa có dòng — bấm "Thêm dòng"
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row._key} style={{ borderBottom: '1px solid var(--line-soft)' }}>
                <td style={{ padding: '3px 4px', minWidth: 220 }}>
                  <ItemPicker
                    warehouseId={warehouseId}
                    value={row.itemName}
                    onChange={(v) => update(row._key, { itemName: v })}
                    onSelect={(med) => update(row._key, {
                      itemId: med.id,
                      itemCode: med.code,
                      itemName: med.name,
                      unit: med.unit || '',
                      unitPrice: med.unitPrice || 0,
                    })}
                  />
                </td>
                <td style={{ padding: '3px 4px', minWidth: 90 }}>
                  <Input
                    size="small"
                    value={row.batchNumber}
                    onChange={(e) => update(row._key, { batchNumber: e.target.value })}
                    placeholder="Số lô"
                  />
                </td>
                <td style={{ padding: '3px 4px', minWidth: 120 }}>
                  <DatePicker
                    size="small"
                    format="DD/MM/YYYY"
                    value={row.expiryDate ? dayjs(row.expiryDate) : null}
                    onChange={(d) => update(row._key, { expiryDate: d ? d.format('YYYY-MM-DD') : '' })}
                    style={{ width: '100%' }}
                    placeholder="HSD"
                  />
                </td>
                <td style={{ padding: '3px 4px', minWidth: 70 }}>
                  <InputNumber
                    size="small"
                    min={1}
                    value={row.quantity}
                    onChange={(v) => update(row._key, { quantity: Number(v) || 1 })}
                    style={{ width: '100%' }}
                  />
                </td>
                <td style={{ padding: '3px 4px', minWidth: 100 }}>
                  <InputNumber
                    size="small"
                    min={0}
                    value={row.unitPrice}
                    onChange={(v) => update(row._key, { unitPrice: Number(v) || 0 })}
                    style={{ width: '100%' }}
                    formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  />
                </td>
                <td style={{ padding: '3px 4px', minWidth: 60 }}>
                  <InputNumber
                    size="small"
                    min={0}
                    max={100}
                    value={row.vatRate}
                    onChange={(v) => update(row._key, { vatRate: Number(v) || 0 })}
                    style={{ width: '100%' }}
                  />
                </td>
                <td style={{ padding: '3px 4px', minWidth: 60 }}>
                  <InputNumber
                    size="small"
                    min={0}
                    max={100}
                    value={row.discountRate}
                    onChange={(v) => update(row._key, { discountRate: Number(v) || 0 })}
                    style={{ width: '100%' }}
                  />
                </td>
                <td style={{ padding: '3px 4px', minWidth: 100, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)' }}>
                  {lineAmount(row).toLocaleString('vi-VN')}
                </td>
                <td style={{ padding: '3px 4px' }}>
                  <ActBtn ic="trash" title="Xóa dòng" tone="crit" onClick={() => remove(row._key)} />
                </td>
              </tr>
            ))}
            {rows.length > 0 && (
              <tr style={{ borderTop: '1px solid var(--line)', fontWeight: 600 }}>
                <td colSpan={7} style={{ padding: '4px 6px', textAlign: 'right', fontSize: 'var(--fs-sm)' }}>Tổng cộng:</td>
                <td style={{ padding: '4px 6px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)' }}>
                  {rows.reduce((s, r) => s + lineAmount(r), 0).toLocaleString('vi-VN')} ₫
                </td>
                <td />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const PharmacyStockIn: React.FC = () => {
  const { message } = AntdApp.useApp();

  // ── List state ───────────────────────────────────────────────────────────
  const [rows, setRows] = useState<StockReceiptDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [stab, setStab] = useState<StatusKey | 'all'>('all');
  const [keyword, setKeyword] = useState('');
  const [filterWarehouseId, setFilterWarehouseId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // ── Reference data ───────────────────────────────────────────────────────
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierCatalogDto[]>([]);

  // ── Detail drawer ────────────────────────────────────────────────────────
  const [detail, setDetail] = useState<StockReceiptDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ── Create modal ─────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [lineItems, setLineItems] = useState<LineItem[]>([emptyLine()]);

  // ── Load reference data on mount ─────────────────────────────────────────
  useEffect(() => {
    wh.getWarehouses()
      .then((r) => setWarehouses((r.data as WarehouseDto[]) || []))
      .catch((e) => { console.warn('[async] tải dữ liệu phụ thất bại:', e); });
    systemApi.catalog.getSuppliers()
      .then((r) => setSuppliers((r.data as SupplierCatalogDto[]) || []))
      .catch((e) => { console.warn('[async] tải dữ liệu phụ thất bại:', e); });
  }, []);

  // ── Data loader ───────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const search: StockReceiptSearchDto = {
        keyword: keyword || undefined,
        warehouseId: filterWarehouseId || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        status: stab !== 'all'
          ? stab === 'approved' ? STATUS_APPROVED
          : stab === 'cancelled' ? STATUS_CANCELLED
          : STATUS_DRAFT
          : undefined,
        // Filter to supplier receipt type — backend will filter by type on the supplier endpoint
        receiptType: 1,  // 1 = Nhập từ NCC (verified: createSupplierReceipt posts to /receipts/supplier)
        page: page + 1,
        pageSize: PAGE_SIZE,
      };
      const res = await wh.getStockReceipts(search);
      const paged = res.data;
      setRows(paged.items || []);
      setTotal(paged.totalCount || 0);
    } catch {
      message.warning('Tải danh sách phiếu nhập thất bại');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [keyword, filterWarehouseId, fromDate, toDate, stab, page, message]);

  useEffect(() => { void load(); }, [load]);

  // ── KPI counts ───────────────────────────────────────────────────────────
  const draftCount  = rows.filter((r) => r.status === STATUS_DRAFT).length;
  const approvedCount = rows.filter((r) => r.status === STATUS_APPROVED).length;

  // ── Open detail drawer ───────────────────────────────────────────────────
  const openDetail = async (r: StockReceiptDto) => {
    setDetail(r);
    setDetailLoading(true);
    try {
      const res = await wh.getStockReceiptById(r.id);
      setDetail(res.data as StockReceiptDto);
    } catch {
      message.warning('Không tải được chi tiết phiếu');
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Approve ───────────────────────────────────────────────────────────────
  const onApprove = async (r: StockReceiptDto) => {
    if (r.status !== STATUS_DRAFT) return;
    try {
      await wh.approveStockReceipt(r.id);
      message.success(`Đã duyệt phiếu ${r.receiptCode}`);
      void load();
      if (detail?.id === r.id) {
        const res = await wh.getStockReceiptById(r.id);
        setDetail(res.data as StockReceiptDto);
      }
    } catch {
      message.error('Duyệt phiếu thất bại');
    }
  };

  // ── Cancel (window.prompt pattern — same as Laboratory.tsx) ──────────────
  const onCancel = async (r: StockReceiptDto) => {
    if (r.status !== STATUS_DRAFT) return;
    const reason = window.prompt(`Lý do hủy phiếu ${r.receiptCode}:`, '');
    if (reason === null) return;          // user pressed Cancel
    if (!reason.trim()) { message.warning('Cần nhập lý do hủy'); return; }
    try {
      await wh.cancelStockReceipt(r.id, reason.trim());
      message.success(`Đã hủy phiếu ${r.receiptCode}`);
      void load();
      if (detail?.id === r.id) {
        const res = await wh.getStockReceiptById(r.id);
        setDetail(res.data as StockReceiptDto);
      }
    } catch {
      message.error('Hủy phiếu thất bại');
    }
  };

  // ── Print (blob → new tab — Billing.tsx pattern) ─────────────────────────
  const onPrint = async (r: StockReceiptDto) => {
    try {
      const res = await wh.printStockReceipt(r.id);
      const url = URL.createObjectURL(res.data as Blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      message.error('In phiếu thất bại');
    }
  };

  // ── Create modal open / close ─────────────────────────────────────────────
  const openCreate = () => {
    form.resetFields();
    setLineItems([emptyLine()]);
    setCreateOpen(true);
  };

  // ── Submit create ─────────────────────────────────────────────────────────
  const handleCreate = async () => {
    let values: Record<string, unknown>;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    const validItems = lineItems.filter((l) => l.itemId);
    if (validItems.length === 0) {
      message.warning('Phiếu cần ít nhất 1 dòng thuốc có chọn sản phẩm');
      return;
    }

    const dto: CreateStockReceiptDto = {
      receiptDate: values.receiptDate ? (values.receiptDate as ReturnType<typeof dayjs>).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
      warehouseId: values.warehouseId as string,
      receiptType: 1,   // supplier receipt type — maps to /receipts/supplier endpoint
      supplierId: (values.supplierId as string) || undefined,
      invoiceNumber: (values.invoiceNumber as string) || undefined,
      invoiceDate: values.invoiceDate ? (values.invoiceDate as ReturnType<typeof dayjs>).format('YYYY-MM-DD') : undefined,
      notes: (values.notes as string) || undefined,
      items: validItems.map((l): CreateStockReceiptItemDto => ({
        itemId: l.itemId,
        batchNumber: l.batchNumber || undefined,
        expiryDate: l.expiryDate || undefined,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        vatRate: l.vatRate,
        discountRate: l.discountRate,
      })),
    };

    setSaving(true);
    try {
      await wh.createSupplierReceipt(dto);
      message.success('Tạo phiếu nhập thành công');
      setCreateOpen(false);
      void load();
    } catch (e: unknown) {
      if (!applyServerErrors(form, e)) {
        const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
        message.error(msg || 'Tạo phiếu thất bại');
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Column defs ───────────────────────────────────────────────────────────
  const columns: ColumnDef<StockReceiptDto>[] = [
    {
      key: 'code', label: 'Mã phiếu', mono: true, code: true, width: 140,
      render: (r) => r.receiptCode,
    },
    {
      key: 'date', label: 'Ngày nhập', mono: true, width: 100,
      render: (r) => fmtDate(r.receiptDate),
    },
    {
      key: 'warehouse', label: 'Kho',
      render: (r) => r.warehouseName,
    },
    {
      key: 'supplier', label: 'Nhà cung cấp',
      render: (r) => r.supplierName || '—',
    },
    {
      key: 'invoice', label: 'Số hóa đơn', mono: true,
      render: (r) => r.invoiceNumber || '—',
    },
    {
      key: 'amount', label: 'Tổng tiền', mono: true, width: 120,
      render: (r) => fmtVND(r.finalAmount),
    },
    {
      key: 'status', label: 'Trạng thái', width: 110,
      render: (r) => {
        const tone = r.status === STATUS_APPROVED ? 'ok'
          : r.status === STATUS_CANCELLED ? 'crit' : 'warn';
        return <StatusBadge tone={tone} dot>{r.statusName}</StatusBadge>;
      },
    },
  ];

  // ── Warehouse / supplier options ──────────────────────────────────────────
  const warehouseOpts = warehouses.map((w) => ({ v: w.id, l: w.warehouseName }));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ── Status tab counts (from current page — approximate; full counts need BE) ─
  const tabCounts: Record<string, number> = {
    all: total,
    draft: draftCount,
    approved: approvedCount,
    cancelled: rows.filter((r) => r.status === STATUS_CANCELLED).length,
  };

  return (
    <div className="ab">
      {/* KPI strip */}
      <KpiStrip items={[
        { lbl: 'Tổng phiếu (trang)', val: rows.length },
        { lbl: 'Chờ duyệt', val: draftCount, tone: 'warn' },
        { lbl: 'Đã duyệt', val: approvedCount, tone: 'ok' },
        {
          lbl: 'Tổng giá trị',
          val: Math.round(rows.filter((r) => r.status === STATUS_APPROVED).reduce((s, r) => s + r.finalAmount, 0) / 1_000_000),
          unit: 'tr₫',
          tone: 'info',
        },
      ]} />

      {/* Status sub-tabs */}
      <StatusTabs<StatusKey>
        value={stab}
        onChange={setStab}
        tabs={STATUS_TABS}
        counts={tabCounts}
      />

      {/* Toolbar */}
      <div className="ab-toolbar">
        <SearchBox value={keyword} onChange={setKeyword} placeholder="Mã phiếu / số HĐ / NCC…" />
        <Filter value={filterWarehouseId} onChange={setFilterWarehouseId} options={warehouseOpts} placeholder="▾ Tất cả kho" />
        <DatePicker
          size="small"
          format="DD/MM/YYYY"
          placeholder="Từ ngày"
          value={fromDate ? dayjs(fromDate) : null}
          onChange={(d) => setFromDate(d ? d.format('YYYY-MM-DD') : '')}
        />
        <DatePicker
          size="small"
          format="DD/MM/YYYY"
          placeholder="Đến ngày"
          value={toDate ? dayjs(toDate) : null}
          onChange={(d) => setToDate(d ? d.format('YYYY-MM-DD') : '')}
        />
        <Btn variant="ghost" icon="x" onClick={() => { setKeyword(''); setFilterWarehouseId(''); setFromDate(''); setToDate(''); setStab('all'); setPage(0); }}>
          Bỏ lọc
        </Btn>
        <span className="spacer" />
        <Btn variant="ghost" icon="refresh" onClick={() => void load()}>Làm mới</Btn>
        <Btn variant="primary" icon="plus" onClick={openCreate}>Nhập từ NCC</Btn>
      </div>

      {/* Main table */}
      <DataTable<StockReceiptDto>
        columns={columns}
        data={rows}
        rowKey={(r) => r.id}
        onRowClick={openDetail}
        empty={loading ? 'Đang tải…' : 'Không có phiếu nhập nào'}
        actions={(r) => (
          <>
            {r.status === STATUS_DRAFT && (
              <ActBtn ic="check" title="Duyệt phiếu" onClick={() => void onApprove(r)} />
            )}
            {r.status === STATUS_DRAFT && (
              <ActBtn ic="x-circle" title="Hủy phiếu" tone="crit" onClick={() => void onCancel(r)} />
            )}
            <ActBtn ic="printer" title="In phiếu" onClick={() => void onPrint(r)} />
          </>
        )}
      />

      {/* Pager */}
      <Pager page={page} totalPages={totalPages} setPage={setPage} total={total} perPage={PAGE_SIZE} />

      {/* ── Detail drawer ── */}
      <DrawerShell
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? `Phiếu nhập ${detail.receiptCode}` : ''}
        sub={detail ? `${detail.warehouseName} · ${fmtDate(detail.receiptDate)}` : ''}
        size="xl"
        footer={detail && (
          <div style={{ display: 'flex', gap: 'var(--space-8)' }}>
            {detail.status === STATUS_DRAFT && (
              <Btn variant="ok" icon="check" onClick={() => void onApprove(detail)}>Duyệt</Btn>
            )}
            {detail.status === STATUS_DRAFT && (
              <Btn variant="crit" icon="x-circle" onClick={() => void onCancel(detail)}>Hủy phiếu</Btn>
            )}
            <Btn variant="ghost" icon="printer" onClick={() => void onPrint(detail)}>In phiếu</Btn>
          </div>
        )}
      >
        {detail && (
          <>
            {detailLoading && (
              <div style={{ padding: 'var(--space-20)', textAlign: 'center', color: 'var(--t-2)' }}>Đang tải…</div>
            )}
            {!detailLoading && (
              <>
                <DrSec title="Thông tin phiếu">
                  <DrField lbl="Mã phiếu">{detail.receiptCode}</DrField>
                  <DrField lbl="Kho nhập">{detail.warehouseName}</DrField>
                  <DrField lbl="Ngày nhập">{fmtDate(detail.receiptDate)}</DrField>
                  <DrField lbl="Trạng thái">
                    <StatusBadge
                      tone={detail.status === STATUS_APPROVED ? 'ok' : detail.status === STATUS_CANCELLED ? 'crit' : 'warn'}
                      dot
                    >
                      {detail.statusName}
                    </StatusBadge>
                  </DrField>
                  {detail.approvedByName && (
                    <DrField lbl="Người duyệt">{detail.approvedByName}</DrField>
                  )}
                  {detail.approvedAt && (
                    <DrField lbl="Ngày duyệt">{fmtDate(detail.approvedAt)}</DrField>
                  )}
                </DrSec>

                <DrSec title="Nhà cung cấp / Hóa đơn">
                  <DrField lbl="Nhà cung cấp">{detail.supplierName || '—'}</DrField>
                  <DrField lbl="Số hóa đơn">{detail.invoiceNumber || '—'}</DrField>
                  <DrField lbl="Ngày hóa đơn">{fmtDate(detail.invoiceDate)}</DrField>
                  {detail.notes && <DrField lbl="Ghi chú">{detail.notes}</DrField>}
                </DrSec>

                <DrSec title="Tổng tiền">
                  <DrField lbl="Tổng hàng">{fmtVND(detail.totalAmount)}</DrField>
                  <DrField lbl="VAT">{fmtVND(detail.vatAmount)}</DrField>
                  <DrField lbl="Chiết khấu">{fmtVND(detail.discountAmount)}</DrField>
                  <DrField lbl="Thực trả">
                    <strong style={{ color: 'var(--a-blue)' }}>{fmtVND(detail.finalAmount)}</strong>
                  </DrField>
                </DrSec>

                <DrSec title={`Chi tiết dòng hàng (${detail.items?.length ?? 0} dòng)`}>
                  <div style={{ overflowX: 'auto', marginTop: 'var(--space-4)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-sm)' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-2)', borderBottom: '1px solid var(--line)' }}>
                          {['Mã', 'Tên', 'ĐVT', 'Lô', 'HSD', 'SL', 'Đơn giá', 'VAT%', 'CK%', 'Thành tiền'].map((h) => (
                            <th key={h} style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(detail.items || []).map((item: StockReceiptItemDto) => (
                          <tr key={item.id} style={{ borderBottom: '1px solid var(--line-soft)' }}>
                            <td style={{ padding: '3px 6px', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)' }}>{item.itemCode}</td>
                            <td style={{ padding: '3px 6px' }}>{item.itemName}</td>
                            <td style={{ padding: '3px 6px' }}>{item.unit}</td>
                            <td style={{ padding: '3px 6px', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)' }}>{item.batchNumber || '—'}</td>
                            <td style={{ padding: '3px 6px', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)' }}>{fmtDate(item.expiryDate)}</td>
                            <td style={{ padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{item.quantity.toLocaleString('vi-VN')}</td>
                            <td style={{ padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{fmtVND(item.unitPrice)}</td>
                            <td style={{ padding: '3px 6px', textAlign: 'right' }}>{item.vatRate}%</td>
                            <td style={{ padding: '3px 6px', textAlign: 'right' }}>{item.discountRate}%</td>
                            <td style={{ padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{fmtVND(item.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </DrSec>
              </>
            )}
          </>
        )}
      </DrawerShell>

      {/* ── Create modal ── */}
      <ModalShell
        open={createOpen}
        onClose={() => !saving && setCreateOpen(false)}
        title="Nhập kho từ nhà cung cấp"
        sub="Phiếu nhập NCC — điền thông tin và danh sách hàng"
        size="xl"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setCreateOpen(false)} disabled={saving}>Hủy</Btn>
            <Btn variant="primary" icon="check" onClick={() => void handleCreate()} loading={saving}>
              {saving ? 'Đang tạo…' : 'Tạo phiếu'}
            </Btn>
          </>
        }
      >
        <Form form={form} layout="vertical" scrollToFirstError requiredMark>
          {/* Header fields — 2-col grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="warehouseId" label="Kho nhận" rules={[{ required: true, message: 'Chọn kho nhận' }]}>
              <AbSelect
                options={warehouses}
                fieldNames={{ value: 'id', label: 'warehouseName' }}
                placeholder="— Chọn kho —"
              />
            </Form.Item>

            <Form.Item name="supplierId" label="Nhà cung cấp">
              <AbSelect
                options={suppliers}
                fieldNames={{ value: 'id', label: 'name' }}
                placeholder="— Chọn NCC —"
              />
            </Form.Item>

            <Form.Item name="invoiceNumber" label="Số hóa đơn">
              <Input placeholder="Nhập số hóa đơn" />
            </Form.Item>

            <Form.Item name="invoiceDate" label="Ngày hóa đơn">
              <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item name="receiptDate" label="Ngày nhập kho" rules={[{ required: true, message: 'Chọn ngày nhập' }]} initialValue={dayjs()}>
              <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item name="notes" label="Ghi chú">
              <Input.TextArea rows={1} placeholder="Ghi chú thêm…" />
            </Form.Item>
          </div>

          {/* Line items sub-table */}
          <Form.Item
            shouldUpdate
            style={{ marginBottom: 0 }}
          >
            {() => {
              const selectedWarehouseId = form.getFieldValue('warehouseId') as string || '';
              return (
                <LineItemsTable
                  rows={lineItems}
                  warehouseId={selectedWarehouseId}
                  onChange={setLineItems}
                />
              );
            }}
          </Form.Item>
        </Form>
      </ModalShell>
    </div>
  );
};

export default PharmacyStockIn;
