import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { App as AntdApp } from 'antd';
import apiClient from '../services/apiClient';
import * as labApi from '../api/laboratory';
import type { LabRequest } from '../api/laboratory';
import * as settingsApi from '../modules/system/api/userSettings';
import type { LabDefaultRoles } from '../modules/system/api/userSettings';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager,
  ActBtn, Btn, DrawerShell,
} from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';
import {
  WAREHOUSE_TYPE_CABINET, STATUS_TABS, statusKey, abnormalCount, fmtDT,
  printLabResultBlob,
  type WarehouseStock, type LabChemicalItem, type StatusKey,
} from './laboratory/_shared';
import { LAB_COLUMNS } from './laboratory/columns';
import { LabDrawerBody } from './laboratory/LabDrawerBody';
import { LabChainCancelModal } from './laboratory/LabChainCancelModal';
import { LabUtilDrawer } from './laboratory/LabUtilDrawer';
import { LabRolesModal } from './laboratory/LabRolesModal';

/* ────────────────────────────────────────────────────────────
   Lab v2 (LIS) — port of design-system-v2/his/project/LIS v2.html
   Layout: KpiStrip + filter toolbar + StatusTabs + DataTable + Drawer
   ──────────────────────────────────────────────────────────── */

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

  const saveRoles = async () => {
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
  };

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
            <span style={{ marginLeft: 'var(--space-4)', fontSize: 'var(--fs-xxs)', color: 'var(--t-2)' }}>
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
        columns={LAB_COLUMNS}
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
          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-10)' }}>
              <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 'var(--fs-md)' }}>{detail.requestCode}</span>
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
            <span className="ab-u-flex1" />
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
      <LabUtilDrawer
        open={utilOpen}
        onClose={() => setUtilOpen(false)}
        loading={utilLoading}
        filterMonth={utilFilterMonth}
        setFilterMonth={setUtilFilterMonth}
        cabinetStock={utilCabinetStock}
        chemStock={utilChemStock}
        chemicals={utilChemicals}
      />

      {/* ── Modal: cài đặt KTV / Người duyệt mặc định ───────────────── */}
      <LabRolesModal
        open={rolesOpen}
        onClose={() => setRolesOpen(false)}
        saving={rolesSaving}
        value={rolesEdit}
        onChange={setRolesEdit}
        onSave={saveRoles}
      />

      {/* ── Modal: hủy ngược chuỗi workflow XN ───────────────────────── */}
      <LabChainCancelModal
        open={chainOpen}
        onClose={() => setChainOpen(false)}
        busy={chainBusy}
        target={chainTarget}
        level={chainLevel}
        setLevel={setChainLevel}
        reason={chainReason}
        setReason={setChainReason}
        onConfirm={runChainCancel}
      />
    </div>
  );
};

export default LaboratoryV2;
