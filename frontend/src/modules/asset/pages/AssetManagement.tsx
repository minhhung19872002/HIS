import React, { useEffect, useMemo, useState } from 'react';
import { fmtNum as fmt } from '../../../utils/format';
import dayjs from 'dayjs';
import { Form, Input, InputNumber, DatePicker, Tabs, Select, Checkbox } from 'antd';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { getAssets, getAssetDashboard, saveAsset, getAssetQrCode, getStocktakes, createStocktake, completeStocktake, approveStocktake, updateStocktakeItem, printStocktake, getDepreciationReport, getTenders, saveTender, getTenderItems, saveTenderItem, awardTender, getHandovers, saveHandover, confirmHandover, getDisposals, proposeDisposal, approveDisposal, completeDisposal, getAssetReportTypes, generateAssetReport } from '../api/assetManagement';
import type { FixedAssetDto, AssetDashboardDto, AssetQrCodeDto, AssetStocktakeDto, AssetStocktakeItemDto, DepreciationReportDto, TenderDto, TenderItemDto, AssetHandoverDto, AssetDisposalDto, AssetReportTypeDto } from '../api/assetManagement';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn, Btn, CrudModal, ModalShell,
  DrawerShell, DrSec, DrField, useTabCounts, tk, ti, te, cf,
  type ColumnDef, type CrudFieldCfg,
} from '@/_v2kit';
import { RefreshButton } from '../../../components/actions';
import { Field } from '../../../components/form/Field';
import { useModalForm } from '../../../hooks/useModalForm';
import { useTabState } from '../../../hooks/useTabState';

const ASSET_FIELDS: CrudFieldCfg[] = [
  { key: 'assetCode', label: 'Mã tài sản', required: true, disabledOnEdit: true, placeholder: 'VD: TS-...' },
  { key: 'assetName', label: 'Tên tài sản', required: true },
  { key: 'serialNumber', label: 'Số serial' },
  { key: 'purchaseDate', label: 'Ngày mua', type: 'date', required: true },
  { key: 'originalValue', label: 'Nguyên giá (đ)', type: 'number', required: true },
  { key: 'currentValue', label: 'Giá trị còn lại (đ)', type: 'number', placeholder: 'Bỏ trống = bằng nguyên giá' },
  { key: 'usefulLifeMonths', label: 'Thời gian khấu hao (tháng)', type: 'number' },
  { key: 'depreciationMethod', label: 'Phương pháp khấu hao', type: 'select', options: [
    { value: 1, label: 'Đường thẳng' }, { value: 2, label: 'Số dư giảm dần' }] },
  { key: 'locationDescription', label: 'Vị trí' },
  { key: 'status', label: 'Trạng thái', type: 'select', options: [
    { value: 0, label: 'Đang dùng' }, { value: 1, label: 'Hỏng' }, { value: 2, label: 'Sửa chữa' },
    { value: 3, label: 'Chờ thanh lý' }, { value: 4, label: 'Đã thanh lý' }, { value: 5, label: 'Đã chuyển' }] },
  { key: 'notes', label: 'Ghi chú', type: 'textarea' },
];

const STATUS_LABEL: Record<number, string> = {
  0: 'Đang dùng', 1: 'Hỏng', 2: 'Sửa chữa', 3: 'Chờ thanh lý', 4: 'Đã thanh lý', 5: 'Đã chuyển',
};

type SKey = 'inuse' | 'broken' | 'repair' | 'pending' | 'disposed';
const STATUS_TABS = [
  { v: 'inuse' as SKey,    l: 'Đang dùng',     tone: 'ok' as const },
  { v: 'broken' as SKey,   l: 'Hỏng',          tone: 'crit' as const },
  { v: 'repair' as SKey,   l: 'Sửa chữa',      tone: 'warn' as const },
  { v: 'pending' as SKey,  l: 'Chờ thanh lý',  tone: 'warn' as const },
  { v: 'disposed' as SKey, l: 'Đã thanh lý',   tone: 'info' as const },
];

const sKey = (n: number): SKey =>
  n === 0 ? 'inuse' : n === 1 ? 'broken' : n === 2 ? 'repair' : n === 3 ? 'pending' : 'disposed';

const PER = 18;

const STOCKTAKE_STATUS: Record<number, string> = { 1: 'Nháp', 2: 'Đang kiểm', 3: 'Đã kiểm', 4: 'Đã duyệt' };

const TENDER_TYPE_LABEL: Record<number, string> = { 1: 'Đấu thầu rộng rãi', 2: 'Đấu thầu hạn chế', 3: 'Mua sắm trực tiếp' };
const TENDER_ITEM_TYPE_LABEL: Record<number, string> = { 1: 'TSCĐ', 2: 'CCDC', 3: 'VT' };
const TENDER_STATUS_META: Record<number, { label: string; tone?: 'ok' | 'crit' | 'info' | 'warn' }> = {
  1: { label: 'Nhập' }, 2: { label: 'Đã đăng', tone: 'info' }, 3: { label: 'Đang chấm', tone: 'warn' },
  4: { label: 'Đã trao', tone: 'ok' }, 5: { label: 'Hủy', tone: 'crit' },
};

const TENDER_FIELDS: CrudFieldCfg[] = [
  { key: 'tenderCode', label: 'Mã gói thầu', required: true, disabledOnEdit: true, placeholder: 'VD: GT-...' },
  { key: 'tenderName', label: 'Tên gói thầu', required: true },
  { key: 'tenderType', label: 'Loại đấu thầu', type: 'select', options: [
    { value: 1, label: 'Đấu thầu rộng rãi' }, { value: 2, label: 'Đấu thầu hạn chế' }, { value: 3, label: 'Mua sắm trực tiếp' }] },
  { key: 'budgetAmount', label: 'Ngân sách (đ)', type: 'number' },
  { key: 'status', label: 'Trạng thái', type: 'select', options: [
    { value: 1, label: 'Nhập' }, { value: 2, label: 'Đã đăng' }, { value: 3, label: 'Đang chấm' },
    { value: 4, label: 'Đã trao' }, { value: 5, label: 'Hủy' }] },
  { key: 'publishDate', label: 'Ngày đăng', type: 'date' },
  { key: 'closingDate', label: 'Ngày đóng', type: 'date' },
  { key: 'notes', label: 'Ghi chú', type: 'textarea' },
];

// #352 port từ v1 (pages/AssetManagement.tsx:308-453) — 2 tab Bàn giao + Thanh lý.
// Sạch hơn v1: v1 bắt gõ tay GUID tài sản vào ô text; v2 chọn từ danh sách tài sản đã nạp.
const HANDOVER_TYPE: Record<number, string> = { 1: 'Điều chuyển', 2: 'Cấp mới', 3: 'Thu hồi' };
const DISPOSAL_TYPE: Record<number, string> = { 1: 'Thanh lý', 2: 'Nhượng bán', 3: 'Tiêu hủy', 4: 'Mất/Hỏng' };
const DISPOSAL_STATUS: Record<number, { label: string; tone?: 'ok' | 'warn' | 'info' | 'crit' }> = {
  1: { label: 'Đề xuất', tone: 'warn' },
  2: { label: 'Đã duyệt', tone: 'info' },
  3: { label: 'Hoàn thành', tone: 'ok' },
  4: { label: 'Từ chối', tone: 'crit' },
};

const TENDER_ITEM_FIELDS: CrudFieldCfg[] = [
  { key: 'itemName', label: 'Tên hạng mục', required: true },
  { key: 'itemType', label: 'Loại', type: 'select', options: [
    { value: 1, label: 'TSCĐ' }, { value: 2, label: 'CCDC' }, { value: 3, label: 'Vật tư' }] },
  { key: 'quantity', label: 'Số lượng', type: 'number' },
  { key: 'unitPrice', label: 'Đơn giá (đ)', type: 'number' },
];

// #352: bảng màu pie/bar cho tab Báo cáo (recharts cần màu literal)
const PIE_COLORS = ['#4aa3ff', '#52c41a', '#faad14', '#ff4d4f', '#b37feb', '#13c2c2'];

const AssetManagementV2: React.FC = () => {
  const [moduleTab, setModuleTab] = useState<'assets' | 'stocktake' | 'tenders' | 'handovers' | 'disposals' | 'reports'>('assets');
  const [items, setItems] = useState<FixedAssetDto[]>([]);
  const [dash, setDash] = useState<AssetDashboardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useTabState<SKey | 'all'>('all');
  const [fDept, setFDept] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<FixedAssetDto | null>(null);
  const [crudOpen, setCrudOpen] = useState(false);
  const [crudInit, setCrudInit] = useState<Record<string, unknown> | null>(null);
  const [qrData, setQrData] = useState<AssetQrCodeDto | null>(null);
  // Stocktake state
  const [stocktakes, setStocktakes] = useState<AssetStocktakeDto[]>([]);
  const [stocktakeDetail, setStocktakeDetail] = useState<AssetStocktakeDto | null>(null);
  const [newStocktakeOpen, setNewStocktakeOpen] = useState(false);
  const [stocktakeForm] = Form.useForm();
  // Stocktake item inline edit
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemForm] = Form.useForm();
  const [itemSaving, setItemSaving] = useState(false);
  // Depreciation report drawer
  const [deprOpen, setDeprOpen] = useState(false);
  const [deprLoading, setDeprLoading] = useState(false);
  const [deprItems, setDeprItems] = useState<DepreciationReportDto[]>([]);
  // Tenders (đấu thầu)
  const [tenders, setTenders] = useState<TenderDto[]>([]);
  const [tenderDetail, setTenderDetail] = useState<TenderDto | null>(null);
  const [tenderItems, setTenderItems] = useState<TenderItemDto[]>([]);
  const [tenderCrudOpen, setTenderCrudOpen] = useState(false);
  const [tenderCrudInit, setTenderCrudInit] = useState<Record<string, unknown> | null>(null);
  const [tenderItemCrudOpen, setTenderItemCrudOpen] = useState(false);
  const [tenderItemCrudInit, setTenderItemCrudInit] = useState<Record<string, unknown> | null>(null);
  // #352: Bàn giao + Thanh lý (port từ v1)
  const [handovers, setHandovers] = useState<AssetHandoverDto[]>([]);
  const [disposals, setDisposals] = useState<AssetDisposalDto[]>([]);
  const [hoOpen, setHoOpen] = useState(false);
  const [hoForm, setHoForm] = useState<{ fixedAssetId?: string; handoverType: number; handoverDate?: string; notes?: string }>({ handoverType: 1 });
  const hoModalForm = useModalForm({ fixedAssetId: { required: true, message: 'Vui lòng chọn tài sản cần bàn giao' } }, hoOpen);
  const [dpOpen, setDpOpen] = useState(false);
  const [dpForm, setDpForm] = useState<{ fixedAssetId?: string; disposalType: number; disposalValue?: number; residualValue?: number; reason?: string }>({ disposalType: 1 });
  const dpModalForm = useModalForm({
    fixedAssetId: { required: true, message: 'Vui lòng chọn tài sản cần thanh lý' },
    disposalValue: { validate: (v) => (typeof v === 'number' && v < 0) ? 'Giá trị không được âm' : undefined },
    residualValue: { validate: (v) => (typeof v === 'number' && v < 0) ? 'Giá trị không được âm' : undefined },
  }, dpOpen);
  // #352: tab Báo cáo TSCĐ (catalog + biểu đồ) — port từ v1 ReportsTab + dashboard charts
  const [reportTypes, setReportTypes] = useState<AssetReportTypeDto[]>([]);
  const [repSel, setRepSel] = useState<number | undefined>();
  const [repYear, setRepYear] = useState(dayjs().year());
  const [repMonth, setRepMonth] = useState<number | undefined>();
  const [repFrom, setRepFrom] = useState<string | undefined>();
  const [repTo, setRepTo] = useState<string | undefined>();
  const [repGroup, setRepGroup] = useState('');
  const [repLoading, setRepLoading] = useState(false);
  const [chartView, setChartView] = useState<'status' | 'trend'>('status');

  const openCreate = () => { setCrudInit({ status: 0, depreciationMethod: 1, originalValue: 0, currentValue: 0, usefulLifeMonths: 60 }); setCrudOpen(true); };
  const openEdit = (r: FixedAssetDto) => { setCrudInit({ ...r } as Record<string, unknown>); setCrudOpen(true); };
  const showQr = async (r: FixedAssetDto) => {
    try { const d = await getAssetQrCode(r.id); if (d) setQrData(d); else te('Không lấy được mã QR'); }
    catch { te('Không lấy được mã QR'); }
  };

  const load = async () => {
    setLoading(true);
    try {
      const [r, d, sk, td, ho, dp] = await Promise.all([
        getAssets({ keyword: search, pageSize: 200 }),
        getAssetDashboard(),
        getStocktakes(),
        getTenders({ pageSize: 200 }),
        getHandovers({ pageSize: 200 }),
        getDisposals({ pageSize: 200 }),
      ]);
      setItems(r.items || []);
      setDash(d);
      setStocktakes(sk);
      setTenders(td.items || []);
      setHandovers(ho.items || []);
      setDisposals(dp.items || []);
    } catch { ti('Không tải được tài sản'); }
    finally { setLoading(false); }
  };

  const reloadTenders = async () => {
    try { const td = await getTenders({ pageSize: 200 }); setTenders(td.items || []); }
    catch { te('Không tải được danh sách gói thầu'); }
  };

  const openTenderCreate = () => { setTenderCrudInit({ tenderType: 1, status: 1 }); setTenderCrudOpen(true); };

  // ── #352: Báo cáo TSCĐ — lazy-load danh mục khi mở tab, generate mở print window ─
  useEffect(() => {
    if (moduleTab === 'reports' && reportTypes.length === 0) {
      getAssetReportTypes().then(setReportTypes);
    }
  }, [moduleTab, reportTypes.length]);

  const runReport = async (code?: number) => {
    const rc = code ?? repSel;
    if (!rc) { ti('Chọn loại báo cáo'); return; }
    setRepLoading(true);
    try {
      await generateAssetReport(rc, {
        year: repYear, month: repMonth, fromDate: repFrom, toDate: repTo,
        assetGroupCode: repGroup || undefined,
      });
    } catch { te('Lỗi xuất báo cáo'); }
    finally { setRepLoading(false); }
  };

  const groupedReports = useMemo(() => reportTypes.reduce<Record<string, AssetReportTypeDto[]>>((acc, rt) => {
    (acc[rt.category] ||= []).push(rt);
    return acc;
  }, {}), [reportTypes]);

  // ── #352: Bàn giao tài sản ────────────────────────────────────────────────
  const assetOptions = useMemo(
    () => items.map((a) => ({ value: a.id, label: `${a.assetCode} — ${a.assetName}` })),
    [items],
  );

  const reloadHandovers = async () => {
    try { const r = await getHandovers({ pageSize: 200 }); setHandovers(r.items || []); }
    catch { te('Không tải được danh sách bàn giao'); }
  };
  const reloadDisposals = async () => {
    try { const r = await getDisposals({ pageSize: 200 }); setDisposals(r.items || []); }
    catch { te('Không tải được danh sách thanh lý'); }
  };

  const submitHandover = async () => {
    try {
      await saveHandover({ ...hoForm });
      tk('Đã tạo phiếu bàn giao');
      setHoOpen(false);
      setHoForm({ handoverType: 1 });
      void reloadHandovers();
    } catch { te('Lỗi tạo phiếu bàn giao'); }
  };

  const doConfirmHandover = (r: AssetHandoverDto) =>
    cf(`Xác nhận bàn giao "${r.assetName || r.assetCode}"?`, async () => {
      try { await confirmHandover(r.id); tk('Đã xác nhận bàn giao'); void reloadHandovers(); }
      catch { te('Lỗi xác nhận bàn giao'); }
    }, { tone: 'info', confirm: 'Xác nhận' });

  // ── #352: Thanh lý tài sản (tiền) ─────────────────────────────────────────
  const submitDisposal = async () => {
    try {
      await proposeDisposal({ ...dpForm });
      tk('Đã đề xuất thanh lý');
      setDpOpen(false);
      setDpForm({ disposalType: 1 });
      void reloadDisposals();
    } catch { te('Lỗi đề xuất thanh lý'); }
  };

  const doApproveDisposal = (r: AssetDisposalDto) =>
    cf(`Duyệt thanh lý "${r.assetName || r.assetCode}" (giá ${fmt(r.disposalValue)}đ)?`, async () => {
      try { await approveDisposal(r.id); tk('Đã duyệt thanh lý'); void reloadDisposals(); }
      catch { te('Lỗi duyệt thanh lý'); }
    }, { tone: 'warn', confirm: 'Duyệt' });

  const doCompleteDisposal = (r: AssetDisposalDto) =>
    cf(`Hoàn thành thanh lý "${r.assetName || r.assetCode}"? Tài sản sẽ chuyển trạng thái đã thanh lý.`, async () => {
      try { await completeDisposal(r.id); tk('Đã hoàn thành thanh lý'); void reloadDisposals(); void load(); }
      catch { te('Lỗi hoàn thành thanh lý'); }
    }, { tone: 'crit', confirm: 'Hoàn thành' });

  const hoCols: ColumnDef<AssetHandoverDto>[] = [
    { key: 'assetCode', label: 'Mã TS', mono: true, code: true, render: (r) => r.assetCode || '—' },
    { key: 'assetName', label: 'Tài sản', render: (r) => r.assetName || '—' },
    { key: 'handoverType', label: 'Loại', render: (r) => HANDOVER_TYPE[r.handoverType] || '—' },
    { key: 'from', label: 'Từ khoa', render: (r) => r.fromDepartmentName || '—' },
    { key: 'to', label: 'Đến khoa', render: (r) => r.toDepartmentName || '—' },
    { key: 'handoverDate', label: 'Ngày BG', mono: true, render: (r) => r.handoverDate ? dayjs(r.handoverDate).format('DD/MM/YYYY') : '—' },
    { key: 'status', label: 'TT', render: (r) => (
        <StatusBadge tone={r.status === 2 ? 'ok' : 'warn'}>{r.status === 2 ? 'Đã xác nhận' : 'Chờ xác nhận'}</StatusBadge>
    )},
  ];

  const dpCols: ColumnDef<AssetDisposalDto>[] = [
    { key: 'assetCode', label: 'Mã TS', mono: true, code: true, render: (r) => r.assetCode || '—' },
    { key: 'assetName', label: 'Tài sản', render: (r) => r.assetName || '—' },
    { key: 'disposalType', label: 'Loại', render: (r) => DISPOSAL_TYPE[r.disposalType] || '—' },
    { key: 'originalValue', label: 'Nguyên giá', mono: true, render: (r) => `${fmt(r.originalValue)}đ` },
    { key: 'disposalValue', label: 'Giá thanh lý', mono: true, render: (r) => `${fmt(r.disposalValue)}đ` },
    { key: 'residualValue', label: 'Còn lại', mono: true, render: (r) => `${fmt(r.residualValue)}đ` },
    { key: 'status', label: 'TT', render: (r) => {
        const m = DISPOSAL_STATUS[r.status] ?? { label: '—' };
        return <StatusBadge tone={m.tone}>{m.label}</StatusBadge>;
    }},
  ];

  const viewTenderItems = async (r: TenderDto) => {
    setTenderDetail(r);
    try { setTenderItems(await getTenderItems(r.id)); }
    catch { te('Không tải được hạng mục gói thầu'); }
  };

  const handleAwardTender = async (id: string) => {
    try {
      await awardTender({ tenderId: id, winnerSupplierId: '00000000-0000-0000-0000-000000000000' });
      tk('Đã trao thầu');
      reloadTenders();
    } catch { te('Không thể trao thầu'); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [search]);

  const depts = useMemo(() => {
    const set = new Set(items.map((r) => r.departmentName).filter(Boolean) as string[]);
    return Array.from(set).map((v) => ({ v, l: v }));
  }, [items]);

  const counts = useTabCounts(items, STATUS_TABS, (r) => sKey(r.status));

  const filtered = useMemo(() => {
    return items.filter((r) => {
      if (stab !== 'all' && sKey(r.status) !== stab) return false;
      if (fDept && r.departmentName !== fDept) return false;
      return true;
    });
  }, [items, stab, fDept]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const cols: ColumnDef<FixedAssetDto>[] = [
    { key: 'code', label: 'Mã TS', code: true, render: (r) => r.assetCode },
    { key: 'name', label: 'Tên tài sản', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.assetName}</div>
        {r.serialNumber && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>SN: {r.serialNumber}</div>}
      </div>
    ) },
    { key: 'dept', label: 'Khoa', render: (r) => r.departmentName || '—' },
    { key: 'orig', label: 'Nguyên giá', mono: true, render: (r) => fmt(r.originalValue) },
    { key: 'cur', label: 'Còn lại', mono: true, render: (r) => {
      const ratio = r.originalValue ? r.currentValue / r.originalValue : 0;
      const tone = ratio < 0.2 ? 'var(--a-rd-text)' : ratio < 0.5 ? 'var(--a-or-text)' : undefined;
      return <span style={{ color: tone }}>{fmt(r.currentValue)}</span>;
    } },
    { key: 'date', label: 'Mua', mono: true, render: (r) => dayjs(r.purchaseDate).format('DD/MM/YYYY') },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === sKey(r.status));
      return <StatusBadge tone={t?.tone || 'info'} dot>{STATUS_LABEL[r.status] || '—'}</StatusBadge>;
    } },
  ];

  const actions = (r: FixedAssetDto) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      <ActBtn ic="edit" title="Sửa" onClick={() => openEdit(r)} />
      <ActBtn ic="qr" title="QR/Barcode" onClick={() => showQr(r)} />
    </div>
  );

  const totalValue = items.reduce((s, r) => s + (r.currentValue || 0), 0);

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng TS', val: dash?.totalAssets ?? items.length, sub: 'tất cả' },
        { lbl: 'Đang dùng', val: dash?.inUseCount ?? counts.inuse, sub: `${Math.round(((counts.inuse || 0) / Math.max(1, items.length)) * 100)}%`, tone: 'ok' },
        { lbl: 'Hỏng / Sửa', val: (dash?.brokenCount ?? counts.broken) + (counts.repair || 0), sub: 'cần xử lý', tone: 'warn' },
        { lbl: 'Tổng giá trị còn', val: Math.round(totalValue / 1_000_000), unit: 'tr', sub: 'VND', tone: 'info' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <Tabs
          activeKey={moduleTab}
          onChange={(k) => setModuleTab(k as typeof moduleTab)}
          size="small"
          style={{ marginBottom: 0 }}
          items={[
            { key: 'assets', label: 'Danh sách tài sản' },
            { key: 'stocktake', label: `Kiểm kê (${stocktakes.length})` },
            { key: 'tenders', label: `Đấu thầu (${tenders.length})` },
            { key: 'handovers', label: `Bàn giao (${handovers.length})` },
            { key: 'disposals', label: `Thanh lý (${disposals.length})` },
            { key: 'reports', label: 'Báo cáo TSCĐ' },
          ]}
        />
        <span className="spacer" />
        <RefreshButton onRefresh={load} loading={loading} />
        {moduleTab === 'assets' && <>
          <Btn variant="ghost" icon="activity" onClick={async () => {
            setDeprOpen(true);
            setDeprLoading(true);
            setDeprItems([]);
            try {
              const now = new Date();
              const result = await getDepreciationReport({ month: now.getMonth() + 1, year: now.getFullYear(), pageSize: 100 });
              setDeprItems(result.items || []);
            } catch {
              te('Không tải được báo cáo khấu hao');
              setDeprOpen(false);
            } finally {
              setDeprLoading(false);
            }
          }}>Khấu hao</Btn>
          <Btn variant="primary" icon="plus" onClick={openCreate}>Thêm TS</Btn>
        </>}
        {moduleTab === 'stocktake' && (
          <Btn variant="primary" icon="plus" onClick={() => setNewStocktakeOpen(true)}>Tạo phiếu kiểm kê</Btn>
        )}
        {moduleTab === 'tenders' && (
          <Btn variant="primary" icon="plus" onClick={openTenderCreate}>Thêm gói thầu</Btn>
        )}
        {moduleTab === 'handovers' && (
          <Btn variant="primary" icon="plus" onClick={() => { setHoForm({ handoverType: 1 }); setHoOpen(true); }}>Tạo bàn giao</Btn>
        )}
        {moduleTab === 'disposals' && (
          <Btn variant="primary" icon="plus" onClick={() => { setDpForm({ disposalType: 1 }); setDpOpen(true); }}>Đề xuất thanh lý</Btn>
        )}
      </div>

      {moduleTab === 'assets' && <>
        <div style={{ display: 'flex', gap: 'var(--space-8)', padding: '8px 16px', borderBottom: '1px solid var(--line)' }}>
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
            placeholder="Tìm mã TS / tên / serial…" />
          <Filter value={fDept} onChange={setFDept} options={depts} placeholder="▾ Khoa" />
          <Btn variant="ghost" icon="x" onClick={() => { setSearch(''); setFDept(''); setStab('all'); }}>Bỏ lọc</Btn>
        </div>
        <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />
        <DataTable<FixedAssetDto>
          columns={cols} data={paged} rowKey={(r) => r.id}
          onRowClick={setSel} actions={actions}
          loading={loading}
          empty={'Chưa có tài sản'}
        />
        <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />
      </>}

      {moduleTab === 'stocktake' && (
        <DataTable<AssetStocktakeDto>
          columns={[
            { key: 'code', label: 'Mã phiếu', code: true, render: (r) => r.stocktakeCode },
            { key: 'title', label: 'Tiêu đề', render: (r) => r.title },
            { key: 'date', label: 'Ngày KK', mono: true, render: (r) => dayjs(r.stocktakeDate).format('DD/MM/YYYY') },
            { key: 'dept', label: 'Khoa', render: (r) => r.departmentName || 'Toàn viện' },
            { key: 'items', label: 'Số TS', mono: true, render: (r) => r.totalItems },
            { key: 'found', label: 'Có mặt', mono: true, render: (r) => <span style={{ color: 'var(--s-ok)' }}>{r.foundCount}</span> },
            { key: 'miss', label: 'Thiếu', mono: true, render: (r) => r.missingCount > 0 ? <span style={{ color: 'var(--s-crit)' }}>{r.missingCount}</span> : '—' },
            { key: 'st', label: 'Trạng thái', render: (r) => {
              const tone = r.status === 4 ? 'ok' : r.status === 3 ? 'info' : r.status === 2 ? 'warn' : undefined;
              return <StatusBadge tone={tone} dot>{STOCKTAKE_STATUS[r.status] || '—'}</StatusBadge>;
            } },
          ] as ColumnDef<AssetStocktakeDto>[]}
          data={stocktakes}
          rowKey={(r) => r.id}
          onRowClick={setStocktakeDetail}
          actions={(r) => (
            <div className="ab-actions">
              <ActBtn ic="eye" title="Chi tiết" onClick={() => setStocktakeDetail(r)} />
              {r.status === 1 && (
                <ActBtn ic="check" title="Hoàn thành kiểm kê" onClick={async () => {
                  try { const u = await completeStocktake(r.id); setStocktakes((p) => p.map((x) => x.id === r.id ? u : x)); tk('Đã hoàn thành kiểm kê'); }
                  catch { te('Lỗi khi hoàn thành kiểm kê'); }
                }} />
              )}
              {r.status === 3 && (
                <ActBtn ic="check" title="Duyệt phiếu" onClick={async () => {
                  try { const u = await approveStocktake(r.id); setStocktakes((p) => p.map((x) => x.id === r.id ? u : x)); tk('Đã duyệt phiếu kiểm kê'); }
                  catch { te('Lỗi khi duyệt phiếu'); }
                }} />
              )}
            </div>
          )}
          loading={loading}
          empty={'Chưa có phiếu kiểm kê'}
        />
      )}

      {moduleTab === 'tenders' && (
        <DataTable<TenderDto>
          columns={[
            { key: 'code', label: 'Mã', code: true, render: (r) => r.tenderCode },
            { key: 'name', label: 'Tên gói thầu', render: (r) => r.tenderName },
            { key: 'type', label: 'Loại', render: (r) => TENDER_TYPE_LABEL[r.tenderType] || '—' },
            { key: 'budget', label: 'Ngân sách', mono: true, render: (r) => fmt(r.budgetAmount) },
            { key: 'st', label: 'Trạng thái', render: (r) => {
              const meta = TENDER_STATUS_META[r.status];
              return <StatusBadge tone={meta?.tone} dot>{meta?.label || '—'}</StatusBadge>;
            } },
            { key: 'items', label: 'Hạng mục', mono: true, render: (r) => r.itemCount },
          ] as ColumnDef<TenderDto>[]}
          data={tenders}
          rowKey={(r) => r.id}
          onRowClick={viewTenderItems}
          actions={(r) => (
            <div className="ab-actions">
              <ActBtn ic="eye" title="Hạng mục" onClick={() => viewTenderItems(r)} />
              {r.status < 4 && <ActBtn ic="check" title="Trao thầu" onClick={() => cf('Xác nhận trao thầu?', () => handleAwardTender(r.id))} />}
            </div>
          )}
          loading={loading}
          empty={'Chưa có gói thầu'}
        />
      )}

      {/* #352: Bàn giao tài sản — port từ v1 pages/AssetManagement.tsx:308-379 */}
      {moduleTab === 'handovers' && (
        <DataTable<AssetHandoverDto>
          columns={hoCols}
          data={handovers}
          rowKey={(r) => r.id}
          actions={(r) => (
            <div className="ab-actions">
              {r.status === 1 && (
                <ActBtn ic="check" title="Xác nhận bàn giao" onClick={() => doConfirmHandover(r)} />
              )}
            </div>
          )}
          loading={loading}
          empty={'Chưa có phiếu bàn giao'}
        />
      )}

      {/* #352: Thanh lý tài sản — port từ v1 pages/AssetManagement.tsx:382-453 */}
      {moduleTab === 'disposals' && (
        <DataTable<AssetDisposalDto>
          columns={dpCols}
          data={disposals}
          rowKey={(r) => r.id}
          actions={(r) => (
            <div className="ab-actions">
              {r.status === 1 && <ActBtn ic="check" title="Duyệt thanh lý" onClick={() => doApproveDisposal(r)} />}
              {r.status === 2 && <ActBtn ic="check" title="Hoàn thành thanh lý" tone="warn" onClick={() => doCompleteDisposal(r)} />}
            </div>
          )}
          loading={loading}
          empty={'Chưa có phiếu thanh lý'}
        />
      )}

      {/* #352: Báo cáo TSCĐ — biểu đồ trạng thái/khấu hao + catalog báo cáo (port v1 ReportsTab + charts) */}
      {moduleTab === 'reports' && (
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-2)', padding: 12 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <Btn variant={chartView === 'status' ? 'primary' : 'ghost'} onClick={() => setChartView('status')}>Theo trạng thái</Btn>
              <Btn variant={chartView === 'trend' ? 'primary' : 'ghost'} onClick={() => setChartView('trend')}>Xu hướng khấu hao</Btn>
            </div>
            <div style={{ height: 280 }}>
              {chartView === 'status' ? (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={dash?.statusBreakdown || []} dataKey="count" nameKey="statusName"
                      cx="50%" cy="50%" outerRadius={100}
                      label={({ name, value }) => `${String(name ?? '')}: ${Number(value ?? 0)}`}>
                      {(dash?.statusBreakdown || []).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <RTooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer>
                  <BarChart data={dash?.depreciationTrends || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tickFormatter={(m: number, i: number) => `T${m}/${dash?.depreciationTrends?.[i]?.year ?? ''}`} />
                    <YAxis tickFormatter={(v: number) => `${Math.round(v / 1_000_000)}tr`} />
                    <RTooltip formatter={(value) => Number(value ?? 0).toLocaleString('vi-VN')} />
                    <Bar dataKey="amount" fill="#ff4d4f" name="Khấu hao" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <Select placeholder="Chọn loại báo cáo" value={repSel} onChange={setRepSel}
              style={{ minWidth: 280 }} showSearch optionFilterProp="label" allowClear
              options={Object.entries(groupedReports).map(([cat, its]) => ({
                label: cat,
                options: its.map((rt) => ({ value: rt.code, label: `${rt.code}. ${rt.name}` })),
              }))} />
            <InputNumber placeholder="Năm" value={repYear} min={2020} max={2035}
              onChange={(v) => setRepYear(Number(v) || dayjs().year())} style={{ width: 90 }} />
            <Select placeholder="Tháng" allowClear value={repMonth} onChange={setRepMonth} style={{ width: 100 }}
              options={Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `Tháng ${i + 1}` }))} />
            <DatePicker placeholder="Từ ngày" format="DD/MM/YYYY" style={{ width: 130 }}
              onChange={(d) => setRepFrom(d ? d.format('YYYY-MM-DD') : undefined)} />
            <DatePicker placeholder="Đến ngày" format="DD/MM/YYYY" style={{ width: 130 }}
              onChange={(d) => setRepTo(d ? d.format('YYYY-MM-DD') : undefined)} />
            <Input placeholder="Nhóm TS" value={repGroup} onChange={(e) => setRepGroup(e.target.value)} style={{ width: 110 }} />
            <Btn variant="primary" icon="printer" loading={repLoading} onClick={() => runReport()}>Xuất báo cáo</Btn>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {Object.entries(groupedReports).map(([cat, its]) => (
              <div key={cat} style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-2)', padding: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 'var(--fs-sm)', marginBottom: 8, textTransform: 'uppercase', color: 'var(--t-2)' }}>{cat}</div>
                {its.map((rt) => (
                  <button key={rt.code} type="button" title={rt.description}
                    onClick={() => { setRepSel(rt.code); runReport(rt.code); }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left', padding: '5px 4px',
                      background: 'none', border: 'none', borderBottom: '1px solid var(--line-soft)',
                      color: 'var(--a-cy)', fontSize: 'var(--fs-sm)', cursor: 'pointer',
                    }}>
                    {rt.code}. {rt.name}
                  </button>
                ))}
              </div>
            ))}
            {reportTypes.length === 0 && (
              <div style={{ color: 'var(--t-2)', fontSize: 'var(--fs-sm)' }}>Đang tải danh mục báo cáo…</div>
            )}
          </div>
        </div>
      )}

      <ModalShell open={hoOpen} onClose={() => setHoOpen(false)} title="Tạo phiếu bàn giao tài sản" size="md"
        footer={<>
          <Btn variant="ghost" onClick={() => setHoOpen(false)}>Hủy</Btn>
          <Btn variant="primary" onClick={() => { if (hoModalForm.validate({ fixedAssetId: hoForm.fixedAssetId })) submitHandover(); }}>Lưu</Btn>
        </>}
      >
        <Form layout="vertical" style={{ padding: '4px 0' }}>
          <Field label="Tài sản" required error={hoModalForm.errors.fixedAssetId}>
            <Select showSearch optionFilterProp="label" placeholder="Chọn tài sản…"
              value={hoForm.fixedAssetId} options={assetOptions} style={{ width: '100%' }}
              onChange={(v) => { setHoForm((p) => ({ ...p, fixedAssetId: v })); hoModalForm.clear('fixedAssetId'); }} />
          </Field>
          <Form.Item label="Loại bàn giao">
            <Select value={hoForm.handoverType} style={{ width: '100%' }}
              options={Object.entries(HANDOVER_TYPE).map(([k, l]) => ({ value: Number(k), label: l }))}
              onChange={(v) => setHoForm((p) => ({ ...p, handoverType: v }))} />
          </Form.Item>
          <Form.Item label="Ngày bàn giao">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY"
              value={hoForm.handoverDate ? dayjs(hoForm.handoverDate) : null}
              onChange={(d) => setHoForm((p) => ({ ...p, handoverDate: d ? d.toISOString() : undefined }))} />
          </Form.Item>
          <Form.Item label="Ghi chú">
            <Input.TextArea rows={2} value={hoForm.notes ?? ''}
              onChange={(e) => setHoForm((p) => ({ ...p, notes: e.target.value || undefined }))} />
          </Form.Item>
        </Form>
      </ModalShell>

      <ModalShell open={dpOpen} onClose={() => setDpOpen(false)} title="Đề xuất thanh lý tài sản" size="md"
        footer={<>
          <Btn variant="ghost" onClick={() => setDpOpen(false)}>Hủy</Btn>
          <Btn variant="primary" onClick={() => { if (dpModalForm.validate({ fixedAssetId: dpForm.fixedAssetId, disposalValue: dpForm.disposalValue, residualValue: dpForm.residualValue })) submitDisposal(); }}>Đề xuất</Btn>
        </>}
      >
        <Form layout="vertical" style={{ padding: '4px 0' }}>
          <Field label="Tài sản" required error={dpModalForm.errors.fixedAssetId}>
            <Select showSearch optionFilterProp="label" placeholder="Chọn tài sản…"
              value={dpForm.fixedAssetId} options={assetOptions} style={{ width: '100%' }}
              onChange={(v) => { setDpForm((p) => ({ ...p, fixedAssetId: v })); dpModalForm.clear('fixedAssetId'); }} />
          </Field>
          <Form.Item label="Loại thanh lý">
            <Select value={dpForm.disposalType} style={{ width: '100%' }}
              options={Object.entries(DISPOSAL_TYPE).map(([k, l]) => ({ value: Number(k), label: l }))}
              onChange={(v) => setDpForm((p) => ({ ...p, disposalType: v }))} />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Giá thanh lý (đ)" error={dpModalForm.errors.disposalValue}>
              <Input type="number" min={0} value={dpForm.disposalValue ?? ''}
                onChange={(e) => { setDpForm((p) => ({ ...p, disposalValue: e.target.value === '' ? undefined : Number(e.target.value) })); dpModalForm.clear('disposalValue'); }} />
            </Field>
            <Field label="Giá trị còn lại (đ)" error={dpModalForm.errors.residualValue}>
              <Input type="number" min={0} value={dpForm.residualValue ?? ''}
                onChange={(e) => { setDpForm((p) => ({ ...p, residualValue: e.target.value === '' ? undefined : Number(e.target.value) })); dpModalForm.clear('residualValue'); }} />
            </Field>
          </div>
          <Form.Item label="Lý do">
            <Input.TextArea rows={2} value={dpForm.reason ?? ''}
              onChange={(e) => setDpForm((p) => ({ ...p, reason: e.target.value || undefined }))} />
          </Form.Item>
        </Form>
      </ModalShell>

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? sel.assetName : ''}
        sub={sel ? `${sel.assetCode}${sel.serialNumber ? ` · SN ${sel.serialNumber}` : ''}` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
          <Btn icon="qr" onClick={() => { if (sel) showQr(sel); }}>Mã QR</Btn>
          <Btn variant="primary" icon="edit" onClick={() => { if (sel) openEdit(sel); setSel(null); }}>Chỉnh sửa</Btn>
        </>}
      >
        {sel && <>
          <DrSec title="Định danh">
            <DrField lbl="Mã TS"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.assetCode}</span></DrField>
            <DrField lbl="Tên">{sel.assetName}</DrField>
            {sel.serialNumber && <DrField lbl="Serial"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.serialNumber}</span></DrField>}
            <DrField lbl="Khoa">{sel.departmentName || '—'}</DrField>
            <DrField lbl="Vị trí">{sel.locationDescription || '—'}</DrField>
            <DrField lbl="Trạng thái">
              <StatusBadge tone={STATUS_TABS.find((x) => x.v === sKey(sel.status))?.tone || 'info'} dot>
                {STATUS_LABEL[sel.status] || '—'}
              </StatusBadge>
            </DrField>
          </DrSec>
          <DrSec title="Tài chính">
            <div style={{ padding: 'var(--space-14)', background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-2)' }}>
              <Line label="Nguyên giá" value={`${fmt(sel.originalValue)} đ`} bold />
              <Line label="Hao mòn lũy kế" value={`−${fmt(sel.accumulatedDepreciation)} đ`} tone="warn" />
              <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '8px 0' }} />
              <Line label="Giá trị còn lại" value={`${fmt(sel.currentValue)} đ`} bold tone="ok" />
              <Line label="Hao mòn / tháng" value={`${fmt(sel.monthlyDepreciation)} đ`} />
            </div>
          </DrSec>
          <DrSec title="Khấu hao">
            <DrField lbl="Mua">{dayjs(sel.purchaseDate).format('DD/MM/YYYY')}</DrField>
            <DrField lbl="Thời gian KH"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.usefulLifeMonths} tháng</span></DrField>
            <DrField lbl="Phương pháp">{sel.depreciationMethod === 1 ? 'Đường thẳng' : 'Số dư giảm dần'}</DrField>
            {sel.tenderName && <DrField lbl="Gói thầu">{sel.tenderName}</DrField>}
            {sel.notes && <DrField lbl="Ghi chú">{sel.notes}</DrField>}
          </DrSec>
        </>}
      </DrawerShell>

      <CrudModal
        open={crudOpen}
        onClose={() => setCrudOpen(false)}
        title={crudInit?.id ? 'Cập nhật tài sản' : 'Thêm tài sản cố định'}
        fields={ASSET_FIELDS}
        initial={crudInit}
        size="lg"
        onSubmit={async (v, editing) => {
          await saveAsset(v as Partial<FixedAssetDto>);
          tk(editing ? 'Đã cập nhật tài sản' : 'Đã thêm tài sản');
          load();
        }}
      />

      {/* Stocktake detail drawer */}
      <DrawerShell
        open={!!stocktakeDetail}
        onClose={() => { setStocktakeDetail(null); setEditingItemId(null); }}
        size="lg"
        title={stocktakeDetail ? `Phiếu ${stocktakeDetail.stocktakeCode}` : ''}
        sub={stocktakeDetail ? `${stocktakeDetail.title} · ${stocktakeDetail.departmentName || 'Toàn viện'}` : ''}
        footer={
          <div style={{ display: 'flex', gap: 'var(--space-8)', justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => { setStocktakeDetail(null); setEditingItemId(null); }}>Đóng</Btn>
            {stocktakeDetail && (
              <Btn icon="printer" onClick={async () => {
                try { await printStocktake(stocktakeDetail.id); }
                catch { te('Không thể in phiếu kiểm kê'); }
              }}>In phiếu</Btn>
            )}
          </div>
        }
      >
        {stocktakeDetail && <>
          <DrSec title="Thông tin phiếu">
            <DrField lbl="Mã phiếu"><span style={{ fontFamily: 'var(--font-mono)' }}>{stocktakeDetail.stocktakeCode}</span></DrField>
            <DrField lbl="Tiêu đề">{stocktakeDetail.title}</DrField>
            <DrField lbl="Ngày kiểm kê">{dayjs(stocktakeDetail.stocktakeDate).format('DD/MM/YYYY')}</DrField>
            <DrField lbl="Khoa">{stocktakeDetail.departmentName || 'Toàn viện'}</DrField>
            <DrField lbl="Trạng thái">
              <StatusBadge tone={stocktakeDetail.status === 4 ? 'ok' : stocktakeDetail.status === 3 ? 'info' : 'warn'} dot>
                {STOCKTAKE_STATUS[stocktakeDetail.status]}
              </StatusBadge>
            </DrField>
            <DrField lbl="Tổng TS"><span style={{ fontFamily: 'var(--font-mono)' }}>{stocktakeDetail.totalItems}</span></DrField>
            <DrField lbl="Có mặt"><span style={{ color: 'var(--s-ok)', fontFamily: 'var(--font-mono)' }}>{stocktakeDetail.foundCount}</span></DrField>
            {stocktakeDetail.missingCount > 0 && (
              <DrField lbl="Thiếu"><span style={{ color: 'var(--s-crit)', fontFamily: 'var(--font-mono)' }}>{stocktakeDetail.missingCount}</span></DrField>
            )}
            {stocktakeDetail.notes && <DrField lbl="Ghi chú">{stocktakeDetail.notes}</DrField>}
          </DrSec>
          <DrSec title={`Danh sách tài sản (${stocktakeDetail.items.length})${stocktakeDetail.status < 4 ? ' — click dòng để chỉnh sửa' : ''}`}>
            <table className="ab-tbl">
              <thead>
                <tr>
                  <th>Mã TS</th><th>Tên</th><th>Serial</th><th>Vị trí</th>
                  <th>Có mặt</th><th>Tình trạng</th><th>Ghi chú</th>
                  {stocktakeDetail.status < 4 && <th style={{ width: 60 }}></th>}
                </tr>
              </thead>
              <tbody>
                {stocktakeDetail.items.map((it) => {
                  const isEditing = editingItemId === it.id;
                  if (isEditing) {
                    return (
                      <tr key={it.id} style={{ background: 'var(--d-2)' }}>
                        <td className="mono">{it.assetCode}</td>
                        <td>{it.assetName}</td>
                        <td className="mono">{it.serialNumber || '—'}</td>
                        <td>{it.locationDescription || '—'}</td>
                        <td className="center">
                          <Checkbox
                            defaultChecked={it.isFound}
                            onChange={(e) => editItemForm.setFieldValue('isFound', e.target.checked)}
                          />
                        </td>
                        <td>
                          <Select
                            defaultValue={it.conditionStatus}
                            size="small"
                            style={{ width: 100 }}
                            onChange={(v) => editItemForm.setFieldValue('conditionStatus', v)}
                            options={[
                              { value: 1, label: 'Tốt' },
                              { value: 2, label: 'Xuống cấp' },
                              { value: 3, label: 'Hỏng' },
                            ]}
                          />
                        </td>
                        <td>
                          <Input
                            size="small"
                            defaultValue={it.remark || ''}
                            onChange={(e) => editItemForm.setFieldValue('remark', e.target.value)}
                            placeholder="Ghi chú…"
                          />
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                            <Btn
                              variant="primary"
                              style={{ padding: '2px 8px', fontSize: 'var(--fs-sm)' }}
                              disabled={itemSaving}
                              onClick={async () => {
                                setItemSaving(true);
                                try {
                                  const vals = editItemForm.getFieldsValue() as { isFound?: boolean; conditionStatus?: number; remark?: string };
                                  const updated: AssetStocktakeItemDto = await updateStocktakeItem(
                                    stocktakeDetail.id, it.id,
                                    {
                                      isFound: vals.isFound ?? it.isFound,
                                      conditionStatus: vals.conditionStatus ?? it.conditionStatus,
                                      remark: vals.remark ?? it.remark,
                                    },
                                  );
                                  // Update local state
                                  setStocktakeDetail((prev) => prev ? {
                                    ...prev,
                                    items: prev.items.map((x) => x.id === it.id ? { ...x, ...updated } : x),
                                    foundCount: prev.items.map((x) => x.id === it.id ? { ...x, ...updated } : x).filter((x) => x.isFound).length,
                                    missingCount: prev.items.map((x) => x.id === it.id ? { ...x, ...updated } : x).filter((x) => !x.isFound).length,
                                  } : prev);
                                  setEditingItemId(null);
                                  tk('Đã cập nhật');
                                } catch { te('Cập nhật thất bại'); }
                                finally { setItemSaving(false); }
                              }}
                            >Lưu</Btn>
                            <Btn variant="ghost" style={{ padding: '2px 8px', fontSize: 'var(--fs-sm)' }} onClick={() => setEditingItemId(null)}>Hủy</Btn>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr
                      key={it.id}
                      style={{ cursor: stocktakeDetail.status < 4 ? 'pointer' : undefined }}
                      onClick={() => {
                        if (stocktakeDetail.status < 4) {
                          editItemForm.setFieldsValue({ isFound: it.isFound, conditionStatus: it.conditionStatus, remark: it.remark });
                          setEditingItemId(it.id);
                        }
                      }}
                    >
                      <td className="mono">{it.assetCode}</td>
                      <td>{it.assetName}</td>
                      <td className="mono">{it.serialNumber || '—'}</td>
                      <td>{it.locationDescription || '—'}</td>
                      <td>{it.isFound ? <span style={{ color: 'var(--s-ok)' }}>Có</span> : <span style={{ color: 'var(--s-crit)' }}>Thiếu</span>}</td>
                      <td>{it.conditionStatus === 1 ? 'Tốt' : it.conditionStatus === 2 ? 'Xuống cấp' : 'Hỏng'}</td>
                      <td>{it.remark || '—'}</td>
                      {stocktakeDetail.status < 4 && <td style={{ color: 'var(--t-2)', fontSize: 'var(--fs-xs)' }}>Sửa</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {/* Hidden form used only for holding field values during inline edit */}
            <Form form={editItemForm} style={{ display: 'none' }}>
              <Form.Item name="isFound" />
              <Form.Item name="conditionStatus" />
              <Form.Item name="remark" />
            </Form>
          </DrSec>
        </>}
      </DrawerShell>

      {/* Tạo phiếu kiểm kê */}
      <ModalShell
        open={newStocktakeOpen}
        onClose={() => setNewStocktakeOpen(false)}
        title="Tạo phiếu kiểm kê tài sản"
        size="md"
        footer={<>
          <Btn variant="ghost" onClick={() => setNewStocktakeOpen(false)}>Hủy</Btn>
          <Btn variant="primary" onClick={async () => {
            try {
              const v = await stocktakeForm.validateFields();
              const dto = {
                title: v.title as string,
                stocktakeDate: v.stocktakeDate ? dayjs(v.stocktakeDate as Parameters<typeof dayjs>[0]).format('YYYY-MM-DD') : new Date().toISOString().slice(0, 10),
                notes: v.notes as string | undefined,
                items: [],
              };
              const result = await createStocktake(dto);
              setStocktakes((p) => [result, ...p]);
              tk(`Đã tạo phiếu ${result.stocktakeCode} — ${result.totalItems} tài sản được tự động nạp`);
              setNewStocktakeOpen(false);
              stocktakeForm.resetFields();
            } catch { te('Tạo phiếu kiểm kê thất bại'); }
          }}>Tạo phiếu</Btn>
        </>}
      >
        <Form form={stocktakeForm} layout="vertical">
          <Form.Item name="title" label="Tiêu đề phiếu" rules={[{ required: true }]}>
            <Input placeholder="VD: Kiểm kê quý 2/2026 — Khoa Nội" />
          </Form.Item>
          <Form.Item name="stocktakeDate" label="Ngày kiểm kê" rules={[{ required: true }]}>
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="notes" label="Ghi chú">
            <Input.TextArea rows={2} />
          </Form.Item>
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>
            Hệ thống sẽ tự động nạp toàn bộ tài sản cố định hiện có vào phiếu kiểm kê. Sau khi tạo, bạn có thể cập nhật trạng thái từng tài sản.
          </p>
        </Form>
      </ModalShell>

      {/* Báo cáo khấu hao */}
      <DrawerShell
        open={deprOpen}
        onClose={() => setDeprOpen(false)}
        size="lg"
        title={`Báo cáo khấu hao tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`}
        sub={deprLoading ? 'Đang tải…' : `${deprItems.length} tài sản`}
        footer={<Btn variant="ghost" onClick={() => setDeprOpen(false)}>Đóng</Btn>}
      >
        {deprLoading && <div style={{ padding: 'var(--space-32)', textAlign: 'center', color: 'var(--t-2)' }}>Đang tải báo cáo khấu hao…</div>}
        {!deprLoading && deprItems.length === 0 && (
          <div style={{ padding: 'var(--space-32)', textAlign: 'center', color: 'var(--t-2)' }}>Không có dữ liệu khấu hao tháng này</div>
        )}
        {!deprLoading && deprItems.length > 0 && (
          <table className="ab-tbl" style={{ width: '100%', fontSize: 'var(--fs-sm)' }}>
            <thead>
              <tr>
                <th>Mã TS</th><th>Tên tài sản</th><th>Khoa</th>
                <th>Đầu kỳ (đ)</th><th>Khấu hao (đ)</th><th>Cuối kỳ (đ)</th>
              </tr>
            </thead>
            <tbody>
              {deprItems.map((d) => (
                <tr key={d.fixedAssetId}>
                  <td className="mono">{d.assetCode}</td>
                  <td>{d.assetName}</td>
                  <td>{d.departmentName || '—'}</td>
                  <td className="mono">{fmt(d.openingValue)}</td>
                  <td className="mono" style={{ color: 'var(--a-or-text)' }}>−{fmt(d.depreciationAmount)}</td>
                  <td className="mono" style={{ color: d.closingValue < d.openingValue * 0.2 ? 'var(--a-rd-text)' : undefined }}>
                    {fmt(d.closingValue)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 700 }}>
                <td colSpan={3}>Tổng cộng</td>
                <td className="mono">{fmt(deprItems.reduce((s, d) => s + d.openingValue, 0))}</td>
                <td className="mono" style={{ color: 'var(--a-or-text)' }}>
                  −{fmt(deprItems.reduce((s, d) => s + d.depreciationAmount, 0))}
                </td>
                <td className="mono">{fmt(deprItems.reduce((s, d) => s + d.closingValue, 0))}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </DrawerShell>

      {/* Chi tiết gói thầu + hạng mục */}
      <DrawerShell
        open={!!tenderDetail}
        onClose={() => setTenderDetail(null)}
        size="lg"
        title={tenderDetail ? tenderDetail.tenderName : ''}
        sub={tenderDetail ? tenderDetail.tenderCode : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setTenderDetail(null)}>Đóng</Btn>
          {tenderDetail && tenderDetail.status < 4 && (
            <Btn variant="primary" icon="check" onClick={() => cf('Xác nhận trao thầu?', () => { handleAwardTender(tenderDetail.id); setTenderDetail(null); })}>Trao thầu</Btn>
          )}
        </>}
      >
        {tenderDetail && <>
          <DrSec title="Thông tin gói thầu">
            <DrField lbl="Mã gói thầu"><span style={{ fontFamily: 'var(--font-mono)' }}>{tenderDetail.tenderCode}</span></DrField>
            <DrField lbl="Loại">{TENDER_TYPE_LABEL[tenderDetail.tenderType] || '—'}</DrField>
            <DrField lbl="Ngân sách"><span style={{ fontFamily: 'var(--font-mono)' }}>{fmt(tenderDetail.budgetAmount)} đ</span></DrField>
            <DrField lbl="Trạng thái">
              <StatusBadge tone={TENDER_STATUS_META[tenderDetail.status]?.tone} dot>
                {TENDER_STATUS_META[tenderDetail.status]?.label || '—'}
              </StatusBadge>
            </DrField>
            {tenderDetail.publishDate && <DrField lbl="Ngày đăng">{dayjs(tenderDetail.publishDate).format('DD/MM/YYYY')}</DrField>}
            {tenderDetail.closingDate && <DrField lbl="Ngày đóng">{dayjs(tenderDetail.closingDate).format('DD/MM/YYYY')}</DrField>}
            {tenderDetail.winnerSupplierName && <DrField lbl="Nhà thầu trúng">{tenderDetail.winnerSupplierName}</DrField>}
            {tenderDetail.notes && <DrField lbl="Ghi chú">{tenderDetail.notes}</DrField>}
          </DrSec>
          <DrSec title={`Hạng mục (${tenderItems.length})`}>
            <DataTable<TenderItemDto>
              columns={[
                { key: 'name', label: 'Tên', render: (r) => r.itemName },
                { key: 'type', label: 'Loại', render: (r) => TENDER_ITEM_TYPE_LABEL[r.itemType] || '—' },
                { key: 'qty', label: 'SL', mono: true, render: (r) => r.quantity },
                { key: 'price', label: 'Đơn giá', mono: true, render: (r) => fmt(r.unitPrice) },
              ] as ColumnDef<TenderItemDto>[]}
              data={tenderItems}
              rowKey={(r) => r.id}
              empty="Chưa có hạng mục"
            />
            <div style={{ marginTop: 'var(--space-8)' }}>
              <Btn variant="ghost" icon="plus" onClick={() => { setTenderItemCrudInit({ itemType: 1 }); setTenderItemCrudOpen(true); }}>Thêm hạng mục</Btn>
            </div>
          </DrSec>
        </>}
      </DrawerShell>

      <CrudModal
        open={tenderCrudOpen}
        onClose={() => setTenderCrudOpen(false)}
        title={tenderCrudInit?.id ? 'Cập nhật gói thầu' : 'Thêm gói thầu'}
        fields={TENDER_FIELDS}
        initial={tenderCrudInit}
        size="lg"
        onSubmit={async (v, editing) => {
          await saveTender(v as Partial<TenderDto>);
          tk(editing ? 'Đã cập nhật gói thầu' : 'Đã thêm gói thầu');
          reloadTenders();
        }}
      />

      <CrudModal
        open={tenderItemCrudOpen}
        onClose={() => setTenderItemCrudOpen(false)}
        title="Thêm hạng mục gói thầu"
        fields={TENDER_ITEM_FIELDS}
        initial={tenderItemCrudInit}
        onSubmit={async (v) => {
          if (!tenderDetail) return;
          await saveTenderItem({ ...v, tenderId: tenderDetail.id } as Partial<TenderItemDto>);
          tk('Đã thêm hạng mục');
          setTenderItems(await getTenderItems(tenderDetail.id));
          reloadTenders();
        }}
      />

      <ModalShell
        open={!!qrData}
        onClose={() => setQrData(null)}
        title="Mã QR tài sản"
        sub={qrData ? `${qrData.assetCode} · ${qrData.assetName}` : ''}
        size="sm"
        footer={<Btn variant="ghost" onClick={() => setQrData(null)}>Đóng</Btn>}
      >
        {qrData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
            <DrField lbl="Mã TS"><span style={{ fontFamily: 'var(--font-mono)' }}>{qrData.assetCode}</span></DrField>
            <DrField lbl="Tên">{qrData.assetName}</DrField>
            {qrData.departmentName && <DrField lbl="Khoa">{qrData.departmentName}</DrField>}
            {qrData.serialNumber && <DrField lbl="Serial"><span style={{ fontFamily: 'var(--font-mono)' }}>{qrData.serialNumber}</span></DrField>}
            <DrField lbl="Nội dung QR">
              <code style={{ display: 'block', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: 'var(--fs-sm)',
                padding: 'var(--space-10)', background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-2)' }}>
                {qrData.qrContent}
              </code>
            </DrField>
          </div>
        )}
      </ModalShell>
    </div>
  );
};

const Line: React.FC<{ label: string; value: React.ReactNode; tone?: 'ok' | 'crit' | 'info' | 'warn'; bold?: boolean }> = ({ label, value, tone, bold }) => {
  const color = tone === 'ok' ? 'var(--a-em-text)'
    : tone === 'crit' ? 'var(--a-rd-text)'
    : tone === 'info' ? 'var(--a-cy-text)'
    : tone === 'warn' ? 'var(--a-or-text)'
    : 'var(--t-0)';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: bold ? 14 : 13, fontWeight: bold ? 700 : 400, color }}>
      <span>{label}</span><span style={{ fontFamily: 'var(--font-mono)' }}>{value}</span>
    </div>
  );
};

export default AssetManagementV2;
