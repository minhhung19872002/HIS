import React, { useState, useEffect, useCallback, useMemo } from 'react';
import dayjs from 'dayjs';
import { App as AntdApp, Form, Input, DatePicker, Select, Row, Col } from 'antd';
import {
  getEquipment, getMaintenanceSchedules, getRepairRequests,
  createEquipment, createMaintenanceRecord, createRepairRequest, getEquipmentCategories,
  type EquipmentDto, type CreateEquipmentDto, type MaintenanceScheduleDto,
  type RepairRequestDto, type EquipmentCategoryDto,
} from '../api/equipment';
import {
  KpiStrip, TopTabs, StatusTabs, SearchBox, Filter, DataTable, Pager,
  StatusBadge, ActBtn, ModalShell, DrawerShell, Btn,
  type ColumnDef, type StatusTab, type KpiItem, type TopTab,
} from '../../../pages-v2/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';
import { HOSPITAL_NAME } from '../../../constants/hospital';

/* ── Trang thiết bị y tế — v2 ────────────────────────────────────────────── */

// ── Status config ─────────────────────────────────────────────────────────────

type StatusKey = 'operational' | 'maintenance' | 'broken' | 'decommissioned';

const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'operational',    l: 'Hoạt động', tone: 'ok'   },
  { v: 'maintenance',    l: 'Bảo trì',   tone: 'warn' },
  { v: 'broken',         l: 'Hỏng',      tone: 'crit' },
  { v: 'decommissioned', l: 'Thanh lý',  tone: 'info' },
];

const statusKey = (s: number): StatusKey =>
  s === 2 ? 'maintenance' : s === 3 ? 'broken' : s === 4 ? 'decommissioned' : 'operational';

// ── Format helpers ─────────────────────────────────────────────────────────────

const fmtDMY = (iso?: string | null) => iso ? dayjs(iso).format('DD/MM/YYYY') : '—';
const fmtVND = (n?: number | null) => n != null ? `${n.toLocaleString('vi-VN')} ₫` : '—';

// ── Page tabs ──────────────────────────────────────────────────────────────────

type PageTab = 'list' | 'maintenance' | 'repairs' | 'calibration';

const PAGE_TABS: TopTab<PageTab>[] = [
  { v: 'list',        l: 'Danh sách thiết bị', ic: 'activity' },
  { v: 'maintenance', l: 'Lịch bảo trì',       ic: 'check'    },
  { v: 'repairs',     l: 'Yêu cầu sửa chữa',   ic: 'tool'     },
  { v: 'calibration', l: 'Kiểm định',           ic: 'info'     },
];

const PER_PAGE = 16;

// ── Form value types ───────────────────────────────────────────────────────────

type MaintFormValues = {
  maintenanceType: string;
  scheduledDate?: dayjs.Dayjs | null;
  description?: string;
  notes?: string;
};

type RepairFormValues = {
  priority: number;
  issueDescription: string;
  reportedBy?: string;
};

type AddEquipmentFormValues = {
  equipmentCode: string;
  name: string;
  category: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  departmentId: string;
  riskClass: string;
  trainingRequired: boolean;
  purchaseDate?: dayjs.Dayjs | null;
  purchasePrice?: string;
  warrantyExpiry?: dayjs.Dayjs | null;
  notes?: string;
};

// ── Main component ─────────────────────────────────────────────────────────────

const EquipmentV2: React.FC = () => {
  const { message } = AntdApp.useApp();

  // Tab state
  const [tab, setTab] = useState<PageTab>('list');

  // Data
  const [equipment, setEquipment] = useState<EquipmentDto[]>([]);
  const [maintenanceSchedules, setMaintenanceSchedules] = useState<MaintenanceScheduleDto[]>([]);
  const [repairRequests, setRepairRequests] = useState<RepairRequestDto[]>([]);
  const [loading, setLoading] = useState(false);

  // List filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusKey | 'all'>('all');
  const [riskFilter, setRiskFilter] = useState('');
  const [page, setPage] = useState(0);

  // Modal state
  const [detailEq, setDetailEq] = useState<EquipmentDto | null>(null);
  const [maintTarget, setMaintTarget] = useState<EquipmentDto | null>(null);
  const [repairTarget, setRepairTarget] = useState<EquipmentDto | null>(null);
  const [showAddEq, setShowAddEq] = useState(false);
  const [categories, setCategories] = useState<EquipmentCategoryDto[]>([]);
  const [addLoading, setAddLoading] = useState(false);

  // Forms
  const [maintForm] = Form.useForm<MaintFormValues>();
  const [repairForm] = Form.useForm<RepairFormValues>();
  const [addForm] = Form.useForm<AddEquipmentFormValues>();

  // ── Data loading ───────────────────────────────────────────────────────────

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [eqRes, maintRes, repairRes] = await Promise.allSettled([
        getEquipment({ page: 1, pageSize: 200, keyword: search || undefined }),
        getMaintenanceSchedules(undefined, 90),
        getRepairRequests(),
      ]);
      if (eqRes.status === 'fulfilled') {
        // #352 CRITICAL: GET /api/equipment trả MẢNG TRẦN (EquipmentController.cs:35-40 →
        // GetEquipmentListAsync trả List<...>), KHÔNG phải {items}. v2 chỉ đọc
        // `data?.items` ⇒ luôn rỗng ⇒ danh sách + KPI + đếm trạng thái + tab Kiểm định đều trắng.
        // v1 xử lý cả 2 shape (pages/Equipment.tsx:113) nên vẫn hiển thị được.
        const raw = eqRes.value.data as unknown;
        setEquipment(
          Array.isArray(raw)
            ? (raw as EquipmentDto[])
            : ((raw as { items?: EquipmentDto[] } | undefined)?.items || []),
        );
      }
      if (maintRes.status === 'fulfilled') setMaintenanceSchedules(maintRes.value.data || []);
      if (repairRes.status === 'fulfilled') setRepairRequests(repairRes.value.data || []);
    } catch {
      message.warning('Không thể tải dữ liệu trang thiết bị');
    } finally {
      setLoading(false);
    }
  }, [message, search]);

  useEffect(() => { void reload(); }, [reload]);

  // Reset page on filter/tab change
  useEffect(() => { setPage(0); }, [search, statusFilter, riskFilter, tab]);

  // ── Derived data ───────────────────────────────────────────────────────────

  const filteredEq = useMemo(() => {
    let rows = equipment;
    if (statusFilter !== 'all') rows = rows.filter((r) => statusKey(r.operationalStatus) === statusFilter);
    if (riskFilter) rows = rows.filter((r) => r.riskClass === riskFilter);
    return rows;
  }, [equipment, statusFilter, riskFilter]);

  const pagedEq = filteredEq.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const totalPages = Math.max(1, Math.ceil(filteredEq.length / PER_PAGE));

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { all: equipment.length };
    STATUS_TABS.forEach((s) => {
      c[s.v] = equipment.filter((r) => statusKey(r.operationalStatus) === s.v).length;
    });
    return c;
  }, [equipment]);

  // Equipment requiring calibration (from v1: class A/B/I/II)
  const calibEq = useMemo(
    () => equipment.filter((e) => ['A', 'B', 'I', 'II'].includes(e.riskClass)),
    [equipment],
  );

  const pendingRepairs = useMemo(() => repairRequests.filter((r) => r.status < 4).length, [repairRequests]);
  const maintenanceDue = useMemo(
    () => maintenanceSchedules.filter((m) => m.status === 1 || m.status === 2).length,
    [maintenanceSchedules],
  );

  // ── KPIs ───────────────────────────────────────────────────────────────────

  const kpis = useMemo((): KpiItem[] => {
    const today = dayjs();
    const operational = equipment.filter((r) => r.operationalStatus === 1).length;
    const maint = equipment.filter((r) => r.operationalStatus === 2).length;
    const broken = equipment.filter((r) => r.operationalStatus === 3).length;
    const overdueMaint = equipment.filter((r) => r.nextMaintenanceDate && dayjs(r.nextMaintenanceDate).isBefore(today, 'day')).length;
    const expiredWarranty = equipment.filter((r) => r.warrantyExpiry && dayjs(r.warrantyExpiry).isBefore(today, 'day')).length;
    const expiringWarranty = equipment.filter((r) => {
      const d = r.warrantyExpiry ? dayjs(r.warrantyExpiry).diff(today, 'day') : null;
      return d != null && d >= 0 && d < 90;
    }).length;
    return [
      { lbl: 'Tổng TB', val: equipment.length },
      { lbl: 'Hoạt động', val: operational, sub: equipment.length > 0 ? `${Math.round(operational / equipment.length * 100)}%` : '—', tone: 'ok' },
      { lbl: 'Bảo trì', val: maint, tone: 'warn' },
      { lbl: 'Hỏng', val: broken, tone: 'crit' },
      { lbl: 'Quá hạn BT', val: overdueMaint, tone: 'crit' },
      { lbl: 'Hết BH', val: expiredWarranty, sub: `+${expiringWarranty} sắp hết`, tone: 'warn' },
      { lbl: 'YC sửa chữa', val: pendingRepairs, tone: pendingRepairs > 0 ? 'warn' : 'info' },
      { lbl: 'Lịch BT tới hạn', val: maintenanceDue, tone: maintenanceDue > 0 ? 'warn' : 'info' },
    ];
  }, [equipment, pendingRepairs, maintenanceDue]);

  // ── Action handlers ────────────────────────────────────────────────────────

  // Open add equipment modal; lazy-load categories
  const handleOpenAddEq = async () => {
    setShowAddEq(true);
    if (categories.length === 0) {
      try {
        const res = await getEquipmentCategories();
        setCategories(res.data || []);
      } catch { /* categories optional — form still works with manual input */ }
    }
  };

  // Create equipment (verbatim from v1)
  const handleAddEquipment = async () => {
    setAddLoading(true);
    try {
      const values = await addForm.validateFields();
      const dto: CreateEquipmentDto = {
        equipmentCode: values.equipmentCode,
        name: values.name,
        category: values.category,
        manufacturer: values.manufacturer,
        model: values.model,
        serialNumber: values.serialNumber,
        departmentId: values.departmentId,
        riskClass: values.riskClass,
        trainingRequired: values.trainingRequired ?? false,
        purchaseDate: values.purchaseDate ? dayjs(values.purchaseDate).format('YYYY-MM-DD') : undefined,
        purchasePrice: values.purchasePrice ? Number(values.purchasePrice) : undefined,
        warrantyExpiry: values.warrantyExpiry ? dayjs(values.warrantyExpiry).format('YYYY-MM-DD') : undefined,
        notes: values.notes,
      };
      await createEquipment(dto);
      message.success('Đã thêm thiết bị thành công');
      setShowAddEq(false);
      addForm.resetFields();
      void reload();
    } catch (err) {
      // AntD validation rejects with { errorFields } — don't show error toast in that case
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      message.error('Thêm thiết bị thất bại — vui lòng thử lại');
    } finally {
      setAddLoading(false);
    }
  };

  // Schedule maintenance for a specific equipment (row action)
  const handleScheduleMaintenance = async () => {
    if (!maintTarget) return;
    try {
      const v = await maintForm.validateFields();
      const scheduledIso = v.scheduledDate ? v.scheduledDate.toISOString() : undefined;
      await createMaintenanceRecord({
        equipmentId: maintTarget.id,
        maintenanceType: v.maintenanceType || 'Preventive',
        scheduledDate: scheduledIso,
        performedDate: new Date().toISOString(),
        description: v.description || '',
        workPerformed: v.description || '',
        afterStatus: maintTarget.operationalStatus,
        nextMaintenanceDate: scheduledIso,
        notes: v.notes,
      });
      message.success(`Đã lên lịch bảo trì cho ${maintTarget.name}`);
      setMaintTarget(null);
      void reload();
    } catch (err) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      message.warning('Lên lịch bảo trì thất bại');
    }
  };

  // Report repair for a specific equipment (row action — verbatim from v1)
  const handleSubmitRepair = async () => {
    if (!repairTarget) return;
    try {
      const v = await repairForm.validateFields();
      await createRepairRequest({
        equipmentId: repairTarget.id,
        priority: v.priority,
        problemDescription: v.issueDescription,
        equipmentLocation: repairTarget.locationName || repairTarget.departmentName,
        contactPerson: v.reportedBy ?? '',
      });
      message.success('Đã gửi yêu cầu sửa chữa');
      setRepairTarget(null);
      repairForm.resetFields();
      void reload();
    } catch (err) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      message.warning('Không thể gửi yêu cầu sửa chữa');
    }
  };

  // Print equipment card (ported verbatim from v1)
  const handlePrint = (eq: EquipmentDto) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Phiếu thiết bị</title>
  <style>
    body { font-family: 'Times New Roman', serif; padding: 20px; max-width: 800px; margin: auto; }
    .header { text-align: center; margin-bottom: 20px; }
    .title { font-size: 20px; font-weight: bold; margin: 20px 0; text-align: center; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #000; padding: 8px; text-align: left; }
    th { background: #f0f0f0; width: 30%; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <!-- #352: v1 in tên bệnh viện ở đầu phiếu (pages/Equipment.tsx:261); v2 bỏ mất → phiếu pháp lý
       không có đơn vị phát hành. Lấy từ env qua constants/hospital.ts như các form in khác. -->
  <div class="header"><strong>${HOSPITAL_NAME}</strong></div>
  <div class="header"><strong>PHÒNG VẬT TƯ - THIẾT BỊ Y TẾ</strong></div>
  <div class="title">PHIẾU LÝ LỊCH THIẾT BỊ Y TẾ</div>
  <table>
    <tr><th>Mã thiết bị</th><td>${eq.equipmentCode}</td></tr>
    <tr><th>Tên thiết bị</th><td>${eq.name}</td></tr>
    <tr><th>Hãng sản xuất</th><td>${eq.manufacturer}</td></tr>
    <tr><th>Model</th><td>${eq.model}</td></tr>
    <tr><th>Số seri</th><td>${eq.serialNumber}</td></tr>
    <tr><th>Khoa/Phòng</th><td>${eq.departmentName}</td></tr>
    <tr><th>Vị trí</th><td>${eq.locationName || eq.roomName || '-'}</td></tr>
    <tr><th>Ngày mua</th><td>${eq.purchaseDate || '-'}</td></tr>
    <tr><th>Hạn bảo hành</th><td>${eq.warrantyExpiry || 'Hết bảo hành'}</td></tr>
    <tr><th>Nhóm nguy cơ</th><td>${eq.riskClass}</td></tr>
    <tr><th>Nguyên giá</th><td>${(eq.purchasePrice || 0).toLocaleString('vi-VN')} VND</td></tr>
    <tr><th>Trạng thái</th><td>${eq.operationalStatusName}</td></tr>
  </table>
  <div style="margin-top: 50px; text-align: right;">
    <p>Ngày ${dayjs().format('DD/MM/YYYY')}</p>
    <p><strong>Trưởng phòng VTYT</strong></p>
  </div>
  <script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`);
    printWindow.document.close();
  };

  // ── Column definitions ─────────────────────────────────────────────────────

  const equipColumns: ColumnDef<EquipmentDto>[] = [
    { key: 'code', label: 'Mã TB', mono: true, width: 130, render: (r) => r.equipmentCode },
    {
      key: 'name', label: 'Tên / Hãng',
      render: (r) => (
        <div className="cell-2l">
          <b>{r.name}</b>
          <i>{r.manufacturer} · {r.model}</i>
        </div>
      ),
    },
    { key: 'cat', label: 'Loại', width: 140, render: (r) => r.categoryName || r.category },
    { key: 'serial', label: 'Serial', mono: true, width: 130, render: (r) => r.serialNumber },
    {
      key: 'risk', label: 'Risk', width: 80,
      render: (r) => (
        <span className={`chip ${r.riskClass === 'III' || r.riskClass === 'A' ? 'crit' : r.riskClass === 'II' || r.riskClass === 'B' ? 'warn' : 'info'}`}>
          {r.riskClass}
        </span>
      ),
    },
    {
      key: 'dept', label: 'Khoa · Phòng',
      render: (r) => (
        <div className="cell-2l">
          <b>{r.departmentName}</b>
          <i>{r.roomName || r.locationName || '—'}</i>
        </div>
      ),
    },
    {
      key: 'maint', label: 'Bảo trì kế tiếp', mono: true, width: 130,
      render: (r) => {
        if (!r.nextMaintenanceDate) return '—';
        const days = dayjs(r.nextMaintenanceDate).diff(dayjs(), 'day');
        const color = days < 0 ? 'var(--s-crit)' : days < 30 ? 'var(--s-warn)' : 'var(--t-1)';
        return <span style={{ color }}>{fmtDMY(r.nextMaintenanceDate)}</span>;
      },
    },
    {
      key: 'warranty', label: 'Bảo hành', mono: true, width: 110,
      render: (r) => {
        if (!r.warrantyExpiry) return '—';
        const days = dayjs(r.warrantyExpiry).diff(dayjs(), 'day');
        return days < 0
          ? <span className="chip crit">Hết</span>
          : days < 90
            ? <span className="chip warn">{fmtDMY(r.warrantyExpiry)}</span>
            : <span style={{ color: 'var(--t-1)' }}>{fmtDMY(r.warrantyExpiry)}</span>;
      },
    },
    {
      key: 'status', label: 'TT', width: 130,
      render: (r) => {
        const sk = statusKey(r.operationalStatus);
        const tab = STATUS_TABS.find((t) => t.v === sk);
        return <StatusBadge tone={tab?.tone} dot>{r.operationalStatusName || tab?.l}</StatusBadge>;
      },
    },
  ];

  // Maintenance schedule columns (ported from v1)
  const maintColumns: ColumnDef<MaintenanceScheduleDto>[] = [
    {
      key: 'eq', label: 'Thiết bị',
      render: (r) => (
        <div className="cell-2l">
          <b>{r.equipmentName}</b>
          <i>{r.equipmentCode} · {r.departmentName}</i>
        </div>
      ),
    },
    { key: 'type', label: 'Loại', width: 150, render: (r) => r.maintenanceTypeName },
    { key: 'freq', label: 'Tần suất', width: 120, render: (r) => r.frequencyName },
    {
      key: 'due', label: 'Đến hạn', mono: true, width: 120,
      render: (r) => {
        const days = dayjs(r.nextDueDate).diff(dayjs(), 'day');
        const color = days < 0 ? 'var(--s-crit)' : days < 14 ? 'var(--s-warn)' : 'var(--t-1)';
        return <span style={{ color }}>{fmtDMY(r.nextDueDate)}</span>;
      },
    },
    { key: 'assign', label: 'Đơn vị thực hiện', width: 160, render: (r) => r.assignedToName || '—' },
    {
      key: 'status', label: 'TT', width: 100,
      render: (r) => {
        const toneMap: Record<number, 'ok' | 'info' | 'warn' | 'crit'> = { 1: 'info', 2: 'warn', 3: 'ok', 4: 'crit' };
        return <StatusBadge tone={toneMap[r.status] ?? 'info'} dot>{r.statusName}</StatusBadge>;
      },
    },
  ];

  // Repair request columns (ported from v1)
  const repairColumns: ColumnDef<RepairRequestDto>[] = [
    {
      key: 'eq', label: 'Thiết bị',
      render: (r) => (
        <div className="cell-2l">
          <b>{r.equipmentName}</b>
          <i>{r.departmentName}</i>
        </div>
      ),
    },
    {
      key: 'desc', label: 'Mô tả lỗi',
      render: (r) => (
        <span style={{ display: 'block', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {r.problemDescription}
        </span>
      ),
    },
    {
      key: 'priority', label: 'Ưu tiên', width: 110,
      render: (r) => {
        const toneMap: Record<number, 'ok' | 'info' | 'warn' | 'crit'> = { 1: 'info', 2: 'info', 3: 'warn', 4: 'crit' };
        return <StatusBadge tone={toneMap[r.priority] ?? 'info'} dot>{r.priorityName}</StatusBadge>;
      },
    },
    {
      key: 'status', label: 'TT', width: 120,
      render: (r) => {
        const toneMap: Record<number, 'ok' | 'info' | 'warn' | 'crit'> = { 1: 'warn', 2: 'info', 3: 'info', 4: 'ok', 5: 'crit' };
        return <StatusBadge tone={toneMap[r.status] ?? 'info'} dot>{r.statusName}</StatusBadge>;
      },
    },
    { key: 'date', label: 'Ngày báo', mono: true, width: 110, render: (r) => fmtDMY(r.requestedDate) },
  ];

  // Calibration columns (ported from v1)
  const calibColumns: ColumnDef<EquipmentDto>[] = [
    {
      key: 'eq', label: 'Thiết bị',
      render: (r) => (
        <div className="cell-2l">
          <b>{r.name}</b>
          <i>{r.equipmentCode}</i>
        </div>
      ),
    },
    {
      key: 'risk', label: 'Nhóm', width: 90,
      render: (r) => (
        <span className={`chip ${r.riskClass === 'III' || r.riskClass === 'A' ? 'crit' : r.riskClass === 'II' || r.riskClass === 'B' ? 'warn' : 'info'}`}>
          {r.riskClass}
        </span>
      ),
    },
    { key: 'dept', label: 'Khoa/Phòng', width: 160, render: (r) => r.departmentName },
    { key: 'last', label: 'KĐ lần cuối', mono: true, width: 120, render: (r) => fmtDMY(r.lastCalibrationDate) },
    {
      key: 'next', label: 'KĐ tiếp theo', mono: true, width: 120,
      render: (r) => {
        if (!r.nextCalibrationDate) return '—';
        const days = dayjs(r.nextCalibrationDate).diff(dayjs(), 'day');
        const color = days < 0 ? 'var(--s-crit)' : days < 30 ? 'var(--s-warn)' : 'var(--t-1)';
        return <span style={{ color }}>{fmtDMY(r.nextCalibrationDate)}</span>;
      },
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="ab">
        <KpiStrip items={kpis} />

        <TopTabs
          tab={tab}
          setTab={setTab}
          tabs={PAGE_TABS}
          actions={
            <Btn variant="primary" onClick={() => { void handleOpenAddEq(); }}>
              + Thêm thiết bị
            </Btn>
          }
        />

        {/* ── Tab: Danh sách thiết bị ──────────────────────────────────── */}
        {tab === 'list' && (
          <>
            <div className="ab-tools">
              <SearchBox
                value={search}
                onChange={setSearch}
                placeholder="Tìm mã TB / tên / model / serial…"
              />
              <Filter
                value={riskFilter}
                onChange={setRiskFilter}
                options={[
                  { v: 'I',   l: 'Class I'   },
                  { v: 'II',  l: 'Class II'  },
                  { v: 'III', l: 'Class III' },
                ]}
                placeholder="▾ Risk class"
              />
              <button
                type="button"
                className="ab-btn ghost"
                onClick={() => { setSearch(''); setRiskFilter(''); setStatusFilter('all'); setPage(0); }}
              >
                <TermIcon name="refresh" size={12} /> Bỏ lọc
              </button>
              <span className="spacer" />
              <button type="button" className="ab-btn ghost" onClick={() => { void reload(); }}>
                <TermIcon name="refresh" size={12} /> Làm mới
              </button>
            </div>

            <StatusTabs<StatusKey>
              value={statusFilter}
              onChange={setStatusFilter}
              tabs={STATUS_TABS}
              counts={statusCounts}
            />

            <DataTable<EquipmentDto>
              columns={equipColumns}
              data={pagedEq}
              rowKey={(r) => r.id}
              onRowClick={(r) => setDetailEq(r)}
              actions={(r) => (
                <div className="ab-actions">
                  <ActBtn ic="eye" title="Chi tiết" onClick={() => setDetailEq(r)} />
                  <ActBtn
                    ic="check"
                    title="Lên lịch bảo trì"
                    onClick={() => { setMaintTarget(r); maintForm.resetFields(); }}
                  />
                  <ActBtn
                    ic="x"
                    title="Báo hỏng"
                    tone="crit"
                    onClick={() => { setRepairTarget(r); repairForm.resetFields(); }}
                  />
                </div>
              )}
            />

            <Pager
              page={page}
              totalPages={totalPages}
              setPage={setPage}
              total={filteredEq.length}
              perPage={PER_PAGE}
            />
          </>
        )}

        {/* ── Tab: Lịch bảo trì ────────────────────────────────────────── */}
        {tab === 'maintenance' && (
          <DataTable<MaintenanceScheduleDto>
            columns={maintColumns}
            data={maintenanceSchedules}
            rowKey={(r) => r.id}
            empty={loading ? 'Đang tải…' : 'Không có lịch bảo trì nào trong 90 ngày tới'}
          />
        )}

        {/* ── Tab: Yêu cầu sửa chữa ────────────────────────────────────── */}
        {tab === 'repairs' && (
          <DataTable<RepairRequestDto>
            columns={repairColumns}
            data={repairRequests}
            rowKey={(r) => r.id}
            empty={loading ? 'Đang tải…' : 'Không có yêu cầu sửa chữa nào'}
          />
        )}

        {/* ── Tab: Kiểm định ───────────────────────────────────────────── */}
        {tab === 'calibration' && (
          <>
            <div
              className="rec-section"
              style={{ padding: 'var(--space-14) var(--space-16)', borderBottom: '1px solid var(--line)' }}
            >
              <h5 style={{
                marginBottom: 'var(--space-8)',
                color: 'var(--t-2)',
                fontSize: 'var(--fs-sm)',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                <TermIcon name="info" size={11} /> QUY ĐỊNH KIỂM ĐỊNH
              </h5>
              <ul style={{
                margin: 0,
                paddingLeft: 'var(--space-18)',
                color: 'var(--t-1)',
                fontSize: 'var(--fs-sm)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-4)',
              }}>
                <li><strong>Nhóm A / Class III:</strong> Kiểm định mỗi 1 năm (X-quang, CT, MRI, máy gia tốc)</li>
                <li><strong>Nhóm B / Class II:</strong> Kiểm định mỗi 2 năm</li>
                <li><strong>Nhóm C / Class I:</strong> Kiểm định khi cần thiết</li>
              </ul>
            </div>
            <DataTable<EquipmentDto>
              columns={calibColumns}
              data={calibEq}
              rowKey={(r) => r.id}
              onRowClick={(r) => setDetailEq(r)}
              empty={loading ? 'Đang tải…' : 'Không có thiết bị cần kiểm định'}
            />
          </>
        )}
      </div>

      {/* ── Modal: Lên lịch bảo trì ─────────────────────────────────────── */}
      <ModalShell
        open={!!maintTarget}
        onClose={() => setMaintTarget(null)}
        title={maintTarget ? `Lên lịch bảo trì: ${maintTarget.name}` : ''}
        sub={maintTarget ? `${maintTarget.equipmentCode} · ${maintTarget.departmentName}` : ''}
        size="md"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setMaintTarget(null)}>Hủy</Btn>
            <Btn variant="primary" onClick={() => { void handleScheduleMaintenance(); }}>Lưu lịch</Btn>
          </>
        }
      >
        {maintTarget && (
          <Form form={maintForm} layout="vertical">
            <Form.Item name="maintenanceType" label="Loại bảo trì" initialValue="Preventive">
              <Select options={[
                { value: 'Preventive',  label: 'Bảo trì định kỳ (Preventive)' },
                { value: 'Corrective',  label: 'Bảo trì khắc phục (Corrective)' },
                { value: 'Calibration', label: 'Hiệu chuẩn (Calibration)' },
              ]} />
            </Form.Item>
            <Form.Item name="scheduledDate" label="Ngày bảo trì dự kiến" rules={[{ required: true }]}>
              <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} disabledDate={(d) => d.isBefore(dayjs(), 'day')} />
            </Form.Item>
            <Form.Item name="description" label="Mô tả công việc">
              <Input.TextArea rows={3} placeholder="Mô tả nội dung bảo trì cần thực hiện…" />
            </Form.Item>
            <Form.Item name="notes" label="Ghi chú">
              <Input placeholder="Ghi chú thêm" />
            </Form.Item>
          </Form>
        )}
      </ModalShell>

      {/* ── Modal: Báo hỏng / Yêu cầu sửa chữa ────────────────────────── */}
      <ModalShell
        open={!!repairTarget}
        onClose={() => { setRepairTarget(null); repairForm.resetFields(); }}
        title={repairTarget ? `Báo hỏng: ${repairTarget.name}` : ''}
        sub={repairTarget ? `${repairTarget.equipmentCode} · ${repairTarget.departmentName}` : ''}
        size="md"
        footer={
          <>
            <Btn variant="ghost" onClick={() => { setRepairTarget(null); repairForm.resetFields(); }}>Hủy</Btn>
            <Btn variant="primary" onClick={() => { void handleSubmitRepair(); }}>Gửi báo cáo</Btn>
          </>
        }
      >
        {repairTarget && (
          <Form form={repairForm} layout="vertical">
            <Form.Item name="reportedBy" label="Người báo cáo" rules={[{ required: true }]}>
              <Input placeholder="Tên người báo cáo" />
            </Form.Item>
            <Form.Item name="issueDescription" label="Mô tả lỗi" rules={[{ required: true }]}>
              <Input.TextArea rows={3} placeholder="Mô tả triệu chứng / lỗi xảy ra…" />
            </Form.Item>
            <Form.Item name="priority" label="Mức độ ưu tiên" rules={[{ required: true }]}>
              <Select options={[
                { value: 1, label: 'Thấp' },
                { value: 2, label: 'Trung bình' },
                { value: 3, label: 'Cao' },
                { value: 4, label: 'Khẩn cấp' },
              ]} />
            </Form.Item>
          </Form>
        )}
      </ModalShell>

      {/* ── Modal: Thêm thiết bị mới ─────────────────────────────────────── */}
      <ModalShell
        open={showAddEq}
        onClose={() => { setShowAddEq(false); addForm.resetFields(); }}
        title="Thêm thiết bị y tế mới"
        sub="Điền đầy đủ thông tin bắt buộc để đăng ký thiết bị"
        size="lg"
        footer={
          <>
            <Btn variant="ghost" onClick={() => { setShowAddEq(false); addForm.resetFields(); }}>Hủy</Btn>
            <Btn variant="primary" loading={addLoading} onClick={() => { void handleAddEquipment(); }}>
              Thêm thiết bị
            </Btn>
          </>
        }
      >
        <Form form={addForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="equipmentCode" label="Mã thiết bị *" rules={[{ required: true, message: 'Nhập mã thiết bị' }]}>
                <Input placeholder="VD: ECG-001" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="name" label="Tên thiết bị *" rules={[{ required: true, message: 'Nhập tên thiết bị' }]}>
                <Input placeholder="VD: Máy điện tim 12 kênh" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="category" label="Danh mục *" rules={[{ required: true, message: 'Chọn/nhập danh mục' }]}>
                {categories.length > 0 ? (
                  <Select
                    placeholder="Chọn danh mục"
                    showSearch
                    optionFilterProp="label"
                    options={categories.map((c) => ({ value: c.code, label: c.name }))}
                  />
                ) : (
                  <Input placeholder="VD: imaging, monitoring, lab" />
                )}
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="riskClass" label="Nhóm nguy cơ *" rules={[{ required: true, message: 'Chọn nhóm' }]}>
                <Select options={[
                  { value: 'I',   label: 'Loại I'   },
                  { value: 'II',  label: 'Loại II'  },
                  { value: 'III', label: 'Loại III' },
                  { value: 'A',   label: 'Loại A'   },
                  { value: 'B',   label: 'Loại B'   },
                  { value: 'C',   label: 'Loại C'   },
                  { value: 'D',   label: 'Loại D'   },
                ]} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="manufacturer" label="Hãng sản xuất *" rules={[{ required: true, message: 'Nhập hãng sản xuất' }]}>
                <Input placeholder="VD: Philips, GE, Siemens" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="model" label="Model *" rules={[{ required: true, message: 'Nhập model' }]}>
                <Input placeholder="VD: PageWriter TC30" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="serialNumber" label="Số serial *" rules={[{ required: true, message: 'Nhập số serial' }]}>
                <Input placeholder="VD: SN2024001234" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="departmentId" label="Khoa/Phòng *" rules={[{ required: true, message: 'Nhập ID khoa' }]}>
                <Input placeholder="ID khoa/phòng sử dụng" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="purchaseDate" label="Ngày mua">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="warrantyExpiry" label="Hạn bảo hành">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="purchasePrice" label="Nguyên giá (VND)">
                <Input type="number" placeholder="VD: 250000000" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="trainingRequired" label="Cần đào tạo" initialValue={false}>
                <Select options={[
                  { value: false, label: 'Không' },
                  { value: true,  label: 'Có'     },
                ]} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="notes" label="Ghi chú">
                <Input.TextArea rows={2} placeholder="Ghi chú thêm về thiết bị..." />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </ModalShell>

      {/* ── Drawer: Chi tiết thiết bị ─────────────────────────────────── */}
      <DrawerShell
        open={!!detailEq}
        onClose={() => setDetailEq(null)}
        size="md"
        title={detailEq ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-10)' }}>
            <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 'var(--fs-md)' }}>{detailEq.equipmentCode}</span>
            <span style={{ fontSize: 14 }}>{detailEq.name}</span>
          </span>
        ) : ''}
        sub={detailEq ? `${detailEq.manufacturer} · ${detailEq.model} · ${detailEq.departmentName}` : ''}
        footer={detailEq ? (
          <Btn variant="ghost" onClick={() => handlePrint(detailEq)}>
            <TermIcon name="printer" size={13} /> In phiếu lý lịch
          </Btn>
        ) : undefined}
      >
        {detailEq && <EquipmentDrawerBody r={detailEq} />}
      </DrawerShell>
    </>
  );
};

// ── Equipment detail drawer body ───────────────────────────────────────────────

const EquipmentDrawerBody: React.FC<{ r: EquipmentDto }> = ({ r }) => (
  <>
    <div className="rec-section">
      <h5><TermIcon name="activity" size={11} /> THIẾT BỊ</h5>
      <div className="rec-kv">
        <span>Mã TB</span><span className="mono" style={{ color: 'var(--a-cy)' }}>{r.equipmentCode}</span>
        <span>Tên</span><b>{r.name}</b>
        {r.nameEnglish && (<><span>Tên EN</span><span>{r.nameEnglish}</span></>)}
        <span>Loại</span><span>{r.categoryName || r.category}</span>
        <span>Hãng / Model</span><b>{r.manufacturer} · {r.model}</b>
        <span>Serial</span><span className="mono">{r.serialNumber}</span>
        {r.assetNumber && (<><span>Mã tài sản</span><span className="mono">{r.assetNumber}</span></>)}
        <span>Risk class</span>
        <span>
          <span className={`chip ${r.riskClass === 'III' || r.riskClass === 'A' ? 'crit' : r.riskClass === 'II' || r.riskClass === 'B' ? 'warn' : 'info'}`}>
            {r.riskClassName || r.riskClass}
          </span>
        </span>
      </div>
    </div>
    <div className="rec-section">
      <h5><TermIcon name="user" size={11} /> VỊ TRÍ</h5>
      <div className="rec-kv">
        <span>Khoa</span><b>{r.departmentName}</b>
        {r.roomName && (<><span>Phòng</span><span>{r.roomName}</span></>)}
        {r.locationName && (<><span>Vị trí</span><span>{r.locationName}</span></>)}
      </div>
    </div>
    <div className="rec-section">
      <h5><TermIcon name="dollar" size={11} /> MUA SẮM</h5>
      <div className="rec-kv">
        <span>Ngày mua</span><span>{fmtDMY(r.purchaseDate)}</span>
        <span>Giá mua</span><b className="mono">{fmtVND(r.purchasePrice)}</b>
        {r.supplier && (<><span>Nhà cung cấp</span><span>{r.supplier}</span></>)}
        {r.purchaseOrderNumber && (<><span>Số PO</span><span className="mono">{r.purchaseOrderNumber}</span></>)}
        {r.expectedLifeYears && (<><span>Tuổi thọ dự kiến</span><span>{r.expectedLifeYears} năm</span></>)}
        {r.currentValue != null && (<><span>Giá trị hiện tại</span><b className="mono">{fmtVND(r.currentValue)}</b></>)}
      </div>
    </div>
    <div className="rec-section">
      <h5><TermIcon name="check" size={11} /> BẢO HÀNH & BẢO TRÌ</h5>
      <div className="rec-kv">
        <span>Hết bảo hành</span><span>{fmtDMY(r.warrantyExpiry)}</span>
        <span>BT lần cuối</span><span>{fmtDMY(r.lastMaintenanceDate)}</span>
        <span>BT kế tiếp</span>
        <b style={{ color: r.nextMaintenanceDate && dayjs(r.nextMaintenanceDate).isBefore(dayjs(), 'day') ? 'var(--s-crit)' : 'var(--t-0)' }}>
          {fmtDMY(r.nextMaintenanceDate)}
        </b>
        {r.lastCalibrationDate && (<><span>KĐ lần cuối</span><span>{fmtDMY(r.lastCalibrationDate)}</span></>)}
        {r.nextCalibrationDate && (<><span>KĐ tiếp theo</span><span>{fmtDMY(r.nextCalibrationDate)}</span></>)}
      </div>
    </div>
    <div className="rec-section">
      <h5><TermIcon name="info" size={11} /> CHỨNG NHẬN</h5>
      <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap' }}>
        {r.fdaClearance && <span className="chip ok">FDA: {r.fdaClearance}</span>}
        {r.ceMarking && <span className="chip ok">CE Marking</span>}
        {!r.fdaClearance && !r.ceMarking && <span style={{ color: 'var(--t-3)' }}>Chưa có chứng nhận</span>}
      </div>
    </div>
  </>
);

export default EquipmentV2;
