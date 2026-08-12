import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  getHAICases, createHAICase, createIsolationOrder,
  getHandHygieneObservations, createHandHygieneObservation,
  getOutbreaks, investigateHAICase,
  getIsolationOrders, discontinueIsolation,
} from '../api/infectionControl';
import type {
  CreateHAISurveillanceDto, CreateIsolationOrderDto,
  CreateHandHygieneObservationDto, HandHygieneObservationDto, OutbreakDto,
  IsolationOrderDto,
} from '../api/infectionControl';
import { getInpatientList } from '../../inpatient/api/inpatient';
import { friendlyErrorMessage } from '../../../utils/friendlyError';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn, CrudModal, Btn,
  DrawerShell, DrSec, DrField, tk, ti, tw,
  TopTabs, ModalShell,
  type ColumnDef, type CrudFieldCfg, type TopTab,
} from '@/_v2kit';

type Row = {
  id: string;
  caseCode?: string;
  patientName?: string;
  patientCode?: string;
  departmentName?: string;
  bedNumber?: string;
  infectionType?: string;
  infectionTypeName?: string;
  infectionSite?: string;
  onsetDate?: string;
  diagnosisDate?: string;
  organism?: string;
  isMDRO?: boolean;
  mdroType?: string;
  resistancePattern?: string;
  daysSinceAdmission?: number;
  hasCentralLine?: boolean;
  centralLineDays?: number | null;
  hasUrinaryCatheter?: boolean;
  catheterDays?: number | null;
  onVentilator?: boolean;
  ventilatorDays?: number | null;
  deviceAssociated?: boolean;
  deviceType?: string;
  deviceDays?: number;
  isOutbreakRelated?: boolean;
  status?: string | number;
  statusName?: string;
  severity?: string | number;
  severityName?: string;
  riskFactors?: string[];
  reportedBy?: string;
  reportedAt?: string;
  requiresIsolation?: boolean;
};

const SEVERITY_LABEL: Record<string, string> = { Mild: 'Nhẹ', Moderate: 'Vừa', Severe: 'Nặng' };
const SEVERITY_TONE: Record<string, 'ok' | 'warn' | 'crit'> = { Mild: 'ok', Moderate: 'warn', Severe: 'crit' };

type SKey = 'suspected' | 'confirmed' | 'resolved' | 'excluded';
const STATUS_TABS = [
  { v: 'suspected' as SKey, l: 'Nghi ngờ',  tone: 'warn' as const },
  { v: 'confirmed' as SKey, l: 'Xác định',  tone: 'crit' as const },
  { v: 'resolved' as SKey,  l: 'Đã giải quyết', tone: 'ok' as const },
  { v: 'excluded' as SKey,  l: 'Loại trừ',  tone: 'info' as const },
];

const sKey = (st: string | number | undefined): SKey => {
  const k = String(st || '').toLowerCase();
  if (k === 'confirmed' || k === '1') return 'confirmed';
  if (k === 'resolved' || k === '2') return 'resolved';
  if (k === 'excluded' || k === '3' || k === 'deceased') return 'excluded';
  return 'suspected';
};

const isDevice = (r: Row) => r.deviceAssociated || r.hasCentralLine || r.hasUrinaryCatheter || r.onVentilator;

const PER = 18;

// ─── TopTabs ───────────────────────────────────────────────────────────────
type TabKey = 'hai' | 'hh' | 'outbreak' | 'isolation';
const TOP_TABS: TopTab<TabKey>[] = [
  { v: 'hai', l: 'Ca NKBV' },
  { v: 'hh',  l: 'Vệ sinh tay' },
  { v: 'outbreak', l: 'Ổ dịch' },
  { v: 'isolation', l: 'Cách ly' },
];

// ─── Hand Hygiene form fields (static, no deps) ───────────────────────────
const hhFields: CrudFieldCfg[] = [
  { key: 'departmentId', label: 'Khoa', required: true },
  { key: 'auditDate', label: 'Ngày quan sát', type: 'date', required: true },
  { key: 'shift', label: 'Ca', type: 'select', options: [
    { value: 'Morning',   label: 'Sáng' },
    { value: 'Afternoon', label: 'Chiều' },
    { value: 'Evening',   label: 'Tối' },
    { value: 'Night',     label: 'Đêm' },
  ]},
  { key: 'opportunitiesTotal', label: 'Tổng cơ hội', type: 'number', required: true },
  { key: 'compliantCount',     label: 'Số tuân thủ',  type: 'number', required: true },
  { key: 'notes', label: 'Ghi chú', type: 'textarea' },
];

// Outbreak status → badge tone
const obTone = (s: string): 'ok' | 'warn' | 'info' =>
  s === 'Active' ? 'warn' : s === 'Resolved' ? 'ok' : 'info';

const InfectionControlV2: React.FC = () => {
  // ─── Tab ────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<TabKey>('hai');

  // ─── HAI state ──────────────────────────────────────────────────────────
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fInfType, setFInfType] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<Row | null>(null);
  const [admissionOpts, setAdmissionOpts] = useState<{ value: string; label: string }[]>([]);
  const [isoOpen, setIsoOpen] = useState(false);
  const [isoInit, setIsoInit] = useState<Record<string, unknown> | null>(null);

  const isoFields: CrudFieldCfg[] = useMemo(() => [
    { key: 'admissionId', label: 'Bệnh nhân (nội trú)', type: 'select', required: true, options: admissionOpts, showSearch: true },
    { key: 'isolationType', label: 'Loại cách ly', type: 'select', required: true, options: [
      { value: 'Contact',    label: 'Cách ly tiếp xúc' },
      { value: 'Droplet',   label: 'Cách ly giọt bắn' },
      { value: 'Airborne',  label: 'Cách ly không khí' },
      { value: 'Protective', label: 'Cách ly bảo vệ' }] },
    { key: 'precautions', label: 'Biện pháp phòng ngừa', type: 'multiselect', options: [
      { value: 'Gloves',  label: 'Găng tay' },
      { value: 'Gown',    label: 'Áo choàng' },
      { value: 'Mask',    label: 'Khẩu trang thường' },
      { value: 'N95',     label: 'Khẩu trang N95' },
      { value: 'Goggles', label: 'Kính bảo hộ' },
      { value: 'PrivateRoom', label: 'Phòng riêng' }] },
    { key: 'reason', label: 'Lý do cách ly', required: true, type: 'textarea' },
    { key: 'organism', label: 'Mầm bệnh' },
    { key: 'isMDRO', label: 'Kháng đa thuốc (MDRO)', type: 'switch' },
    { key: 'ppeRequirements', label: 'Yêu cầu PPE', type: 'multiselect', options: [
      { value: 'Gloves',  label: 'Găng tay' },
      { value: 'Gown',    label: 'Áo choàng' },
      { value: 'Mask',    label: 'Khẩu trang' },
      { value: 'N95',     label: 'N95' },
      { value: 'FaceShield', label: 'Tấm che mặt' }] },
    { key: 'visitorRestrictions', label: 'Hạn chế thăm bệnh', type: 'textarea' },
    { key: 'specialInstructions', label: 'Hướng dẫn đặc biệt', type: 'textarea' },
  ], [admissionOpts]);

  const [crudOpen, setCrudOpen] = useState(false);
  const [crudInit, setCrudInit] = useState<Record<string, unknown> | null>(null);

  const openCreate = () => { setCrudInit({ isMDRO: false, onsetDate: dayjs().format('YYYY-MM-DD') }); setCrudOpen(true); };

  // Form theo đúng contract backend ReportHAIDto (POST hai-reports). Backend không có
  // endpoint update/investigate/close cho HAI → trang chỉ hỗ trợ tạo mới.
  const haiFields: CrudFieldCfg[] = useMemo(() => [
    { key: 'admissionId', label: 'Bệnh nhân (nội trú)', type: 'select', required: true, options: admissionOpts, showSearch: true },
    { key: 'infectionType', label: 'Loại nhiễm khuẩn', type: 'select', required: true, options: [
      { value: 'CLABSI', label: 'NK huyết do catheter (CLABSI)' },
      { value: 'CAUTI', label: 'NK tiết niệu do sonde (CAUTI)' },
      { value: 'VAP', label: 'Viêm phổi thở máy (VAP)' },
      { value: 'SSI', label: 'NK vết mổ (SSI)' },
      { value: 'BSI', label: 'NK huyết (BSI)' },
      { value: 'Other', label: 'Khác' }] },
    { key: 'infectionSite', label: 'Vị trí nhiễm khuẩn' },
    { key: 'onsetDate', label: 'Ngày khởi phát', type: 'date', required: true },
    { key: 'organism', label: 'Mầm bệnh' },
    { key: 'isMDRO', label: 'Kháng đa thuốc (MDRO)', type: 'switch' },
    { key: 'criteriaUsed', label: 'Tiêu chuẩn CDC áp dụng', type: 'textarea' },
    { key: 'initialNotes', label: 'Ghi chú ban đầu', type: 'textarea' },
  ], [admissionOpts]);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getHAICases({ keyword: search, pageSize: 200 });
      const body = r.data as unknown;
      const list = (Array.isArray(body) ? body : ((body as { items?: Row[] })?.items || [])) as Row[];
      setItems(list);
    } catch { ti('Không tải được ca HAI'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  useEffect(() => {
    (async () => {
      try {
        const ip = await getInpatientList({ pageSize: 300 });
        setAdmissionOpts((ip.data?.items || []).map((p) => ({ value: p.admissionId, label: `${p.patientName} · ${p.bedName || p.roomName || p.departmentName}` })));
      // options optional — form vẫn mở được; cảnh báo để không hiểu nhầm "không có BN nội trú"
      } catch (e) { tw(friendlyErrorMessage(e, 'Không tải được danh sách bệnh nhân nội trú — ô chọn bệnh nhân sẽ trống.')); }
    })();
  }, []);

  // ─── Hand Hygiene state ─────────────────────────────────────────────────
  const [hhItems, setHhItems] = useState<HandHygieneObservationDto[]>([]);
  const [hhLoading, setHhLoading] = useState(false);
  const [hhLoaded, setHhLoaded] = useState(false);
  const [hhCrudOpen, setHhCrudOpen] = useState(false);
  const [hhCrudInit, setHhCrudInit] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (tab !== 'hh' || hhLoaded) return;
    setHhLoading(true);
    getHandHygieneObservations()
      .then((r) => {
        setHhItems(Array.isArray(r.data) ? r.data : []);
        setHhLoaded(true);
      })
      .catch(() => ti('Không tải được dữ liệu vệ sinh tay'))
      .finally(() => setHhLoading(false));
  }, [tab, hhLoaded]);

  // ─── Isolation orders state (#352 parity v1 tab Cách ly) ────────────────
  const [isoItems, setIsoItems] = useState<IsolationOrderDto[]>([]);
  const [isoLoading, setIsoLoading] = useState(false);
  const [isoLoaded, setIsoLoaded] = useState(false);
  const [isoSel, setIsoSel] = useState<IsolationOrderDto | null>(null);
  const [isoDiscTarget, setIsoDiscTarget] = useState<IsolationOrderDto | null>(null);
  const [isoDiscReason, setIsoDiscReason] = useState('');
  const [isoDiscSaving, setIsoDiscSaving] = useState(false);

  useEffect(() => {
    if (tab !== 'isolation' || isoLoaded) return;
    setIsoLoading(true);
    getIsolationOrders()
      .then((r) => {
        setIsoItems(Array.isArray(r.data) ? r.data : []);
        setIsoLoaded(true);
      })
      .catch(() => ti('Không tải được danh sách y lệnh cách ly'))
      .finally(() => setIsoLoading(false));
  }, [tab, isoLoaded]);

  const doDiscontinueIso = async () => {
    if (!isoDiscTarget) return;
    if (isoDiscSaving) return; // chặn double-submit ngay cả khi disabled chưa kịp render
    if (!isoDiscReason.trim()) { ti('Nhập lý do kết thúc cách ly'); return; }
    setIsoDiscSaving(true);
    try {
      await discontinueIsolation({ isolationOrderId: isoDiscTarget.id, reason: isoDiscReason.trim() });
      tk('Đã kết thúc cách ly');
      setIsoDiscTarget(null);
      setIsoDiscReason('');
      setIsoLoaded(false); // reload
    } catch { ti('Kết thúc cách ly thất bại'); }
    finally { setIsoDiscSaving(false); }
  };

  // ─── Outbreak state ─────────────────────────────────────────────────────
  const [outbreakItems, setOutbreakItems] = useState<OutbreakDto[]>([]);
  const [outbreakLoading, setOutbreakLoading] = useState(false);
  const [outbreakLoaded, setOutbreakLoaded] = useState(false);

  useEffect(() => {
    if (tab !== 'outbreak' || outbreakLoaded) return;
    setOutbreakLoading(true);
    getOutbreaks()
      .then((r) => {
        setOutbreakItems(Array.isArray(r.data) ? r.data : []);
        setOutbreakLoaded(true);
      })
      .catch(() => ti('Không tải được ổ dịch'))
      .finally(() => setOutbreakLoading(false));
  }, [tab, outbreakLoaded]);

  // ─── Investigate state ──────────────────────────────────────────────────
  const [invOpen, setInvOpen] = useState(false);
  const [invFindings, setInvFindings] = useState('');
  const [invActions, setInvActions] = useState('');
  const [invSaving, setInvSaving] = useState(false);

  // ─── HAI derived ────────────────────────────────────────────────────────
  const infTypes = useMemo(() => {
    const set = new Set(items.map((r) => r.infectionTypeName || r.infectionType).filter(Boolean) as string[]);
    return Array.from(set).map((v) => ({ v, l: v }));
  }, [items]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    STATUS_TABS.forEach((s) => { c[s.v] = items.filter((r) => sKey(r.status) === s.v).length; });
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (stab !== 'all' && sKey(r.status) !== stab) return false;
      const t = r.infectionTypeName || r.infectionType;
      if (fInfType && t !== fInfType) return false;
      if (!k) return true;
      return [r.caseCode, r.patientName, r.patientCode, r.organism, r.departmentName]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fInfType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  // ─── HAI table columns ──────────────────────────────────────────────────
  const cols: ColumnDef<Row>[] = [
    { key: 'code', label: 'Mã ca', code: true, render: (r) => r.caseCode || '—' },
    { key: 'pt', label: 'Bệnh nhân', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.patientName || '—'}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.patientCode || '—'}</div>
      </div>
    ) },
    { key: 'loc', label: 'Khoa · Giường', render: (r) => (
      <div>
        <div>{r.departmentName || '—'}</div>
        {r.bedNumber && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>G {r.bedNumber}</div>}
      </div>
    ) },
    { key: 'inf', label: 'Loại NK', render: (r) => r.infectionTypeName || r.infectionType || '—' },
    { key: 'org', label: 'Mầm bệnh', render: (r) => (
      <div>
        <div style={{ fontSize: 'var(--fs-sm)' }}>{r.organism || '—'}</div>
        {r.isMDRO && <StatusBadge tone="crit" dot>MDRO</StatusBadge>}
      </div>
    ) },
    { key: 'days', label: 'Ngày NV', mono: true, render: (r) => r.daysSinceAdmission ?? '—' },
    { key: 'dev', label: 'Thiết bị', render: (r) => isDevice(r)
      ? <StatusBadge tone="warn" dot>{r.hasCentralLine ? 'CL' : r.hasUrinaryCatheter ? 'UC' : r.onVentilator ? 'Vent' : 'TB'}</StatusBadge>
      : <span style={{ color: 'var(--t-2)' }}>—</span>
    },
    { key: 'sev', label: 'Mức', render: (r) => {
      const s = String(r.severity || '');
      const t = SEVERITY_TONE[s] || 'info';
      return <StatusBadge tone={t} dot>{r.severityName || SEVERITY_LABEL[s] || '—'}</StatusBadge>;
    } },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === sKey(r.status));
      return <StatusBadge tone={t?.tone || 'info'} dot>{r.statusName || t?.l || '—'}</StatusBadge>;
    } },
  ];

  const actions = (r: Row) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
    </div>
  );

  // ─── Hand Hygiene table columns ─────────────────────────────────────────
  const hhCols: ColumnDef<HandHygieneObservationDto>[] = [
    { key: 'dept',    label: 'Khoa',           render: (r) => r.departmentName },
    { key: 'date',    label: 'Ngày quan sát',  render: (r) => dayjs(r.observationDate).format('DD/MM/YYYY') },
    { key: 'shift',   label: 'Ca',             render: (r) => r.observationShift },
    { key: 'opp',     label: 'Cơ hội',         mono: true, render: (r) => r.totalOpportunities },
    { key: 'comp',    label: 'Tuân thủ',       mono: true, render: (r) => r.correctActions },
    { key: 'rate',    label: 'Tỷ lệ (%)',      render: (r) => `${r.complianceRate.toFixed(1)}%` },
    { key: 'auditor', label: 'Người quan sát', render: (r) => r.observedByName },
  ];

  // ─── Outbreak table columns ─────────────────────────────────────────────
  const obCols: ColumnDef<OutbreakDto>[] = [
    { key: 'code',    label: 'Mã ổ dịch',   code: true, render: (r) => r.outbreakCode },
    { key: 'disease', label: 'Bệnh',                    render: (r) => r.organism },
    { key: 'start',   label: 'Bắt đầu',                render: (r) => dayjs(r.startDate).format('DD/MM/YYYY') },
    { key: 'end',     label: 'Kết thúc',               render: (r) => r.endDate ? dayjs(r.endDate).format('DD/MM/YYYY') : '—' },
    { key: 'cases',   label: 'Số ca',        mono: true, render: (r) => r.totalCases },
    { key: 'status',  label: 'Trạng thái',             render: (r) => (
      <StatusBadge tone={obTone(r.statusName)} dot>{r.statusName}</StatusBadge>
    )},
    { key: 'dept',    label: 'Khoa',                    render: (r) => r.affectedDepartmentNames.join(', ') || '—' },
  ];

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="ab">
      <TopTabs<TabKey> tab={tab} setTab={setTab} tabs={TOP_TABS} />

      {/* ── Tab: Ca NKBV ─────────────────────────────────────────────── */}
      {tab === 'hai' && <>
        <KpiStrip items={[
          { lbl: 'Tổng ca HAI', val: items.length, sub: 'tất cả' },
          { lbl: 'MDRO', val: items.filter((c) => c.isMDRO).length, sub: 'kháng đa thuốc', tone: 'crit' },
          { lbl: 'Liên quan TB', val: items.filter(isDevice).length, sub: 'CLABSI/CAUTI/VAP', tone: 'warn' },
          { lbl: 'Ổ dịch', val: items.filter((c) => c.isOutbreakRelated).length, sub: 'cluster', tone: 'info' },
        ]} />

        <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
            placeholder="Tìm BN / mã ca / mầm bệnh…" />
          <Filter value={fInfType} onChange={setFInfType} options={infTypes} placeholder="▾ Loại NK" />
          <Btn variant="ghost" icon="x" onClick={() => { setSearch(''); setFInfType(''); setStab('all'); }}>Bỏ lọc</Btn>
          <span className="spacer" />
          <Btn variant="ghost" icon="refresh" onClick={load} loading={loading}>Làm mới</Btn>
          <Btn variant="ghost" icon="alert" onClick={() => { setIsoInit({ isMDRO: false }); setIsoOpen(true); }}>Cách ly</Btn>
          <Btn variant="primary" icon="plus" onClick={openCreate}>Báo cáo HAI</Btn>
        </div>

        <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

        <DataTable<Row>
          columns={cols} data={paged} rowKey={(r) => r.id}
          onRowClick={setSel} actions={actions}
          loading={loading}
          empty={'Chưa có ca HAI'}
        />
        <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />
      </>}

      {/* ── Tab: Vệ sinh tay ──────────────────────────────────────────── */}
      {tab === 'hh' && <>
        <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
          <span className="spacer" />
          <Btn variant="ghost" icon="refresh" onClick={() => setHhLoaded(false)} loading={hhLoading}>Làm mới</Btn>
          <Btn variant="primary" icon="plus" onClick={() => { setHhCrudInit(null); setHhCrudOpen(true); }}>Thêm quan sát</Btn>
        </div>
        <DataTable<HandHygieneObservationDto>
          columns={hhCols} data={hhItems} rowKey={(r) => r.id}
          loading={hhLoading}
          empty={'Chưa có dữ liệu vệ sinh tay'}
        />
      </>}

      {/* ── Tab: Ổ dịch ──────────────────────────────────────────────── */}
      {tab === 'outbreak' && <>
        <DataTable<OutbreakDto>
          columns={obCols} data={outbreakItems} rowKey={(r) => r.id}
          loading={outbreakLoading}
          empty={'Chưa có ổ dịch'}
        />
      </>}

      {/* ── Tab: Cách ly (#352 parity v1 pages/InfectionControl.tsx:803-851) ── */}
      {tab === 'isolation' && <>
        <KpiStrip items={[
          { lbl: 'Tổng y lệnh', val: isoItems.length, sub: 'cách ly' },
          { lbl: 'Đang cách ly', val: isoItems.filter((o) => !o.discontinuedDate).length, tone: 'warn' },
          { lbl: 'MDRO', val: isoItems.filter((o) => o.isMDRO).length, sub: 'kháng đa thuốc', tone: 'crit' },
          { lbl: 'Đã kết thúc', val: isoItems.filter((o) => !!o.discontinuedDate).length, tone: 'ok' },
        ]} />
        <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
          <span className="spacer" />
          <Btn variant="ghost" icon="refresh" onClick={() => setIsoLoaded(false)} loading={isoLoading}>Làm mới</Btn>
        </div>
        <DataTable<IsolationOrderDto>
          columns={[
            { key: 'code', label: 'Mã YL', code: true, width: 120, render: (r) => r.orderCode },
            { key: 'patient', label: 'Bệnh nhân', render: (r) => (
              <div className="cell-2l">
                <b>{r.patientName}</b>
                <i>{r.departmentName}{r.bedNumber ? ` · giường ${r.bedNumber}` : ''}</i>
              </div>
            ) },
            { key: 'type', label: 'Loại cách ly', width: 140, render: (r) => (
              <span className="chip warn">{r.isolationTypeName || r.isolationType}</span>
            ) },
            { key: 'reason', label: 'Lý do / tác nhân', render: (r) => (
              <div className="cell-2l">
                <b>{r.reason}</b>
                {r.organism && <i>{r.organism}{r.isMDRO ? ' · MDRO' : ''}</i>}
              </div>
            ) },
            { key: 'start', label: 'Bắt đầu', mono: true, width: 110, render: (r) => dayjs(r.startDate).format('DD/MM/YYYY') },
            { key: 'st', label: 'TT', width: 130, render: (r) => r.discontinuedDate
              ? <StatusBadge tone="ok" dot>Đã kết thúc</StatusBadge>
              : <StatusBadge tone="warn" dot>{r.statusName || 'Đang cách ly'}</StatusBadge> },
          ]}
          data={isoItems} rowKey={(r) => r.id}
          loading={isoLoading}
          onRowClick={(r) => setIsoSel(r)}
          actions={(r) => (
            <div className="ab-actions">
              <ActBtn ic="eye" title="Chi tiết" onClick={() => setIsoSel(r)} />
              {!r.discontinuedDate && (
                <ActBtn ic="x" title="Kết thúc cách ly" tone="warn"
                  onClick={() => { setIsoDiscTarget(r); setIsoDiscReason(''); }} />
              )}
            </div>
          )}
          empty={'Chưa có y lệnh cách ly'}
        />
      </>}

      {/* ── DrawerShell: HAI detail ───────────────────────────────────── */}
      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? `Ca HAI ${sel.caseCode || '—'}` : ''}
        sub={sel ? `${sel.patientName || '—'} · ${sel.organism || sel.infectionTypeName || '—'}` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
          <Btn variant="ghost" icon="search" onClick={() => { setInvFindings(''); setInvActions(''); setInvOpen(true); }}>Điều tra</Btn>
          <Btn icon="print" onClick={() => window.print()}>In báo cáo</Btn>
        </>}
      >
        {sel && <>
          <DrSec title="Bệnh nhân & vị trí">
            <DrField lbl="Mã ca"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.caseCode || '—'}</span></DrField>
            <DrField lbl="Bệnh nhân">{sel.patientName} · {sel.patientCode}</DrField>
            <DrField lbl="Khoa">{sel.departmentName || '—'}</DrField>
            <DrField lbl="Giường">{sel.bedNumber || '—'}</DrField>
          </DrSec>
          <DrSec title="Nhiễm khuẩn">
            <DrField lbl="Loại NK">{sel.infectionTypeName || sel.infectionType || '—'}</DrField>
            <DrField lbl="Vị trí">{sel.infectionSite || '—'}</DrField>
            {sel.onsetDate && <DrField lbl="Khởi phát">{dayjs(sel.onsetDate).format('DD/MM/YYYY')}</DrField>}
            {sel.diagnosisDate && <DrField lbl="Chẩn đoán">{dayjs(sel.diagnosisDate).format('DD/MM/YYYY')}</DrField>}
            <DrField lbl="Ngày sau NV"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.daysSinceAdmission ?? '—'}</span></DrField>
            <DrField lbl="Mầm bệnh">{sel.organism || '—'}</DrField>
            <DrField lbl="MDRO">
              {sel.isMDRO
                ? <StatusBadge tone="crit" dot>{sel.mdroType || 'Có'}</StatusBadge>
                : <span style={{ color: 'var(--t-2)' }}>Không</span>}
            </DrField>
            {sel.resistancePattern && <DrField lbl="Kháng">{sel.resistancePattern}</DrField>}
          </DrSec>
          {(sel.hasCentralLine || sel.hasUrinaryCatheter || sel.onVentilator || sel.deviceAssociated) && (
            <DrSec title="Thiết bị xâm lấn">
              {sel.hasCentralLine && <DrField lbl="Catheter TMTT">{sel.centralLineDays ?? '?'} ngày</DrField>}
              {sel.hasUrinaryCatheter && <DrField lbl="Sonde tiểu">{sel.catheterDays ?? '?'} ngày</DrField>}
              {sel.onVentilator && <DrField lbl="Thở máy">{sel.ventilatorDays ?? '?'} ngày</DrField>}
              {sel.deviceAssociated && sel.deviceType && (
                <DrField lbl="TB khác">{sel.deviceType}{sel.deviceDays ? ` · ${sel.deviceDays} ngày` : ''}</DrField>
              )}
            </DrSec>
          )}
          <DrSec title="Đánh giá">
            <DrField lbl="Mức độ">
              <StatusBadge tone={SEVERITY_TONE[String(sel.severity || '')] || 'info'} dot>
                {sel.severityName || SEVERITY_LABEL[String(sel.severity || '')] || '—'}
              </StatusBadge>
            </DrField>
            <DrField lbl="Trạng thái">
              <StatusBadge tone={STATUS_TABS.find((x) => x.v === sKey(sel.status))?.tone || 'info'} dot>
                {sel.statusName || STATUS_TABS.find((x) => x.v === sKey(sel.status))?.l || '—'}
              </StatusBadge>
            </DrField>
            <DrField lbl="Liên quan ổ dịch">{sel.isOutbreakRelated ? 'Có' : 'Không'}</DrField>
            <DrField lbl="Cách ly">{sel.requiresIsolation ? 'Có' : 'Không'}</DrField>
            {sel.riskFactors && sel.riskFactors.length > 0 && (
              <DrField lbl="Yếu tố nguy cơ">{sel.riskFactors.join(', ')}</DrField>
            )}
            <DrField lbl="Người báo cáo">{sel.reportedBy || '—'}</DrField>
          </DrSec>
        </>}
      </DrawerShell>

      {/* ── CrudModal: Báo cáo HAI ────────────────────────────────────── */}
      <CrudModal
        open={crudOpen}
        onClose={() => setCrudOpen(false)}
        title="Báo cáo ca nhiễm khuẩn bệnh viện (HAI)"
        fields={haiFields}
        initial={crudInit}
        size="lg"
        onSubmit={async (v) => {
          await createHAICase(v as unknown as CreateHAISurveillanceDto);
          tk('Đã tạo báo cáo HAI');
          load();
        }}
      />

      {/* ── CrudModal: Lệnh cách ly ───────────────────────────────────── */}
      <CrudModal
        open={isoOpen}
        onClose={() => setIsoOpen(false)}
        title="Lệnh cách ly bệnh nhân"
        fields={isoFields}
        initial={isoInit}
        size="lg"
        onSubmit={async (v) => {
          const dto: CreateIsolationOrderDto = {
            admissionId: v.admissionId as string,
            isolationType: v.isolationType as string,
            precautions: (v.precautions as string[]) || [],
            reason: v.reason as string,
            organism: v.organism as string | undefined,
            isMDRO: !!(v.isMDRO),
            roomId: v.roomId as string | undefined,
            ppeRequirements: (v.ppeRequirements as string[]) || [],
            visitorRestrictions: v.visitorRestrictions as string | undefined,
            specialInstructions: v.specialInstructions as string | undefined,
          };
          await createIsolationOrder(dto);
          tk('Đã tạo lệnh cách ly');
          load();
        }}
      />

      {/* ── CrudModal: Thêm quan sát vệ sinh tay ─────────────────────── */}
      <CrudModal
        open={hhCrudOpen}
        onClose={() => setHhCrudOpen(false)}
        title="Thêm quan sát vệ sinh tay"
        fields={hhFields}
        initial={hhCrudInit}
        onSubmit={async (v) => {
          await createHandHygieneObservation(v as unknown as CreateHandHygieneObservationDto);
          tk('Đã lưu quan sát');
          setHhLoaded(false);
          setHhCrudOpen(false);
        }}
      />

      {/* ── ModalShell: Điều tra ca HAI ───────────────────────────────── */}
      <ModalShell
        open={invOpen}
        onClose={() => setInvOpen(false)}
        title="Điều tra ca HAI"
        sub={sel ? `Ca ${sel.caseCode || '—'} · ${sel.patientName || '—'}` : undefined}
        footer={<>
          <Btn variant="ghost" onClick={() => setInvOpen(false)}>Hủy</Btn>
          <Btn variant="primary" disabled={invSaving} onClick={async () => {
            if (!sel) return;
            if (invSaving) return; // chặn double-submit
            setInvSaving(true);
            try {
              await investigateHAICase(
                sel.id,
                invFindings,
                invActions.split(',').map((s) => s.trim()).filter(Boolean),
              );
              tk('Đã lưu kết quả điều tra');
              setInvOpen(false);
            } catch { ti('Không lưu được điều tra'); }
            finally { setInvSaving(false); }
          }}>{invSaving ? 'Đang lưu…' : 'Lưu'}</Btn>
        </>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0' }}>
          <div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginBottom: 4 }}>Phát hiện</div>
            <textarea
              value={invFindings}
              onChange={(e) => setInvFindings(e.target.value)}
              rows={4}
              style={{
                width: '100%', resize: 'vertical',
                background: 'var(--bg-1)', border: '1px solid var(--line)', borderRadius: 4,
                padding: 8, color: 'var(--t-0)', fontSize: 'var(--fs-sm)', boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginBottom: 4 }}>Hành động (phân cách bằng dấu phẩy)</div>
            <textarea
              value={invActions}
              onChange={(e) => setInvActions(e.target.value)}
              rows={4}
              style={{
                width: '100%', resize: 'vertical',
                background: 'var(--bg-1)', border: '1px solid var(--line)', borderRadius: 4,
                padding: 8, color: 'var(--t-0)', fontSize: 'var(--fs-sm)', boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      </ModalShell>

      {/* ── Drawer: chi tiết y lệnh cách ly ─────────────────────────────── */}
      <DrawerShell
        open={!!isoSel}
        onClose={() => setIsoSel(null)}
        size="md"
        title={isoSel ? `Cách ly ${isoSel.orderCode}` : ''}
        sub={isoSel ? `${isoSel.patientName} · ${isoSel.departmentName}` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setIsoSel(null)}>Đóng</Btn>
          {isoSel && !isoSel.discontinuedDate && (
            <Btn variant="primary" icon="x" onClick={() => { setIsoDiscTarget(isoSel); setIsoDiscReason(''); setIsoSel(null); }}>
              Kết thúc cách ly
            </Btn>
          )}
        </>}
      >
        {isoSel && <>
          <DrSec title="Y lệnh">
            <DrField lbl="Loại cách ly"><span className="chip warn">{isoSel.isolationTypeName || isoSel.isolationType}</span></DrField>
            <DrField lbl="Lý do">{isoSel.reason}</DrField>
            {isoSel.organism && <DrField lbl="Tác nhân">{isoSel.organism}{isoSel.isMDRO ? ' (MDRO)' : ''}</DrField>}
            <DrField lbl="Bắt đầu">{dayjs(isoSel.startDate).format('DD/MM/YYYY')}</DrField>
            <DrField lbl="BS chỉ định">{isoSel.orderedByName || '—'}</DrField>
          </DrSec>
          <DrSec title="Biện pháp">
            <DrField lbl="Phòng ngừa">{isoSel.precautions?.length ? isoSel.precautions.join(', ') : '—'}</DrField>
            <DrField lbl="PPE">{isoSel.ppeRequirements?.length ? isoSel.ppeRequirements.join(', ') : '—'}</DrField>
            {isoSel.visitorRestrictions && <DrField lbl="Hạn chế thăm">{isoSel.visitorRestrictions}</DrField>}
            {isoSel.specialInstructions && <DrField lbl="Hướng dẫn đặc biệt">{isoSel.specialInstructions}</DrField>}
          </DrSec>
          {isoSel.discontinuedDate && (
            <DrSec title="Kết thúc">
              <DrField lbl="Ngày">{dayjs(isoSel.discontinuedDate).format('DD/MM/YYYY')}</DrField>
              <DrField lbl="Người kết thúc">{isoSel.discontinuedByName || '—'}</DrField>
              {isoSel.discontinuedReason && <DrField lbl="Lý do">{isoSel.discontinuedReason}</DrField>}
            </DrSec>
          )}
        </>}
      </DrawerShell>

      {/* ── Modal: kết thúc cách ly (bắt buộc lý do) ────────────────────── */}
      <ModalShell
        open={!!isoDiscTarget}
        onClose={() => setIsoDiscTarget(null)}
        title={isoDiscTarget ? `Kết thúc cách ly ${isoDiscTarget.orderCode}` : ''}
        sub={isoDiscTarget ? `${isoDiscTarget.patientName} · ${isoDiscTarget.isolationTypeName || isoDiscTarget.isolationType}` : ''}
        size="sm"
        footer={<>
          <Btn variant="ghost" onClick={() => setIsoDiscTarget(null)}>Hủy</Btn>
          <Btn variant="primary" disabled={isoDiscSaving} onClick={doDiscontinueIso}>
            {isoDiscSaving ? 'Đang xử lý…' : 'Xác nhận kết thúc'}
          </Btn>
        </>}
      >
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginBottom: 4 }}>Lý do kết thúc cách ly *</div>
        <textarea
          value={isoDiscReason}
          onChange={(e) => setIsoDiscReason(e.target.value)}
          rows={3}
          placeholder="VD: đủ tiêu chuẩn ngừng cách ly, 2 lần cấy âm tính…"
          style={{
            width: '100%', resize: 'vertical',
            background: 'var(--bg-1)', border: '1px solid var(--line)', borderRadius: 4,
            padding: 8, color: 'var(--t-0)', fontSize: 'var(--fs-sm)', boxSizing: 'border-box',
          }}
        />
      </ModalShell>
    </div>
  );
};

export default InfectionControlV2;
