/**
 * PharmacyStockIssue — Xuất kho Dược (v2 native ab-* design).
 *
 * Layout: KpiStrip + StatusTabs (by issue type) + toolbar + DataTable + Pager
 * Create: ModalShell — type selector + conditional target field + line-items sub-table
 * Detail: DrawerShell — read-only header + items table
 * Actions: In phiếu (blob → new tab)
 *
 * Issue types (manual, each has its own create endpoint):
 *   3 → issueToDepartment   — requires departmentId
 *   4 → createTransferIssue — requires targetWarehouseId (must differ from source)
 *   5 → createSupplierReturn— requires supplierId
 *   7 → createDestructionIssue — only notes (lý do hủy required)
 *
 * No approve/cancel endpoints exist for issues — created directly.
 *
 * Departments: catalogApi.getDepartments(undefined, undefined, true) → DepartmentCatalogDto[] {id, name}
 * Item search:  searchMedicines(keyword, warehouseId?, limit) → MedicineDto[]
 * paymentSource default: 0 (backend FIFO — stockId left undefined)
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { App as AntdApp, AutoComplete, DatePicker, Form, Input, InputNumber, Select } from 'antd';
import dayjs from 'dayjs';
import * as wh from '../api/warehouse';
import type {
  StockIssueDto,
  StockIssueItemDto,
  CreateStockIssueDto,
  CreateStockIssueItemDto,
  StockIssueSearchDto,
  WarehouseDto,
} from '../api/warehouse';
import { searchMedicines } from '../../opd/api/examination';
import type { MedicineDto } from '../../opd/api/examination';
import systemApi from '../../system/api/system';
import type { SupplierCatalogDto, DepartmentCatalogDto } from '../../system/api/system';
// NangCap26 phiếu in #98 — tái sử dụng NGUYÊN mẫu in đã có, không dựng lại layout phiếu.
import { ChemicalIssueSlipPrint } from '../../patient/components/EMRPrintTemplates';
import { openPrintWindow } from '../../../utils/printWindow';
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
} from '@/_v2kit';

// ─── Constants ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

/** Issue type numeric values */
const ISSUE_TYPE_DEPARTMENT  = 3;  // Xuất khoa/phòng
const ISSUE_TYPE_TRANSFER    = 4;  // Xuất chuyển kho
const ISSUE_TYPE_SUPPLIER_RETURN = 5; // Xuất trả NCC
const ISSUE_TYPE_DESTRUCTION = 7;  // Xuất hủy

type IssueTypeKey = 'dept' | 'transfer' | 'supplier' | 'destruction';

const ISSUE_TYPE_TABS: StatusTab<IssueTypeKey>[] = [
  { v: 'dept',        l: 'Xuất khoa/phòng', tone: 'info' },
  { v: 'transfer',    l: 'Chuyển kho',       tone: 'warn' },
  { v: 'supplier',    l: 'Trả NCC',          tone: 'ok' },
  { v: 'destruction', l: 'Xuất hủy',         tone: 'crit' },
];

const ISSUE_TYPE_SELECT_OPTIONS = [
  { value: ISSUE_TYPE_DEPARTMENT,      label: 'Xuất khoa/phòng (loại 3)' },
  { value: ISSUE_TYPE_TRANSFER,        label: 'Xuất chuyển kho (loại 4)' },
  { value: ISSUE_TYPE_SUPPLIER_RETURN, label: 'Xuất trả NCC (loại 5)' },
  { value: ISSUE_TYPE_DESTRUCTION,     label: 'Xuất hủy (loại 7)' },
];

function issueTypeKey(issueType: number): IssueTypeKey | null {
  if (issueType === ISSUE_TYPE_DEPARTMENT)      return 'dept';
  if (issueType === ISSUE_TYPE_TRANSFER)        return 'transfer';
  if (issueType === ISSUE_TYPE_SUPPLIER_RETURN) return 'supplier';
  if (issueType === ISSUE_TYPE_DESTRUCTION)     return 'destruction';
  return null;
}

function issueTypeNumeric(key: IssueTypeKey): number {
  if (key === 'dept')        return ISSUE_TYPE_DEPARTMENT;
  if (key === 'transfer')    return ISSUE_TYPE_TRANSFER;
  if (key === 'supplier')    return ISSUE_TYPE_SUPPLIER_RETURN;
  if (key === 'destruction') return ISSUE_TYPE_DESTRUCTION;
  return ISSUE_TYPE_DEPARTMENT;
}

const fmtVND = (n: number | null | undefined) =>
  n != null ? `${n.toLocaleString('vi-VN')} ₫` : '—';

const fmtDate = (iso?: string | null) =>
  iso ? dayjs(iso).format('DD/MM/YYYY') : '—';

// ─── Resolve receiver display name ───────────────────────────────────────────

function receiverName(r: StockIssueDto): string {
  return r.departmentName ?? r.targetWarehouseName ?? r.supplierName ?? '—';
}

// ─── Line-item row state (local — not the DTO shape) ─────────────────────────

interface LineItem {
  _key: string;        // local unique key for table rowKey
  itemId: string;
  itemCode: string;
  itemName: string;
  unit: string;
  quantity: number;
  unitPrice: number;   // from medicine search — display only, server computes final
  notes: string;
}

function emptyLine(): LineItem {
  return {
    _key: Math.random().toString(36).slice(2),
    itemId: '',
    itemCode: '',
    itemName: '',
    unit: '',
    quantity: 1,
    unitPrice: 0,
    notes: '',
  };
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

// ─── Issue line-items sub-table (simpler than StockIn — no batch/VAT/CK) ─────

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
              {['Thuốc / Vật tư', 'ĐVT', 'SL', 'Đơn giá (tham khảo)', 'Thành tiền (dự tính)', 'Ghi chú', ''].map((h) => (
                <th key={h} style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '20px', textAlign: 'center', color: 'var(--t-3)', fontSize: 'var(--fs-sm)' }}>
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
                <td style={{ padding: '3px 4px', minWidth: 60, color: 'var(--t-2)', fontSize: 'var(--fs-xs)' }}>
                  {row.unit || '—'}
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
                <td style={{ padding: '3px 4px', minWidth: 120, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>
                  {row.unitPrice > 0 ? fmtVND(row.unitPrice) : '—'}
                </td>
                <td style={{ padding: '3px 4px', minWidth: 120, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)' }}>
                  {row.unitPrice > 0 ? (row.quantity * row.unitPrice).toLocaleString('vi-VN') + ' ₫' : '—'}
                </td>
                <td style={{ padding: '3px 4px', minWidth: 140 }}>
                  <Input
                    size="small"
                    value={row.notes}
                    onChange={(e) => update(row._key, { notes: e.target.value })}
                    placeholder="Ghi chú dòng…"
                  />
                </td>
                <td style={{ padding: '3px 4px' }}>
                  <ActBtn ic="trash" title="Xóa dòng" tone="crit" onClick={() => remove(row._key)} />
                </td>
              </tr>
            ))}
            {rows.length > 0 && (
              <tr style={{ borderTop: '1px solid var(--line)', fontWeight: 600 }}>
                <td colSpan={4} style={{ padding: '4px 6px', textAlign: 'right', fontSize: 'var(--fs-sm)' }}>Tổng cộng (dự tính):</td>
                <td style={{ padding: '4px 6px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)' }}>
                  {rows.reduce((s, r) => s + r.quantity * r.unitPrice, 0).toLocaleString('vi-VN')} ₫
                </td>
                <td colSpan={2} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const PharmacyStockIssue: React.FC = () => {
  const { message } = AntdApp.useApp();

  // ── List state ───────────────────────────────────────────────────────────
  const [rows, setRows] = useState<StockIssueDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [activeTab, setActiveTab] = useState<IssueTypeKey | 'all'>('all');
  const [keyword, setKeyword] = useState('');
  const [filterWarehouseId, setFilterWarehouseId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // ── Reference data ───────────────────────────────────────────────────────
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierCatalogDto[]>([]);
  const [departments, setDepartments] = useState<DepartmentCatalogDto[]>([]);

  // ── Detail drawer ────────────────────────────────────────────────────────
  const [detail, setDetail] = useState<StockIssueDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // NangCap26 phiếu in #98 — phiếu đang dựng để in (render ẩn rồi bơm HTML sang popup)
  const [chemSlip, setChemSlip] = useState<StockIssueDto | null>(null);
  const chemSlipRef = useRef<HTMLDivElement>(null);

  // ── Create modal ─────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [lineItems, setLineItems] = useState<LineItem[]>([emptyLine()]);
  // Watched value for conditional rendering of target fields
  const [selectedIssueType, setSelectedIssueType] = useState<number>(ISSUE_TYPE_DEPARTMENT);

  // ── Load reference data on mount ─────────────────────────────────────────
  useEffect(() => {
    wh.getWarehouses()
      .then((r) => setWarehouses((r.data as WarehouseDto[]) || []))
      .catch((e) => { console.warn('[async] tải dữ liệu phụ thất bại:', e); });
    systemApi.catalog.getSuppliers()
      .then((r) => setSuppliers((r.data as SupplierCatalogDto[]) || []))
      .catch((e) => { console.warn('[async] tải dữ liệu phụ thất bại:', e); });
    systemApi.catalog.getDepartments(undefined, undefined, true)
      .then((r) => setDepartments((r.data as DepartmentCatalogDto[]) || []))
      .catch((e) => { console.warn('[async] tải dữ liệu phụ thất bại:', e); });
  }, []);

  // ── Data loader ───────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const search: StockIssueSearchDto = {
        keyword: keyword || undefined,
        warehouseId: filterWarehouseId || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        issueType: activeTab !== 'all' ? issueTypeNumeric(activeTab) : undefined,
        page: page + 1,
        pageSize: PAGE_SIZE,
      };
      const res = await wh.getStockIssues(search);
      const paged = res.data;
      setRows(paged.items || []);
      setTotal(paged.totalCount || 0);
    } catch {
      message.warning('Tải danh sách phiếu xuất thất bại');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [keyword, filterWarehouseId, fromDate, toDate, activeTab, page, message]);

  useEffect(() => { void load(); }, [load]);

  // ── KPI counts ───────────────────────────────────────────────────────────
  const deptCount        = rows.filter((r) => r.issueType === ISSUE_TYPE_DEPARTMENT).length;
  const transferCount    = rows.filter((r) => r.issueType === ISSUE_TYPE_TRANSFER).length;
  const supplierCount    = rows.filter((r) => r.issueType === ISSUE_TYPE_SUPPLIER_RETURN).length;
  const destructionCount = rows.filter((r) => r.issueType === ISSUE_TYPE_DESTRUCTION).length;
  const totalValue       = rows.reduce((s, r) => s + (r.totalAmount || 0), 0);

  // ── Open detail drawer ───────────────────────────────────────────────────
  const openDetail = async (r: StockIssueDto) => {
    setDetail(r);
    setDetailLoading(true);
    try {
      const res = await wh.getStockIssueById(r.id);
      setDetail(res.data as StockIssueDto);
    } catch {
      message.warning('Không tải được chi tiết phiếu xuất');
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Print (blob → new tab) ────────────────────────────────────────────────
  const onPrint = async (r: StockIssueDto) => {
    try {
      const res = await wh.printStockIssue(r.id);
      const url = URL.createObjectURL(res.data as Blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      message.error('In phiếu thất bại');
    }
  };

  /**
   * NangCap26 phiếu in #98 — Phiếu lĩnh hóa chất.
   * Phiếu do BE render (`printStockIssue`) là phiếu xuất kho chung; mẫu lĩnh hóa chất
   * là biểu mẫu riêng nên dựng từ component in đã có rồi bơm sang popup — dùng lại
   * đúng layout/chữ ký, không viết lại HTML phiếu.
   */
  const onPrintChemicalSlip = async (r: StockIssueDto) => {
    // Danh sách dòng chỉ có ở bản chi tiết; bản trong bảng có thể chưa kèm items.
    let full = r;
    if (!r.items || r.items.length === 0) {
      try { full = (await wh.getStockIssueById(r.id)).data as StockIssueDto; }
      catch { message.error('Không tải được chi tiết phiếu'); return; }
    }
    setChemSlip(full);
  };

  // Chờ React render xong khối ẩn rồi mới bơm HTML sang popup.
  useEffect(() => {
    if (!chemSlip) return;
    const html = chemSlipRef.current?.innerHTML;
    if (!html) return;
    openPrintWindow(
      `<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><title>Phieu linh hoa chat</title></head><body>${html}</body></html>`,
      { features: 'width=900,height=700', focus: true, print: 'onload', onBlocked: () => message.warning('Trình duyệt chặn popup — cho phép popup để in phiếu') },
    );
    setChemSlip(null);
  }, [chemSlip, message]);

  // ── Create modal open / close ─────────────────────────────────────────────
  const openCreate = () => {
    form.resetFields();
    setLineItems([emptyLine()]);
    setSelectedIssueType(ISSUE_TYPE_DEPARTMENT);
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

    const issueType = values.issueType as number;

    const mappedItems: CreateStockIssueItemDto[] = validItems.map((l) => ({
      itemId: l.itemId,
      // stockId intentionally omitted — backend auto-FIFO
      quantity: l.quantity,
      paymentSource: 0,  // default: no specific payment source
      notes: l.notes || undefined,
    }));

    const dto: CreateStockIssueDto = {
      issueDate: values.issueDate
        ? (values.issueDate as ReturnType<typeof dayjs>).format('YYYY-MM-DD')
        : dayjs().format('YYYY-MM-DD'),
      warehouseId: values.warehouseId as string,
      issueType,
      departmentId:      issueType === ISSUE_TYPE_DEPARTMENT      ? (values.departmentId as string)     : undefined,
      targetWarehouseId: issueType === ISSUE_TYPE_TRANSFER        ? (values.targetWarehouseId as string) : undefined,
      supplierId:        issueType === ISSUE_TYPE_SUPPLIER_RETURN  ? (values.supplierId as string)        : undefined,
      notes: (values.notes as string) || undefined,
      items: mappedItems,
    };

    setSaving(true);
    try {
      if (issueType === ISSUE_TYPE_DEPARTMENT) {
        await wh.issueToDepartment(dto);
      } else if (issueType === ISSUE_TYPE_TRANSFER) {
        await wh.createTransferIssue(dto);
      } else if (issueType === ISSUE_TYPE_SUPPLIER_RETURN) {
        await wh.createSupplierReturn(dto);
      } else {
        await wh.createDestructionIssue(dto);
      }
      message.success('Tạo phiếu xuất kho thành công');
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
  const columns: ColumnDef<StockIssueDto>[] = [
    {
      key: 'code', label: 'Mã phiếu', mono: true, code: true, width: 140,
      render: (r) => r.issueCode,
    },
    {
      key: 'date', label: 'Ngày xuất', mono: true, width: 100,
      render: (r) => fmtDate(r.issueDate),
    },
    {
      key: 'warehouse', label: 'Kho xuất',
      render: (r) => r.warehouseName,
    },
    {
      key: 'type', label: 'Loại',
      render: (r) => r.issueTypeName,
    },
    {
      key: 'receiver', label: 'Nơi nhận',
      render: (r) => receiverName(r),
    },
    {
      key: 'amount', label: 'Tổng tiền', mono: true, width: 130,
      render: (r) => fmtVND(r.totalAmount),
    },
    {
      key: 'status', label: 'Trạng thái', width: 110,
      render: (r) => {
        const typeKey = issueTypeKey(r.issueType);
        const tone = typeKey === 'dept' ? 'info'
          : typeKey === 'transfer' ? 'warn'
          : typeKey === 'supplier' ? 'ok'
          : 'crit';
        return <StatusBadge tone={tone} dot>{r.statusName}</StatusBadge>;
      },
    },
  ];

  // ── Options ───────────────────────────────────────────────────────────────
  const warehouseOpts = warehouses.map((w) => ({ v: w.id, l: w.warehouseName }));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const tabCounts: Record<string, number> = {
    all: total,
    dept: deptCount,
    transfer: transferCount,
    supplier: supplierCount,
    destruction: destructionCount,
  };

  // ── Conditional create-form field rules ───────────────────────────────────
  const isDept        = selectedIssueType === ISSUE_TYPE_DEPARTMENT;
  const isTransfer    = selectedIssueType === ISSUE_TYPE_TRANSFER;
  const isSupplier    = selectedIssueType === ISSUE_TYPE_SUPPLIER_RETURN;
  const isDestruction = selectedIssueType === ISSUE_TYPE_DESTRUCTION;

  return (
    <div className="ab">
      {/* KPI strip */}
      <KpiStrip items={[
        { lbl: 'Tổng phiếu (trang)', val: rows.length },
        { lbl: 'Xuất khoa/phòng', val: deptCount, tone: 'info' },
        { lbl: 'Chuyển kho',      val: transferCount, tone: 'warn' },
        { lbl: 'Tổng giá trị',
          val: Math.round(totalValue / 1_000_000),
          unit: 'tr₫',
          tone: 'ok',
        },
      ]} />

      {/* Issue-type sub-tabs */}
      <StatusTabs<IssueTypeKey>
        value={activeTab}
        onChange={setActiveTab}
        tabs={ISSUE_TYPE_TABS}
        counts={tabCounts}
      />

      {/* Toolbar */}
      <div className="ab-toolbar">
        <SearchBox value={keyword} onChange={setKeyword} placeholder="Mã phiếu / ghi chú…" />
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
        <Btn variant="ghost" icon="x" onClick={() => { setKeyword(''); setFilterWarehouseId(''); setFromDate(''); setToDate(''); setActiveTab('all'); setPage(0); }}>
          Bỏ lọc
        </Btn>
        <span className="spacer" />
        <Btn variant="ghost" icon="refresh" onClick={() => void load()}>Làm mới</Btn>
        <Btn variant="primary" icon="plus" onClick={openCreate}>+ Tạo phiếu xuất</Btn>
      </div>

      {/* Main table */}
      <DataTable<StockIssueDto>
        columns={columns}
        data={rows}
        rowKey={(r) => r.id}
        onRowClick={openDetail}
        empty={loading ? 'Đang tải…' : 'Không có phiếu xuất nào'}
        actions={(r) => (
          <div className="ab-actions" style={{ display: 'flex', gap: 'var(--space-6)' }}>
            <ActBtn ic="printer" title="In phiếu" onClick={() => void onPrint(r)} />
            {/* NangCap26 phiếu in #98 — biểu mẫu lĩnh hóa chất (khác phiếu xuất kho chung) */}
            <ActBtn ic="flask" title="In phiếu lĩnh hóa chất" onClick={() => void onPrintChemicalSlip(r)} />
          </div>
        )}
      />

      {/* Pager */}
      <Pager page={page} totalPages={totalPages} setPage={setPage} total={total} perPage={PAGE_SIZE} />

      {/* ── Detail drawer ── */}
      <DrawerShell
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? `Phiếu xuất ${detail.issueCode}` : ''}
        sub={detail ? `${detail.warehouseName} · ${fmtDate(detail.issueDate)}` : ''}
        size="xl"
        footer={detail && (
          <div style={{ display: 'flex', gap: 'var(--space-8)' }}>
            <Btn variant="ghost" icon="printer" onClick={() => void onPrint(detail)}>In phiếu</Btn>
            <Btn variant="ghost" icon="flask" onClick={() => void onPrintChemicalSlip(detail)}>In phiếu lĩnh hóa chất</Btn>
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
                  <DrField lbl="Mã phiếu">{detail.issueCode}</DrField>
                  <DrField lbl="Kho xuất">{detail.warehouseName}</DrField>
                  <DrField lbl="Ngày xuất">{fmtDate(detail.issueDate)}</DrField>
                  <DrField lbl="Loại phiếu">{detail.issueTypeName}</DrField>
                  <DrField lbl="Trạng thái">
                    <StatusBadge
                      tone={issueTypeKey(detail.issueType) === 'dept' ? 'info'
                        : issueTypeKey(detail.issueType) === 'transfer' ? 'warn'
                        : issueTypeKey(detail.issueType) === 'supplier' ? 'ok'
                        : 'crit'}
                      dot
                    >
                      {detail.statusName}
                    </StatusBadge>
                  </DrField>
                  <DrField lbl="Người tạo">{detail.createdByName}</DrField>
                  <DrField lbl="Ngày tạo">{fmtDate(detail.createdAt)}</DrField>
                  {detail.notes && <DrField lbl="Ghi chú">{detail.notes}</DrField>}
                </DrSec>

                <DrSec title="Nơi nhận">
                  {detail.departmentName && (
                    <DrField lbl="Khoa/phòng nhận">{detail.departmentName}</DrField>
                  )}
                  {detail.targetWarehouseName && (
                    <DrField lbl="Kho nhận (chuyển đến)">{detail.targetWarehouseName}</DrField>
                  )}
                  {detail.supplierName && (
                    <DrField lbl="Nhà cung cấp (trả về)">{detail.supplierName}</DrField>
                  )}
                  {!detail.departmentName && !detail.targetWarehouseName && !detail.supplierName && (
                    <DrField lbl="Nơi nhận">—</DrField>
                  )}
                </DrSec>

                <DrSec title={`Chi tiết dòng hàng (${detail.items?.length ?? 0} dòng)`}>
                  <div style={{ overflowX: 'auto', marginTop: 'var(--space-4)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-sm)' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-2)', borderBottom: '1px solid var(--line)' }}>
                          {['Mã', 'Tên', 'ĐVT', 'Lô', 'HSD', 'SL', 'Đơn giá', 'Thành tiền'].map((h) => (
                            <th key={h} style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(detail.items || []).map((item: StockIssueItemDto) => (
                          <tr key={item.id} style={{ borderBottom: '1px solid var(--line-soft)' }}>
                            <td style={{ padding: '3px 6px', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)' }}>{item.itemCode}</td>
                            <td style={{ padding: '3px 6px' }}>{item.itemName}</td>
                            <td style={{ padding: '3px 6px' }}>{item.unit}</td>
                            <td style={{ padding: '3px 6px', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)' }}>{item.batchNumber || '—'}</td>
                            <td style={{ padding: '3px 6px', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)' }}>{fmtDate(item.expiryDate)}</td>
                            <td style={{ padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{item.quantity.toLocaleString('vi-VN')}</td>
                            <td style={{ padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{fmtVND(item.unitPrice)}</td>
                            <td style={{ padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{fmtVND(item.amount)}</td>
                          </tr>
                        ))}
                        {(detail.items?.length ?? 0) > 0 && (
                          <tr style={{ borderTop: '1px solid var(--line)', fontWeight: 600 }}>
                            <td colSpan={7} style={{ padding: '4px 6px', textAlign: 'right', fontSize: 'var(--fs-sm)' }}>Tổng tiền:</td>
                            <td style={{ padding: '4px 6px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)' }}>
                              {fmtVND(detail.totalAmount)}
                            </td>
                          </tr>
                        )}
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
        title="Tạo phiếu xuất kho"
        sub="Chọn loại xuất, kho xuất, nơi nhận và danh sách hàng"
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
        <Form
          form={form}
          layout="vertical"
          scrollToFirstError
          requiredMark
          onValuesChange={(changed) => {
            if ('issueType' in changed) {
              setSelectedIssueType(changed.issueType as number);
              // Clear conditional target fields when type changes
              form.setFieldsValue({ departmentId: undefined, targetWarehouseId: undefined, supplierId: undefined });
            }
          }}
        >
          {/* 2-col grid for header fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            {/* Loại phiếu — always first */}
            <Form.Item
              name="issueType"
              label="Loại phiếu xuất"
              rules={[{ required: true, message: 'Chọn loại phiếu xuất' }]}
              initialValue={ISSUE_TYPE_DEPARTMENT}
              style={{ gridColumn: '1 / -1' }}
            >
              <Select options={ISSUE_TYPE_SELECT_OPTIONS} placeholder="— Chọn loại phiếu —" />
            </Form.Item>

            {/* Kho xuất */}
            <Form.Item name="warehouseId" label="Kho xuất" rules={[{ required: true, message: 'Chọn kho xuất' }]}>
              <AbSelect
                options={warehouses}
                fieldNames={{ value: 'id', label: 'warehouseName' }}
                placeholder="— Chọn kho —"
              />
            </Form.Item>

            {/* Ngày xuất */}
            <Form.Item
              name="issueDate"
              label="Ngày xuất"
              rules={[{ required: true, message: 'Chọn ngày xuất' }]}
              initialValue={dayjs()}
            >
              <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
            </Form.Item>

            {/* Conditional target field — type 3: Khoa/phòng */}
            {isDept && (
              <Form.Item
                name="departmentId"
                label="Khoa/phòng nhận"
                rules={[{ required: true, message: 'Chọn khoa/phòng nhận' }]}
                style={{ gridColumn: '1 / -1' }}
              >
                <AbSelect
                  options={departments}
                  fieldNames={{ value: 'id', label: 'name' }}
                  placeholder="— Chọn khoa/phòng —"
                />
              </Form.Item>
            )}

            {/* Conditional target field — type 4: Kho nhận */}
            {isTransfer && (
              <Form.Item
                name="targetWarehouseId"
                label="Kho nhận (chuyển đến)"
                rules={[
                  { required: true, message: 'Chọn kho nhận' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || value !== getFieldValue('warehouseId')) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Kho nhận phải khác kho xuất'));
                    },
                  }),
                ]}
                style={{ gridColumn: '1 / -1' }}
              >
                <AbSelect
                  options={warehouses}
                  fieldNames={{ value: 'id', label: 'warehouseName' }}
                  placeholder="— Chọn kho nhận —"
                />
              </Form.Item>
            )}

            {/* Conditional target field — type 5: Nhà cung cấp */}
            {isSupplier && (
              <Form.Item
                name="supplierId"
                label="Nhà cung cấp (trả về)"
                rules={[{ required: true, message: 'Chọn nhà cung cấp' }]}
                style={{ gridColumn: '1 / -1' }}
              >
                <AbSelect
                  options={suppliers}
                  fieldNames={{ value: 'id', label: 'name' }}
                  placeholder="— Chọn NCC —"
                />
              </Form.Item>
            )}

            {/* Ghi chú — required for type 7 (destruction reason) */}
            <Form.Item
              name="notes"
              label={isDestruction ? 'Lý do hủy (bắt buộc)' : 'Ghi chú'}
              rules={isDestruction ? [{ required: true, message: 'Nhập lý do hủy' }] : undefined}
              style={{ gridColumn: '1 / -1' }}
            >
              <Input.TextArea rows={2} placeholder={isDestruction ? 'Lý do hủy hàng…' : 'Ghi chú thêm…'} />
            </Form.Item>
          </div>

          {/* Line items sub-table */}
          <Form.Item shouldUpdate style={{ marginBottom: 0 }}>
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

      {/* NangCap26 phiếu in #98 — render ẩn mẫu phiếu lĩnh hóa chất để lấy HTML đưa sang popup in.
          Dùng lại component mẫu in đã có (kèm style nội tuyến) thay vì dựng lại layout phiếu. */}
      {chemSlip && (
        <div ref={chemSlipRef} style={{ display: 'none' }} aria-hidden>
          <ChemicalIssueSlipPrint
            slipCode={chemSlip.issueCode}
            slipDate={chemSlip.issueDate}
            departmentName={chemSlip.departmentName || chemSlip.targetWarehouseName}
            warehouseName={chemSlip.warehouseName}
            requesterName={chemSlip.createdByName}
            note={chemSlip.notes}
            items={(chemSlip.items || []).map((it) => ({
              code: it.itemCode,
              name: it.itemName,
              unit: it.unit,
              quantityRequested: it.quantity,
              quantityIssued: it.quantity,
              batchNumber: it.batchNumber,
              expiryDate: it.expiryDate,
              note: it.notes,
            }))}
          />
        </div>
      )}
    </div>
  );
};

export default PharmacyStockIssue;
