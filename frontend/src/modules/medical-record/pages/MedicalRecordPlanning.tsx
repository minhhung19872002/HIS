import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { DatePicker, Form, Input, InputNumber, Divider } from 'antd';
import {
  getRecordCodes, assignRecordCode, bulkAllocate,
  getTransfers, approveTransfer,
  getBorrowing, createBorrow, returnRecord, extendBorrow,
  getHandover, approveHandover,
  getOutpatientRecords,
  getAttendance, checkIn,
  getPlanningStats,
} from '../api/medicalRecordPlanning';
import type { BulkAllocateResult } from '../api/medicalRecordPlanning';
import {
  KpiStrip, TopTabs, type TopTab, StatusTabs, SearchBox, Filter, DataTable,
  Pager, StatusBadge, ActBtn, Btn, DrawerShell, ModalShell, DrSec, DrField,
  useTabCounts, cf, tk, ti, tw, Ico, type ColumnDef,
} from '@/_v2kit';

// ─────────────────────────── Interfaces ───────────────────────────────────────

interface RecordCode {
  id: string;
  recordCode: string;
  examinationId?: string;
  patientCode?: string;
  patientName?: string;
  departmentName?: string;
  doctorName?: string;
  assignedDate?: string;
  assignedByName?: string;
  status: number;
  statusName: string;
  createdAt: string;
}

interface TransferRecord {
  id: string;
  transferNumber?: string;
  patientCode?: string;
  patientName?: string;
  fromDepartment?: string;
  toDepartment?: string;
  toHospital?: string;
  diagnosis?: string;
  transferDate?: string;
  status: number;
  statusName: string;
}

interface BorrowRecord {
  id: string;
  borrowCode: string;
  recordCode?: string;
  patientCode?: string;
  patientName?: string;
  borrowerName?: string;
  purpose?: string;
  borrowDate: string;
  expectedReturnDate?: string;
  status: number;
  statusName: string;
  isOverdue: boolean;
}

interface HandoverRecord {
  id: string;
  handoverCode: string;
  recordCode?: string;
  patientCode?: string;
  patientName?: string;
  departmentName?: string;
  submittedByName?: string;
  submittedDate?: string;
  status: number;
  statusName: string;
  totalForms: number;
  completedForms: number;
}

interface OutpatientRecord {
  id: string;
  recordCode?: string;
  patientCode?: string;
  patientName?: string;
  gender?: string;
  departmentName?: string;
  doctorName?: string;
  diagnosis?: string;
  icdCode?: string;
  examinationDate: string;
  statusName: string;
}

interface DepartmentAttendance {
  departmentId: string;
  departmentName: string;
  isCheckedIn: boolean;
  checkInTime?: string;
  checkInByName?: string;
  totalRecords: number;
  completedRecords: number;
  pendingRecords: number;
}

interface PlanningStats {
  totalRecords: number;
  assignedCodes: number;
  totalTransfers: number;
  activeBorrows: number;
  overdueBorrows: number;
  pendingHandovers: number;
}

// ─────────────────────────── Constants ────────────────────────────────────────

type SKey = 'unused' | 'assigned' | 'completed' | 'pending' | 'cancelled';
const STATUS_TABS = [
  { v: 'unused' as SKey,    l: 'Chưa dùng',  tone: 'warn' as const },
  { v: 'assigned' as SKey,  l: 'Đã gán',     tone: 'info' as const },
  { v: 'completed' as SKey, l: 'Hoàn tất',   tone: 'ok' as const },
  { v: 'pending' as SKey,   l: 'Treo',       tone: 'warn' as const },
  { v: 'cancelled' as SKey, l: 'Hủy',        tone: 'crit' as const },
];

const sKey = (n: number): SKey =>
  n === 0 ? 'unused' : n === 1 ? 'assigned' : n === 2 ? 'completed' : n === 3 ? 'pending' : 'cancelled';

const PER = 18;
const PAGE_SIZE = 20;

// FE-only parity filters (v1→v2): DatePicker.RangePicker value shape.
type DateRange = [dayjs.Dayjs | null, dayjs.Dayjs | null] | null;
const fmtDay = (d: dayjs.Dayjs | null | undefined): string | undefined =>
  d ? d.format('YYYY-MM-DD') : undefined;

type TabKey = 'codes' | 'transfers' | 'borrowing' | 'handover' | 'outpatient' | 'attendance';

const TABS: TopTab<TabKey>[] = [
  { v: 'codes',      l: 'Mã BA',        ic: 'file' },
  { v: 'transfers',  l: 'Chuyển viện',  ic: 'truck' },
  { v: 'borrowing',  l: 'Mượn trả BA',  ic: 'book-open' },
  { v: 'handover',   l: 'Bàn giao BA',  ic: 'inbox' },
  { v: 'outpatient', l: 'BA Ngoại trú', ic: 'user-check' },
  { v: 'attendance', l: 'Điểm danh',    ic: 'calendar-check' },
];

const TR_TONE: Record<number, 'ok' | 'warn' | 'crit' | 'info'> = { 0: 'warn', 1: 'ok', 2: 'crit', 3: 'info' };
const BR_TONE: Record<number, 'ok' | 'warn' | 'crit' | 'info'> = { 0: 'info', 1: 'ok', 2: 'crit', 3: 'warn' };
const HO_TONE: Record<number, 'ok' | 'warn' | 'crit' | 'info'> = { 0: 'info', 1: 'warn', 2: 'ok', 3: 'crit' };

const BR_STATUS_OPTS = [
  { v: '', l: 'Tất cả trạng thái' },
  { v: '0', l: 'Đang mượn' },
  { v: '1', l: 'Đã trả' },
  { v: '2', l: 'Từ chối' },
  { v: '3', l: 'Quá hạn' },
];

const HO_STATUS_OPTS = [
  { v: '', l: 'Tất cả trạng thái' },
  { v: '0', l: 'Mới tạo' },
  { v: '1', l: 'Chờ duyệt' },
  { v: '2', l: 'Đã duyệt' },
  { v: '3', l: 'Từ chối' },
];

// ─────────────────────────── Component ────────────────────────────────────────

const MedicalRecordPlanningV2: React.FC = () => {
  // ── Tab navigation ────────────────────────────────────────────────────────
  const [tab, setTab] = useState<TabKey>('codes');

  // ── Stats (KpiStrip) ──────────────────────────────────────────────────────
  const [stats, setStats] = useState<PlanningStats | null>(null);

  // ── Tab 0: Mã BA ──────────────────────────────────────────────────────────
  const [items, setItems] = useState<RecordCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fDept, setFDept] = useState('');
  const [rcRange, setRcRange] = useState<DateRange>(null); // Ngày cấp từ–đến (in-memory)
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<RecordCode | null>(null);

  const [assignTarget, setAssignTarget] = useState<RecordCode | null>(null);
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignForm] = Form.useForm();

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkAllocateResult | null>(null);
  const [bulkForm] = Form.useForm();

  // ── Tab 1: Chuyển viện ────────────────────────────────────────────────────
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [trLoading, setTrLoading] = useState(false);
  const [trPage, setTrPage] = useState(0);
  const [trTotal, setTrTotal] = useState(0);
  const [trSearch, setTrSearch] = useState('');
  const [trRange, setTrRange] = useState<DateRange>(null); // Ngày CV từ–đến (server)

  // ── Tab 2: Mượn trả BA ────────────────────────────────────────────────────
  const [borrowing, setBorrowing] = useState<BorrowRecord[]>([]);
  const [brLoading, setBrLoading] = useState(false);
  const [brPage, setBrPage] = useState(0);
  const [brTotal, setBrTotal] = useState(0);
  const [brSearch, setBrSearch] = useState('');
  const [brStatus, setBrStatus] = useState('');
  const [borrowModal, setBorrowModal] = useState(false);
  const [returnTarget, setReturnTarget] = useState<BorrowRecord | null>(null);
  const [extendTarget, setExtendTarget] = useState<BorrowRecord | null>(null);
  const [borrowSaving, setBorrowSaving] = useState(false);
  const [borrowForm] = Form.useForm();
  const [returnForm] = Form.useForm();
  const [extendForm] = Form.useForm();

  // ── Tab 3: Bàn giao BA ────────────────────────────────────────────────────
  const [handover, setHandover] = useState<HandoverRecord[]>([]);
  const [hoLoading, setHoLoading] = useState(false);
  const [hoPage, setHoPage] = useState(0);
  const [hoTotal, setHoTotal] = useState(0);
  const [hoStatus, setHoStatus] = useState('');
  const [hoSearch, setHoSearch] = useState(''); // keyword (server)

  // ── Tab 4: BA Ngoại trú ───────────────────────────────────────────────────
  const [outpatient, setOutpatient] = useState<OutpatientRecord[]>([]);
  const [opLoading, setOpLoading] = useState(false);
  const [opPage, setOpPage] = useState(0);
  const [opTotal, setOpTotal] = useState(0);
  const [opSearch, setOpSearch] = useState('');
  const [opRange, setOpRange] = useState<DateRange>(null); // Ngày khám từ–đến (server)

  // ── Tab 5: Điểm danh ──────────────────────────────────────────────────────
  const [attendance, setAttendance] = useState<DepartmentAttendance[]>([]);
  const [attLoading, setAttLoading] = useState(false);
  const [attDate, setAttDate] = useState<dayjs.Dayjs>(dayjs());

  // ─────────────────────────── Load functions ───────────────────────────────

  const loadStats = async () => {
    try {
      const r = await getPlanningStats();
      setStats(r.data as PlanningStats);
    } catch { /* silent — KPI stays at '…' */ }
  };

  const load = async () => {
    setLoading(true);
    try {
      const r = await getRecordCodes({ pageIndex: 0, pageSize: 200, keyword: search || undefined });
      const list = ((r.data as { items?: RecordCode[] })?.items || []) as RecordCode[];
      setItems(list);
    } catch { ti('Không tải được mã BA'); }
    finally { setLoading(false); }
  };

  const loadTransfers = async (p = 0, kw?: string, range?: DateRange) => {
    setTrLoading(true);
    try {
      const [from, to] = (range === undefined ? trRange : range) || [null, null];
      const r = await getTransfers({
        pageIndex: p, pageSize: PAGE_SIZE,
        keyword: (kw ?? trSearch) || undefined,
        fromDate: fmtDay(from), toDate: fmtDay(to),
      });
      const d = r.data as { items?: TransferRecord[]; totalCount?: number };
      setTransfers(d.items || []);
      setTrTotal(d.totalCount || 0);
    } catch { ti('Không tải được danh sách chuyển viện'); }
    finally { setTrLoading(false); }
  };

  const loadBorrowing = async (p = 0, kw?: string, st?: string) => {
    setBrLoading(true);
    try {
      const r = await getBorrowing({
        pageIndex: p, pageSize: PAGE_SIZE,
        keyword: (kw ?? brSearch) || undefined,
        status: (st ?? brStatus) || undefined,
      });
      const d = r.data as { items?: BorrowRecord[]; totalCount?: number };
      setBorrowing(d.items || []);
      setBrTotal(d.totalCount || 0);
    } catch { ti('Không tải được danh sách mượn trả'); }
    finally { setBrLoading(false); }
  };

  const loadHandover = async (p = 0, st?: string, kw?: string) => {
    setHoLoading(true);
    try {
      const r = await getHandover({
        pageIndex: p, pageSize: PAGE_SIZE,
        status: (st ?? hoStatus) || undefined,
        keyword: (kw ?? hoSearch) || undefined,
      });
      const d = r.data as { items?: HandoverRecord[]; totalCount?: number };
      setHandover(d.items || []);
      setHoTotal(d.totalCount || 0);
    } catch { ti('Không tải được danh sách bàn giao'); }
    finally { setHoLoading(false); }
  };

  const loadOutpatient = async (p = 0, kw?: string, range?: DateRange) => {
    setOpLoading(true);
    try {
      const [from, to] = (range === undefined ? opRange : range) || [null, null];
      const r = await getOutpatientRecords({
        pageIndex: p, pageSize: PAGE_SIZE,
        keyword: (kw ?? opSearch) || undefined,
        fromDate: fmtDay(from), toDate: fmtDay(to),
      });
      const d = r.data as { items?: OutpatientRecord[]; totalCount?: number };
      setOutpatient(d.items || []);
      setOpTotal(d.totalCount || 0);
    } catch { ti('Không tải được danh sách BA ngoại trú'); }
    finally { setOpLoading(false); }
  };

  const loadAttendance = async (date?: dayjs.Dayjs) => {
    setAttLoading(true);
    try {
      const r = await getAttendance({ date: (date ?? attDate).format('YYYY-MM-DD') });
      const d = r.data as DepartmentAttendance[] | { items?: DepartmentAttendance[] };
      setAttendance(Array.isArray(d) ? d : (d.items || []));
    } catch { ti('Không tải được điểm danh'); }
    finally { setAttLoading(false); }
  };

  // ─────────────────────────── Effects ─────────────────────────────────────

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadStats(); }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    switch (tab) {
      case 'codes':      load();            break;
      case 'transfers':  setTrPage(0); loadTransfers(0);  break;
      case 'borrowing':  setBrPage(0); loadBorrowing(0);  break;
      case 'handover':   setHoPage(0); loadHandover(0);   break;
      case 'outpatient': setOpPage(0); loadOutpatient(0); break;
      case 'attendance': loadAttendance(attDate);          break;
    }
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────── Codes tab handlers ───────────────────────────

  const openAssign = (r: RecordCode) => {
    setAssignTarget(r);
    assignForm.resetFields();
    assignForm.setFieldValue('examinationId', '');
  };

  const handleAssign = async () => {
    setAssignSaving(true);
    try {
      const v = await assignForm.validateFields();
      await assignRecordCode({ examinationId: v.examinationId.trim(), recordCode: assignTarget?.recordCode });
      tk(`Đã gán mã BA ${assignTarget?.recordCode}`);
      setAssignTarget(null);
      setSel(null);
      assignForm.resetFields();
      load();
    } catch (e: unknown) {
      const err = e as { errorFields?: unknown };
      if (err?.errorFields) return;
      tw('Gán BN thất bại');
    } finally {
      setAssignSaving(false);
    }
  };

  const openBulk = () => {
    setBulkResult(null);
    bulkForm.resetFields();
    setBulkOpen(true);
  };

  const handleBulkAllocate = async () => {
    setBulkSaving(true);
    try {
      const v = await bulkForm.validateFields();
      const dto = {
        departmentId: v.departmentId?.trim() || '',
        prefix: v.prefix?.trim() || undefined,
        count: v.count ? Number(v.count) : undefined,
        fromCode: v.fromCode?.trim() || undefined,
        toCode: v.toCode?.trim() || undefined,
        skipExisting: true,
      };
      const r = await bulkAllocate(dto);
      const result = r.data as BulkAllocateResult;
      setBulkResult(result);
      tk(`Đã cấp ${result.allocated} mã BA`);
      load();
    } catch (e: unknown) {
      const err = e as { errorFields?: unknown };
      if (err?.errorFields) return;
      tw('Cấp dải mã thất bại');
    } finally {
      setBulkSaving(false);
    }
  };

  // ─────────────────────────── Transfers tab handlers ───────────────────────

  const handleApproveTransfer = async (r: TransferRecord, approve: boolean) => {
    try {
      await approveTransfer({ transferId: r.id, approve });
      tk(approve ? 'Đã duyệt chuyển viện' : 'Đã từ chối chuyển viện');
      loadTransfers(trPage);
    } catch { tw(approve ? 'Duyệt thất bại' : 'Từ chối thất bại'); }
  };

  // ─────────────────────────── Borrowing tab handlers ──────────────────────

  const handleCreateBorrow = async () => {
    setBorrowSaving(true);
    try {
      const v = await borrowForm.validateFields();
      await createBorrow({
        medicalRecordId: v.medicalRecordId.trim(),
        purpose: v.purpose?.trim() || undefined,
        borrowDays: v.borrowDays,
      });
      tk('Đã tạo phiếu mượn');
      setBorrowModal(false);
      borrowForm.resetFields();
      loadBorrowing(brPage);
    } catch (e: unknown) {
      const err = e as { errorFields?: unknown };
      if (err?.errorFields) return;
      tw('Tạo phiếu mượn thất bại');
    } finally { setBorrowSaving(false); }
  };

  const handleReturn = async () => {
    if (!returnTarget) return;
    setBorrowSaving(true);
    try {
      const v = await returnForm.validateFields();
      await returnRecord({ borrowId: returnTarget.id, note: v.note?.trim() || undefined });
      tk('Đã trả hồ sơ');
      setReturnTarget(null);
      returnForm.resetFields();
      loadBorrowing(brPage);
    } catch (e: unknown) {
      const err = e as { errorFields?: unknown };
      if (err?.errorFields) return;
      tw('Trả hồ sơ thất bại');
    } finally { setBorrowSaving(false); }
  };

  const handleExtend = async () => {
    if (!extendTarget) return;
    setBorrowSaving(true);
    try {
      const v = await extendForm.validateFields();
      await extendBorrow({ borrowId: extendTarget.id, extendDays: v.extendDays, reason: v.reason?.trim() });
      tk('Đã gia hạn mượn');
      setExtendTarget(null);
      extendForm.resetFields();
      loadBorrowing(brPage);
    } catch (e: unknown) {
      const err = e as { errorFields?: unknown };
      if (err?.errorFields) return;
      tw('Gia hạn thất bại');
    } finally { setBorrowSaving(false); }
  };

  // ─────────────────────────── Handover tab handlers ───────────────────────

  const handleApproveHandover = async (r: HandoverRecord, approve: boolean) => {
    try {
      await approveHandover({ handoverId: r.id, approve });
      tk(approve ? 'Đã duyệt bàn giao' : 'Đã từ chối bàn giao');
      loadHandover(hoPage);
    } catch { tw(approve ? 'Duyệt thất bại' : 'Từ chối thất bại'); }
  };

  // ─────────────────────────── Attendance tab handlers ─────────────────────

  const handleCheckIn = async (r: DepartmentAttendance) => {
    try {
      await checkIn({ departmentId: r.departmentId });
      tk(`Đã chấm công khoa ${r.departmentName}`);
      loadAttendance(attDate);
    } catch { tw('Chấm công thất bại'); }
  };

  // ─────────────────────────── Computed (Codes tab) ────────────────────────

  const depts = useMemo(() => {
    const set = new Set(items.map((r) => r.departmentName).filter(Boolean) as string[]);
    return Array.from(set).map((v) => ({ v, l: v }));
  }, [items]);

  const counts = useTabCounts(items, STATUS_TABS, (r) => sKey(r.status));

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    const rcFrom = fmtDay(rcRange?.[0]);
    const rcTo = fmtDay(rcRange?.[1]);
    return items.filter((r) => {
      if (stab !== 'all' && sKey(r.status) !== stab) return false;
      if (fDept && r.departmentName !== fDept) return false;
      if (rcFrom || rcTo) {
        const d = dayjs(r.createdAt).format('YYYY-MM-DD'); // ngày cấp (allocation)
        if (rcFrom && d < rcFrom) return false;
        if (rcTo && d > rcTo) return false;
      }
      if (!k) return true;
      return [r.recordCode, r.patientName, r.patientCode, r.doctorName]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fDept, rcRange]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  // ─────────────────────────── Columns ─────────────────────────────────────

  const cols: ColumnDef<RecordCode>[] = [
    { key: 'code', label: 'Mã BA', code: true, render: (r) => r.recordCode },
    { key: 'pt', label: 'Bệnh nhân', render: (r) => r.patientName ? (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.patientName}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.patientCode}</div>
      </div>
    ) : <span style={{ color: 'var(--t-2)' }}>Chưa gán</span> },
    { key: 'dept', label: 'Khoa', render: (r) => r.departmentName || '—' },
    { key: 'doc', label: 'BS', render: (r) => r.doctorName || '—' },
    { key: 'date', label: 'Ngày gán', mono: true, render: (r) => r.assignedDate ? dayjs(r.assignedDate).format('DD/MM HH:mm') : '—' },
    { key: 'by', label: 'Người gán', render: (r) => r.assignedByName || '—' },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === sKey(r.status));
      return <StatusBadge tone={t?.tone || 'info'} dot>{r.statusName}</StatusBadge>;
    } },
  ];

  const codeActions = (r: RecordCode) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      {r.status === 0 && <ActBtn ic="user" title="Gán BN" onClick={() => openAssign(r)} />}
    </div>
  );

  const trCols: ColumnDef<TransferRecord>[] = [
    { key: 'num', label: 'Số CV', code: true, render: (r) => r.transferNumber || '—' },
    { key: 'pt', label: 'Bệnh nhân', render: (r) => (
      <div>
        <div style={{ fontWeight: 600 }}>{r.patientName || '—'}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.patientCode}</div>
      </div>
    ) },
    { key: 'from', label: 'Từ khoa', render: (r) => r.fromDepartment || '—' },
    { key: 'to', label: 'Đến nơi', render: (r) => r.toDepartment || r.toHospital || '—' },
    { key: 'dx', label: 'Chẩn đoán', render: (r) => r.diagnosis || '—' },
    { key: 'date', label: 'Ngày CV', mono: true, render: (r) => r.transferDate ? dayjs(r.transferDate).format('DD/MM/YYYY') : '—' },
    { key: 'st', label: 'Trạng thái', render: (r) => (
      <StatusBadge tone={TR_TONE[r.status] || 'info'} dot>{r.statusName}</StatusBadge>
    ) },
  ];

  const trActions = (r: TransferRecord) => r.status === 0 ? (
    <div className="ab-actions">
      <ActBtn ic="check" title="Duyệt" onClick={() => cf('Duyệt chuyển viện?', () => handleApproveTransfer(r, true))} />
      <ActBtn ic="x" title="Từ chối" onClick={() => cf('Từ chối chuyển viện?', () => handleApproveTransfer(r, false), { tone: 'crit' })} />
    </div>
  ) : null;

  const brCols: ColumnDef<BorrowRecord>[] = [
    { key: 'code', label: 'Mã phiếu', code: true, render: (r) => r.borrowCode },
    { key: 'rc', label: 'Mã BA', code: true, render: (r) => r.recordCode || '—' },
    { key: 'pt', label: 'Bệnh nhân', render: (r) => (
      <div>
        <div style={{ fontWeight: 600 }}>{r.patientName || '—'}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.patientCode}</div>
      </div>
    ) },
    { key: 'borrower', label: 'Người mượn', render: (r) => r.borrowerName || '—' },
    { key: 'purpose', label: 'Mục đích', render: (r) => r.purpose || '—' },
    { key: 'bdate', label: 'Ngày mượn', mono: true, render: (r) => dayjs(r.borrowDate).format('DD/MM/YYYY') },
    { key: 'rdate', label: 'Hạn trả', mono: true, render: (r) => r.expectedReturnDate ? dayjs(r.expectedReturnDate).format('DD/MM/YYYY') : '—' },
    { key: 'st', label: 'Trạng thái', render: (r) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <StatusBadge tone={BR_TONE[r.status] || 'info'} dot>{r.statusName}</StatusBadge>
        {r.isOverdue && <StatusBadge tone="crit">Quá hạn</StatusBadge>}
      </div>
    ) },
  ];

  const brActions = (r: BorrowRecord) => (
    <div className="ab-actions">
      {(r.status === 0 || r.status === 3) && (
        <ActBtn ic="corner-down-left" title="Trả" onClick={() => { setReturnTarget(r); returnForm.resetFields(); }} />
      )}
      {r.status === 0 && (
        <ActBtn ic="clock" title="Gia hạn" onClick={() => { setExtendTarget(r); extendForm.resetFields(); }} />
      )}
    </div>
  );

  const hoCols: ColumnDef<HandoverRecord>[] = [
    { key: 'code', label: 'Mã bàn giao', code: true, render: (r) => r.handoverCode },
    { key: 'rc', label: 'Mã BA', code: true, render: (r) => r.recordCode || '—' },
    { key: 'pt', label: 'Bệnh nhân', render: (r) => (
      <div>
        <div style={{ fontWeight: 600 }}>{r.patientName || '—'}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.patientCode}</div>
      </div>
    ) },
    { key: 'dept', label: 'Khoa', render: (r) => r.departmentName || '—' },
    { key: 'submitter', label: 'Người nộp', render: (r) => r.submittedByName || '—' },
    { key: 'date', label: 'Ngày nộp', mono: true, render: (r) => r.submittedDate ? dayjs(r.submittedDate).format('DD/MM/YYYY') : '—' },
    { key: 'forms', label: 'Biểu mẫu', render: (r) => `${r.completedForms}/${r.totalForms}` },
    { key: 'st', label: 'Trạng thái', render: (r) => (
      <StatusBadge tone={HO_TONE[r.status] || 'info'} dot>{r.statusName}</StatusBadge>
    ) },
  ];

  const hoActions = (r: HandoverRecord) => r.status === 1 ? (
    <div className="ab-actions">
      <ActBtn ic="check" title="Duyệt" onClick={() => cf('Duyệt bàn giao?', () => handleApproveHandover(r, true))} />
      <ActBtn ic="x" title="Từ chối" onClick={() => cf('Từ chối bàn giao?', () => handleApproveHandover(r, false), { tone: 'crit' })} />
    </div>
  ) : null;

  const opCols: ColumnDef<OutpatientRecord>[] = [
    { key: 'rc', label: 'Mã BA', code: true, render: (r) => r.recordCode || '—' },
    { key: 'pt', label: 'Bệnh nhân', render: (r) => (
      <div>
        <div style={{ fontWeight: 600 }}>{r.patientName || '—'}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.patientCode} · {r.gender}</div>
      </div>
    ) },
    { key: 'dept', label: 'Khoa', render: (r) => r.departmentName || '—' },
    { key: 'doc', label: 'Bác sĩ', render: (r) => r.doctorName || '—' },
    { key: 'dx', label: 'Chẩn đoán', render: (r) => (
      <div>
        <div>{r.diagnosis || '—'}</div>
        {r.icdCode && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.icdCode}</div>}
      </div>
    ) },
    { key: 'date', label: 'Ngày khám', mono: true, render: (r) => dayjs(r.examinationDate).format('DD/MM/YYYY') },
    { key: 'st', label: 'Trạng thái', render: (r) => (
      <StatusBadge tone="info" dot>{r.statusName}</StatusBadge>
    ) },
  ];

  const attCols: ColumnDef<DepartmentAttendance>[] = [
    { key: 'dept', label: 'Khoa/Phòng', render: (r) => r.departmentName },
    { key: 'st', label: 'Trạng thái', render: (r) => (
      <StatusBadge tone={r.isCheckedIn ? 'ok' : 'warn'} dot>
        {r.isCheckedIn ? 'Đã chấm' : 'Chưa chấm'}
      </StatusBadge>
    ) },
    { key: 'time', label: 'Thời gian', mono: true, render: (r) => r.checkInTime ? dayjs(r.checkInTime).format('HH:mm DD/MM') : '—' },
    { key: 'by', label: 'Người chấm', render: (r) => r.checkInByName || '—' },
    { key: 'total', label: 'Tổng HS', render: (r) => String(r.totalRecords) },
    { key: 'done', label: 'Hoàn thành', render: (r) => String(r.completedRecords) },
    { key: 'pend', label: 'Chờ xử lý', render: (r) => String(r.pendingRecords) },
  ];

  const attActions = (r: DepartmentAttendance) => !r.isCheckedIn ? (
    <div className="ab-actions">
      <ActBtn ic="check-square" title="Chấm công" onClick={() => handleCheckIn(r)} />
    </div>
  ) : null;

  // ─────────────────────────── Computed ────────────────────────────────────

  const attCheckedIn = attendance.filter((r) => r.isCheckedIn).length;
  const trTotalPages = Math.max(1, Math.ceil(trTotal / PAGE_SIZE));
  const brTotalPages = Math.max(1, Math.ceil(brTotal / PAGE_SIZE));
  const hoTotalPages = Math.max(1, Math.ceil(hoTotal / PAGE_SIZE));
  const opTotalPages = Math.max(1, Math.ceil(opTotal / PAGE_SIZE));

  // ─────────────────────────── Render ──────────────────────────────────────

  return (
    <div className="ab">
      {/* ── KPI Strip (stats-based) ── */}
      <KpiStrip items={[
        { lbl: 'Tổng HS', val: stats?.totalRecords ?? '…', sub: 'tất cả' },
        { lbl: 'Đã cấp mã', val: stats?.assignedCodes ?? '…', sub: 'đang dùng', tone: 'info' },
        { lbl: 'Chuyển viện', val: stats?.totalTransfers ?? '…', sub: 'tổng số', tone: 'warn' },
        { lbl: 'Đang mượn', val: stats?.activeBorrows ?? '…', sub: 'phiếu mượn', tone: 'info' },
        { lbl: 'Quá hạn', val: stats?.overdueBorrows ?? '…', sub: 'cần xử lý', tone: 'crit' },
        { lbl: 'Bàn giao chờ', val: stats?.pendingHandovers ?? '…', sub: 'chờ duyệt', tone: 'warn' },
      ]} />

      {/* ── Top Tabs ── */}
      <TopTabs<TabKey> tab={tab} setTab={setTab} tabs={TABS} />

      {/* ══════════════════ Tab 0: Mã BA ══════════════════ */}
      {tab === 'codes' && <>
        <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
            placeholder="Tìm BN / mã BA…" />
          <Filter value={fDept} onChange={setFDept} options={depts} placeholder="▾ Khoa" />
          <DatePicker.RangePicker
            value={rcRange}
            onChange={(v) => { setRcRange(v); setPage(0); }}
            format="DD/MM/YYYY"
            placeholder={['Ngày cấp từ', 'đến']}
          />
          <Btn variant="ghost" icon="x" onClick={() => { setSearch(''); setFDept(''); setStab('all'); setRcRange(null); setPage(0); }}>Bỏ lọc</Btn>
          <span className="spacer" />
          <Btn variant="ghost" icon="refresh" onClick={load}>Làm mới</Btn>
          <Btn variant="primary" icon="plus" onClick={openBulk}>Cấp dải mã</Btn>
        </div>

        <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

        <DataTable<RecordCode>
          columns={cols} data={paged} rowKey={(r) => r.id}
          onRowClick={setSel} actions={codeActions}
          empty={loading ? 'Đang tải…' : 'Chưa có mã BA'}
        />
        <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />
      </>}

      {/* ══════════════════ Tab 1: Chuyển viện ══════════════════ */}
      {tab === 'transfers' && <>
        <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
          <SearchBox value={trSearch} onChange={(v) => { setTrSearch(v); setTrPage(0); loadTransfers(0, v); }}
            placeholder="Tìm số CV / bệnh nhân…" />
          <DatePicker.RangePicker
            value={trRange}
            onChange={(v) => { setTrRange(v); setTrPage(0); loadTransfers(0, undefined, v); }}
            format="DD/MM/YYYY"
            placeholder={['Ngày CV từ', 'đến']}
          />
          <span className="spacer" />
          <Btn variant="ghost" icon="refresh" onClick={() => loadTransfers(trPage)}>Làm mới</Btn>
        </div>

        <DataTable<TransferRecord>
          columns={trCols} data={transfers} rowKey={(r) => r.id}
          actions={trActions}
          empty={trLoading ? 'Đang tải…' : 'Không có chuyển viện'}
        />
        <Pager
          page={trPage}
          setPage={(next) => { const p = typeof next === 'function' ? next(trPage) : next; setTrPage(p); loadTransfers(p); }}
          totalPages={trTotalPages}
          total={trTotal}
          perPage={PAGE_SIZE}
        />
      </>}

      {/* ══════════════════ Tab 2: Mượn trả BA ══════════════════ */}
      {tab === 'borrowing' && <>
        <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
          <SearchBox value={brSearch} onChange={(v) => { setBrSearch(v); setBrPage(0); loadBorrowing(0, v, brStatus); }}
            placeholder="Tìm mã phiếu / bệnh nhân…" />
          <Filter
            value={brStatus}
            onChange={(v) => { setBrStatus(v); setBrPage(0); loadBorrowing(0, brSearch, v); }}
            options={BR_STATUS_OPTS}
            placeholder="▾ Trạng thái"
          />
          <span className="spacer" />
          <Btn variant="ghost" icon="refresh" onClick={() => loadBorrowing(brPage)}>Làm mới</Btn>
          <Btn variant="primary" icon="plus" onClick={() => { setBorrowModal(true); borrowForm.resetFields(); }}>
            Tạo phiếu mượn
          </Btn>
        </div>

        <DataTable<BorrowRecord>
          columns={brCols} data={borrowing} rowKey={(r) => r.id}
          actions={brActions}
          empty={brLoading ? 'Đang tải…' : 'Không có phiếu mượn'}
        />
        <Pager
          page={brPage}
          setPage={(next) => { const p = typeof next === 'function' ? next(brPage) : next; setBrPage(p); loadBorrowing(p); }}
          totalPages={brTotalPages}
          total={brTotal}
          perPage={PAGE_SIZE}
        />
      </>}

      {/* ══════════════════ Tab 3: Bàn giao BA ══════════════════ */}
      {tab === 'handover' && <>
        <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
          <SearchBox value={hoSearch} onChange={(v) => { setHoSearch(v); setHoPage(0); loadHandover(0, hoStatus, v); }}
            placeholder="Tìm mã bàn giao / bệnh nhân…" />
          <Filter
            value={hoStatus}
            onChange={(v) => { setHoStatus(v); setHoPage(0); loadHandover(0, v); }}
            options={HO_STATUS_OPTS}
            placeholder="▾ Trạng thái"
          />
          <span className="spacer" />
          <Btn variant="ghost" icon="refresh" onClick={() => loadHandover(hoPage)}>Làm mới</Btn>
        </div>

        <DataTable<HandoverRecord>
          columns={hoCols} data={handover} rowKey={(r) => r.id}
          actions={hoActions}
          empty={hoLoading ? 'Đang tải…' : 'Không có bàn giao'}
        />
        <Pager
          page={hoPage}
          setPage={(next) => { const p = typeof next === 'function' ? next(hoPage) : next; setHoPage(p); loadHandover(p); }}
          totalPages={hoTotalPages}
          total={hoTotal}
          perPage={PAGE_SIZE}
        />
      </>}

      {/* ══════════════════ Tab 4: BA Ngoại trú ══════════════════ */}
      {tab === 'outpatient' && <>
        <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
          <SearchBox value={opSearch} onChange={(v) => { setOpSearch(v); setOpPage(0); loadOutpatient(0, v); }}
            placeholder="Tìm mã BA / bệnh nhân / chẩn đoán…" />
          <DatePicker.RangePicker
            value={opRange}
            onChange={(v) => { setOpRange(v); setOpPage(0); loadOutpatient(0, undefined, v); }}
            format="DD/MM/YYYY"
            placeholder={['Ngày khám từ', 'đến']}
          />
          <span className="spacer" />
          <Btn variant="ghost" icon="refresh" onClick={() => loadOutpatient(opPage)}>Làm mới</Btn>
        </div>

        <DataTable<OutpatientRecord>
          columns={opCols} data={outpatient} rowKey={(r) => r.id}
          empty={opLoading ? 'Đang tải…' : 'Không có BA ngoại trú'}
        />
        <Pager
          page={opPage}
          setPage={(next) => { const p = typeof next === 'function' ? next(opPage) : next; setOpPage(p); loadOutpatient(p); }}
          totalPages={opTotalPages}
          total={opTotal}
          perPage={PAGE_SIZE}
        />
      </>}

      {/* ══════════════════ Tab 5: Điểm danh ══════════════════ */}
      {tab === 'attendance' && <>
        <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
          <DatePicker
            value={attDate}
            onChange={(d) => {
              if (!d) return;
              setAttDate(d);
              loadAttendance(d);
            }}
            format="DD/MM/YYYY"
            allowClear={false}
          />
          <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-2)', marginLeft: 'var(--space-8)' }}>
            Chưa chấm: <b>{attendance.length - attCheckedIn}/{attendance.length}</b> khoa
          </span>
          <span className="spacer" />
          <Btn variant="ghost" icon="refresh" onClick={() => loadAttendance(attDate)}>Làm mới</Btn>
        </div>

        <DataTable<DepartmentAttendance>
          columns={attCols} data={attendance} rowKey={(r) => r.departmentId}
          actions={attActions}
          empty={attLoading ? 'Đang tải…' : 'Không có dữ liệu điểm danh'}
        />
      </>}

      {/* ══════════════════ Codes tab: Drawer + Modals ══════════════════ */}

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="md"
        title={sel ? `Mã BA ${sel.recordCode}` : ''}
        sub={sel ? sel.statusName : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
          {sel && sel.status === 0 && (
            <Btn variant="primary" icon="user" onClick={() => { openAssign(sel); setSel(null); }}>Gán BN</Btn>
          )}
        </>}
      >
        {sel && <>
          <DrSec title="Mã BA">
            <DrField lbl="Mã"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.recordCode}</span></DrField>
            <DrField lbl="Tạo lúc">{dayjs(sel.createdAt).format('DD/MM/YYYY HH:mm')}</DrField>
            <DrField lbl="Trạng thái">
              <StatusBadge tone={STATUS_TABS.find((x) => x.v === sKey(sel.status))?.tone || 'info'} dot>
                {sel.statusName}
              </StatusBadge>
            </DrField>
          </DrSec>
          <DrSec title="Sử dụng">
            <DrField lbl="Bệnh nhân">{sel.patientName || '—'}</DrField>
            <DrField lbl="Mã BN"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.patientCode || '—'}</span></DrField>
            <DrField lbl="Khoa">{sel.departmentName || '—'}</DrField>
            <DrField lbl="BS">{sel.doctorName || '—'}</DrField>
            {sel.assignedDate && <DrField lbl="Ngày gán">{dayjs(sel.assignedDate).format('DD/MM/YYYY HH:mm')}</DrField>}
            <DrField lbl="Người gán">{sel.assignedByName || '—'}</DrField>
          </DrSec>
        </>}
      </DrawerShell>

      {/* Modal Gán BN */}
      <ModalShell
        open={!!assignTarget}
        onClose={() => { setAssignTarget(null); assignForm.resetFields(); }}
        title={assignTarget ? `Gán BN cho mã BA · ${assignTarget.recordCode}` : 'Gán BN'}
        size="md"
        footer={<>
          <Btn variant="ghost" onClick={() => { setAssignTarget(null); assignForm.resetFields(); }}>Hủy</Btn>
          <Btn variant="primary" onClick={handleAssign} loading={assignSaving}>
            <Ico name="check" size={12} /> Xác nhận gán
          </Btn>
        </>}
      >
        <div style={{ padding: '8px 0' }}>
          <div style={{ padding: 'var(--space-10)', marginBottom: 'var(--space-14)', background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 4, fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>
            Gán bệnh nhân (qua ExaminationId) cho mã BA{' '}
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--t-0)' }}>{assignTarget?.recordCode}</span>.
          </div>
          <Form form={assignForm} layout="vertical">
            <Form.Item name="examinationId" label="ExaminationId (lần khám)" rules={[{ required: true, message: 'Nhập ExaminationId' }]}>
              <Input placeholder="VD: 3fa85f64-5717-4562-b3fc-2c963f66afa6" style={{ fontFamily: 'var(--font-mono)' }} />
            </Form.Item>
          </Form>
        </div>
      </ModalShell>

      {/* Modal Cấp dải mã */}
      <ModalShell
        open={bulkOpen}
        onClose={() => { setBulkOpen(false); setBulkResult(null); bulkForm.resetFields(); }}
        title="Cấp dải mã BA"
        size="lg"
        footer={bulkResult ? (
          <Btn variant="primary" onClick={() => { setBulkOpen(false); setBulkResult(null); bulkForm.resetFields(); }}>Đóng</Btn>
        ) : (
          <>
            <Btn variant="ghost" onClick={() => setBulkOpen(false)}>Hủy</Btn>
            <Btn variant="primary" onClick={handleBulkAllocate} loading={bulkSaving}>
              <Ico name="plus" size={12} /> Cấp mã
            </Btn>
          </>
        )}
      >
        {bulkResult ? (
          <div style={{ padding: '8px 0' }}>
            <div style={{ marginBottom: 'var(--space-12)', padding: 'var(--space-12)', background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 4 }}>
              <div style={{ fontWeight: 600, marginBottom: 'var(--space-6)', color: 'var(--t-0)' }}>{bulkResult.message}</div>
              <div style={{ display: 'flex', gap: 'var(--space-16)', fontSize: 'var(--fs-md)' }}>
                <span>Yêu cầu: <b>{bulkResult.requested}</b></span>
                <span style={{ color: 'var(--a-gn-text)' }}>Cấp: <b>{bulkResult.allocated}</b></span>
                <span style={{ color: 'var(--a-or-text)' }}>Bỏ qua: <b>{bulkResult.skipped}</b></span>
                <span style={{ color: 'var(--a-rd-text)' }}>Lỗi: <b>{bulkResult.failed}</b></span>
              </div>
            </div>
            {bulkResult.allocatedCodes.length > 0 && (
              <DrSec title={`Mã đã cấp (${bulkResult.allocatedCodes.length})`}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)', lineHeight: '22px', color: 'var(--t-1)' }}>
                  {bulkResult.allocatedCodes.join(' · ')}
                </div>
              </DrSec>
            )}
            {bulkResult.errors.length > 0 && (
              <DrSec title="Lỗi">
                {bulkResult.errors.map((e, i) => (
                  <div key={i} style={{ fontSize: 'var(--fs-sm)', color: 'var(--a-rd-text)', marginBottom: 'var(--space-2)' }}>{e}</div>
                ))}
              </DrSec>
            )}
          </div>
        ) : (
          <Form form={bulkForm} layout="vertical" style={{ padding: '8px 0' }}>
            <Form.Item name="departmentId" label="Department ID">
              <Input placeholder="UUID khoa (để trống nếu không cần)" style={{ fontFamily: 'var(--font-mono)' }} />
            </Form.Item>
            <Divider style={{ margin: '8px 0', borderColor: 'var(--line)' }}>
              <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>Chọn 1 trong 2 cách cấp mã</span>
            </Divider>
            <div style={{ marginBottom: 'var(--space-8)', fontSize: 'var(--fs-sm)', color: 'var(--t-2)', fontWeight: 600 }}>Cách 1: Prefix + Số lượng</div>
            <div style={{ display: 'flex', gap: 'var(--space-8)' }}>
              <Form.Item name="prefix" label="Prefix" style={{ flex: 1 }}>
                <Input placeholder="VD: HS" />
              </Form.Item>
              <Form.Item name="count" label="Số lượng" style={{ flex: 1 }}>
                <InputNumber min={1} max={1000} style={{ width: '100%' }} placeholder="VD: 100" />
              </Form.Item>
            </div>
            <div style={{ marginBottom: 'var(--space-8)', fontSize: 'var(--fs-sm)', color: 'var(--t-2)', fontWeight: 600 }}>Cách 2: Dải từ — đến</div>
            <div style={{ display: 'flex', gap: 'var(--space-8)' }}>
              <Form.Item name="fromCode" label="Từ mã" style={{ flex: 1 }}>
                <Input placeholder="VD: HS0001" style={{ fontFamily: 'var(--font-mono)' }} />
              </Form.Item>
              <Form.Item name="toCode" label="Đến mã" style={{ flex: 1 }}>
                <Input placeholder="VD: HS0100" style={{ fontFamily: 'var(--font-mono)' }} />
              </Form.Item>
            </div>
          </Form>
        )}
      </ModalShell>

      {/* Modal Tạo phiếu mượn */}
      <ModalShell
        open={borrowModal}
        onClose={() => { setBorrowModal(false); borrowForm.resetFields(); }}
        title="Tạo phiếu mượn hồ sơ"
        size="md"
        footer={<>
          <Btn variant="ghost" onClick={() => { setBorrowModal(false); borrowForm.resetFields(); }}>Hủy</Btn>
          <Btn variant="primary" onClick={handleCreateBorrow} loading={borrowSaving}>
            <Ico name="check" size={12} /> Tạo phiếu
          </Btn>
        </>}
      >
        <Form form={borrowForm} layout="vertical" style={{ padding: '8px 0' }}>
          <Form.Item
            name="medicalRecordId"
            label="ID hồ sơ bệnh án"
            rules={[{ required: true, message: 'Nhập ID hồ sơ' }]}
          >
            <Input placeholder="UUID hồ sơ" style={{ fontFamily: 'var(--font-mono)' }} />
          </Form.Item>
          <Form.Item name="purpose" label="Mục đích mượn">
            <Input.TextArea rows={2} placeholder="Nhập mục đích (không bắt buộc)" />
          </Form.Item>
          <Form.Item name="borrowDays" label="Số ngày mượn" initialValue={7}>
            <InputNumber min={1} max={90} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </ModalShell>

      {/* Modal Trả hồ sơ */}
      <ModalShell
        open={!!returnTarget}
        onClose={() => { setReturnTarget(null); returnForm.resetFields(); }}
        title="Trả hồ sơ bệnh án"
        size="md"
        footer={<>
          <Btn variant="ghost" onClick={() => { setReturnTarget(null); returnForm.resetFields(); }}>Hủy</Btn>
          <Btn variant="primary" onClick={handleReturn} loading={borrowSaving}>
            <Ico name="corner-down-left" size={12} /> Xác nhận trả
          </Btn>
        </>}
      >
        {returnTarget && (
          <div style={{ padding: '8px 0' }}>
            <div style={{ padding: 'var(--space-10)', marginBottom: 'var(--space-14)', background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 4, fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>
              <div>Phiếu mượn: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--t-0)' }}>{returnTarget.borrowCode}</span></div>
              <div>Bệnh nhân: <b style={{ color: 'var(--t-0)' }}>{returnTarget.patientName || '—'}</b></div>
            </div>
            <Form form={returnForm} layout="vertical">
              <Form.Item name="note" label="Ghi chú">
                <Input.TextArea rows={3} placeholder="Ghi chú khi trả (không bắt buộc)" />
              </Form.Item>
            </Form>
          </div>
        )}
      </ModalShell>

      {/* Modal Gia hạn */}
      <ModalShell
        open={!!extendTarget}
        onClose={() => { setExtendTarget(null); extendForm.resetFields(); }}
        title="Gia hạn mượn hồ sơ"
        size="md"
        footer={<>
          <Btn variant="ghost" onClick={() => { setExtendTarget(null); extendForm.resetFields(); }}>Hủy</Btn>
          <Btn variant="primary" onClick={handleExtend} loading={borrowSaving}>
            <Ico name="clock" size={12} /> Gia hạn
          </Btn>
        </>}
      >
        {extendTarget && (
          <div style={{ padding: '8px 0' }}>
            <div style={{ padding: 'var(--space-10)', marginBottom: 'var(--space-14)', background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 4, fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>
              <div>Phiếu mượn: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--t-0)' }}>{extendTarget.borrowCode}</span></div>
              <div>Bệnh nhân: <b style={{ color: 'var(--t-0)' }}>{extendTarget.patientName || '—'}</b></div>
            </div>
            <Form form={extendForm} layout="vertical">
              <Form.Item name="extendDays" label="Số ngày gia hạn" initialValue={7} rules={[{ required: true, message: 'Nhập số ngày' }]}>
                <InputNumber min={1} max={30} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="reason" label="Lý do gia hạn" rules={[{ required: true, message: 'Nhập lý do' }]}>
                <Input.TextArea rows={3} placeholder="Lý do gia hạn" />
              </Form.Item>
            </Form>
          </div>
        )}
      </ModalShell>
    </div>
  );
};

export default MedicalRecordPlanningV2;
