import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { App as AntdApp, InputNumber, Select, Input } from 'antd';
import * as pharmacyApi from '../api/pharmacy';
import { getWarehouses } from '../api/warehouse';
import type { WarehouseDto } from '../api/warehouse';
import { openPrintWindow } from '../../../utils/printWindow';
import type { PendingPrescription, InventoryItem, TransferRequest, AlertItem, MedicationItem } from '../api/pharmacy';
import {
  KpiStrip, TopTabs, StatusTabs, SearchBox, DataTable, Pager,
  DrawerShell, DrSec, DrField, ModalShell,
  StatusBadge, ActBtn, Btn, tk, ti, te,
  type ColumnDef, type TopTab, type KpiItem, type StatusTab,
} from '@/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';
import BarcodeScanner from '../../../components/form/BarcodeScanner';
import ExpiryAlertModal from './ExpiryAlertModal';
import { fmtVND } from '../../../utils/format';

/* ────────────── Types ────────────── */

type PageTab = 'rx' | 'inventory' | 'transfers' | 'alerts' | 'clinical' | 'recon';
type RxStatus = 'pending' | 'accepted' | 'dispensing' | 'completed' | 'rejected';
type ClSubTab = 'reviews' | 'adr';
interface ClinReview { id: string; patientName?: string; medicationName?: string; reviewDate?: string; recommendation?: string; }
interface AdrReport  { id: string; patientName?: string; medicationName?: string; reaction?: string; severity?: string; reportDate?: string; }
/** Một dòng thuốc đang soạn trong modal tạo phiếu điều chuyển (#436) */
interface TransferLine { medicineId: string; code: string; name: string; unit: string; stock: number; qty: number; }

/* ────────────── Constants ────────────── */

const TOP_TABS: TopTab<PageTab>[] = [
  { v: 'rx',        l: 'Đơn cấp phát',  ic: 'activity' },
  { v: 'inventory', l: 'Kho thuốc',     ic: 'box' },
  { v: 'transfers', l: 'Chuyển kho',    ic: 'shuffle' },
  { v: 'alerts',    l: 'Cảnh báo',      ic: 'alert' },
  { v: 'clinical',  l: 'Dược lâm sàng', ic: 'flask' },
  { v: 'recon',     l: 'Đối chiếu thuốc', ic: 'check' },
];

/* #438: nhãn + tông màu cho từng loại lệch khi đối chiếu y lệnh vs cấp phát */
const RECON_TYPES: Record<string, { label: string; tone: 'crit' | 'warn' | 'info' | 'ok' }> = {
  NOT_DISPENSED:  { label: 'Chưa/thiếu cấp',   tone: 'crit' },
  NO_ORDER:       { label: 'Không có y lệnh',  tone: 'crit' },
  OVER_DISPENSED: { label: 'Cấp vượt y lệnh',  tone: 'warn' },
  FIELD_DRIFT:    { label: 'Lệch dữ liệu',     tone: 'info' },
  CABINET_ISSUE:  { label: 'Xuất tủ trực',     tone: 'ok'   },
};

const RX_TABS: StatusTab<RxStatus>[] = [
  { v: 'pending',    l: 'Chờ duyệt',  tone: 'warn' },
  { v: 'accepted',   l: 'DS đã nhận', tone: 'info' },
  { v: 'dispensing', l: 'Đang cấp',   tone: 'warn' },
  { v: 'completed',  l: 'Đã cấp',     tone: 'ok'   },
  { v: 'rejected',   l: 'Hoàn',       tone: 'crit' },
];

const AL_TABS: StatusTab<'unack' | 'ack'>[] = [
  { v: 'unack', l: 'Chưa xác nhận', tone: 'warn' },
  { v: 'ack',   l: 'Đã xác nhận',   tone: 'ok'   },
];

const CL_TABS: StatusTab<ClSubTab>[] = [
  { v: 'reviews', l: 'Phiếu duyệt', tone: 'info' },
  { v: 'adr',     l: 'Báo cáo ADR', tone: 'warn' },
];

const TR_STATUS_OPTS = [
  { value: '',         label: 'Tất cả'    },
  { value: 'pending',  label: 'Chờ duyệt' },
  { value: 'approved', label: 'Đã duyệt'  },
  { value: 'rejected', label: 'Từ chối'   },
  { value: 'received', label: 'Đã nhận'   },
];

const ADR_SEV_OPTS = [
  { value: 'mild',     label: 'Nhẹ (mild)'              },
  { value: 'moderate', label: 'Trung bình (moderate)'   },
  { value: 'severe',   label: 'Nặng (severe)'           },
];

const PER = 18;
const fmtHM  = (s?: string) => s ? dayjs(s).format('HH:mm')       : '—';
const fmtDT  = (s?: string) => s ? dayjs(s).format('DD/MM HH:mm') : '—';
const sevTone = (s?: string): 'crit' | 'warn' | 'info' =>
  s === 'high' || s === 'severe' ? 'crit' : s === 'medium' || s === 'moderate' ? 'warn' : 'info';

/* ────────────────────────── Main Component ────────────────────────── */

const PharmacyV2: React.FC = () => {
  const { message, modal } = AntdApp.useApp();
  const navigate = useNavigate();
  const [tab, setTab] = useState<PageTab>('rx');

  /* ── RX state ── */
  const [rxRows,     setRxRows]     = useState<PendingPrescription[]>([]);
  const [rxLoading,  setRxLoading]  = useState(true);
  const [rxSearch,   setRxSearch]   = useState('');
  const [rxStab,     setRxStab]     = useState<RxStatus | 'all'>('all');
  const [rxPage,     setRxPage]     = useState(0);
  const [rxSel,      setRxSel]      = useState<PendingPrescription | null>(null);
  const [printLoad,  setPrintLoad]  = useState<string | null>(null);

  const loadRx = useCallback(async () => {
    setRxLoading(true);
    try { const r = await pharmacyApi.getPendingPrescriptions(); setRxRows(Array.isArray(r.data) ? r.data : []); }
    catch { /* silent */ } finally { setRxLoading(false); }
  }, []);
  useEffect(() => { if (tab === 'rx') loadRx(); }, [tab, loadRx]);

  /* ── Inventory state ── */
  const [invRows,    setInvRows]    = useState<InventoryItem[]>([]);
  const [invLoading, setInvLoading] = useState(false);
  const [invSearch,  setInvSearch]  = useState('');
  const [invPage,    setInvPage]    = useState(0);
  const [invScanOpen, setInvScanOpen] = useState(false);

  const loadInv = useCallback(async () => {
    setInvLoading(true);
    try { const r = await pharmacyApi.getInventoryItems(); setInvRows(Array.isArray(r.data) ? r.data : []); }
    catch { ti('Không tải được kho thuốc'); } finally { setInvLoading(false); }
  }, []);
  useEffect(() => { if (tab === 'inventory') loadInv(); }, [tab, loadInv]);

  /* ── Transfers state ── */
  const [trRows,     setTrRows]     = useState<TransferRequest[]>([]);
  const [trLoading,  setTrLoading]  = useState(false);
  const [trStatus,   setTrStatus]   = useState('');
  const [trPage,     setTrPage]     = useState(0);
  const [trModal,    setTrModal]    = useState(false);
  const [trFromWh,   setTrFromWh]   = useState('');
  const [trToWh,     setTrToWh]     = useState('');
  const [trNote,     setTrNote]     = useState('');
  const [trWhs,      setTrWhs]      = useState<WarehouseDto[]>([]);
  const [trInv,      setTrInv]      = useState<InventoryItem[]>([]);
  const [trInvLoading, setTrInvLoading] = useState(false);
  const [trItems,    setTrItems]    = useState<TransferLine[]>([]);
  const [trPickMed,  setTrPickMed]  = useState('');
  const [trPickQty,  setTrPickQty]  = useState<number>(1);
  const [trSubmitting, setTrSubmitting] = useState(false);
  const [trSel,      setTrSel]      = useState<TransferRequest | null>(null);

  const loadTr = useCallback(async () => {
    setTrLoading(true);
    try { const r = await pharmacyApi.getTransferRequests(trStatus || undefined); setTrRows(Array.isArray(r.data) ? r.data : []); }
    catch { ti('Không tải được yêu cầu chuyển kho'); } finally { setTrLoading(false); }
  }, [trStatus]);
  useEffect(() => { if (tab === 'transfers') loadTr(); }, [tab, loadTr]);

  // Danh sách kho cho modal điều chuyển (nạp 1 lần khi mở modal lần đầu)
  useEffect(() => {
    if (!trModal || trWhs.length > 0) return;
    getWarehouses()
      .then((r) => setTrWhs((Array.isArray(r.data) ? r.data : []).filter((w) => w.isActive)))
      .catch(() => ti('Không tải được danh sách kho'));
  }, [trModal, trWhs.length]);

  // Tồn kho của kho gửi → nguồn picker thuốc trong modal
  useEffect(() => {
    if (!trModal || !trFromWh) { setTrInv([]); return; }
    let alive = true;
    setTrInvLoading(true);
    pharmacyApi.getInventoryItems(trFromWh)
      .then((r) => { if (alive) setTrInv(Array.isArray(r.data) ? r.data : []); })
      .catch(() => { if (alive) ti('Không tải được tồn kho của kho gửi'); })
      .finally(() => { if (alive) setTrInvLoading(false); });
    return () => { alive = false; };
  }, [trModal, trFromWh]);

  /* ── Alerts state ── */
  const [alRows,     setAlRows]     = useState<AlertItem[]>([]);
  const [alLoading,  setAlLoading]  = useState(false);
  const [alStab,     setAlStab]     = useState<'unack' | 'ack' | 'all'>('unack');
  const [alPage,     setAlPage]     = useState(0);

  const loadAl = useCallback(async () => {
    setAlLoading(true);
    try { const r = await pharmacyApi.getAlerts(); setAlRows(Array.isArray(r.data) ? r.data : []); }
    catch { ti('Không tải được cảnh báo'); } finally { setAlLoading(false); }
  }, []);
  useEffect(() => { if (tab === 'alerts') loadAl(); }, [tab, loadAl]);

  /* ── Clinical state ── */
  const [clSubTab,   setClSubTab]   = useState<ClSubTab | 'all'>('reviews');
  const [clReviews,  setClReviews]  = useState<ClinReview[]>([]);
  const [clAdr,      setClAdr]      = useState<AdrReport[]>([]);
  const [clLoading,  setClLoading]  = useState(false);
  const [clPage,     setClPage]     = useState(0);
  const [adrModal,   setAdrModal]   = useState(false);
  const [adrPatient, setAdrPatient] = useState('');
  const [adrMed,     setAdrMed]     = useState('');
  const [adrReact,   setAdrReact]   = useState('');
  const [adrSev,     setAdrSev]     = useState<'mild' | 'moderate' | 'severe'>('mild');
  const [adrDesc,    setAdrDesc]    = useState('');

  const loadCl = useCallback(async () => {
    setClLoading(true);
    try {
      const [rev, adr] = await Promise.all([pharmacyApi.getClinicalReviews(), pharmacyApi.getAdrReports()]);
      setClReviews(Array.isArray(rev.data) ? (rev.data as ClinReview[]) : []);
      setClAdr(Array.isArray(adr.data) ? (adr.data as AdrReport[]) : []);
    }
    catch { ti('Không tải được dữ liệu lâm sàng'); } finally { setClLoading(false); }
  }, []);
  useEffect(() => { if (tab === 'clinical') loadCl(); }, [tab, loadCl]);

  /* ══════════════ ĐỐI CHIẾU THUỐC (#438) ══════════════ */
  // Read-only: chỉ báo cáo lệch, KHÔNG tạo phiếu điều chỉnh (quyết định clinical design 2026-08-02).
  const [rcRows,    setRcRows]    = useState<pharmacyApi.ReconciliationRow[]>([]);
  const [rcSummary, setRcSummary] = useState<pharmacyApi.ReconciliationSummary | null>(null);
  const [rcLoading, setRcLoading] = useState(false);
  const [rcPage,    setRcPage]    = useState(0);
  const [rcType,    setRcType]    = useState<string>('');
  const [rcFrom,    setRcFrom]    = useState(dayjs().subtract(30, 'day').format('YYYY-MM-DD'));
  const [rcTo,      setRcTo]      = useState(dayjs().format('YYYY-MM-DD'));

  const loadRecon = useCallback(async () => {
    setRcLoading(true);
    try {
      const { data } = await pharmacyApi.getMedicationReconciliation({ fromDate: rcFrom, toDate: rcTo });
      setRcRows(Array.isArray(data?.rows) ? data.rows : []);
      setRcSummary(data?.summary ?? null);
    } catch {
      ti('Không tải được báo cáo đối chiếu thuốc');
      setRcRows([]); setRcSummary(null);
    } finally { setRcLoading(false); }
  }, [rcFrom, rcTo]);
  useEffect(() => { if (tab === 'recon') loadRecon(); }, [tab, loadRecon]);

  const rcFiltered = useMemo(
    () => (rcType ? rcRows.filter((r) => r.discrepancyType === rcType) : rcRows),
    [rcRows, rcType],
  );
  const rcTotalPages = Math.max(1, Math.ceil(rcFiltered.length / PER));
  const rcPaged      = rcFiltered.slice(rcPage * PER, (rcPage + 1) * PER);
  const rcKpis: KpiItem[] = useMemo(() => [
    { lbl: 'HSBA đối chiếu', val: rcSummary?.medicalRecordCount ?? 0 },
    { lbl: 'Chưa/thiếu cấp', val: rcSummary?.notDispensedCount ?? 0,  tone: 'crit' as const },
    { lbl: 'Không y lệnh',   val: rcSummary?.noOrderCount ?? 0,       tone: 'crit' as const },
    { lbl: 'Cấp vượt',       val: rcSummary?.overDispensedCount ?? 0, tone: 'warn' as const },
    { lbl: 'Lệch dữ liệu',   val: rcSummary?.fieldDriftCount ?? 0,    tone: 'info' as const },
    { lbl: 'Tủ trực',        val: rcSummary?.cabinetIssueCount ?? 0,  tone: 'ok'   as const },
  ], [rcSummary]);

  const rcCols: ColumnDef<pharmacyApi.ReconciliationRow>[] = [
    { key: 'patient',   label: 'Bệnh nhân', render: (r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.patientName || '—'}</div>
          <div style={{ fontSize: 11, color: 'var(--t-3)', fontFamily: 'var(--font-mono)' }}>
            {r.patientCode || '—'}{r.medicalRecordCode ? ` · ${r.medicalRecordCode}` : ''}
          </div>
        </div>
    )},
    { key: 'dept',      label: 'Khoa',   render: (r) => r.departmentName || '—' },
    { key: 'medicine',  label: 'Thuốc',  render: (r) => (
        <div>
          <div>{r.medicineName || '—'}</div>
          <div style={{ fontSize: 11, color: 'var(--t-3)', fontFamily: 'var(--font-mono)' }}>{r.medicineCode || ''}</div>
        </div>
    )},
    { key: 'ordered',   label: 'Y lệnh',   mono: true, render: (r) => `${r.orderedQuantity}${r.unit ? ' ' + r.unit : ''}` },
    { key: 'dispensed', label: 'Đã cấp',   mono: true, render: (r) => `${r.dispensedQuantity}${r.unit ? ' ' + r.unit : ''}` },
    { key: 'variance',  label: 'Lệch',     mono: true, render: (r) => (
        <span style={{ color: r.variance === 0 ? 'var(--t-2)' : r.variance < 0 ? 'var(--s-crit)' : 'var(--s-warn)' }}>
          {r.variance > 0 ? `+${r.variance}` : r.variance}
        </span>
    )},
    { key: 'type',      label: 'Loại lệch', render: (r) => {
        const m = RECON_TYPES[r.discrepancyType] ?? { label: r.discrepancyType, tone: 'warn' as const };
        return <StatusBadge tone={m.tone}>{m.label}</StatusBadge>;
    }},
    { key: 'note',      label: 'Ghi chú', render: (r) => (
        <span style={{ fontSize: 11.5, color: 'var(--t-2)' }}>{r.note || '—'}</span>
    )},
  ];

  /* ══════════════ RX HANDLERS ══════════════ */

  const onPrintLabel = async (r: PendingPrescription) => {
    setPrintLoad(r.id);
    try {
      const { data: html } = await pharmacyApi.printDrugLabel(r.id);
      openPrintWindow(html as unknown as string, { onBlocked: () => message.error('Trình duyệt chặn popup — cho phép popup để in') });
    } catch { message.error('In nhãn thất bại'); } finally { setPrintLoad(null); }
  };

  const onAccept = async (r: PendingPrescription) => {
    try { await pharmacyApi.acceptPrescription(r.id); message.success(`DS đã nhận · ${r.prescriptionCode}`); loadRx(); }
    catch { message.error('Nhận thất bại'); }
  };

  const onComplete = (r: PendingPrescription) => {
    modal.confirm({
      title: 'Cấp phát đơn thuốc?', content: `${r.itemsCount} thuốc · ${fmtVND(r.totalAmount)}`,
      okText: 'Cấp phát', cancelText: 'Hủy',
      onOk: async () => {
        try { await pharmacyApi.completeDispensing(r.id); message.success('Đã cấp phát'); loadRx(); }
        catch { message.error('Cấp phát thất bại'); }
      },
    });
  };

  const onRejectRx = async (r: PendingPrescription) => {
    try { await pharmacyApi.rejectPrescription(r.id, 'Hoàn từ giao diện cấp phát'); message.warning(`Đã hoàn · ${r.prescriptionCode}`); loadRx(); }
    catch { message.error('Hoàn thất bại'); }
  };

  /* ══════════════ RX DERIVED ══════════════ */

  const rxFiltered = useMemo(() => {
    const k = rxSearch.toLowerCase();
    return rxRows.filter((r) => {
      if (rxStab !== 'all' && r.status !== rxStab) return false;
      if (k && !`${r.patientName} ${r.patientCode} ${r.prescriptionCode} ${r.doctorName}`.toLowerCase().includes(k)) return false;
      return true;
    });
  }, [rxRows, rxSearch, rxStab]);

  const rxCounts = useMemo(() => {
    const c: Record<string, number> = { all: rxRows.length };
    RX_TABS.forEach((t) => { c[t.v] = rxRows.filter((r) => r.status === t.v).length; });
    return c;
  }, [rxRows]);

  const rxKpis = useMemo((): KpiItem[] => {
    const today   = dayjs().startOf('day');
    const pending   = rxRows.filter((r) => r.status === 'pending').length;
    const dispensing = rxRows.filter((r) => r.status === 'dispensing').length;
    const urgent  = rxRows.filter((r) => r.priority === 'urgent').length;
    const revenue = rxRows.filter((r) => r.status === 'completed').reduce((s, r) => s + (r.totalAmount || 0), 0);
    return [
      { lbl: 'Đơn hôm nay',  val: rxRows.filter((r) => dayjs(r.createdDate).isSame(today, 'day')).length, sub: 'cần cấp',    tone: 'info' },
      { lbl: 'Chờ duyệt',    val: pending,                                                                  sub: 'DS xử lý',  tone: 'warn' },
      { lbl: 'Đang cấp',     val: dispensing,                                                               sub: 'đang xử lý', tone: 'warn' },
      { lbl: 'STAT',         val: urgent,                                                                   sub: 'ưu tiên',   tone: 'crit' },
      { lbl: 'Doanh thu',    val: Math.round(revenue / 1_000_000), unit: 'tr',                              sub: 'VND'               },
    ];
  }, [rxRows]);

  const rxTotalPages = Math.max(1, Math.ceil(rxFiltered.length / PER));
  const rxPaged = rxFiltered.slice(rxPage * PER, (rxPage + 1) * PER);

  const rxCols: ColumnDef<PendingPrescription>[] = [
    {
      key: 'code', label: 'Mã đơn', mono: true, width: 150,
      render: (r) => (
        <span>
          {r.prescriptionCode}
          {r.priority === 'urgent' && (
            <span style={{ marginLeft: 6, padding: '1px 5px', background: 'var(--s-crit-bg)', color: 'var(--s-crit)', border: '1px solid #fca5a5', borderRadius: 'var(--r-1)', fontSize: 9, fontWeight: 700 }}>STAT</span>
          )}
        </span>
      ),
    },
    { key: 'time', label: 'Giờ', mono: true, width: 80, render: (r) => fmtHM(r.createdDate) },
    { key: 'patient', label: 'Bệnh nhân', render: (r) => <div className="cell-2l"><b>{r.patientName}</b><i className="mono">{r.patientCode}</i></div> },
    { key: 'doctor',  label: 'BS / Khoa',  render: (r) => <div className="cell-2l"><b>{r.doctorName}</b><i>{r.department}</i></div> },
    { key: 'items',  label: 'Thuốc',  mono: true, width: 90,  render: (r) => `${r.itemsCount} loại` },
    { key: 'total',  label: 'Tổng tiền', mono: true, width: 130, render: (r) => fmtVND(r.totalAmount) },
    {
      key: 'status', label: 'Trạng thái', width: 130,
      render: (r) => { const t = RX_TABS.find((x) => x.v === r.status); return <StatusBadge tone={t?.tone} dot>{t?.l || r.status}</StatusBadge>; },
    },
  ];

  /* ══════════════ INVENTORY DERIVED ══════════════ */

  const invFiltered = useMemo(() => {
    const k = invSearch.toLowerCase();
    return invRows.filter((r) => !k || `${r.medicationName} ${r.medicationCode}`.toLowerCase().includes(k));
  }, [invRows, invSearch]);
  const invTotalPages = Math.max(1, Math.ceil(invFiltered.length / PER));
  const invPaged = invFiltered.slice(invPage * PER, (invPage + 1) * PER);

  const invCols: ColumnDef<InventoryItem>[] = [
    { key: 'name', label: 'Thuốc',       render: (r) => <div className="cell-2l"><b>{r.medicationName}</b><i className="mono">{r.medicationCode}</i></div> },
    { key: 'unit', label: 'ĐVT',         width: 70,  render: (r) => r.unit },
    { key: 'qty',  label: 'Tồn kho',     mono: true, width: 100, render: (r) => r.totalStock },
    { key: 'min',  label: 'Tối thiểu',   mono: true, width: 100, render: (r) => r.minStock },
    { key: 'exp',  label: 'Hạn gần nhất', mono: true, width: 130, render: (r) => fmtDT(r.nearestExpiry) },
    { key: 'wh',   label: 'Kho',          render: (r) => r.warehouse },
    {
      key: 'st', label: 'Tình trạng', width: 130,
      render: (r) => {
        const tone = r.status === 'out' ? 'crit' as const : (r.status === 'low' || r.status === 'expiring') ? 'warn' as const : 'ok' as const;
        const lbl  = r.status === 'out' ? 'Hết hàng' : r.status === 'low' ? 'Sắp hết' : r.status === 'expiring' ? 'Gần hết hạn' : 'Bình thường';
        return <StatusBadge tone={tone} dot>{lbl}</StatusBadge>;
      },
    },
  ];

  /* ══════════════ TRANSFER HANDLERS & COLS ══════════════ */

  const onApprove  = async (r: TransferRequest) => { try { await pharmacyApi.approveTransfer(r.id);  tk(`Đã duyệt · ${r.transferCode}`); loadTr(); } catch { te('Duyệt thất bại'); } };
  const onRejectTr = async (r: TransferRequest) => { try { await pharmacyApi.rejectTransfer(r.id, 'Từ chối từ giao diện'); te(`Đã từ chối · ${r.transferCode}`); loadTr(); } catch { te('Từ chối thất bại'); } };
  const onReceive  = async (r: TransferRequest) => { try { await pharmacyApi.receiveTransfer(r.id); tk(`Đã nhận · ${r.transferCode}`); loadTr(); } catch { te('Nhận hàng thất bại'); } };

  const trAddLine = () => {
    const inv = trInv.find((i) => i.medicineId === trPickMed);
    if (!inv?.medicineId) { ti('Chọn thuốc từ danh sách'); return; }
    if (trPickQty <= 0) { ti('Số lượng phải lớn hơn 0'); return; }
    if (trPickQty > inv.totalStock) { ti(`Vượt tồn khả dụng (${inv.totalStock} ${inv.unit})`); return; }
    setTrItems((prev) => [...prev, {
      medicineId: inv.medicineId!, code: inv.medicationCode, name: inv.medicationName,
      unit: inv.unit, stock: inv.totalStock, qty: trPickQty,
    }]);
    setTrPickMed(''); setTrPickQty(1);
  };

  const trRemoveLine = (medicineId: string) =>
    setTrItems((prev) => prev.filter((l) => l.medicineId !== medicineId));

  const trCanSubmit = !!trFromWh && !!trToWh && trFromWh !== trToWh && trItems.length > 0 && !trSubmitting;

  const trResetForm = () => {
    setTrFromWh(''); setTrToWh(''); setTrNote(''); setTrItems([]); setTrPickMed(''); setTrPickQty(1);
  };

  const onCreateTransfer = async () => {
    if (!trCanSubmit) return;
    setTrSubmitting(true);
    try {
      await pharmacyApi.createTransfer({
        fromWarehouse: trFromWh, toWarehouse: trToWh, note: trNote || undefined,
        items: trItems.map((l) => ({ medicineId: l.medicineId, quantity: l.qty })),
      });
      tk('Đã tạo yêu cầu chuyển kho'); setTrModal(false);
      trResetForm();
      loadTr();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      te(msg || 'Tạo yêu cầu thất bại');
    } finally { setTrSubmitting(false); }
  };

  const trCols: ColumnDef<TransferRequest>[] = [
    { key: 'code', label: 'Mã',        code: true, width: 130, render: (r) => r.transferCode },
    { key: 'from', label: 'Kho gửi',   render: (r) => r.fromWarehouse },
    { key: 'to',   label: 'Kho nhận',  render: (r) => r.toWarehouse },
    { key: 'cnt',  label: 'Dòng',      mono: true, width: 80, render: (r) => r.itemsCount },
    { key: 'date', label: 'Ngày YC',   mono: true, width: 130, render: (r) => fmtDT(r.requestedDate) },
    {
      key: 'st', label: 'Trạng thái', width: 120,
      render: (r) => {
        const tone = r.status === 'rejected' ? 'crit' as const : r.status === 'received' ? 'ok' as const : r.status === 'approved' ? 'info' as const : 'warn' as const;
        const lbl  = { pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối', received: 'Đã nhận' }[r.status] ?? r.status;
        return <StatusBadge tone={tone} dot>{lbl}</StatusBadge>;
      },
    },
  ];
  const trTotalPages = Math.max(1, Math.ceil(trRows.length / PER));
  const trPaged = trRows.slice(trPage * PER, (trPage + 1) * PER);

  /* ══════════════ ALERTS DERIVED ══════════════ */

  const alFiltered = useMemo(() => {
    if (alStab === 'ack')   return alRows.filter((a) => a.acknowledged);
    if (alStab === 'unack') return alRows.filter((a) => !a.acknowledged);
    return alRows;
  }, [alRows, alStab]);
  const alTotalPages = Math.max(1, Math.ceil(alFiltered.length / PER));
  const alPaged = alFiltered.slice(alPage * PER, (alPage + 1) * PER);
  const alCounts: Record<string, number> = {
    all: alRows.length,
    unack: alRows.filter((a) => !a.acknowledged).length,
    ack: alRows.filter((a) => a.acknowledged).length,
  };

  const onAck     = async (r: AlertItem) => { try { await pharmacyApi.acknowledgeAlert(r.id); tk('Đã xác nhận'); loadAl(); } catch { te('Thất bại'); } };
  const onResolve = async (r: AlertItem) => { try { await pharmacyApi.resolveAlert(r.id); tk('Đã giải quyết'); loadAl(); } catch { te('Thất bại'); } };

  const alCols: ColumnDef<AlertItem>[] = [
    { key: 'type', label: 'Loại',      width: 130, render: (r) => r.type },
    { key: 'med',  label: 'Thuốc',     render: (r) => r.medicationName ?? '—' },
    { key: 'msg',  label: 'Thông điệp', render: (r) => r.message },
    { key: 'sev',  label: 'Mức độ',    width: 110, render: (r) => <StatusBadge tone={sevTone(r.severity)} dot>{r.severity}</StatusBadge> },
    { key: 'date', label: 'Ngày',       mono: true, width: 130, render: (r) => fmtDT(r.createdDate) },
  ];

  /* ══════════════ CLINICAL COLS ══════════════ */

  const clCurRows = clSubTab === 'adr' ? clAdr : clReviews;
  const clTotalPages = Math.max(1, Math.ceil(clCurRows.length / PER));
  const clPaged = clCurRows.slice(clPage * PER, (clPage + 1) * PER);
  const clCounts: Record<string, number> = { all: clCurRows.length, reviews: clReviews.length, adr: clAdr.length };

  const revCols: ColumnDef<ClinReview>[] = [
    { key: 'pt',  label: 'Bệnh nhân',  render: (r) => r.patientName  ?? '—' },
    { key: 'med', label: 'Thuốc',       render: (r) => r.medicationName ?? '—' },
    { key: 'rec', label: 'Khuyến cáo', render: (r) => r.recommendation ?? '—' },
    { key: 'dt',  label: 'Ngày',  mono: true, width: 130, render: (r) => fmtDT(r.reviewDate) },
  ];
  const adrCols: ColumnDef<AdrReport>[] = [
    { key: 'pt',   label: 'Bệnh nhân', render: (r) => r.patientName   ?? '—' },
    { key: 'med',  label: 'Thuốc',      render: (r) => r.medicationName ?? '—' },
    { key: 'reac', label: 'Phản ứng',  render: (r) => r.reaction ?? '—' },
    { key: 'sev',  label: 'Mức độ', width: 110, render: (r) => <StatusBadge tone={sevTone(r.severity)} dot>{r.severity ?? '—'}</StatusBadge> },
    { key: 'dt',   label: 'Ngày BC', mono: true, width: 130, render: (r) => fmtDT(r.reportDate) },
  ];

  const onSubmitAdr = async () => {
    try {
      await pharmacyApi.submitAdrReport({ patientId: adrPatient, medicationName: adrMed, reaction: adrReact, severity: adrSev, description: adrDesc });
      tk('Đã gửi báo cáo ADR'); setAdrModal(false);
      setAdrPatient(''); setAdrMed(''); setAdrReact(''); setAdrSev('mild'); setAdrDesc('');
      loadCl();
    } catch { te('Gửi báo cáo ADR thất bại'); }
  };

  /* ══════════════════════════════ RENDER ══════════════════════════════ */

  return (
    <>
      <ExpiryAlertModal />
      <div className="ab">
        <TopTabs<PageTab> tab={tab} setTab={setTab} tabs={TOP_TABS} />

        {/* ════ TAB: ĐƠN CẤP PHÁT ════ */}
        {tab === 'rx' && (
          <>
            <KpiStrip items={rxKpis} />
            <div className="ab-tools">
              <SearchBox value={rxSearch} onChange={(v) => { setRxSearch(v); setRxPage(0); }} placeholder="Tìm BN / mã đơn / bác sĩ…" />
              <button type="button" className="ab-btn ghost" onClick={() => { setRxSearch(''); setRxStab('all'); setRxPage(0); }}>
                <TermIcon name="refresh" size={12} /> Bỏ lọc
              </button>
              <span className="spacer" />
              <Btn variant="ghost" onClick={() => navigate('/v2/pharmacy-approval')}>
                <TermIcon name="download" size={12} /> Nhập kho
              </Btn>
              <Btn variant="primary" onClick={() => navigate('/v2/dispensing-counter')}>
                <TermIcon name="plus" size={12} /> Đơn ngoại
              </Btn>
            </div>
            <StatusTabs<RxStatus>
              value={rxStab}
              onChange={(v) => { setRxStab(v); setRxPage(0); }}
              tabs={RX_TABS}
              counts={rxCounts}
            />
            <DataTable<PendingPrescription>
              columns={rxCols} data={rxPaged} rowKey={(r) => r.id}
              onRowClick={setRxSel}
              actions={(r) => (
                <div className="ab-actions">
                  {r.status === 'pending'    && <ActBtn ic="check" title="DS duyệt" onClick={() => onAccept(r)} />}
                  {(r.status === 'accepted' || r.status === 'dispensing') && (
                    <ActBtn ic="check" title="Cấp phát" onClick={() => onComplete(r)} />
                  )}
                  <ActBtn ic="print" title="In nhãn" loading={printLoad === r.id} onClick={() => onPrintLabel(r)} />
                  {r.status !== 'completed' && r.status !== 'rejected' && (
                    <ActBtn ic="x" title="Hoàn" tone="crit" onClick={() => onRejectRx(r)} />
                  )}
                </div>
              )}
              empty={rxLoading ? 'Đang tải…' : 'Không có đơn thuốc'}
            />
            <Pager page={rxPage} setPage={setRxPage} totalPages={rxTotalPages} total={rxFiltered.length} perPage={PER} />
            <DrawerShell
              open={!!rxSel} onClose={() => setRxSel(null)} size="lg"
              title={rxSel ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-10)' }}>
                  <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 'var(--fs-md)' }}>{rxSel.prescriptionCode}</span>
                  <span style={{ fontSize: 14 }}>{rxSel.patientName}</span>
                </span>
              ) : ''}
              sub={rxSel ? `${rxSel.doctorName} · ${rxSel.department} · ${fmtDT(rxSel.createdDate)}` : ''}
              footer={rxSel ? (
                <div style={{ display: 'flex', gap: 'var(--space-8)', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  {rxSel.status === 'pending' && (
                    <Btn variant="default" onClick={() => { onAccept(rxSel); setRxSel(null); }}>
                      <TermIcon name="check" size={12} /> Nhận đơn
                    </Btn>
                  )}
                  {(rxSel.status === 'accepted' || rxSel.status === 'dispensing') && (
                    <Btn variant="primary" onClick={() => { onComplete(rxSel); setRxSel(null); }}>
                      <TermIcon name="check-circle" size={12} /> Cấp phát
                    </Btn>
                  )}
                  <Btn loading={printLoad === rxSel.id} onClick={() => onPrintLabel(rxSel)}>
                    <TermIcon name="printer" size={12} /> In phiếu
                  </Btn>
                </div>
              ) : undefined}
            >
              {rxSel && <RxDrawerBody r={rxSel} />}
            </DrawerShell>
          </>
        )}

        {/* ════ TAB: KHO THUỐC ════ */}
        {tab === 'inventory' && (
          <>
            <div className="ab-tools">
              <SearchBox value={invSearch} onChange={(v) => { setInvSearch(v); setInvPage(0); }} placeholder="Tìm tên / mã thuốc…" />
              <Btn variant="ghost" icon="scan" onClick={() => setInvScanOpen(true)}>Quét mã vạch</Btn>
              <span className="spacer" />
              <Btn variant="ghost" icon="refresh" onClick={loadInv}>Làm mới</Btn>
            </div>
            <DataTable<InventoryItem>
              columns={invCols} data={invPaged} rowKey={(r) => r.id}
              empty={invLoading ? 'Đang tải…' : 'Kho thuốc trống'}
            />
            <Pager page={invPage} setPage={setInvPage} totalPages={invTotalPages} total={invFiltered.length} perPage={PER} />
            <BarcodeScanner
              open={invScanOpen}
              onClose={() => setInvScanOpen(false)}
              onScan={(decodedText) => { setInvSearch(decodedText); setInvPage(0); }}
              title="Quét mã vạch thuốc"
            />
          </>
        )}

        {/* ════ TAB: CHUYỂN KHO ════ */}
        {tab === 'transfers' && (
          <>
            <div className="ab-tools">
              <Select value={trStatus} onChange={(v) => { setTrStatus(v); setTrPage(0); }}
                style={{ width: 160 }} options={TR_STATUS_OPTS} />
              <span className="spacer" />
              <Btn variant="ghost" icon="refresh" onClick={loadTr}>Làm mới</Btn>
              <Btn variant="primary" icon="plus" onClick={() => setTrModal(true)}>Tạo yêu cầu</Btn>
            </div>
            <DataTable<TransferRequest>
              columns={trCols} data={trPaged} rowKey={(r) => r.id}
              onRowClick={(r) => setTrSel(r)}
              actions={(r) => (
                <div className="ab-actions">
                  {r.status === 'pending'  && <ActBtn ic="check" title="Duyệt"    onClick={() => onApprove(r)} />}
                  {r.status === 'pending'  && <ActBtn ic="x"     title="Từ chối" tone="crit" onClick={() => onRejectTr(r)} />}
                  {r.status === 'approved' && <ActBtn ic="check" title="Đã nhận"  onClick={() => onReceive(r)} />}
                </div>
              )}
              empty={trLoading ? 'Đang tải…' : 'Không có yêu cầu chuyển kho'}
            />
            <Pager page={trPage} setPage={setTrPage} totalPages={trTotalPages} total={trRows.length} perPage={PER} />
            <ModalShell open={trModal} onClose={() => { setTrModal(false); trResetForm(); }} title="Tạo yêu cầu chuyển kho"
              footer={<>
                <Btn variant="ghost" onClick={() => { setTrModal(false); trResetForm(); }}>Hủy</Btn>
                <Btn variant="primary" loading={trSubmitting} disabled={!trCanSubmit} onClick={onCreateTransfer}>Tạo yêu cầu</Btn>
              </>}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <label style={{ fontSize: 12.5 }}>Kho gửi
                    <Select showSearch optionFilterProp="label" value={trFromWh || undefined}
                      onChange={(v) => { setTrFromWh(v); setTrItems([]); setTrPickMed(''); }}
                      placeholder="Chọn kho gửi" style={{ width: '100%', marginTop: 4 }}
                      options={trWhs.map((w) => ({ value: w.id, label: `${w.warehouseName} (${w.warehouseCode})` }))} />
                  </label>
                  <label style={{ fontSize: 12.5 }}>Kho nhận
                    <Select showSearch optionFilterProp="label" value={trToWh || undefined}
                      onChange={setTrToWh}
                      placeholder="Chọn kho nhận" style={{ width: '100%', marginTop: 4 }}
                      options={trWhs.filter((w) => w.id !== trFromWh).map((w) => ({ value: w.id, label: `${w.warehouseName} (${w.warehouseCode})` }))} />
                  </label>
                </div>

                <div>
                  <div style={{ fontSize: 12.5, marginBottom: 4 }}>Dòng thuốc ({trItems.length})</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px auto', gap: 8 }}>
                    <Select showSearch optionFilterProp="label" value={trPickMed || undefined}
                      onChange={(v) => setTrPickMed(v)}
                      disabled={!trFromWh || trInvLoading}
                      placeholder={!trFromWh ? 'Chọn kho gửi trước' : trInvLoading ? 'Đang tải tồn kho…' : 'Chọn thuốc từ kho gửi'}
                      style={{ width: '100%' }}
                      options={trInv
                        .filter((i) => i.medicineId && i.totalStock > 0 && !trItems.some((l) => l.medicineId === i.medicineId))
                        .map((i) => ({ value: i.medicineId!, label: `${i.medicationName} (${i.medicationCode}) · tồn ${i.totalStock} ${i.unit}` }))} />
                    <InputNumber value={trPickQty} onChange={(v) => setTrPickQty(v ?? 1)} min={1} style={{ width: '100%' }} />
                    <Btn variant="ghost" icon="plus" disabled={!trPickMed} onClick={trAddLine}>Thêm</Btn>
                  </div>
                  {trItems.length > 0 && (
                    <div style={{ marginTop: 8, border: '1px solid var(--line-soft)', borderRadius: 'var(--r-1)' }}>
                      {trItems.map((l) => (
                        <div key={l.medicineId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderBottom: '1px solid var(--line-soft)', fontSize: 12.5 }}>
                          <span style={{ flex: 1 }}><b>{l.name}</b> <span className="mono" style={{ color: 'var(--t-2)' }}>{l.code}</span></span>
                          <span className="mono">{l.qty} {l.unit}</span>
                          <span className="mono" style={{ color: 'var(--t-2)' }}>/ tồn {l.stock}</span>
                          <ActBtn ic="x" title="Xoá dòng" tone="crit" onClick={() => trRemoveLine(l.medicineId)} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <label style={{ fontSize: 12.5 }}>Ghi chú
                  <Input value={trNote} onChange={(e) => setTrNote(e.target.value)} placeholder="Ghi chú…" style={{ marginTop: 4 }} />
                </label>
                {!!trFromWh && !!trToWh && trFromWh === trToWh && (
                  <div style={{ fontSize: 12, color: 'var(--s-crit)' }}>Kho gửi và kho nhận phải khác nhau</div>
                )}
              </div>
            </ModalShell>
            <DrawerShell open={!!trSel} onClose={() => setTrSel(null)}
              title={trSel?.transferCode ?? ''} sub="Chi tiết phiếu điều chuyển kho"
            >
              {trSel && (
                <>
                  <DrSec title="Thông tin phiếu">
                    <DrField lbl="Kho gửi">{trSel.fromWarehouse || '—'}</DrField>
                    <DrField lbl="Kho nhận">{trSel.toWarehouse || '—'}</DrField>
                    <DrField lbl="Người yêu cầu">{trSel.requestedBy || '—'}</DrField>
                    <DrField lbl="Ngày YC">{fmtDT(trSel.requestedDate)}</DrField>
                    <DrField lbl="Trạng thái">
                      {(() => {
                        const tone = trSel.status === 'rejected' ? 'crit' as const : trSel.status === 'received' ? 'ok' as const : trSel.status === 'approved' ? 'info' as const : 'warn' as const;
                        const lbl  = { pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối', received: 'Đã nhận' }[trSel.status] ?? trSel.status;
                        return <StatusBadge tone={tone} dot>{lbl}</StatusBadge>;
                      })()}
                    </DrField>
                    {trSel.note && <DrField lbl="Ghi chú">{trSel.note}</DrField>}
                  </DrSec>
                  <DrSec title={`Dòng thuốc (${trSel.items?.length ?? 0})`}>
                    {(trSel.items?.length ?? 0) === 0
                      ? <div style={{ fontSize: 12.5, color: 'var(--t-2)' }}>Phiếu không có dòng thuốc</div>
                      : (trSel.items ?? []).map((it, idx) => (
                        <div key={`${it.medicineId}-${idx}`} style={{ display: 'flex', gap: 8, padding: '5px 0', fontSize: 12.5, borderBottom: '1px solid var(--line-soft)' }}>
                          <span style={{ flex: 1 }}><b>{it.medicationName}</b> <span className="mono" style={{ color: 'var(--t-2)' }}>{it.medicationCode}</span></span>
                          <span className="mono">{it.quantity} {it.unit}</span>
                        </div>
                      ))}
                  </DrSec>
                </>
              )}
            </DrawerShell>
          </>
        )}

        {/* ════ TAB: CẢNH BÁO ════ */}
        {tab === 'alerts' && (
          <>
            <StatusTabs<'unack' | 'ack'>
              value={alStab}
              onChange={(v) => { setAlStab(v as 'unack' | 'ack' | 'all'); setAlPage(0); }}
              tabs={AL_TABS}
              counts={alCounts}
            />
            <DataTable<AlertItem>
              columns={alCols} data={alPaged} rowKey={(r) => r.id}
              actions={(r) => (
                <div className="ab-actions">
                  {!r.acknowledged && <ActBtn ic="check" title="Xác nhận"    onClick={() => onAck(r)} />}
                  {r.acknowledged  && <ActBtn ic="x"     title="Giải quyết" onClick={() => onResolve(r)} />}
                </div>
              )}
              empty={alLoading ? 'Đang tải…' : 'Không có cảnh báo'}
            />
            <Pager page={alPage} setPage={setAlPage} totalPages={alTotalPages} total={alFiltered.length} perPage={PER} />
          </>
        )}

        {/* ════ TAB: DƯỢC LÂM SÀNG ════ */}
        {tab === 'clinical' && (
          <>
            <StatusTabs<ClSubTab>
              value={clSubTab}
              onChange={(v) => { setClSubTab(v as ClSubTab | 'all'); setClPage(0); }}
              tabs={CL_TABS}
              counts={clCounts}
            />
            {clSubTab === 'adr' && (
              <div className="ab-tools">
                <span className="spacer" />
                <Btn variant="primary" icon="plus" onClick={() => setAdrModal(true)}>Báo cáo ADR</Btn>
              </div>
            )}
            {clSubTab !== 'adr' ? (
              <DataTable<ClinReview>
                columns={revCols} data={clPaged as ClinReview[]} rowKey={(r) => r.id}
                empty={clLoading ? 'Đang tải…' : 'Không có phiếu duyệt'}
              />
            ) : (
              <DataTable<AdrReport>
                columns={adrCols} data={clPaged as AdrReport[]} rowKey={(r) => r.id}
                empty={clLoading ? 'Đang tải…' : 'Chưa có báo cáo ADR'}
              />
            )}
            <Pager page={clPage} setPage={setClPage} totalPages={clTotalPages} total={clCurRows.length} perPage={PER} />
            <ModalShell open={adrModal} onClose={() => setAdrModal(false)} title="Báo cáo phản ứng có hại (ADR)" size="md"
              footer={<><Btn variant="ghost" onClick={() => setAdrModal(false)}>Hủy</Btn><Btn variant="primary" onClick={onSubmitAdr}>Gửi báo cáo</Btn></>}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0' }}>
                <label style={{ fontSize: 12.5 }}>Mã bệnh nhân
                  <Input value={adrPatient} onChange={(e) => setAdrPatient(e.target.value)} placeholder="Mã BN…" style={{ marginTop: 4 }} />
                </label>
                <label style={{ fontSize: 12.5 }}>Tên thuốc
                  <Input value={adrMed} onChange={(e) => setAdrMed(e.target.value)} placeholder="Tên thuốc…" style={{ marginTop: 4 }} />
                </label>
                <label style={{ fontSize: 12.5 }}>Phản ứng
                  <Input value={adrReact} onChange={(e) => setAdrReact(e.target.value)} placeholder="Mô tả phản ứng…" style={{ marginTop: 4 }} />
                </label>
                <label style={{ fontSize: 12.5 }}>Mức độ
                  <Select value={adrSev} onChange={(v) => setAdrSev(v)} options={ADR_SEV_OPTS} style={{ width: '100%', marginTop: 4 }} />
                </label>
                <label style={{ fontSize: 12.5 }}>Mô tả chi tiết
                  <Input.TextArea value={adrDesc} onChange={(e) => setAdrDesc(e.target.value)} rows={3} placeholder="Mô tả chi tiết…" style={{ marginTop: 4, resize: 'vertical' }} />
                </label>
              </div>
            </ModalShell>
          </>
        )}

        {/* ══════ Đối chiếu thuốc nội trú (#438) — READ-ONLY ══════ */}
        {tab === 'recon' && (
          <>
            <KpiStrip items={rcKpis} />
            <div className="ab-tools">
              <span style={{ fontSize: 12.5, color: 'var(--t-2)' }}>Ngày kê:</span>
              <Input type="date" value={rcFrom} onChange={(e) => { setRcFrom(e.target.value); setRcPage(0); }} style={{ width: 150 }} />
              <span style={{ fontSize: 12.5, color: 'var(--t-2)' }}>→</span>
              <Input type="date" value={rcTo} onChange={(e) => { setRcTo(e.target.value); setRcPage(0); }} style={{ width: 150 }} />
              <Select<string>
                value={rcType}
                onChange={(v) => { setRcType(v); setRcPage(0); }}
                style={{ width: 190 }}
                options={[
                  { value: '', label: 'Tất cả loại lệch' },
                  ...Object.entries(RECON_TYPES).map(([v, m]) => ({ value: v, label: m.label })),
                ]}
              />
              <span className="spacer" />
              <Btn variant="ghost" icon="refresh" onClick={loadRecon}>Làm mới</Btn>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--t-3)', margin: '0 0 8px' }}>
              Đối chiếu theo <strong>đợt điều trị</strong> (hồ sơ × thuốc). Báo cáo chỉ đọc — sửa lệch do dược sĩ xử lý thủ công có duyệt.
            </div>
            <DataTable<pharmacyApi.ReconciliationRow>
              columns={rcCols}
              data={rcPaged}
              rowKey={(r) => `${r.medicalRecordId}-${r.medicineId}-${r.discrepancyType}`}
              empty={rcLoading ? 'Đang tải…' : 'Không phát hiện lệch trong khoảng đã chọn'}
            />
            <Pager page={rcPage} setPage={setRcPage} totalPages={rcTotalPages} total={rcFiltered.length} perPage={PER} />
          </>
        )}
      </div>
    </>
  );
};

/* ────────────────────────── RX Drawer Body ────────────────────────── */

const RxDrawerBody: React.FC<{ r: PendingPrescription }> = ({ r }) => {
  const { message } = AntdApp.useApp();
  const [items,     setItems]     = useState<MedicationItem[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [dispQty,   setDispQty]   = useState<Record<string, number>>({});
  const [savingId,  setSavingId]  = useState<string | null>(null);

  const canEdit = r.status === 'accepted' || r.status === 'dispensing';

  React.useEffect(() => {
    setLoading(true);
    pharmacyApi.getMedicationItems(r.id)
      .then((res) => setItems(Array.isArray(res.data) ? res.data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [r.id]);

  const onSaveQty = async (it: MedicationItem) => {
    const qty = dispQty[it.id] ?? it.dispensedQuantity;
    setSavingId(it.id);
    try {
      await pharmacyApi.updateDispensedQuantity(it.id, qty);
      message.success(`Đã lưu: ${it.medicationName} → ${qty} ${it.unit}`);
    } catch { message.error('Lưu số lượng thất bại'); }
    finally { setSavingId(null); }
  };

  return (
    <>
      <DrSec title="Đơn thuốc">
        <DrField lbl="Mã đơn"><span className="mono" style={{ color: 'var(--a-cy)' }}>{r.prescriptionCode}</span></DrField>
        <DrField lbl="Bệnh nhân"><b>{r.patientName}</b> · <span className="mono">{r.patientCode}</span></DrField>
        <DrField lbl="BS chỉ định">{r.doctorName}</DrField>
        <DrField lbl="Khoa">{r.department}</DrField>
        <DrField lbl="Ngày kê">{fmtDT(r.createdDate)}</DrField>
        <DrField lbl="Số thuốc"><b>{r.itemsCount} loại</b></DrField>
        <DrField lbl="Tổng tiền"><b className="mono" style={{ color: 'var(--a-cy)' }}>{fmtVND(r.totalAmount)}</b></DrField>
        <DrField lbl="Ưu tiên">
          <span className={`chip ${r.priority === 'urgent' ? 'crit' : 'info'}`}>{r.priority === 'urgent' ? 'STAT' : 'Thường'}</span>
        </DrField>
      </DrSec>
      <DrSec title="Danh mục thuốc">
        {loading && <div style={{ textAlign: 'center', padding: 'var(--space-16)', color: 'var(--t-2)' }}>Đang tải…</div>}
        {!loading && items.length === 0 && <div style={{ color: 'var(--t-3)', fontSize: 'var(--fs-sm)' }}>Chưa có thuốc</div>}
        {!loading && items.map((it) => (
          <div key={it.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--line-soft)', display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'start' }}>
            <div>
              <b style={{ color: 'var(--t-0)', fontSize: 13 }}>{it.medicationName}</b>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginTop: 2 }}>
                <span className="mono">{it.medicationCode}</span> · {it.dosage}
              </div>
              {it.instruction && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginTop: 2 }}>{it.instruction}</div>}
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginTop: 4 }}>
                Kê: <b className="mono">{it.quantity} {it.unit}</b>
                {it.dispensedQuantity > 0 && <> · Đã cấp: <span className="chip ok mono">{it.dispensedQuantity}</span></>}
              </div>
            </div>
            {canEdit && (
              <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
                <InputNumber
                  size="small" min={0} style={{ width: 80 }}
                  value={dispQty[it.id] ?? it.dispensedQuantity}
                  onChange={(v) => setDispQty((prev) => ({ ...prev, [it.id]: v ?? 0 }))}
                />
                <ActBtn ic="check" title="Lưu số lượng" loading={savingId === it.id} onClick={() => onSaveQty(it)} />
              </div>
            )}
          </div>
        ))}
      </DrSec>
    </>
  );
};

export default PharmacyV2;
