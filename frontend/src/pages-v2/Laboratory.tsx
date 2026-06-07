import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { App as AntdApp } from 'antd';
import apiClient from '../api/client';
import * as labApi from '../api/laboratory';
import type { LabRequest, LabTestItem } from '../api/laboratory';
import * as settingsApi from '../api/userSettings';
import type { LabDefaultRoles } from '../api/userSettings';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager,
  StatusBadge, ActBtn, Btn, DrawerShell, ModalShell,
  type ColumnDef, type StatusTab,
} from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';

// ─── Types cho Panel Tiện ích ────────────────────────────────
interface WarehouseStock {
  id: string; itemCode: string; itemName: string; itemTypeName: string;
  unit: string; quantity: number; availableQuantity: number;
  warehouseName: string; warehouseId?: string; warehouseType?: number;
  batchNumber?: string; expiryDate?: string; daysToExpiry?: number;
}
interface LabChemicalItem {
  id: string; serviceName?: string; supplyName?: string; supplyCode?: string;
  quantityPerTest: number; unit?: string; objectType: string; isActive: boolean; note?: string;
}

// WarehouseType=5 là Tủ trực (IsCabinet=true)
const WAREHOUSE_TYPE_CABINET = 5;

/* ────────────────────────────────────────────────────────────
   Lab v2 (LIS) — port of design-system-v2/his/project/LIS v2.html
   Layout: KpiStrip + filter toolbar + StatusTabs + DataTable + Drawer
   ──────────────────────────────────────────────────────────── */

/** Mở phiếu kết quả XN (PDF blob) ở tab mới. Throw nếu lỗi để caller xử lý. */
const printLabResultBlob = async (orderId: string): Promise<void> => {
  const blob = await labApi.printTestResultReport(orderId);
  const url = URL.createObjectURL(blob as Blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

type StatusKey = 'ordered' | 'collected' | 'running' | 'verified' | 'rejected';

const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'ordered',   l: 'Đã chỉ định', tone: 'info' },
  { v: 'collected', l: 'Đã lấy mẫu',  tone: 'warn' },
  { v: 'running',   l: 'Đang chạy',   tone: 'warn' },
  { v: 'verified',  l: 'Đã duyệt',    tone: 'ok' },
  { v: 'rejected',  l: 'Từ chối mẫu', tone: 'crit' },
];

// Backend Status mapping:
// 0 Pending(ordered) | 1 Collected | 2 Processing | 3 Completed | 4 Approved | 5 Verified
const statusKey = (s: number): StatusKey => {
  if (s === 0) return 'ordered';
  if (s === 1) return 'collected';
  if (s === 2) return 'running';
  if (s >= 3) return 'verified';
  return 'ordered';
};
const statusTone = (s: StatusKey) => STATUS_TABS.find((t) => t.v === s)?.tone || 'info';

const PRIO_LABEL: Record<number, string> = { 0: 'ROUTINE', 1: 'URGENT', 2: 'STAT' };
const PRIO_TONE: Record<number, 'ok' | 'warn' | 'crit'> = { 0: 'ok', 1: 'warn', 2: 'crit' };

const flagFor = (test: LabTestItem): '' | 'H' | 'L' | 'HH' | 'LL' => {
  if (!test.result) return '';
  const v = parseFloat(test.result);
  if (Number.isNaN(v)) return '';
  if (typeof test.criticalHigh === 'number' && v >= test.criticalHigh) return 'HH';
  if (typeof test.criticalLow === 'number' && v <= test.criticalLow) return 'LL';
  if (typeof test.normalMax === 'number' && v > test.normalMax) return 'H';
  if (typeof test.normalMin === 'number' && v < test.normalMin) return 'L';
  return '';
};

// Màu cờ theo tài liệu nghiệp vụ: cao → ĐỎ (HH đậm hơn), thấp → XANH (LL đậm hơn).
const FLAG_COLOR: Record<string, string> = {
  HH: '#991b1b', H: '#dc2626', LL: '#1e40af', L: '#2563eb',
};
const abnormalCount = (tests?: LabTestItem[]): number =>
  (tests || []).filter((t) => flagFor(t) !== '').length;

const fmtHM = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const fmtDT = (iso?: string) => iso ? dayjs(iso).format('DD/MM HH:mm') : '—';

const LaboratoryV2: React.FC = () => {
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();
  const [rows, setRows]   = useState<LabRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [stab, setStab]   = useState<StatusKey | 'all'>('all');
  const [fGroup, setFGroup] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage]   = useState(0);
  const [detail, setDetail] = useState<LabRequest | null>(null);
  const [date, setDate]   = useState(() => dayjs());
  const PAGE_SIZE = 18;

  // Panel Tiện ích: tủ trực + tồn kho hóa chất (2 nguồn tách biệt)
  const [utilOpen, setUtilOpen] = useState(false);
  const [utilCabinetStock, setUtilCabinetStock] = useState<WarehouseStock[]>([]); // WarehouseType=5
  const [utilChemStock, setUtilChemStock] = useState<WarehouseStock[]>([]);       // Tồn kho hóa chất chung
  const [utilChemicals, setUtilChemicals] = useState<LabChemicalItem[]>([]);
  const [utilLoading, setUtilLoading] = useState(false);
  // Filter cho panel
  const [utilFilterMonth, setUtilFilterMonth] = useState<string>(''); // 'YYYY-MM' hoặc '' để lọc HSD

  const loadUtilData = async () => {
    setUtilLoading(true);
    try {
      const [cabinetRes, chemStockRes, chemRes] = await Promise.all([
        // Tủ trực: warehouseType=5, itemType=3 (Hóa chất)
        apiClient.get<{ items: WarehouseStock[] } | WarehouseStock[]>('/warehouse/stock', {
          params: { warehouseType: WAREHOUSE_TYPE_CABINET, itemType: 3, pageSize: 200 },
        }),
        // Tồn kho hóa chất chung (không phải tủ trực)
        apiClient.get<{ items: WarehouseStock[] } | WarehouseStock[]>('/warehouse/stock', {
          params: { itemType: 3, pageSize: 200 },
        }),
        apiClient.get<LabChemicalItem[]>('/lis-catalog/chemicals'),
      ]);

      const toItems = (res: { data: { items: WarehouseStock[] } | WarehouseStock[] }) => {
        const p = res.data;
        return Array.isArray(p) ? p : ((p as { items?: WarehouseStock[] }).items ?? []);
      };

      const cabinetItems = toItems(cabinetRes);
      const allChemItems = toItems(chemStockRes);
      // Tách tồn kho hóa chất = all − tủ trực (không trùng nhau)
      const cabinetIds = new Set(cabinetItems.map((s) => s.id));
      const chemOnlyItems = allChemItems.filter((s) => !cabinetIds.has(s.id));

      setUtilCabinetStock(cabinetItems);
      setUtilChemStock(chemOnlyItems);
      setUtilChemicals(Array.isArray(chemRes.data) ? chemRes.data : []);
    } catch {
      // warn only — panel is non-critical
      console.warn('[Laboratory] loadUtilData failed');
    } finally {
      setUtilLoading(false);
    }
  };

  // Filter helpers cho panel
  const filterByMonth = (items: WarehouseStock[]) => {
    if (!utilFilterMonth) return items;
    return items.filter((s) => {
      if (!s.expiryDate) return true; // Hạn không xác định → giữ lại
      return s.expiryDate.startsWith(utilFilterMonth);
    });
  };
  const applyUtilFilters = (items: WarehouseStock[]) => filterByMonth(items);

  // DefaultLabRole per-user (Prompt 11 Đợt 3)
  const [labRoles, setLabRoles] = useState<LabDefaultRoles>({});
  const [rolesOpen, setRolesOpen] = useState(false);
  const [rolesEdit, setRolesEdit] = useState<LabDefaultRoles>({});
  const [rolesSaving, setRolesSaving] = useState(false);
  // Track first mount — load once
  const rolesFetched = useRef(false);

  useEffect(() => {
    if (rolesFetched.current) return;
    rolesFetched.current = true;
    settingsApi.getLabDefaultRoles().then(setLabRoles).catch(() => { /* non-critical */ });
  }, []);

  // Hủy ngược chuỗi workflow (M3.14): mức hủy + lý do, áp cho mọi test item của phiếu
  const [chainOpen, setChainOpen] = useState(false);
  const [chainTarget, setChainTarget] = useState<LabRequest | null>(null);
  const [chainLevel, setChainLevel] = useState<1 | 2 | 3>(1);
  const [chainReason, setChainReason] = useState('');
  const [chainBusy, setChainBusy] = useState(false);

  const reload = () => {
    setLoading(true);
    labApi.getLabRequests({ fromDate: date.format('YYYY-MM-DD') })
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };
  useEffect(reload, [date]);

  const groupOpts = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => (r.tests || []).forEach((t) => t.testGroup && set.add(t.testGroup)));
    return Array.from(set).map((g) => ({ v: g, l: g }));
  }, [rows]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    STATUS_TABS.forEach((s) => {
      c[s.v] = rows.filter((r) => statusKey(r.status) === s.v).length;
    });
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (stab !== 'all' && statusKey(r.status) !== stab) return false;
      if (fGroup && !(r.tests || []).some((t) => t.testGroup === fGroup)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = [r.patientName, r.patientCode, r.requestCode, r.sampleBarcode].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, stab, fGroup, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // KPIs
  const kpis = useMemo(() => {
    const verified = rows.filter((r) => r.status >= 3).length;
    const pending  = rows.filter((r) => r.status >= 0 && r.status <= 2).length;
    const stat     = rows.filter((r) => r.priority === 2).length;
    const totalAbnormal = rows.reduce((a, r) => a + abnormalCount(r.tests), 0);
    const tatTimes = rows
      .filter((l) => l.processingStartTime && l.processingEndTime)
      .map((l) => dayjs(l.processingEndTime).diff(dayjs(l.processingStartTime), 'minute'));
    const tat = tatTimes.length > 0 ? Math.round(tatTimes.reduce((a, b) => a + b, 0) / tatTimes.length) : 0;
    return { total: rows.length, verified, pending, stat, abnormal: totalAbnormal, tat };
  }, [rows]);

  const onApprove = async (r: LabRequest) => {
    try {
      await labApi.completeProcessing(r.id);
      message.success(`Đã duyệt ${r.requestCode}`);
      reload();
    } catch {
      message.error('Duyệt thất bại');
    }
  };

  const onCollect = async (r: LabRequest) => {
    try {
      // Auto-fill KTV từ DefaultLabRole; fallback về tên generic nếu chưa cấu hình
      const collectorName = labRoles.defaultKtvName || 'KTV thu mẫu';
      await labApi.collectSample(r.id, {
        sampleType: 'Blood',
        collectionTime: new Date().toISOString(),
        collectorName,
        collectorUserId: labRoles.defaultKtvId ?? undefined,
      });
      message.success(`Đã ghi nhận lấy mẫu · ${r.requestCode}`);
      reload();
    } catch {
      message.error('Ghi nhận thất bại');
    }
  };

  // Duyệt 2 bước: KTV duyệt sơ bộ (status 3 → 4)
  const onPreliminary = async (r: LabRequest) => {
    try {
      await labApi.preliminaryApprove(r.id);
      message.success(`Đã duyệt sơ bộ · ${r.requestCode}`);
      reload();
    } catch {
      message.error('Duyệt sơ bộ thất bại');
    }
  };

  // Duyệt 2 bước: BS duyệt chính thức (status 4 → 5)
  const onFinal = async (r: LabRequest) => {
    try {
      await labApi.finalApprove(r.id);
      message.success(`Đã duyệt chính thức · ${r.requestCode}`);
      reload();
    } catch {
      message.error('Duyệt chính thức thất bại');
    }
  };

  // Hủy duyệt (status 4/5 → 3) — yêu cầu lý do
  const onCancelApproval = async (r: LabRequest) => {
    const reason = window.prompt(`Lý do hủy duyệt ${r.requestCode}:`, '');
    if (reason === null) return;            // bấm Cancel
    if (!reason.trim()) { message.warning('Cần nhập lý do hủy duyệt'); return; }
    try {
      await labApi.cancelApproval(r.id, reason.trim());
      message.success(`Đã hủy duyệt · ${r.requestCode}`);
      reload();
    } catch {
      message.error('Hủy duyệt thất bại');
    }
  };

  const onPrintRow = async (r: LabRequest) => {
    // Rule tài liệu: chưa duyệt KQ (status < 4) → "Không có số liệu", không in.
    // (Backend PrintLabResultAsync cũng enforce — đây là guard sớm phía client.)
    if (r.status < 4) {
      message.warning(`Chưa duyệt kết quả ${r.requestCode} — không có số liệu để in.`);
      return;
    }
    try { await printLabResultBlob(r.id); }
    catch { message.error('Không in được phiếu'); }
  };

  const openChainCancel = (r: LabRequest) => {
    setChainTarget(r); setChainLevel(1); setChainReason(''); setChainOpen(true);
  };

  /**
   * Hủy ngược chuỗi cho mọi test item của phiếu, tuần tự theo bước backend:
   * 4→3 (hủy duyệt) → 3/2→1 (hủy KQ + nhận mẫu) → 1→0 (hủy lấy mẫu).
   * Mỗi bước backend tự validate; item không đúng trạng thái sẽ bị bỏ qua.
   */
  const runChainCancel = async () => {
    if (!chainTarget) return;
    if (!chainReason.trim()) { message.warning('Cần nhập lý do hủy'); return; }
    const items = chainTarget.tests || [];
    if (items.length === 0) { message.warning('Phiếu không có test item để hủy'); return; }
    setChainBusy(true);
    const reason = chainReason.trim();
    let touched = 0;
    for (const t of items) {
      const r1 = await labApi.cancelChainApproval(t.id, reason).catch(() => null);
      const r2 = chainLevel >= 2 ? await labApi.cancelChainResult(t.id, reason).catch(() => null) : null;
      const r3 = chainLevel >= 3 ? await labApi.cancelChainCollection(t.id, reason).catch(() => null) : null;
      if (r1 || r2 || r3) touched += 1;
    }
    setChainBusy(false);
    setChainOpen(false);
    if (touched > 0) message.success(`Đã hủy ngược chuỗi ${touched}/${items.length} chỉ số · ${chainTarget.requestCode}`);
    else message.warning('Không có chỉ số nào hủy được — kiểm tra trạng thái từng bước');
    setDetail(null);
    reload();
  };

  const columns: ColumnDef<LabRequest>[] = [
    {
      key: 'code', label: 'Mã XN', width: 140,
      render: (r) => (
        <span>
          <span className="mono">{r.requestCode}</span>
          {r.priority === 2 && (
            <span style={{
              marginLeft: 6, padding: '1px 5px',
              background: 'var(--s-crit-bg, #fee2e2)', border: '1px solid #fca5a5',
              color: 'var(--s-crit, #b91c1c)', borderRadius: 3,
              fontSize: 9, fontWeight: 700,
            }}>STAT</span>
          )}
        </span>
      ),
    },
    { key: 'time', label: 'CĐ lúc', mono: true, width: 70, render: (r) => fmtHM(r.requestDate) },
    {
      key: 'patient', label: 'Bệnh nhân',
      render: (r) => (
        <div className="cell-2l">
          <b>{r.patientName}</b>
          <i className="mono">{r.patientCode}</i>
        </div>
      ),
    },
    {
      key: 'panel', label: 'Xét nghiệm',
      render: (r) => {
        const names = (r.tests || []).map((t) => t.testName).filter(Boolean);
        const display = names.length === 0 ? (r.requestedTests?.join(' · ') || '—') :
          names.slice(0, 3).join(' · ') + (names.length > 3 ? ` +${names.length - 3}` : '');
        const groups = Array.from(new Set((r.tests || []).map((t) => t.testGroup).filter(Boolean))).slice(0, 2).join(', ');
        return (
          <div className="cell-2l">
            <b>{display}</b>
            {groups && <i className="mono">{groups}</i>}
          </div>
        );
      },
    },
    { key: 'sample', label: 'Mẫu', width: 110, render: (r) => r.sampleType || '—' },
    { key: 'collect', label: 'Lấy mẫu', mono: true, width: 80, render: (r) => fmtHM(r.collectionTime) },
    { key: 'machine', label: 'Máy', width: 110, mono: true, render: (r) => r.analyzer || '—' },
    {
      key: 'priority', label: 'Ưu tiên', width: 90,
      render: (r) => (
        <span className={`chip ${PRIO_TONE[r.priority] || 'info'}`}>{PRIO_LABEL[r.priority] || 'ROUTINE'}</span>
      ),
    },
    {
      key: 'status', label: 'Trạng thái', width: 130,
      render: (r) => {
        const sk = statusKey(r.status);
        return <StatusBadge tone={statusTone(sk)} dot>{STATUS_TABS.find((t) => t.v === sk)?.l}</StatusBadge>;
      },
    },
    {
      key: 'abnormal', label: 'BT', width: 60,
      render: (r) => {
        const ab = abnormalCount(r.tests);
        return ab > 0 ? (
          <span className="chip warn mono">{ab}</span>
        ) : (
          <span style={{ color: 'var(--t-3)' }}>0</span>
        );
      },
    },
  ];

  return (
    <div className="ab">
      <KpiStrip
        items={[
          { lbl: 'Tổng XN', val: kpis.total, sub: date.isSame(dayjs(), 'day') ? 'hôm nay' : date.format('DD/MM') },
          {
            lbl: 'Đã duyệt', val: kpis.verified,
            sub: kpis.total > 0 ? `${Math.round(kpis.verified / kpis.total * 100)}%` : '—',
            tone: 'ok',
          },
          { lbl: 'Đang chờ', val: kpis.pending, sub: 'trong quy trình', tone: 'warn' },
          { lbl: 'Bất thường', val: kpis.abnormal, sub: 'H/L flags', tone: 'crit' },
          { lbl: 'STAT', val: kpis.stat, sub: 'ưu tiên', tone: 'crit' },
          { lbl: 'TAT', val: kpis.tat, unit: 'p', sub: 'TB', tone: 'ok' },
        ]}
      />

      <div className="ab-tools">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Tìm BN, mã XN, barcode mẫu…"
        />
        <Filter value={fGroup} onChange={setFGroup} options={groupOpts} placeholder="▾ Nhóm XN" />
        <Btn variant="ghost" onClick={() => { setSearch(''); setFGroup(''); setStab('all'); }}>
          <TermIcon name="refresh" size={12} /> Bỏ lọc
        </Btn>
        <Btn variant="ghost" onClick={() => setDate(date.subtract(1, 'day'))}>
          <TermIcon name="chevronL" size={12} />
        </Btn>
        <Btn variant="ghost" onClick={() => setDate(dayjs())}>Hôm nay</Btn>
        <Btn variant="ghost" onClick={() => setDate(date.add(1, 'day'))}>
          <TermIcon name="chevronR" size={12} />
        </Btn>
        <span className="spacer" />
        <Btn variant="ghost" onClick={reload}>
          <TermIcon name="refresh" size={12} /> Làm mới
        </Btn>
        <Btn variant="ghost" onClick={() => navigate('/v2/lab-qc')}>
          <TermIcon name="chart" size={12} /> QC hôm nay
        </Btn>
        <Btn variant="ghost" onClick={() => { setUtilOpen(true); loadUtilData(); }}>
          <TermIcon name="flask" size={12} /> Tiện ích
        </Btn>
        <Btn variant="ghost" title="Cài đặt KTV / Người duyệt mặc định" onClick={() => {
          setRolesEdit({ ...labRoles });
          setRolesOpen(true);
        }}>
          <TermIcon name="user" size={12} /> Vai trò
          {labRoles.defaultKtvName && (
            <span style={{ marginLeft: 4, fontSize: 10, color: 'var(--t-2)' }}>
              {labRoles.defaultKtvName.split(' ').slice(-1)[0]}
            </span>
          )}
        </Btn>
        <Btn variant="primary" onClick={() => navigate('/v2/sample-receive')}>
          <TermIcon name="plus" size={12} /> Chỉ định <kbd>F2</kbd>
        </Btn>
      </div>

      <StatusTabs<StatusKey> value={stab} onChange={setStab} tabs={STATUS_TABS} counts={counts} />

      <DataTable<LabRequest>
        columns={columns}
        data={paged}
        rowKey={(r) => r.id}
        onRowClick={(r) => setDetail(r)}
        actions={(r) => {
          const sk = statusKey(r.status);
          return (
            <div className="ab-actions">
              {sk === 'ordered' && (
                <ActBtn ic="check" title="Đánh dấu đã lấy mẫu" onClick={() => onCollect(r)} />
              )}
              {sk === 'running' && (
                <ActBtn ic="check" title="Duyệt kết quả" onClick={() => onApprove(r)} />
              )}
              {r.status === 3 && (
                <ActBtn ic="check" title="Duyệt sơ bộ (KTV)" onClick={() => onPreliminary(r)} />
              )}
              {r.status === 4 && (
                <ActBtn ic="check" title="Duyệt chính thức (BS)" onClick={() => onFinal(r)} />
              )}
              {r.status >= 4 && (
                <ActBtn ic="x" title="Hủy duyệt" tone="warn" onClick={() => onCancelApproval(r)} />
              )}
              <ActBtn ic="eye" title="Chi tiết" onClick={() => setDetail(r)} />
              <ActBtn ic="print" title="In phiếu" onClick={() => onPrintRow(r)} />
            </div>
          );
        }}
        empty={loading ? 'Đang tải…' : (
          <div className="ab-empty">
            <TermIcon name="search" size={20} />
            <div>Không có xét nghiệm nào</div>
          </div>
        )}
      />

      <Pager
        page={page}
        totalPages={totalPages}
        setPage={setPage}
        total={filtered.length}
        perPage={PAGE_SIZE}
      />

      <DrawerShell
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail
          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 13 }}>{detail.requestCode}</span>
              <span style={{ fontSize: 14 }}>{detail.patientName}</span>
            </span>
          : ''}
        sub={detail
          ? `${detail.patientCode} · ${detail.departmentName || '—'} · ${fmtDT(detail.requestDate)}`
          : ''}
        size="lg"
        footer={detail ? (
          <>
            <Btn variant="ghost" onClick={() => setDetail(null)}>Đóng</Btn>
            <Btn variant="ghost" onClick={() => navigate(`/v2/emr/edit?patientId=${encodeURIComponent(detail.patientId)}`)}>
              <TermIcon name="folder" size={12} /> Xem HSBA
            </Btn>
            <span style={{ flex: 1 }} />
            {detail.status >= 1 && (
              <Btn onClick={() => openChainCancel(detail)}>
                <TermIcon name="refresh" size={12} /> Hủy ngược chuỗi
              </Btn>
            )}
            {detail.status >= 4 && (
              <Btn onClick={() => onCancelApproval(detail)}>
                <TermIcon name="x" size={12} /> Hủy duyệt
              </Btn>
            )}
            <Btn onClick={() => onPrintRow(detail)}>
              <TermIcon name="print" size={12} /> In phiếu
            </Btn>
            {statusKey(detail.status) === 'running' && (
              <Btn variant="primary" onClick={() => { onApprove(detail); setDetail(null); }}>
                <TermIcon name="check" size={12} /> Duyệt KQ
              </Btn>
            )}
            {detail.status === 3 && (
              <Btn variant="primary" onClick={() => { onPreliminary(detail); setDetail(null); }}>
                <TermIcon name="check" size={12} /> Duyệt sơ bộ
              </Btn>
            )}
            {detail.status === 4 && (
              <Btn variant="primary" onClick={() => { onFinal(detail); setDetail(null); }}>
                <TermIcon name="check" size={12} /> Duyệt chính thức
              </Btn>
            )}
          </>
        ) : null}
      >
        {detail && <LabDrawerBody r={detail} />}
      </DrawerShell>

      {/* ── Drawer: Tiện ích — Tủ trực | Tồn kho hóa chất | Định mức XN ── */}
      <DrawerShell
        open={utilOpen}
        onClose={() => setUtilOpen(false)}
        title="Tiện ích XN — Tồn kho"
        sub="Tủ trực hóa chất · Tồn kho hóa chất · Định mức XN"
        size="lg"
      >
        {utilLoading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--t-2)' }}>Đang tải…</div>
        ) : (
          <>
            {/* ── Filter chung ── */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--t-2)', marginBottom: 2 }}>Tháng/Năm HSD</div>
                <input
                  type="month"
                  value={utilFilterMonth}
                  onChange={(e) => setUtilFilterMonth(e.target.value)}
                  style={{
                    padding: '4px 8px', border: '1px solid var(--line)', borderRadius: 4,
                    fontSize: 12, background: 'var(--d-1)', color: 'inherit',
                  }}
                />
              </div>
              {utilFilterMonth && (
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button
                    onClick={() => setUtilFilterMonth('')}
                    style={{ padding: '4px 8px', fontSize: 11, cursor: 'pointer',
                      border: '1px solid var(--line)', borderRadius: 4, background: 'var(--d-0)', color: 'var(--t-2)' }}
                  >
                    Xóa lọc
                  </button>
                </div>
              )}
            </div>

            {/* ── Section 1: Tủ trực (WarehouseType=5) ── */}
            <div className="rec-section">
              <h5><TermIcon name="package" size={11} /> TỒN TỦ TRỰC (Kho hóa chất nội bộ khoa)</h5>
              {applyUtilFilters(utilCabinetStock).length === 0 ? (
                <div style={{ color: 'var(--t-3)', fontSize: 12, padding: '8px 0' }}>
                  {utilCabinetStock.length === 0 ? 'Không có dữ liệu tủ trực' : 'Không có mục nào khớp filter'}
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 4 }}>
                  <div style={{
                    display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
                    fontSize: 10, color: 'var(--t-2)', textTransform: 'uppercase',
                    fontWeight: 600, padding: '4px 0', borderBottom: '1px solid var(--line-soft)',
                  }}>
                    <span>Tên hóa chất / Kho</span>
                    <span style={{ textAlign: 'right' }}>Tồn</span>
                    <span style={{ textAlign: 'right' }}>Khả dụng</span>
                    <span>HSD</span>
                  </div>
                  {applyUtilFilters(utilCabinetStock).slice(0, 50).map((s) => (
                    <div key={s.id} style={{
                      display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
                      padding: '6px 0', borderBottom: '1px solid var(--line-soft)',
                      fontSize: 12.5, alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ fontWeight: 500 }}>{s.itemName}</div>
                        <div style={{ fontSize: 10, color: 'var(--t-2)' }}>{s.warehouseName}</div>
                      </div>
                      <span className="mono" style={{ textAlign: 'right' }}>{s.quantity} {s.unit}</span>
                      <span className="mono" style={{
                        textAlign: 'right',
                        color: s.availableQuantity <= 0 ? 'var(--s-crit)' : s.availableQuantity < 10 ? '#d97706' : 'inherit',
                        fontWeight: s.availableQuantity <= 0 ? 700 : 400,
                      }}>
                        {s.availableQuantity}
                      </span>
                      <span style={{ fontSize: 11, color: s.daysToExpiry !== undefined && s.daysToExpiry < 30 ? '#d97706' : 'var(--t-2)' }}>
                        {s.expiryDate ? dayjs(s.expiryDate).format('MM/YYYY') : '—'}
                        {s.daysToExpiry !== undefined && s.daysToExpiry < 30 && (
                          <span style={{ marginLeft: 4, color: 'var(--s-crit)', fontSize: 10 }}>({s.daysToExpiry}d)</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Section 2: Tồn kho hóa chất (ngoài tủ trực) ── */}
            <div className="rec-section" style={{ marginTop: 16 }}>
              <h5><TermIcon name="flask" size={11} /> TỒN KHO HÓA CHẤT (Kho XN — không kể tủ trực)</h5>
              {applyUtilFilters(utilChemStock).length === 0 ? (
                <div style={{ color: 'var(--t-3)', fontSize: 12, padding: '8px 0' }}>
                  {utilChemStock.length === 0 ? 'Không có dữ liệu tồn kho hóa chất' : 'Không có mục nào khớp filter'}
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 4 }}>
                  <div style={{
                    display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
                    fontSize: 10, color: 'var(--t-2)', textTransform: 'uppercase',
                    fontWeight: 600, padding: '4px 0', borderBottom: '1px solid var(--line-soft)',
                  }}>
                    <span>Tên hóa chất / Kho</span>
                    <span style={{ textAlign: 'right' }}>Tồn</span>
                    <span style={{ textAlign: 'right' }}>Khả dụng</span>
                    <span>HSD</span>
                  </div>
                  {applyUtilFilters(utilChemStock).slice(0, 50).map((s) => (
                    <div key={s.id} style={{
                      display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
                      padding: '6px 0', borderBottom: '1px solid var(--line-soft)',
                      fontSize: 12.5, alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ fontWeight: 500 }}>{s.itemName}</div>
                        <div style={{ fontSize: 10, color: 'var(--t-2)' }}>{s.warehouseName}</div>
                      </div>
                      <span className="mono" style={{ textAlign: 'right' }}>{s.quantity} {s.unit}</span>
                      <span className="mono" style={{
                        textAlign: 'right',
                        color: s.availableQuantity <= 0 ? 'var(--s-crit)' : s.availableQuantity < 10 ? '#d97706' : 'inherit',
                        fontWeight: s.availableQuantity <= 0 ? 700 : 400,
                      }}>
                        {s.availableQuantity}
                      </span>
                      <span style={{ fontSize: 11, color: s.daysToExpiry !== undefined && s.daysToExpiry < 30 ? '#d97706' : 'var(--t-2)' }}>
                        {s.expiryDate ? dayjs(s.expiryDate).format('MM/YYYY') : '—'}
                        {s.daysToExpiry !== undefined && s.daysToExpiry < 30 && (
                          <span style={{ marginLeft: 4, color: 'var(--s-crit)', fontSize: 10 }}>({s.daysToExpiry}d)</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Section 3: Định mức hóa chất theo XN ── */}
            <div className="rec-section" style={{ marginTop: 16 }}>
              <h5><TermIcon name="activity" size={11} /> ĐỊNH MỨC HÓA CHẤT THEO XN (LIS Catalog)</h5>
              {utilChemicals.length === 0 ? (
                <div style={{ color: 'var(--t-3)', fontSize: 12, padding: '8px 0' }}>Chưa khai báo định mức hóa chất</div>
              ) : (
                <div style={{ display: 'grid', gap: 4 }}>
                  <div style={{
                    display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr',
                    fontSize: 10, color: 'var(--t-2)', textTransform: 'uppercase',
                    fontWeight: 600, padding: '4px 0', borderBottom: '1px solid var(--line-soft)',
                  }}>
                    <span>Dịch vụ XN</span>
                    <span>Hóa chất</span>
                    <span style={{ textAlign: 'right' }}>Định mức/lần</span>
                    <span>Loại</span>
                  </div>
                  {utilChemicals.filter(c => c.isActive).slice(0, 50).map((c) => (
                    <div key={c.id} style={{
                      display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr',
                      padding: '6px 0', borderBottom: '1px solid var(--line-soft)',
                      fontSize: 12.5, alignItems: 'center',
                    }}>
                      <span>{c.serviceName || '—'}</span>
                      <span>
                        <span style={{ fontWeight: 500 }}>{c.supplyName || '—'}</span>
                        {c.supplyCode && <span style={{ fontSize: 10, color: 'var(--t-2)', marginLeft: 4 }}>({c.supplyCode})</span>}
                      </span>
                      <span className="mono" style={{ textAlign: 'right' }}>{c.quantityPerTest} {c.unit || ''}</span>
                      <span style={{
                        fontSize: 11,
                        color: c.objectType === 'ThuPhi' ? '#d97706' : 'var(--t-2)',
                      }}>
                        {c.objectType === 'ThuPhi' ? 'Thu phí' : 'Hao phí'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </DrawerShell>

      {/* ── Modal: cài đặt KTV / Người duyệt mặc định ───────────────── */}
      <ModalShell
        open={rolesOpen}
        onClose={() => { if (!rolesSaving) setRolesOpen(false); }}
        title="Cài đặt vai trò mặc định (LIS)"
        sub="Auto-fill KTV và Người duyệt khi thao tác trên phiếu XN"
        size="sm"
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" size="sm" disabled={rolesSaving} onClick={() => setRolesOpen(false)}>Hủy</Btn>
            <Btn variant="primary" size="sm" disabled={rolesSaving} onClick={async () => {
              setRolesSaving(true);
              try {
                await settingsApi.saveLabDefaultRoles(rolesEdit);
                setLabRoles({ ...rolesEdit });
                message.success('Đã lưu cài đặt vai trò mặc định');
                setRolesOpen(false);
              } catch {
                message.error('Không lưu được cài đặt');
              } finally {
                setRolesSaving(false);
              }
            }}>
              <TermIcon name="check" size={11} /> {rolesSaving ? 'Đang lưu…' : 'Lưu cài đặt'}
            </Btn>
          </div>
        }
      >
        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--t-2)', display: 'block', marginBottom: 4 }}>
              Tên KTV mặc định (auto-fill khi nhận mẫu)
            </label>
            <input
              className="hui-inp"
              style={{ width: '100%' }}
              placeholder="Ví dụ: Nguyễn Văn A"
              value={rolesEdit.defaultKtvName || ''}
              onChange={(e) => setRolesEdit((p) => ({ ...p, defaultKtvName: e.target.value || null }))}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--t-2)', display: 'block', marginBottom: 4 }}>
              Tên Người duyệt mặc định (auto-fill khi duyệt chính thức)
            </label>
            <input
              className="hui-inp"
              style={{ width: '100%' }}
              placeholder="Ví dụ: BS. Trần Thị B"
              value={rolesEdit.defaultApproverName || ''}
              onChange={(e) => setRolesEdit((p) => ({ ...p, defaultApproverName: e.target.value || null }))}
            />
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--t-2)', padding: '6px 8px', background: 'var(--d-1)', borderRadius: 4, borderLeft: '3px solid var(--a-cy)' }}>
            Cài đặt này lưu riêng theo tài khoản đăng nhập. Sau khi lưu, tên sẽ tự động điền vào các thao tác lấy mẫu và duyệt kết quả.
          </div>
        </div>
      </ModalShell>

      {/* ── Modal: hủy ngược chuỗi workflow XN ───────────────────────── */}
      <ModalShell
        open={chainOpen}
        onClose={() => { if (!chainBusy) setChainOpen(false); }}
        title="Hủy ngược chuỗi xét nghiệm"
        sub={chainTarget ? `${chainTarget.requestCode} · ${chainTarget.patientName} · ${(chainTarget.tests || []).length} chỉ số` : ''}
        size="sm"
        tone="danger"
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" size="sm" disabled={chainBusy} onClick={() => setChainOpen(false)}>Hủy bỏ</Btn>
            <Btn variant="crit" size="sm" disabled={chainBusy || !chainReason.trim()} onClick={runChainCancel}>
              <TermIcon name="refresh" size={11} /> {chainBusy ? 'Đang xử lý…' : 'Thực hiện hủy'}
            </Btn>
          </div>
        }
      >
        <div style={{ display: 'grid', gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--t-2)', display: 'block', marginBottom: 6 }}>Mức hủy (áp cho mọi chỉ số của phiếu, chạy tuần tự theo bước)</label>
            {([
              { v: 1 as const, l: 'Hủy duyệt kết quả', d: 'Đã duyệt → Đã có KQ' },
              { v: 2 as const, l: 'Hủy KQ + hủy nhận mẫu', d: 'Đã có KQ / Đang xử lý → Đã lấy mẫu (xóa kết quả)' },
              { v: 3 as const, l: 'Hủy lấy mẫu', d: 'Đã lấy mẫu → Chờ lấy mẫu (hủy toàn bộ về đầu)' },
            ]).map((o) => (
              <label key={o.v} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '6px 8px', border: '1px solid var(--line)', borderRadius: 6, marginBottom: 4, cursor: 'pointer', background: chainLevel === o.v ? 'var(--d-1)' : 'transparent' }}>
                <input type="radio" name="chain-level" checked={chainLevel === o.v} onChange={() => setChainLevel(o.v)} style={{ marginTop: 2 }} />
                <span>
                  <b style={{ fontSize: 12 }}>{o.l}</b>
                  <span style={{ display: 'block', fontSize: 11, color: 'var(--t-2)' }}>{o.d}</span>
                </span>
              </label>
            ))}
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--t-2)', display: 'block', marginBottom: 4 }}>Lý do hủy <span style={{ color: 'var(--s-err)' }}>*</span></label>
            <textarea className="hui-inp" rows={2} style={{ width: '100%', resize: 'vertical' }} value={chainReason} onChange={(e) => setChainReason(e.target.value)} placeholder="Bắt buộc — ghi vào ghi chú KTV của từng chỉ số…" />
          </div>
          {chainLevel >= 2 && (
            <div style={{ fontSize: 11.5, color: 'var(--s-warn)', padding: '6px 8px', background: 'var(--d-1)', borderRadius: 4, borderLeft: '3px solid var(--s-warn)' }}>
              ⚠ Mức này XÓA kết quả đã nhập của các chỉ số — không thể hoàn tác.
            </div>
          )}
        </div>
      </ModalShell>
    </div>
  );
};

const LabDrawerBody: React.FC<{ r: LabRequest }> = ({ r }) => {
  const sk = statusKey(r.status);
  const tone = statusTone(sk);
  const lbl = STATUS_TABS.find((t) => t.v === sk)?.l || '';
  const ab = abnormalCount(r.tests);

  return (
    <>
      <div className="rec-section">
        <h5><TermIcon name="check" size={11} /> TRẠNG THÁI</h5>
        <div className={`rec-status-banner ${tone}`}>
          <StatusBadge tone={tone} dot>{lbl}</StatusBadge>
          <span style={{ fontSize: 11, color: 'var(--t-2)' }}>
            Ưu tiên&nbsp;
            <span className={`chip ${PRIO_TONE[r.priority] || 'info'}`}>{PRIO_LABEL[r.priority] || 'ROUTINE'}</span>
          </span>
        </div>
      </div>

      <div className="rec-section">
        <h5><TermIcon name="user" size={11} /> BỆNH NHÂN</h5>
        <div className="rec-kv">
          <span>Họ tên</span><b>{r.patientName}</b>
          <span>Mã BN</span><span className="mono" style={{ color: 'var(--a-cy)' }}>{r.patientCode}</span>
          <span>Ngày sinh</span>
          <span>{r.dateOfBirth ? dayjs(r.dateOfBirth).format('DD/MM/YYYY') : '—'}{r.dateOfBirth && ` · ${dayjs().diff(dayjs(r.dateOfBirth), 'year')}t`}</span>
          <span>Giới tính</span><span>{r.gender === 1 ? 'Nam' : r.gender === 2 ? 'Nữ' : '—'}</span>
          <span>BS chỉ định</span><span>{r.doctorName || '—'}</span>
        </div>
      </div>

      <div className="rec-section">
        <h5><TermIcon name="flask" size={11} /> THÔNG TIN MẪU</h5>
        <div className="rec-kv">
          <span>Loại mẫu</span><span>{r.sampleType || '—'}</span>
          <span>Barcode</span><span className="mono">{r.sampleBarcode || '—'}</span>
          <span>Máy phân tích</span><span className="mono">{r.analyzer || '—'}</span>
          <span>CĐ lúc</span><span>{fmtDT(r.requestDate)}</span>
          {r.collectionTime && (<><span>Lấy mẫu lúc</span><span>{fmtDT(r.collectionTime)} · {r.collectorName || '—'}</span></>)}
          {r.processingStartTime && (<><span>Bắt đầu chạy</span><span>{fmtDT(r.processingStartTime)}</span></>)}
          {r.processingEndTime && (<><span>Hoàn thành</span><span>{fmtDT(r.processingEndTime)}</span></>)}
        </div>
      </div>

      {(r.tests || []).length > 0 && (
        <div className="rec-section">
          <h5><TermIcon name="activity" size={11} /> KẾT QUẢ {ab > 0 && <span className="chip warn" style={{ marginLeft: 6 }}>{ab} bất thường</span>}</h5>
          <div style={{
            display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 50px',
            fontSize: 10.5, color: 'var(--t-2)', textTransform: 'uppercase', fontWeight: 600,
            padding: '6px 0', borderBottom: '1px solid var(--line-soft)', letterSpacing: 0.4,
          }}>
            <span>Chỉ số</span>
            <span style={{ textAlign: 'right' }}>Kết quả</span>
            <span>Tham chiếu</span>
            <span style={{ textAlign: 'center' }}>Cờ</span>
          </div>
          {(r.tests || []).map((t) => {
            const flag = flagFor(t);
            const color = FLAG_COLOR[flag] || 'var(--t-0)';
            return (
              <div key={t.id} style={{
                display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 50px',
                padding: '8px 0', borderBottom: '1px solid var(--line-soft)',
                fontSize: 12.5, alignItems: 'center',
              }}>
                <span>{t.testName}</span>
                <span className="mono" style={{ textAlign: 'right', color, fontWeight: 600 }}>
                  {t.result || '—'}
                  {t.unit && <small style={{ marginLeft: 3, color: 'var(--t-2)', fontWeight: 400 }}>{t.unit}</small>}
                </span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--t-2)' }}>
                  {t.referenceRange || (t.normalMin !== undefined && t.normalMax !== undefined ? `${t.normalMin}–${t.normalMax}` : '—')}
                </span>
                <span style={{ textAlign: 'center' }}>
                  {flag && (
                    <span style={{
                      padding: '1px 6px', borderRadius: 3,
                      background: color,
                      color: '#fff', fontSize: 10, fontWeight: 700,
                    }}>{flag}</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {r.clinicalInfo && (
        <div className="rec-section">
          <h5><TermIcon name="info" size={11} /> THÔNG TIN LÂM SÀNG</h5>
          <div style={{ fontSize: 12.5, color: 'var(--t-1)', whiteSpace: 'pre-wrap' }}>{r.clinicalInfo}</div>
        </div>
      )}
    </>
  );
};

export default LaboratoryV2;
