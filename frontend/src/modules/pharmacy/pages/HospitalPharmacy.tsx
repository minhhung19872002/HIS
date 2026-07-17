import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { DatePicker, Form, Input, InputNumber, Select } from 'antd';
import { fmtNum as fmt } from '../../../utils/format';
import {
  getRetailSales, cancelRetailSale, createRetailSale, searchMedicines,
  getPharmacyStock, getPharmacyRevenue,
  getCustomers, saveCustomer,
  getShifts, openShift, closeShift, getCurrentShift,
  getGppRecords, saveGppRecord,
  getCommissions, payCommissions, getEnhancedDashboard,
} from '../api/hospitalPharmacy';
import type {
  RetailSaleDto, MedicineSearchResultDto,
  PharmacyRevenueDto, PharmacyCustomerDto, SavePharmacyCustomerDto,
  PharmacyShiftDto, PharmacyGppRecordDto, SavePharmacyGppRecordDto,
  PharmacyCommissionDto, PharmacyEnhancedDashboardDto,
} from '../api/hospitalPharmacy';
import {
  KpiStrip, TopTabs, StatusTabs, SearchBox, DataTable, Pager,
  DrawerShell, DrSec, DrField, ModalShell, ActBtn, Btn, StatusBadge,
  tk, te, cf,
  type ColumnDef, type TopTab, type KpiItem, type StatusTab,
} from '../../../pages-v2/_v2kit';
import ExpiryAlertModal from '../../../pages-v2/shared/ExpiryAlertModal';
import PaymentQRModal from '../../billing/components/PaymentQRModal';

// ── Constants ─────────────────────────────────────────────────────────────

const STATUS_TONE: Record<number, { label: string; tone: 'warn' | 'ok' | 'crit' }> = {
  0: { label: 'Chờ',    tone: 'warn' },
  1: { label: 'Đã bán', tone: 'ok'   },
  2: { label: 'Hủy',    tone: 'crit' },
};
const PAYMENT_LABEL: Record<number, string> = { 0: 'Tiền mặt', 1: 'Thẻ', 2: 'Chuyển khoản' };
const PMT_OPTS = [{ value: 0, label: 'Tiền mặt' }, { value: 1, label: 'Thẻ' }, { value: 2, label: 'Chuyển khoản' }];
const CTYPE: Record<number, string> = { 0: 'Thường', 1: 'VIP', 2: 'Đại lý' };
const SHIFT_ST: Record<number, { label: string; tone: 'ok' | 'crit' }> = {
  0: { label: 'Đang mở', tone: 'ok'   },
  1: { label: 'Đã đóng', tone: 'crit' },
};
const GPP_TYPES: Record<number, string> = {
  1: 'Nhập hàng', 2: 'Kiểm kho', 3: 'Nhiệt độ/Độ ẩm', 4: 'Vệ sinh', 5: 'Khác',
};
const COMM_ST: Record<number, { label: string; tone: 'warn' | 'ok' }> = {
  0: { label: 'Chờ TT', tone: 'warn' },
  1: { label: 'Đã trả', tone: 'ok'   },
};

// ── History status tabs ────────────────────────────────────────────────────
type SaleKey = 'pending' | 'completed' | 'cancelled';
const SALE_TABS: StatusTab<SaleKey>[] = [
  { v: 'pending',   l: 'Chờ',    tone: 'warn' },
  { v: 'completed', l: 'Đã bán', tone: 'ok'   },
  { v: 'cancelled', l: 'Hủy',    tone: 'crit' },
];
const saleStatusKey = (r: RetailSaleDto): SaleKey =>
  r.status === 1 ? 'completed' : r.status === 2 ? 'cancelled' : 'pending';

// ── Cart item ──────────────────────────────────────────────────────────────
interface CartItem {
  medicineId: string;
  medicineName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  batchNumber?: string;
}

// ── Page tab definitions ───────────────────────────────────────────────────
type PageTab = 'history' | 'retail' | 'stock' | 'report' | 'customers' | 'shifts' | 'gpp' | 'commission';

const PAGE_TABS: TopTab<PageTab>[] = [
  { v: 'history',    l: 'Lịch sử bán', ic: 'receipt'  },
  { v: 'retail',     l: 'Bán lẻ POS',  ic: 'dollar'   },
  { v: 'stock',      l: 'Tồn kho',     ic: 'layers'   },
  { v: 'report',     l: 'Báo cáo DT',  ic: 'chart'    },
  { v: 'customers',  l: 'Khách hàng',  ic: 'users'    },
  { v: 'shifts',     l: 'Ca làm việc', ic: 'clock'    },
  { v: 'gpp',        l: 'Hồ sơ GPP',   ic: 'shield'   },
  { v: 'commission', l: 'Hoa hồng',    ic: 'cash'     },
];

const PS = 20; // default page size
const fmtD  = (s?: string | null) => s ? dayjs(s).format('DD/MM/YYYY')  : '—';
const fmtDT = (s?: string | null) => s ? dayjs(s).format('DD/MM HH:mm') : '—';

// ══════════════════════════════ MAIN COMPONENT ═══════════════════════════════

const HospitalPharmacyV2: React.FC = () => {

  // ── Tab ──────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<PageTab>('history');

  // ── Tab 1: History ───────────────────────────────────────────────────────
  const [hRows,    setHRows]    = useState<RetailSaleDto[]>([]);
  const [hLoading, setHLoading] = useState(false);
  const [hStab,    setHStab]    = useState<SaleKey | 'all'>('all');
  const [hSearch,  setHSearch]  = useState('');
  const [hPage,    setHPage]    = useState(0);
  const [hDetail,  setHDetail]  = useState<RetailSaleDto | null>(null);
  const [qrSale,   setQrSale]   = useState<RetailSaleDto | null>(null);

  const loadHistory = useCallback(async () => {
    setHLoading(true);
    try {
      const r = await getRetailSales({
        fromDate: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
        toDate:   dayjs().format('YYYY-MM-DD'),
      });
      setHRows(r.items);
    } catch { setHRows([]); }
    finally  { setHLoading(false); }
  }, []);
  useEffect(() => { if (tab === 'history') void loadHistory(); }, [tab, loadHistory]);

  const hFiltered = useMemo(() => hRows.filter((r) => {
    if (hStab !== 'all' && saleStatusKey(r) !== hStab) return false;
    if (hSearch.trim()) {
      const q = hSearch.toLowerCase();
      if (!`${r.saleCode} ${r.customerName ?? ''} ${r.customerPhone ?? ''}`.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [hRows, hStab, hSearch]);

  const hCounts = useMemo(() => {
    const c: Record<string, number> = { all: hRows.length };
    SALE_TABS.forEach((s) => { c[s.v] = hRows.filter((r) => saleStatusKey(r) === s.v).length; });
    return c;
  }, [hRows]);

  const hTotalPages = Math.max(1, Math.ceil(hFiltered.length / PS));
  const hPaged      = hFiltered.slice(hPage * PS, (hPage + 1) * PS);

  const hKpis: KpiItem[] = useMemo(() => {
    const done = hRows.filter((r) => r.status === 1);
    const rev  = done.reduce((s, r) => s + (r.finalAmount || 0), 0);
    return [
      { lbl: 'Hóa đơn 7d', val: hRows.length },
      { lbl: 'Đã bán',     val: done.length,                             tone: 'ok'   },
      { lbl: 'Doanh thu',  val: Math.round(rev / 1_000_000), unit: 'M₫', tone: 'info' },
      { lbl: 'Đã hủy',     val: hRows.filter((r) => r.status === 2).length, tone: 'crit' },
    ];
  }, [hRows]);

  const hCols: ColumnDef<RetailSaleDto>[] = [
    { key: 'saleCode',    label: 'Mã đơn',    mono: true, code: true, render: (r) => r.saleCode },
    { key: 'customer',    label: 'Khách hàng',             render: (r) => r.customerName || 'Khách lẻ' },
    { key: 'phone',       label: 'SĐT',       mono: true,  render: (r) => r.customerPhone || '—' },
    { key: 'payMethod',   label: 'Thanh toán',             render: (r) => PAYMENT_LABEL[r.paymentMethod] || '—' },
    { key: 'finalAmount', label: 'Tổng',      mono: true,  render: (r) => `${fmt(r.finalAmount)}đ` },
    { key: 'discount',    label: 'Giảm',      mono: true,  render: (r) => r.discountAmount > 0 ? <span style={{ color: 'var(--s-ok)' }}>-{fmt(r.discountAmount)}đ</span> : '—' },
    { key: 'status',      label: 'TT',                     render: (r) => {
        const m = STATUS_TONE[r.status] ?? { label: '—', tone: 'info' as const };
        return <StatusBadge tone={m.tone}>{m.label}</StatusBadge>;
    }},
    { key: 'saleDate',    label: 'Ngày bán',  mono: true,  render: (r) => fmtDT(r.saleDate) },
  ];

  // ── Tab 2: Retail POS ────────────────────────────────────────────────────
  const [retDash,      setRetDash]      = useState<PharmacyEnhancedDashboardDto>({
    todayRevenue: 0, todaySaleCount: 0, lowStockCount: 0,
    totalCustomers: 0, vipCustomers: 0, openShiftCount: 0, todayGppRecords: 0, pendingCommission: 0,
  });
  const [retSales,     setRetSales]     = useState<RetailSaleDto[]>([]);
  const [posOpen,      setPosOpen]      = useState(false);
  const [cart,         setCart]         = useState<CartItem[]>([]);
  const [posCustName,  setPosCustName]  = useState('');
  const [posCustPhone, setPosCustPhone] = useState('');
  const [posPayMethod, setPosPayMethod] = useState<number>(0);
  const [posDiscount,  setPosDiscount]  = useState<number>(0);
  const [medSearch,    setMedSearch]    = useState('');
  const [medResults,   setMedResults]   = useState<MedicineSearchResultDto[]>([]);
  const [posLoading,   setPosLoading]   = useState(false);
  const medRef = useRef<ReturnType<typeof setTimeout>>();

  const loadRetail = useCallback(async () => {
    const [dash, sales] = await Promise.allSettled([
      getEnhancedDashboard(),
      getRetailSales({ fromDate: dayjs().format('YYYY-MM-DD'), toDate: dayjs().format('YYYY-MM-DD') }),
    ]);
    if (dash.status  === 'fulfilled') setRetDash(dash.value);
    if (sales.status === 'fulfilled') setRetSales(sales.value.items);
  }, []);
  useEffect(() => { if (tab === 'retail') void loadRetail(); }, [tab, loadRetail]);

  const retKpis: KpiItem[] = [
    { lbl: 'Doanh thu hôm nay', val: Math.round(retDash.todayRevenue / 1_000_000), unit: 'M₫', tone: 'info' },
    { lbl: 'HĐ hôm nay',        val: retDash.todaySaleCount },
    { lbl: 'Sắp hết hàng',      val: retDash.lowStockCount, tone: retDash.lowStockCount > 0 ? 'warn' : undefined },
  ];
  const cartTotal = cart.reduce((s, i) => s + i.quantity * i.unitPrice, 0) - posDiscount;

  const handleMedSearch = (v: string) => {
    setMedSearch(v);
    clearTimeout(medRef.current);
    if (v.trim().length < 2) { setMedResults([]); return; }
    medRef.current = setTimeout(async () => {
      try { const r = await searchMedicines(v); setMedResults(Array.isArray(r) ? r : []); }
      catch { setMedResults([]); }
    }, 400);
  };
  const addToCart = (med: MedicineSearchResultDto) => {
    setCart((prev) => {
      const ex = prev.find((i) => i.medicineId === med.id);
      if (ex) return prev.map((i) => i.medicineId === med.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { medicineId: med.id, medicineName: med.medicineName, unit: med.unit,
        quantity: 1, unitPrice: med.unitPrice, batchNumber: med.batchNumber }];
    });
    setMedSearch(''); setMedResults([]);
  };
  const handleCreateSale = async () => {
    if (cart.length === 0) { te('Giỏ hàng trống'); return; }
    setPosLoading(true);
    try {
      await createRetailSale({
        customerName:   posCustName  || undefined,
        customerPhone:  posCustPhone || undefined,
        paymentMethod:  posPayMethod,
        discountAmount: posDiscount  || 0,
        items: cart.map((i) => ({ medicineId: i.medicineId, quantity: i.quantity, unitPrice: i.unitPrice })),
      });
      tk('Đã tạo hóa đơn');
      setPosOpen(false);
      setCart([]); setPosCustName(''); setPosCustPhone(''); setPosDiscount(0);
      setMedSearch(''); setMedResults([]);
      void loadRetail();
    } catch { te('Lỗi tạo hóa đơn'); }
    finally   { setPosLoading(false); }
  };

  const retTdCols: ColumnDef<RetailSaleDto>[] = [
    { key: 'saleCode',    label: 'Mã đơn',    mono: true, code: true, render: (r) => r.saleCode },
    { key: 'customer',    label: 'Khách',                              render: (r) => r.customerName || 'Khách lẻ' },
    { key: 'finalAmount', label: 'Tổng',       mono: true,             render: (r) => `${fmt(r.finalAmount)}đ` },
    { key: 'status',      label: 'TT',                                  render: (r) => {
        const m = STATUS_TONE[r.status] ?? { label: '—', tone: 'info' as const };
        return <StatusBadge tone={m.tone}>{m.label}</StatusBadge>;
    }},
    { key: 'saleDate',    label: 'Giờ',        mono: true,             render: (r) => dayjs(r.saleDate).format('HH:mm') },
  ];

  // ── Tab 3: Stock ──────────────────────────────────────────────────────────
  const [stItems,   setStItems]   = useState<MedicineSearchResultDto[]>([]);
  const [stTotal,   setStTotal]   = useState(0);
  const [stPage,    setStPage]    = useState(0);
  const [stKeyword, setStKeyword] = useState('');
  const [stDetail,  setStDetail]  = useState<MedicineSearchResultDto | null>(null);
  const [stLoading, setStLoading] = useState(false);
  const stRef = useRef<ReturnType<typeof setTimeout>>();

  const loadStock = useCallback(async () => {
    setStLoading(true);
    try {
      const r = await getPharmacyStock({ keyword: stKeyword, page: stPage, pageSize: PS });
      setStItems(r.items); setStTotal(r.totalCount);
    } catch { setStItems([]); setStTotal(0); }
    finally  { setStLoading(false); }
  }, [stKeyword, stPage]);
  useEffect(() => {
    if (tab !== 'stock') return;
    clearTimeout(stRef.current);
    stRef.current = setTimeout(() => void loadStock(), 300);
    return () => clearTimeout(stRef.current);
  }, [tab, loadStock]);

  const stTotalPages = Math.max(1, Math.ceil(stTotal / PS));

  const stCols: ColumnDef<MedicineSearchResultDto>[] = [
    { key: 'medicineName', label: 'Tên thuốc',              render: (r) => r.medicineName },
    { key: 'medicineCode', label: 'Mã',  mono: true, code: true, render: (r) => r.medicineCode },
    { key: 'unit',         label: 'ĐVT',                    render: (r) => r.unit },
    { key: 'unitPrice',    label: 'Đơn giá', mono: true,    render: (r) => `${fmt(r.unitPrice)}đ` },
    { key: 'stockQty',     label: 'Tồn kho', mono: true,    render: (r) => {
        const tone = r.stockQuantity === 0 ? 'crit' : r.stockQuantity <= 10 ? 'warn' : 'ok';
        return <StatusBadge tone={tone}>{r.stockQuantity}</StatusBadge>;
    }},
    { key: 'batchNumber',  label: 'Số lô', mono: true,      render: (r) => r.batchNumber || '—' },
    { key: 'expiryDate',   label: 'Hạn dùng', mono: true,   render: (r) => fmtD(r.expiryDate) },
  ];

  // ── Tab 4: Report ─────────────────────────────────────────────────────────
  const [revData,    setRevData]    = useState<PharmacyRevenueDto[]>([]);
  const [revFrom,    setRevFrom]    = useState(dayjs().subtract(7, 'day').format('YYYY-MM-DD'));
  const [revTo,      setRevTo]      = useState(dayjs().format('YYYY-MM-DD'));
  const [revLoading, setRevLoading] = useState(false);
  const [revPage,    setRevPage]    = useState(0);

  const loadRevenue = useCallback(async () => {
    setRevLoading(true);
    try { const r = await getPharmacyRevenue(revFrom, revTo); setRevData(Array.isArray(r) ? r : []); }
    catch { setRevData([]); }
    finally { setRevLoading(false); }
  }, [revFrom, revTo]);
  useEffect(() => { if (tab === 'report') void loadRevenue(); }, [tab, loadRevenue]);

  const revTotalPages = Math.max(1, Math.ceil(revData.length / PS));
  const revPaged      = revData.slice(revPage * PS, (revPage + 1) * PS);
  const revKpis: KpiItem[] = useMemo(() => {
    const tot = revData.reduce((acc, r) => ({
      sales: acc.sales + r.totalSales,
      amount: acc.amount + r.totalAmount,
      discount: acc.discount + r.totalDiscount,
      net: acc.net + r.netRevenue,
    }), { sales: 0, amount: 0, discount: 0, net: 0 });
    return [
      { lbl: 'Hóa đơn',   val: tot.sales },
      { lbl: 'Tổng tiền', val: Math.round(tot.amount   / 1_000_000), unit: 'M₫' },
      { lbl: 'Giảm giá',  val: Math.round(tot.discount / 1_000_000), unit: 'M₫', tone: 'warn' as const },
      { lbl: 'Doanh thu', val: Math.round(tot.net      / 1_000_000), unit: 'M₫', tone: 'info' as const },
    ];
  }, [revData]);

  const rpCols: ColumnDef<PharmacyRevenueDto>[] = [
    { key: 'date',          label: 'Ngày',      mono: true, render: (r) => fmtD(r.date) },
    { key: 'totalSales',    label: 'Số HĐ',     mono: true, render: (r) => String(r.totalSales) },
    { key: 'totalAmount',   label: 'Tổng tiền', mono: true, render: (r) => `${fmt(r.totalAmount)}đ` },
    { key: 'totalDiscount', label: 'Giảm giá',  mono: true, render: (r) => `${fmt(r.totalDiscount)}đ` },
    { key: 'netRevenue',    label: 'Doanh thu',  mono: true, render: (r) => `${fmt(r.netRevenue)}đ` },
  ];

  // ── Tab 5: Customers ──────────────────────────────────────────────────────
  const [customers,     setCustomers]     = useState<PharmacyCustomerDto[]>([]);
  const [custKeyword,   setCustKeyword]   = useState('');
  const [custTypeF,     setCustTypeF]     = useState('');
  const [custPage,      setCustPage]      = useState(0);
  const [custDetail,    setCustDetail]    = useState<PharmacyCustomerDto | null>(null);
  const [custModalOpen, setCustModalOpen] = useState(false);
  const [custLoading,   setCustLoading]   = useState(false);
  const [custForm,      setCustForm]      = useState<SavePharmacyCustomerDto>({ fullName: '', customerType: 0 });
  const custRef = useRef<ReturnType<typeof setTimeout>>();

  const loadCustomers = useCallback(async () => {
    setCustLoading(true);
    try {
      const r = await getCustomers({
        keyword:      custKeyword || undefined,
        customerType: custTypeF === '' ? undefined : parseInt(custTypeF, 10),
        pageIndex:    custPage,
        pageSize:     PS,
      });
      setCustomers(Array.isArray(r) ? r : []);
    } catch { setCustomers([]); }
    finally  { setCustLoading(false); }
  }, [custKeyword, custTypeF, custPage]);
  useEffect(() => {
    if (tab !== 'customers') return;
    clearTimeout(custRef.current);
    custRef.current = setTimeout(() => void loadCustomers(), 300);
    return () => clearTimeout(custRef.current);
  }, [tab, loadCustomers]);

  const custTotalPages = Math.max(1, Math.ceil(customers.length / PS));
  const custPaged      = customers.slice(custPage * PS, (custPage + 1) * PS);
  const custKpis: KpiItem[] = useMemo(() => [
    { lbl: 'Khách hàng', val: customers.length },
    { lbl: 'VIP',        val: customers.filter((c) => c.customerType === 1).length, tone: 'ok'   as const },
    { lbl: 'Đại lý',     val: customers.filter((c) => c.customerType === 2).length, tone: 'info' as const },
  ], [customers]);

  const cuCols: ColumnDef<PharmacyCustomerDto>[] = [
    { key: 'customerCode',        label: 'Mã KH',      mono: true, code: true, render: (r) => r.customerCode },
    { key: 'fullName',            label: 'Họ tên',                              render: (r) => r.fullName },
    { key: 'phone',               label: 'SĐT',        mono: true,             render: (r) => r.phone || '—' },
    { key: 'custType',            label: 'Loại',                               render: (r) => (
        <StatusBadge tone={r.customerType === 1 ? 'ok' : r.customerType === 2 ? 'info' : undefined}>
          {CTYPE[r.customerType] || '—'}
        </StatusBadge>
    )},
    { key: 'totalPurchaseCount',  label: 'Số lần mua', mono: true,             render: (r) => String(r.totalPurchaseCount) },
    { key: 'totalPurchaseAmount', label: 'Tổng chi',   mono: true,             render: (r) => `${fmt(r.totalPurchaseAmount)}đ` },
    { key: 'totalPoints',         label: 'Điểm',       mono: true,             render: (r) => String(r.totalPoints) },
    { key: 'lastPurchaseDate',    label: 'Mua cuối',   mono: true,             render: (r) => fmtD(r.lastPurchaseDate) },
  ];

  const handleSaveCustomer = async () => {
    if (!custForm.fullName.trim()) { te('Vui lòng nhập tên khách hàng'); return; }
    try {
      await saveCustomer(custForm);
      tk('Đã lưu khách hàng');
      setCustModalOpen(false);
      setCustForm({ fullName: '', customerType: 0 });
      void loadCustomers();
    } catch { te('Lỗi lưu khách hàng'); }
  };

  // ── Tab 6: Shifts ─────────────────────────────────────────────────────────
  const [currentShift, setCurrentShift] = useState<PharmacyShiftDto | null>(null);
  const [shifts,        setShifts]       = useState<PharmacyShiftDto[]>([]);
  const [shiftModal,    setShiftModal]   = useState<'open' | 'close' | null>(null);
  const [shiftCash,     setShiftCash]    = useState<number>(0);
  const [shiftNotes,    setShiftNotes]   = useState('');
  const [shiftLoading,  setShiftLoading] = useState(false);

  const loadShifts = useCallback(async () => {
    setShiftLoading(true);
    try {
      const [cur, hist] = await Promise.allSettled([
        getCurrentShift(),
        getShifts({ fromDate: dayjs().subtract(30, 'day').format('YYYY-MM-DD'), toDate: dayjs().format('YYYY-MM-DD') }),
      ]);
      setCurrentShift(cur.status  === 'fulfilled' ? cur.value  : null);
      setShifts(       hist.status === 'fulfilled' ? (Array.isArray(hist.value) ? hist.value : []) : []);
    } catch { /* silent */ }
    finally  { setShiftLoading(false); }
  }, []);
  useEffect(() => { if (tab === 'shifts') void loadShifts(); }, [tab, loadShifts]);

  const shCols: ColumnDef<PharmacyShiftDto>[] = [
    { key: 'shiftCode',   label: 'Mã ca',       mono: true, code: true, render: (r) => r.shiftCode },
    { key: 'cashierName', label: 'Thu ngân',                             render: (r) => r.cashierName || '—' },
    { key: 'startTime',   label: 'Mở ca',        mono: true,             render: (r) => fmtDT(r.startTime) },
    { key: 'endTime',     label: 'Đóng ca',      mono: true,             render: (r) => fmtDT(r.endTime) },
    { key: 'openingCash', label: 'Tiền đầu ca',  mono: true,             render: (r) => `${fmt(r.openingCash)}đ` },
    { key: 'closingCash', label: 'Tiền cuối ca', mono: true,             render: (r) => r.closingCash ? `${fmt(r.closingCash)}đ` : '—' },
    { key: 'totalSales',  label: 'Doanh số',     mono: true,             render: (r) => `${fmt(r.totalSales)}đ` },
    { key: 'status',      label: 'TT',                                    render: (r) => {
        const m = SHIFT_ST[r.status] ?? { label: '—', tone: 'info' as const };
        return <StatusBadge tone={m.tone}>{m.label}</StatusBadge>;
    }},
  ];

  const shiftTotalPages = Math.max(1, Math.ceil(shifts.length / PS));
  const shiftPaged      = shifts.slice(0, PS);

  const handleOpenShift = async () => {
    try {
      await openShift({ openingCash: shiftCash, notes: shiftNotes || undefined });
      tk('Đã mở ca'); setShiftModal(null); setShiftCash(0); setShiftNotes('');
      void loadShifts();
    } catch { te('Lỗi mở ca'); }
  };
  const handleCloseShift = async () => {
    if (!currentShift) return;
    try {
      await closeShift({ shiftId: currentShift.id, closingCash: shiftCash, notes: shiftNotes || undefined });
      tk('Đã đóng ca'); setShiftModal(null); setShiftCash(0); setShiftNotes('');
      void loadShifts();
    } catch { te('Lỗi đóng ca'); }
  };

  // ── Tab 7: GPP ────────────────────────────────────────────────────────────
  const [gppRecords,  setGppRecords]  = useState<PharmacyGppRecordDto[]>([]);
  const [gppKeyword,  setGppKeyword]  = useState('');
  const [gppTypeF,    setGppTypeF]    = useState('');
  const [gppFrom]                     = useState(dayjs().subtract(30, 'day').format('YYYY-MM-DD'));
  const [gppTo]                       = useState(dayjs().format('YYYY-MM-DD'));
  const [gppPage,     setGppPage]     = useState(0);
  const [gppModal,    setGppModal]    = useState(false);
  const [gppLoading,  setGppLoading]  = useState(false);
  const [gppForm,     setGppForm]     = useState<SavePharmacyGppRecordDto>({
    recordType: 1, recordDate: dayjs().format('YYYY-MM-DD'),
  });
  const gppRef = useRef<ReturnType<typeof setTimeout>>();

  const loadGpp = useCallback(async () => {
    setGppLoading(true);
    try {
      const r = await getGppRecords({
        keyword:    gppKeyword || undefined,
        recordType: gppTypeF === '' ? undefined : parseInt(gppTypeF, 10),
        fromDate:   gppFrom,
        toDate:     gppTo,
      });
      setGppRecords(Array.isArray(r) ? r : []);
    } catch { setGppRecords([]); }
    finally  { setGppLoading(false); }
  }, [gppKeyword, gppTypeF, gppFrom, gppTo]);
  useEffect(() => {
    if (tab !== 'gpp') return;
    clearTimeout(gppRef.current);
    gppRef.current = setTimeout(() => void loadGpp(), 300);
    return () => clearTimeout(gppRef.current);
  }, [tab, loadGpp]);

  const gppTotalPages = Math.max(1, Math.ceil(gppRecords.length / PS));
  const gppPaged      = gppRecords.slice(gppPage * PS, (gppPage + 1) * PS);

  const gpCols: ColumnDef<PharmacyGppRecordDto>[] = [
    { key: 'recordDate',   label: 'Ngày',       mono: true, render: (r) => fmtD(r.recordDate) },
    { key: 'recordType',   label: 'Loại',                   render: (r) => GPP_TYPES[r.recordType] || '—' },
    { key: 'description',  label: 'Mô tả',                  render: (r) => r.description || '—' },
    { key: 'medicineName', label: 'Thuốc',                   render: (r) => r.medicineName || '—' },
    { key: 'batchNumber',  label: 'Số lô',     mono: true,  render: (r) => r.batchNumber || '—' },
    { key: 'temperature',  label: 'Nhiệt độ',  mono: true,  render: (r) => r.temperature != null ? `${r.temperature}°C` : '—' },
    { key: 'humidity',     label: 'Độ ẩm',     mono: true,  render: (r) => r.humidity != null ? `${r.humidity}%` : '—' },
    { key: 'recordedBy',   label: 'Người ghi',              render: (r) => r.recordedByName || '—' },
  ];

  const handleSaveGpp = async () => {
    try {
      await saveGppRecord(gppForm);
      tk('Đã lưu hồ sơ GPP');
      setGppModal(false);
      setGppForm({ recordType: 1, recordDate: dayjs().format('YYYY-MM-DD') });
      void loadGpp();
    } catch { te('Lỗi lưu hồ sơ GPP'); }
  };

  // ── Tab 8: Commission ──────────────────────────────────────────────────────
  const [commissions,  setCommissions]  = useState<PharmacyCommissionDto[]>([]);
  const [commStatusF,  setCommStatusF]  = useState('');
  const [commFrom]                      = useState(dayjs().subtract(30, 'day').format('YYYY-MM-DD'));
  const [commTo]                        = useState(dayjs().format('YYYY-MM-DD'));
  const [commSelected, setCommSelected] = useState<Set<string>>(new Set<string>());
  const [commLoading,  setCommLoading]  = useState(false);
  const [commPage,     setCommPage]     = useState(0);

  const loadCommissions = useCallback(async () => {
    setCommLoading(true);
    try {
      const r = await getCommissions({
        fromDate: commFrom,
        toDate:   commTo,
        status:   commStatusF === '' ? undefined : parseInt(commStatusF, 10),
      });
      setCommissions(Array.isArray(r) ? r : []);
      setCommSelected(new Set<string>());
    } catch { setCommissions([]); }
    finally  { setCommLoading(false); }
  }, [commFrom, commTo, commStatusF]);
  useEffect(() => { if (tab === 'commission') void loadCommissions(); }, [tab, loadCommissions]);

  const commTotalPages = Math.max(1, Math.ceil(commissions.length / PS));
  const commPaged      = commissions.slice(commPage * PS, (commPage + 1) * PS);
  const commKpis: KpiItem[] = useMemo(() => {
    const pending    = commissions.filter((c) => c.status === 0);
    const pendingAmt = pending.reduce((s, c) => s + c.commissionAmount, 0);
    return [
      { lbl: 'Tổng HH',  val: commissions.length },
      { lbl: 'Chờ TT',   val: pending.length,                                tone: 'warn' as const },
      { lbl: 'Cần TT',   val: Math.round(pendingAmt / 1_000_000), unit: 'M₫', tone: 'warn' as const },
      { lbl: 'Đã trả',   val: commissions.filter((c) => c.status === 1).length, tone: 'ok' as const },
    ];
  }, [commissions]);

  const cmCols: ColumnDef<PharmacyCommissionDto>[] = [
    { key: 'doctorName',       label: 'Bác sĩ',      render: (r) => r.doctorName || '—' },
    { key: 'saleDate',         label: 'Ngày bán', mono: true, render: (r) => fmtD(r.saleDate) },
    { key: 'medicineName',     label: 'Thuốc',        render: (r) => r.medicineName || '—' },
    { key: 'quantity',         label: 'SL',       mono: true, render: (r) => String(r.quantity) },
    { key: 'saleAmount',       label: 'Tiền bán', mono: true, render: (r) => `${fmt(r.saleAmount)}đ` },
    { key: 'commissionRate',   label: 'Tỉ lệ',    mono: true, render: (r) => `${r.commissionRate}%` },
    { key: 'commissionAmount', label: 'Hoa hồng', mono: true, render: (r) => `${fmt(r.commissionAmount)}đ` },
    { key: 'status',           label: 'TT',               render: (r) => {
        const m = COMM_ST[r.status] ?? { label: '—', tone: 'warn' as const };
        return <StatusBadge tone={m.tone}>{m.label}</StatusBadge>;
    }},
    { key: 'paidDate',         label: 'Ngày trả', mono: true, render: (r) => fmtD(r.paidDate) },
  ];

  const handlePayCommissions = () => {
    if (commSelected.size === 0) { te('Chọn ít nhất một hoa hồng'); return; }
    cf(`Thanh toán ${commSelected.size} hoa hồng?`, async () => {
      try {
        await payCommissions([...commSelected]);
        tk(`Đã thanh toán ${commSelected.size} hoa hồng`);
        void loadCommissions();
      } catch { te('Lỗi thanh toán hoa hồng'); }
    }, { tone: 'info', confirm: 'Thanh toán' });
  };

  // ── Shared layout helpers ─────────────────────────────────────────────────
  const frow = { display: 'flex', flexDirection: 'column' as const, gap: 12, padding: '4px 0' };
  const flbl = { fontSize: 12.5, display: 'flex' as const, flexDirection: 'column' as const, gap: 4 };

  // Suppress unused warnings for loading state booleans used as empty-state strings
  void hLoading; void revLoading; void custLoading; void shiftLoading; void commLoading;

  // ═══════════════════════════════ RENDER ══════════════════════════════════

  return (
    <>
      <ExpiryAlertModal />

      <div className="ab">
        <TopTabs<PageTab> tab={tab} setTab={setTab} tabs={PAGE_TABS} />

        {/* ══════ Tab 1: Lịch sử bán ══════ */}
        {tab === 'history' && (
          <>
            <KpiStrip items={hKpis} />
            <div className="ab-tools">
              <SearchBox value={hSearch} onChange={(v) => { setHSearch(v); setHPage(0); }} placeholder="Tìm khách / mã đơn / SĐT…" />
              <Btn variant="ghost" icon="refresh" onClick={() => { setHSearch(''); setHStab('all'); setHPage(0); }}>Bỏ lọc</Btn>
              <span className="spacer" />
              <Btn variant="ghost" icon="refresh" onClick={loadHistory}>Làm mới</Btn>
            </div>
            <StatusTabs<SaleKey>
              value={hStab}
              onChange={(v) => { setHStab(v); setHPage(0); }}
              tabs={SALE_TABS}
              counts={hCounts}
            />
            <DataTable<RetailSaleDto>
              columns={hCols}
              data={hPaged}
              rowKey={(r) => r.id}
              onRowClick={setHDetail}
              actions={(r) => (
                <div className="ab-actions">
                  {r.status === 0 && (r.finalAmount ?? 0) > 0 && (
                    <ActBtn ic="qr" title="QR thanh toán" onClick={() => setQrSale(r)} />
                  )}
                  {r.status === 0 && (
                    <ActBtn ic="x" title="Hủy đơn" tone="crit"
                      onClick={() => cf(`Hủy hóa đơn ${r.saleCode}?`,
                        () => { void cancelRetailSale(r.id).then(loadHistory); },
                        { tone: 'crit', confirm: 'Hủy đơn' })}
                    />
                  )}
                </div>
              )}
              empty="Chưa có hóa đơn nào"
            />
            <Pager page={hPage} setPage={setHPage} totalPages={hTotalPages} total={hFiltered.length} perPage={PS} />
            <DrawerShell
              open={!!hDetail} onClose={() => setHDetail(null)}
              title={hDetail?.saleCode ?? ''}
              sub={hDetail ? `${PAYMENT_LABEL[hDetail.paymentMethod] ?? ''} · ${dayjs(hDetail.saleDate).format('DD/MM/YYYY HH:mm')}` : ''}
              size="lg"
            >
              {hDetail && (
                <>
                  <DrSec title="Khách hàng">
                    <DrField lbl="Mã đơn">{hDetail.saleCode}</DrField>
                    <DrField lbl="Khách">{hDetail.customerName || 'Khách lẻ'}</DrField>
                    {hDetail.customerPhone && <DrField lbl="SĐT">{hDetail.customerPhone}</DrField>}
                  </DrSec>
                  <DrSec title="Thanh toán">
                    <DrField lbl="Tổng">{fmt(hDetail.totalAmount)}đ</DrField>
                    {hDetail.discountAmount > 0 && (
                      <DrField lbl="Giảm"><span style={{ color: 'var(--s-ok)' }}>-{fmt(hDetail.discountAmount)}đ</span></DrField>
                    )}
                    <DrField lbl="Cuối cùng">{fmt(hDetail.finalAmount)}đ</DrField>
                    <DrField lbl="Phương thức">{PAYMENT_LABEL[hDetail.paymentMethod] || '—'}</DrField>
                  </DrSec>
                  <DrSec title="Chi tiết">
                    <DrField lbl="Số mặt hàng">{(hDetail.items || []).length}</DrField>
                    <DrField lbl="Người bán">{hDetail.createdByName || '—'}</DrField>
                    <DrField lbl="Ngày">{dayjs(hDetail.saleDate).format('DD/MM/YYYY HH:mm')}</DrField>
                  </DrSec>
                  {hDetail.status === 0 && (hDetail.finalAmount ?? 0) > 0 && (
                    <DrSec title="Thanh toán QR">
                      <div style={{ padding: '4px 0' }}>
                        <Btn variant="primary" onClick={() => setQrSale(hDetail)}>
                          Sinh mã QR VietQR — {fmt(hDetail.finalAmount)}đ
                        </Btn>
                      </div>
                    </DrSec>
                  )}
                </>
              )}
            </DrawerShell>
          </>
        )}

        {/* ══════ Tab 2: Bán lẻ POS ══════ */}
        {tab === 'retail' && (
          <>
            <KpiStrip items={retKpis} />
            <div className="ab-tools">
              <span className="spacer" />
              <Btn variant="ghost" icon="refresh" onClick={loadRetail}>Làm mới</Btn>
              <Btn variant="primary" icon="plus" onClick={() => {
                setCart([]); setPosCustName(''); setPosCustPhone('');
                setPosPayMethod(0); setPosDiscount(0); setMedSearch(''); setMedResults([]);
                setPosOpen(true);
              }}>
                Tạo hóa đơn mới
              </Btn>
            </div>
            <DataTable<RetailSaleDto>
              columns={retTdCols}
              data={retSales}
              rowKey={(r) => r.id}
              empty="Chưa có hóa đơn hôm nay"
            />
            <ModalShell open={posOpen} onClose={() => setPosOpen(false)} title="Tạo hóa đơn bán lẻ" size="xl"
              footer={<>
                <Btn variant="ghost" onClick={() => setPosOpen(false)}>Hủy</Btn>
                <Btn variant="primary" loading={posLoading} onClick={handleCreateSale}>Tạo hóa đơn</Btn>
              </>}
            >
              <div style={frow}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <label style={flbl}>Tên khách hàng
                    <Input value={posCustName}  onChange={(e) => setPosCustName(e.target.value)}  placeholder="Không bắt buộc" />
                  </label>
                  <label style={flbl}>Số điện thoại
                    <Input value={posCustPhone} onChange={(e) => setPosCustPhone(e.target.value)} placeholder="Không bắt buộc" />
                  </label>
                  <label style={flbl}>Phương thức thanh toán
                    <Select<number> value={posPayMethod} onChange={setPosPayMethod} options={PMT_OPTS} />
                  </label>
                  <label style={flbl}>Giảm giá (đ)
                    <InputNumber value={posDiscount} onChange={(v) => setPosDiscount(v ?? 0)} min={0} style={{ width: '100%' }} />
                  </label>
                </div>
                <label style={flbl}>Tìm thuốc
                  <Input value={medSearch} onChange={(e) => handleMedSearch(e.target.value)} placeholder="Nhập ít nhất 2 ký tự…" />
                </label>
                {medResults.length > 0 && (
                  <div style={{ border: '1px solid var(--line)', borderRadius: 6, maxHeight: 160, overflow: 'auto' }}>
                    {medResults.map((m) => (
                      <div key={m.id} onClick={() => addToCart(m)}
                        style={{ padding: '6px 12px', cursor: 'pointer', fontSize: 12.5, borderBottom: '1px solid var(--line-soft)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--d-3)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                      >
                        <strong>{m.medicineName}</strong>
                        <span style={{ color: 'var(--t-2)', marginLeft: 8 }}>{m.unit} · {fmt(m.unitPrice)}đ · Tồn: {m.stockQuantity}</span>
                      </div>
                    ))}
                  </div>
                )}
                {cart.length > 0 && (
                  <>
                    <table style={{ width: '100%', fontSize: 12.5, borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--line)' }}>
                          <th style={{ textAlign: 'left', padding: '4px 6px' }}>Thuốc</th>
                          <th style={{ padding: '4px 6px', width: 90 }}>SL</th>
                          <th style={{ padding: '4px 6px', width: 110 }}>Đơn giá</th>
                          <th style={{ padding: '4px 6px', width: 110 }}>Thành tiền</th>
                          <th style={{ width: 36 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {cart.map((item) => (
                          <tr key={item.medicineId} style={{ borderBottom: '1px solid var(--line-soft)' }}>
                            <td style={{ padding: '4px 6px' }}>
                              {item.medicineName} <small style={{ color: 'var(--t-2)' }}>({item.unit})</small>
                            </td>
                            <td style={{ padding: '4px 6px' }}>
                              <InputNumber min={1} size="small" value={item.quantity} style={{ width: 80 }}
                                onChange={(v) => setCart((prev) => prev.map((c) => c.medicineId === item.medicineId ? { ...c, quantity: v ?? 1 } : c))} />
                            </td>
                            <td style={{ padding: '4px 6px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{fmt(item.unitPrice)}đ</td>
                            <td style={{ padding: '4px 6px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{fmt(item.quantity * item.unitPrice)}đ</td>
                            <td>
                              <ActBtn ic="x" title="Xóa" tone="crit"
                                onClick={() => setCart((prev) => prev.filter((c) => c.medicineId !== item.medicineId))} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600 }}>
                      Tổng: <span style={{ color: 'var(--s-info)' }}>{fmt(Math.max(0, cartTotal))}đ</span>
                    </div>
                  </>
                )}
              </div>
            </ModalShell>
          </>
        )}

        {/* ══════ Tab 3: Tồn kho ══════ */}
        {tab === 'stock' && (
          <>
            <div className="ab-tools">
              <SearchBox value={stKeyword} onChange={(v) => { setStKeyword(v); setStPage(0); }} placeholder="Tìm thuốc / mã…" />
              <span className="spacer" />
              <Btn variant="ghost" icon="refresh" onClick={loadStock}>Làm mới</Btn>
            </div>
            <DataTable<MedicineSearchResultDto>
              columns={stCols}
              data={stItems}
              rowKey={(r) => r.id}
              onRowClick={setStDetail}
              empty={stLoading ? 'Đang tải…' : 'Không có dữ liệu tồn kho'}
            />
            <Pager page={stPage} setPage={setStPage} totalPages={stTotalPages} total={stTotal} perPage={PS} />
            <DrawerShell
              open={!!stDetail} onClose={() => setStDetail(null)}
              title={stDetail?.medicineName ?? ''}
              sub={stDetail?.medicineCode}
              size="md"
            >
              {stDetail && (
                <>
                  <DrSec title="Thông tin thuốc">
                    <DrField lbl="Mã">{stDetail.medicineCode}</DrField>
                    <DrField lbl="Tên">{stDetail.medicineName}</DrField>
                    {stDetail.activeIngredient && <DrField lbl="Hoạt chất">{stDetail.activeIngredient}</DrField>}
                    <DrField lbl="ĐVT">{stDetail.unit}</DrField>
                    <DrField lbl="Đơn giá">{fmt(stDetail.unitPrice)}đ</DrField>
                  </DrSec>
                  <DrSec title="Tồn kho">
                    <DrField lbl="Số lượng">
                      <StatusBadge tone={stDetail.stockQuantity === 0 ? 'crit' : stDetail.stockQuantity <= 10 ? 'warn' : 'ok'}>
                        {stDetail.stockQuantity}
                      </StatusBadge>
                    </DrField>
                    {stDetail.batchNumber && <DrField lbl="Số lô">{stDetail.batchNumber}</DrField>}
                    <DrField lbl="Hạn dùng">{fmtD(stDetail.expiryDate)}</DrField>
                  </DrSec>
                </>
              )}
            </DrawerShell>
          </>
        )}

        {/* ══════ Tab 4: Báo cáo DT ══════ */}
        {tab === 'report' && (
          <>
            <KpiStrip items={revKpis} />
            <div className="ab-tools">
              <DatePicker.RangePicker
                value={[dayjs(revFrom), dayjs(revTo)]}
                format="DD/MM/YYYY"
                onChange={(dates) => {
                  if (dates && dates[0] && dates[1]) {
                    setRevFrom(dates[0].format('YYYY-MM-DD'));
                    setRevTo(dates[1].format('YYYY-MM-DD'));
                    setRevPage(0);
                  }
                }}
              />
              <span className="spacer" />
              <Btn variant="ghost" icon="refresh" onClick={loadRevenue}>Làm mới</Btn>
            </div>
            <DataTable<PharmacyRevenueDto>
              columns={rpCols}
              data={revPaged}
              rowKey={(r) => r.date}
              empty={revLoading ? 'Đang tải…' : 'Không có dữ liệu doanh thu'}
            />
            <Pager page={revPage} setPage={setRevPage} totalPages={revTotalPages} total={revData.length} perPage={PS} />
          </>
        )}

        {/* ══════ Tab 5: Khách hàng ══════ */}
        {tab === 'customers' && (
          <>
            <KpiStrip items={custKpis} />
            <div className="ab-tools">
              <SearchBox value={custKeyword} onChange={(v) => { setCustKeyword(v); setCustPage(0); }} placeholder="Tìm tên / SĐT / mã KH…" />
              <Select<string>
                value={custTypeF}
                onChange={(v) => { setCustTypeF(v); setCustPage(0); }}
                style={{ width: 130 }}
                options={[
                  { value: '', label: 'Tất cả' },
                  { value: '0', label: 'Thường' },
                  { value: '1', label: 'VIP' },
                  { value: '2', label: 'Đại lý' },
                ]}
              />
              <span className="spacer" />
              <Btn variant="ghost" icon="refresh" onClick={loadCustomers}>Làm mới</Btn>
              <Btn variant="primary" icon="plus" onClick={() => { setCustForm({ fullName: '', customerType: 0 }); setCustModalOpen(true); }}>
                Thêm khách
              </Btn>
            </div>
            <DataTable<PharmacyCustomerDto>
              columns={cuCols}
              data={custPaged}
              rowKey={(r) => r.id}
              onRowClick={setCustDetail}
              empty={custLoading ? 'Đang tải…' : 'Không có khách hàng'}
            />
            <Pager page={custPage} setPage={setCustPage} totalPages={custTotalPages} total={customers.length} perPage={PS} />
            <DrawerShell
              open={!!custDetail} onClose={() => setCustDetail(null)}
              title={custDetail?.fullName ?? ''}
              sub={custDetail?.customerCode}
              size="md"
            >
              {custDetail && (
                <>
                  <DrSec title="Thông tin">
                    <DrField lbl="Mã KH">{custDetail.customerCode}</DrField>
                    <DrField lbl="Họ tên">{custDetail.fullName}</DrField>
                    {custDetail.phone   && <DrField lbl="SĐT">{custDetail.phone}</DrField>}
                    {custDetail.email   && <DrField lbl="Email">{custDetail.email}</DrField>}
                    {custDetail.address && <DrField lbl="Địa chỉ">{custDetail.address}</DrField>}
                    <DrField lbl="Loại KH">
                      <StatusBadge tone={custDetail.customerType === 1 ? 'ok' : custDetail.customerType === 2 ? 'info' : undefined}>
                        {CTYPE[custDetail.customerType] || '—'}
                      </StatusBadge>
                    </DrField>
                    {custDetail.cardNumber && <DrField lbl="Số thẻ">{custDetail.cardNumber}</DrField>}
                  </DrSec>
                  <DrSec title="Lịch sử mua hàng">
                    <DrField lbl="Số lần mua">{custDetail.totalPurchaseCount}</DrField>
                    <DrField lbl="Tổng chi tiêu">{fmt(custDetail.totalPurchaseAmount)}đ</DrField>
                    <DrField lbl="Điểm tích lũy">{custDetail.totalPoints}</DrField>
                    <DrField lbl="Mua gần nhất">{fmtD(custDetail.lastPurchaseDate)}</DrField>
                  </DrSec>
                  {custDetail.notes && (
                    <DrSec title="Ghi chú"><DrField lbl="Nội dung">{custDetail.notes}</DrField></DrSec>
                  )}
                </>
              )}
            </DrawerShell>
            <ModalShell open={custModalOpen} onClose={() => setCustModalOpen(false)} title="Thêm khách hàng" size="md"
              footer={<>
                <Btn variant="ghost" onClick={() => setCustModalOpen(false)}>Hủy</Btn>
                <Btn variant="primary" onClick={handleSaveCustomer}>Lưu</Btn>
              </>}
            >
              <Form layout="vertical" style={{ padding: '4px 0' }}>
                <Form.Item label="Họ tên *">
                  <Input value={custForm.fullName}
                    onChange={(e) => setCustForm((p) => ({ ...p, fullName: e.target.value }))}
                    placeholder="Tên đầy đủ" />
                </Form.Item>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Form.Item label="Số điện thoại">
                    <Input value={custForm.phone ?? ''}
                      onChange={(e) => setCustForm((p) => ({ ...p, phone: e.target.value || undefined }))} />
                  </Form.Item>
                  <Form.Item label="Email">
                    <Input value={custForm.email ?? ''}
                      onChange={(e) => setCustForm((p) => ({ ...p, email: e.target.value || undefined }))} />
                  </Form.Item>
                </div>
                <Form.Item label="Địa chỉ">
                  <Input value={custForm.address ?? ''}
                    onChange={(e) => setCustForm((p) => ({ ...p, address: e.target.value || undefined }))} />
                </Form.Item>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Form.Item label="Loại khách hàng">
                    <Select<number>
                      value={custForm.customerType}
                      onChange={(v) => setCustForm((p) => ({ ...p, customerType: v }))}
                      options={Object.entries(CTYPE).map(([k, lbl]) => ({ value: parseInt(k, 10), label: lbl }))}
                    />
                  </Form.Item>
                  <Form.Item label="Số thẻ thành viên">
                    <Input value={custForm.cardNumber ?? ''}
                      onChange={(e) => setCustForm((p) => ({ ...p, cardNumber: e.target.value || undefined }))} />
                  </Form.Item>
                </div>
                <Form.Item label="Ghi chú">
                  <Input value={custForm.notes ?? ''}
                    onChange={(e) => setCustForm((p) => ({ ...p, notes: e.target.value || undefined }))} />
                </Form.Item>
              </Form>
            </ModalShell>
          </>
        )}

        {/* ══════ Tab 6: Ca làm việc ══════ */}
        {tab === 'shifts' && (
          <>
            {currentShift && currentShift.status === 0 ? (
              <div style={{ margin: '12px 14px', padding: '12px 16px', background: 'var(--d-2)', border: '1px solid var(--line)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>{currentShift.shiftCode}</div>
                  <div style={{ color: 'var(--t-2)', fontSize: 12.5, marginTop: 2 }}>
                    {currentShift.cashierName} · Mở ca {fmtDT(currentShift.startTime)} · Doanh số: {fmt(currentShift.totalSales)}đ
                  </div>
                </div>
                <Btn variant="crit" onClick={() => { setShiftCash(0); setShiftNotes(''); setShiftModal('close'); }}>Đóng ca</Btn>
              </div>
            ) : (
              <div style={{ margin: '12px 14px', padding: '12px 16px', background: 'var(--d-2)', border: '1px solid var(--line)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ flex: 1, color: 'var(--t-2)', fontSize: 12.5 }}>Chưa có ca làm việc đang mở</span>
                <Btn variant="primary" onClick={() => { setShiftCash(0); setShiftNotes(''); setShiftModal('open'); }}>Mở ca mới</Btn>
              </div>
            )}
            <div className="ab-tools">
              <span className="spacer" />
              <Btn variant="ghost" icon="refresh" onClick={loadShifts}>Làm mới</Btn>
            </div>
            <DataTable<PharmacyShiftDto>
              columns={shCols}
              data={shiftPaged}
              rowKey={(r) => r.id}
              empty={shiftLoading ? 'Đang tải…' : 'Không có ca làm việc'}
            />
            <Pager page={0} setPage={() => undefined} totalPages={shiftTotalPages} total={shifts.length} perPage={PS} />

            <ModalShell open={shiftModal === 'open'} onClose={() => setShiftModal(null)} title="Mở ca làm việc" size="sm"
              footer={<>
                <Btn variant="ghost" onClick={() => setShiftModal(null)}>Hủy</Btn>
                <Btn variant="primary" onClick={handleOpenShift}>Mở ca</Btn>
              </>}
            >
              <div style={frow}>
                <label style={flbl}>Tiền đầu ca (đ)
                  <InputNumber value={shiftCash} onChange={(v) => setShiftCash(v ?? 0)} min={0} style={{ width: '100%' }} />
                </label>
                <label style={flbl}>Ghi chú
                  <Input value={shiftNotes} onChange={(e) => setShiftNotes(e.target.value)} placeholder="Không bắt buộc" />
                </label>
              </div>
            </ModalShell>

            <ModalShell open={shiftModal === 'close'} onClose={() => setShiftModal(null)} title="Đóng ca làm việc" size="sm"
              footer={<>
                <Btn variant="ghost" onClick={() => setShiftModal(null)}>Hủy</Btn>
                <Btn variant="crit" onClick={handleCloseShift}>Đóng ca</Btn>
              </>}
            >
              <div style={frow}>
                <label style={flbl}>Tiền cuối ca (đ)
                  <InputNumber value={shiftCash} onChange={(v) => setShiftCash(v ?? 0)} min={0} style={{ width: '100%' }} />
                </label>
                <label style={flbl}>Ghi chú
                  <Input value={shiftNotes} onChange={(e) => setShiftNotes(e.target.value)} placeholder="Không bắt buộc" />
                </label>
              </div>
            </ModalShell>
          </>
        )}

        {/* ══════ Tab 7: Hồ sơ GPP ══════ */}
        {tab === 'gpp' && (
          <>
            <div className="ab-tools">
              <SearchBox value={gppKeyword} onChange={(v) => { setGppKeyword(v); setGppPage(0); }} placeholder="Tìm mô tả / thuốc / lô…" />
              <Select<string>
                value={gppTypeF}
                onChange={(v) => { setGppTypeF(v); setGppPage(0); }}
                style={{ width: 170 }}
                options={[
                  { value: '', label: 'Tất cả loại' },
                  ...Object.entries(GPP_TYPES).map(([k, lbl]) => ({ value: k, label: lbl })),
                ]}
              />
              <span className="spacer" />
              <Btn variant="ghost" icon="refresh" onClick={loadGpp}>Làm mới</Btn>
              <Btn variant="primary" icon="plus" onClick={() => {
                setGppForm({ recordType: 1, recordDate: dayjs().format('YYYY-MM-DD') });
                setGppModal(true);
              }}>
                Thêm ghi chép
              </Btn>
            </div>
            <DataTable<PharmacyGppRecordDto>
              columns={gpCols}
              data={gppPaged}
              rowKey={(r) => r.id}
              empty={gppLoading ? 'Đang tải…' : 'Không có hồ sơ GPP'}
            />
            <Pager page={gppPage} setPage={setGppPage} totalPages={gppTotalPages} total={gppRecords.length} perPage={PS} />

            <ModalShell open={gppModal} onClose={() => setGppModal(false)} title="Thêm ghi chép GPP" size="md"
              footer={<>
                <Btn variant="ghost" onClick={() => setGppModal(false)}>Hủy</Btn>
                <Btn variant="primary" onClick={handleSaveGpp}>Lưu</Btn>
              </>}
            >
              <div style={frow}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <label style={flbl}>Loại ghi chép *
                    <Select<number>
                      value={gppForm.recordType}
                      onChange={(v) => setGppForm((p) => ({ ...p, recordType: v }))}
                      options={Object.entries(GPP_TYPES).map(([k, lbl]) => ({ value: parseInt(k, 10), label: lbl }))}
                    />
                  </label>
                  <label style={flbl}>Ngày ghi chép
                    <DatePicker
                      value={gppForm.recordDate ? dayjs(gppForm.recordDate) : null}
                      format="DD/MM/YYYY"
                      onChange={(d) => setGppForm((p) => ({ ...p, recordDate: d ? d.format('YYYY-MM-DD') : undefined }))}
                      style={{ width: '100%' }}
                    />
                  </label>
                </div>
                <label style={flbl}>Mô tả
                  <Input value={gppForm.description ?? ''}
                    onChange={(e) => setGppForm((p) => ({ ...p, description: e.target.value || undefined }))}
                    placeholder="Nội dung ghi chép…" />
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <label style={flbl}>Tên thuốc
                    <Input value={gppForm.medicineName ?? ''}
                      onChange={(e) => setGppForm((p) => ({ ...p, medicineName: e.target.value || undefined }))} />
                  </label>
                  <label style={flbl}>Số lô
                    <Input value={gppForm.batchNumber ?? ''}
                      onChange={(e) => setGppForm((p) => ({ ...p, batchNumber: e.target.value || undefined }))} />
                  </label>
                  <label style={flbl}>Nhiệt độ (°C)
                    <InputNumber value={gppForm.temperature}
                      onChange={(v) => setGppForm((p) => ({ ...p, temperature: v ?? undefined }))} style={{ width: '100%' }} />
                  </label>
                  <label style={flbl}>Độ ẩm (%)
                    <InputNumber value={gppForm.humidity}
                      onChange={(v) => setGppForm((p) => ({ ...p, humidity: v ?? undefined }))} style={{ width: '100%' }} />
                  </label>
                </div>
                <label style={flbl}>Biện pháp xử lý
                  <Input value={gppForm.actionTaken ?? ''}
                    onChange={(e) => setGppForm((p) => ({ ...p, actionTaken: e.target.value || undefined }))} />
                </label>
              </div>
            </ModalShell>
          </>
        )}

        {/* ══════ Tab 8: Hoa hồng ══════ */}
        {tab === 'commission' && (
          <>
            <KpiStrip items={commKpis} />
            <div className="ab-tools">
              <Select<string>
                value={commStatusF}
                onChange={(v) => { setCommStatusF(v); setCommPage(0); }}
                style={{ width: 140 }}
                options={[
                  { value: '',  label: 'Tất cả' },
                  { value: '0', label: 'Chờ TT' },
                  { value: '1', label: 'Đã trả'  },
                ]}
              />
              <span className="spacer" />
              <Btn variant="ghost" icon="refresh" onClick={loadCommissions}>Làm mới</Btn>
              <Btn variant="primary" icon="dollar"
                onClick={handlePayCommissions}
                disabled={commSelected.size === 0}
              >
                Thanh toán HH {commSelected.size > 0 ? `(${commSelected.size})` : ''}
              </Btn>
            </div>
            <DataTable<PharmacyCommissionDto>
              columns={cmCols}
              data={commPaged}
              rowKey={(r) => r.id}
              selected={commSelected}
              onToggle={(key) => setCommSelected((prev) => {
                const next = new Set(prev);
                if (next.has(key)) next.delete(key); else next.add(key);
                return next;
              })}
              onToggleAll={() => setCommSelected((prev) => {
                const allIds = commissions.map((c) => c.id);
                return prev.size === allIds.length ? new Set<string>() : new Set<string>(allIds);
              })}
              empty={commLoading ? 'Đang tải…' : 'Không có hoa hồng'}
            />
            <Pager page={commPage} setPage={setCommPage} totalPages={commTotalPages} total={commissions.length} perPage={PS} />
          </>
        )}
      </div>

      {/* QR Payment modal */}
      {qrSale && (
        <PaymentQRModal
          open={!!qrSale}
          onClose={() => setQrSale(null)}
          onSuccess={() => { tk('Đã thu qua QR'); setQrSale(null); }}
          patientId=""
          patientName={qrSale.customerName || 'Khách lẻ'}
          amount={qrSale.finalAmount ?? 0}
          referenceType="retail-sale"
          referenceId={qrSale.id}
          orderInfo={`TT quay thuoc ${qrSale.saleCode}`}
        />
      )}
    </>
  );
};

export default HospitalPharmacyV2;
