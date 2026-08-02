import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  searchIncidents, getIncidentStats, createIncident, updateIncident,
  searchInspections, createInspection, updateInspection, getInspectionStats,
} from '../api/foodSafety';
import type { FoodSafetyIncident, FoodSafetyStats, FoodInspection, InspectionStats } from '../api/foodSafety';
import {
  KpiStrip, TopTabs, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn, Btn,
  DrawerShell, DrSec, DrField, CrudModal, tk, ti,
  type ColumnDef, type CrudFieldCfg,
} from '@/_v2kit';

// ──── Incident constants ────

const FS_FIELDS: CrudFieldCfg[] = [
  { key: 'incidentCode', label: 'Mã vụ', required: true, disabledOnEdit: true },
  { key: 'incidentDate', label: 'Ngày xảy ra', type: 'date', required: true },
  { key: 'reportDate', label: 'Ngày báo cáo', type: 'date' },
  { key: 'location', label: 'Địa điểm', required: true },
  { key: 'locationAddress', label: 'Địa chỉ' },
  { key: 'locationType', label: 'Loại địa điểm', type: 'select', options: [
    { value: 'Restaurant', label: 'Nhà hàng' }, { value: 'School', label: 'Trường học' },
    { value: 'Factory', label: 'Nhà máy' }, { value: 'Hospital', label: 'Bệnh viện' },
    { value: 'Market', label: 'Chợ' }, { value: 'Other', label: 'Khác' }] },
  { key: 'description', label: 'Mô tả', type: 'textarea', required: true },
  { key: 'suspectedFood', label: 'Thực phẩm nghi ngờ' },
  { key: 'suspectedCause', label: 'Nguyên nhân nghi ngờ' },
  { key: 'totalAffected', label: 'Số người AH', type: 'number' },
  { key: 'hospitalized', label: 'Nhập viện', type: 'number' },
  { key: 'deaths', label: 'Tử vong', type: 'number' },
  { key: 'severity', label: 'Mức độ', type: 'select', options: [
    { value: 1, label: 'Nhẹ' }, { value: 2, label: 'Vừa' }, { value: 3, label: 'Nặng' }, { value: 4, label: 'Nguy kịch' }] },
  { key: 'investigationStatus', label: 'TT điều tra', type: 'select', options: [
    { value: 0, label: 'Đã báo cáo' }, { value: 1, label: 'Đang điều tra' }, { value: 2, label: 'Xác nhận' }, { value: 3, label: 'Đã đóng' }] },
  { key: 'reportedBy', label: 'Người báo cáo' },
  { key: 'notes', label: 'Ghi chú', type: 'textarea' },
];

const STATUS_LABEL: Record<number, string> = { 0: 'Báo cáo', 1: 'Điều tra', 2: 'Xác nhận', 3: 'Đóng' };
const SEVERITY_LABEL: Record<number, string> = { 1: 'Nhẹ', 2: 'Vừa', 3: 'Nặng', 4: 'Nguy kịch' };
const SEVERITY_TONE: Record<number, 'ok' | 'info' | 'warn' | 'crit'> = { 1: 'ok', 2: 'info', 3: 'warn', 4: 'crit' };

type SKey = 'reported' | 'investigating' | 'confirmed' | 'closed';
const STATUS_TABS = [
  { v: 'reported' as SKey,      l: 'Báo cáo',   tone: 'info' as const },
  { v: 'investigating' as SKey, l: 'Điều tra',   tone: 'warn' as const },
  { v: 'confirmed' as SKey,     l: 'Xác nhận',   tone: 'crit' as const },
  { v: 'closed' as SKey,        l: 'Đóng',       tone: 'ok' as const },
];

const sKey = (n: number): SKey =>
  n === 0 ? 'reported' : n === 1 ? 'investigating' : n === 2 ? 'confirmed' : 'closed';

// ──── Inspection constants ────

const INSP_FIELDS: CrudFieldCfg[] = [
  { key: 'inspectionCode', label: 'Mã thanh kiểm', required: true, disabledOnEdit: true },
  { key: 'inspectionDate', label: 'Ngày kiểm tra', type: 'date', required: true },
  { key: 'facilityName', label: 'Tên cơ sở', required: true },
  { key: 'facilityAddress', label: 'Địa chỉ cơ sở', required: true },
  { key: 'facilityType', label: 'Loại cơ sở', type: 'select', options: [
    { value: 'Restaurant', label: 'Nhà hàng' }, { value: 'School', label: 'Trường học' },
    { value: 'Factory', label: 'Nhà máy' }, { value: 'Hospital', label: 'Bệnh viện' },
    { value: 'Market', label: 'Chợ' }, { value: 'Other', label: 'Khác' }] },
  { key: 'inspectorName', label: 'Thanh tra viên', required: true },
  { key: 'complianceLevel', label: 'Xếp loại', type: 'select', required: true, options: [
    { value: 'A', label: 'A — Xuất sắc' }, { value: 'B', label: 'B — Khá' },
    { value: 'C', label: 'C — Trung bình' }, { value: 'D', label: 'D — Không đạt' }] },
  { key: 'overallScore', label: 'Điểm tổng thể', type: 'number' },
  { key: 'hygieneScore', label: 'Điểm VSTP', type: 'number' },
  { key: 'notes', label: 'Ghi chú', type: 'textarea' },
];

const INSP_STATUS_LABEL: Record<number, string> = { 0: 'Đã lên lịch', 1: 'Hoàn thành', 2: 'Tái kiểm', 3: 'Đóng' };
const INSP_STATUS_TONE: Record<number, 'ok' | 'info' | 'warn' | 'crit'> = { 0: 'info', 1: 'ok', 2: 'warn', 3: 'ok' };
const COMPLIANCE_TONE: Record<string, 'ok' | 'info' | 'warn' | 'crit'> = { A: 'ok', B: 'info', C: 'warn', D: 'crit' };

// ──── Shared ────

const PER = 18;

type MainTab = 'incidents' | 'inspections' | 'statistics';
const TOP_TABS: { v: MainTab; l: string; ic?: string }[] = [
  { v: 'incidents',   l: 'Vụ ngộ độc',    ic: 'alert' },
  { v: 'inspections', l: 'Thanh kiểm tra', ic: 'clipboard' },
  { v: 'statistics',  l: 'Thống kê',       ic: 'chart' },
];

// ──── Component ────

const FoodSafetyV2: React.FC = () => {
  // Top tab
  const [tab, setTab] = useState<MainTab>('incidents');

  // ── Incident state ──
  const [items, setItems] = useState<FoodSafetyIncident[]>([]);
  const [stats, setStats] = useState<FoodSafetyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fLoc, setFLoc] = useState('');
  const [fSev, setFSev] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<FoodSafetyIncident | null>(null);
  const [crudOpen, setCrudOpen] = useState(false);
  const [crudInit, setCrudInit] = useState<Record<string, unknown> | null>(null);

  // ── Inspection state ──
  const [inspItems, setInspItems] = useState<FoodInspection[]>([]);
  const [inspStats, setInspStats] = useState<InspectionStats | null>(null);
  const [inspLoading, setInspLoading] = useState(false);
  const [inspSearch, setInspSearch] = useState('');
  const [fCompliance, setFCompliance] = useState('');
  const [fFacType, setFFacType] = useState('');
  const [inspPage, setInspPage] = useState(0);
  const [inspSel, setInspSel] = useState<FoodInspection | null>(null);
  const [inspCrudOpen, setInspCrudOpen] = useState(false);
  const [inspCrudInit, setInspCrudInit] = useState<Record<string, unknown> | null>(null);

  // ── Loaders ──
  const load = async () => {
    setLoading(true);
    try {
      const [list, s] = await Promise.all([searchIncidents({ keyword: search }), getIncidentStats()]);
      setItems(list);
      setStats(s);
    } catch { ti('Không tải được vụ ngộ độc thực phẩm'); }
    finally { setLoading(false); }
  };

  const loadInspections = async () => {
    setInspLoading(true);
    try {
      const [list, s] = await Promise.all([searchInspections(), getInspectionStats()]);
      setInspItems(list);
      setInspStats(s);
    } catch { ti('Không tải được danh sách thanh kiểm'); }
    finally { setInspLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  // Tab Thống kê cần cả inspStats → nạp chung
  useEffect(() => { if (tab === 'inspections' || tab === 'statistics') loadInspections(); /* eslint-disable-next-line */ }, [tab]);

  // ── Incident derived ──
  const locTypes = useMemo(() => {
    const set = new Set(items.map((r) => r.locationType).filter(Boolean));
    return Array.from(set).map((v) => ({ v, l: v }));
  }, [items]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    STATUS_TABS.forEach((s) => { c[s.v] = items.filter((r) => sKey(r.investigationStatus) === s.v).length; });
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (stab !== 'all' && sKey(r.investigationStatus) !== stab) return false;
      if (fLoc && r.locationType !== fLoc) return false;
      if (fSev && r.severity !== Number(fSev)) return false;
      if (!k) return true;
      return [r.location, r.incidentCode, r.description, r.suspectedFood]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fLoc, fSev]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  // ── Inspection derived ──
  const inspFacTypes = useMemo(() => {
    const set = new Set(inspItems.map((r) => r.facilityType).filter(Boolean));
    return Array.from(set).map((v) => ({ v, l: v }));
  }, [inspItems]);

  const inspFiltered = useMemo(() => {
    const k = inspSearch.trim().toLowerCase();
    return inspItems.filter((r) => {
      if (fCompliance && r.complianceLevel !== fCompliance) return false;
      if (fFacType && r.facilityType !== fFacType) return false;
      if (!k) return true;
      return [r.inspectionCode, r.facilityName, r.facilityAddress, r.inspectorName]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [inspItems, inspSearch, fCompliance, fFacType]);

  const inspTotalPages = Math.max(1, Math.ceil(inspFiltered.length / PER));
  const inspPaged = inspFiltered.slice(inspPage * PER, (inspPage + 1) * PER);

  // ── Incident columns ──
  const cols: ColumnDef<FoodSafetyIncident>[] = [
    { key: 'code', label: 'Mã vụ', code: true, render: (r) => r.incidentCode },
    { key: 'date', label: 'Ngày', mono: true, render: (r) => dayjs(r.incidentDate).format('DD/MM/YYYY') },
    { key: 'loc', label: 'Địa điểm', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.location}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.locationType}</div>
      </div>
    ) },
    { key: 'aff', label: 'Người AH', mono: true, render: (r) => (
      <span style={{ color: r.totalAffected > 50 ? 'var(--a-rd-text)' : r.totalAffected > 10 ? 'var(--a-or-text)' : undefined }}>
        {r.totalAffected}
      </span>
    ) },
    { key: 'hosp', label: 'Nhập viện', mono: true, render: (r) => r.hospitalized || 0 },
    { key: 'death', label: 'Tử vong', mono: true, render: (r) => r.deaths
      ? <span style={{ color: 'var(--a-rd-text)', fontWeight: 600 }}>{r.deaths}</span>
      : <span style={{ color: 'var(--t-2)' }}>0</span>
    },
    { key: 'sev', label: 'Mức độ', render: (r) => (
      <StatusBadge tone={SEVERITY_TONE[r.severity] || 'info'} dot>{SEVERITY_LABEL[r.severity] || '—'}</StatusBadge>
    ) },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === sKey(r.investigationStatus));
      return <StatusBadge tone={t?.tone || 'info'} dot>{STATUS_LABEL[r.investigationStatus] || '—'}</StatusBadge>;
    } },
  ];

  // ── Inspection columns ──
  const inspCols: ColumnDef<FoodInspection>[] = [
    { key: 'code', label: 'Mã kiểm tra', code: true, render: (r) => r.inspectionCode },
    { key: 'date', label: 'Ngày', mono: true, render: (r) => dayjs(r.inspectionDate).format('DD/MM/YYYY') },
    { key: 'facility', label: 'Cơ sở', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.facilityName}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.facilityType}</div>
      </div>
    ) },
    { key: 'inspector', label: 'Thanh tra viên', render: (r) => r.inspectorName },
    { key: 'compliance', label: 'Xếp loại', render: (r) => (
      <StatusBadge tone={COMPLIANCE_TONE[r.complianceLevel] ?? 'info'} dot>
        Hạng {r.complianceLevel}
      </StatusBadge>
    ) },
    { key: 'score', label: 'Điểm', mono: true, render: (r) => r.overallScore },
    { key: 'st', label: 'Trạng thái', render: (r) => (
      <StatusBadge tone={INSP_STATUS_TONE[r.status] ?? 'info'} dot>
        {INSP_STATUS_LABEL[r.status] || '—'}
      </StatusBadge>
    ) },
  ];

  // ── Incident CRUD ──
  const openCreate = () => { setCrudInit({ severity: 2, investigationStatus: 0, totalAffected: 0, hospitalized: 0, deaths: 0 }); setCrudOpen(true); };
  const openEdit = (r: FoodSafetyIncident) => { setCrudInit({ ...r } as Record<string, unknown>); setCrudOpen(true); };

  const actions = (r: FoodSafetyIncident) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      <ActBtn ic="edit" title="Cập nhật điều tra" onClick={() => openEdit(r)} />
    </div>
  );

  // ── Inspection CRUD ──
  const inspOpenCreate = () => { setInspCrudInit({ overallScore: 0, hygieneScore: 0, status: 0 }); setInspCrudOpen(true); };
  const inspOpenEdit = (r: FoodInspection) => { setInspCrudInit({ ...r } as Record<string, unknown>); setInspCrudOpen(true); };

  const inspActions = (r: FoodInspection) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setInspSel(r)} />
      <ActBtn ic="edit" title="Cập nhật" onClick={() => inspOpenEdit(r)} />
    </div>
  );

  // ── Filter option lists ──
  const sevOpts = [
    { v: '1', l: 'Nhẹ' }, { v: '2', l: 'Vừa' }, { v: '3', l: 'Nặng' }, { v: '4', l: 'Nguy kịch' },
  ];
  const complianceOpts = [
    { v: 'A', l: 'Hạng A' }, { v: 'B', l: 'Hạng B' }, { v: 'C', l: 'Hạng C' }, { v: 'D', l: 'Hạng D' },
  ];

  return (
    <div className="ab">
      <TopTabs<MainTab> tab={tab} setTab={setTab} tabs={TOP_TABS} />

      {/* ════════════ TAB: VỤ NGỘ ĐỘC ════════════ */}
      {tab === 'incidents' && (
        <>
          <KpiStrip items={[
            { lbl: 'Tổng vụ', val: stats?.totalIncidents ?? items.length, sub: 'tổng số' },
            { lbl: 'Đang điều tra', val: stats?.activeInvestigations ?? counts.investigating ?? 0, sub: 'cần xử lý', tone: 'warn' },
            { lbl: 'Người ảnh hưởng', val: stats?.totalAffected ?? items.reduce((s, i) => s + (i.totalAffected || 0), 0), sub: 'tổng AH', tone: 'info' },
            { lbl: 'Tử vong', val: items.reduce((s, i) => s + (i.deaths || 0), 0), sub: 'liên quan', tone: 'crit' },
          ]} />

          <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
            <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
              placeholder="Tìm địa điểm / mã vụ / mô tả…" />
            <Filter value={fLoc} onChange={setFLoc} options={locTypes} placeholder="▾ Loại địa điểm" />
            <Filter value={fSev} onChange={setFSev} options={sevOpts} placeholder="▾ Mức độ" />
            <Btn variant="ghost" icon="x" onClick={() => { setSearch(''); setFLoc(''); setFSev(''); setStab('all'); }}>Bỏ lọc</Btn>
            <span className="spacer" />
            <Btn variant="ghost" icon="refresh" onClick={load}>Làm mới</Btn>
            <Btn variant="primary" icon="plus" onClick={openCreate}>Báo cáo vụ</Btn>
          </div>

          <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

          <DataTable<FoodSafetyIncident>
            columns={cols} data={paged} rowKey={(r) => r.id}
            onRowClick={setSel} actions={actions}
            empty={loading ? 'Đang tải…' : 'Chưa có vụ ngộ độc'}
          />
          <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

          <DrawerShell
            open={!!sel}
            onClose={() => setSel(null)}
            size="xl"
            title={sel ? `Vụ ${sel.incidentCode}` : ''}
            sub={sel ? `${sel.location} · ${dayjs(sel.incidentDate).format('DD/MM/YYYY')}` : ''}
            footer={<>
              <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
              <Btn icon="print" onClick={() => window.print()}>In báo cáo</Btn>
              <Btn variant="primary" icon="edit" onClick={() => { if (sel) openEdit(sel); setSel(null); }}>Cập nhật</Btn>
            </>}
          >
            {sel && <>
              <DrSec title="Vụ việc">
                <DrField lbl="Mã vụ"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.incidentCode}</span></DrField>
                <DrField lbl="Ngày xảy ra">{dayjs(sel.incidentDate).format('DD/MM/YYYY')}</DrField>
                <DrField lbl="Báo cáo lúc">{dayjs(sel.reportDate).format('DD/MM/YYYY HH:mm')}</DrField>
                <DrField lbl="Địa điểm">{sel.location}</DrField>
                <DrField lbl="Loại">{sel.locationType}</DrField>
                {sel.locationAddress && <DrField lbl="Địa chỉ">{sel.locationAddress}</DrField>}
                <DrField lbl="Mô tả">{sel.description}</DrField>
                {sel.suspectedFood && <DrField lbl="Thực phẩm nghi">{sel.suspectedFood}</DrField>}
                {sel.suspectedCause && <DrField lbl="Nguyên nhân nghi">{sel.suspectedCause}</DrField>}
              </DrSec>
              <DrSec title="Thiệt hại">
                <div style={{ padding: 'var(--space-14)', background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-2)' }}>
                  <Line label="Tổng người ảnh hưởng" value={sel.totalAffected} />
                  <Line label="Nhập viện" value={sel.hospitalized} tone="warn" />
                  <Line label="Tử vong" value={sel.deaths} tone={sel.deaths > 0 ? 'crit' : undefined} />
                  <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '8px 0' }} />
                  <Line label="Mức độ" value={SEVERITY_LABEL[sel.severity] || '—'} tone={SEVERITY_TONE[sel.severity]} bold />
                </div>
              </DrSec>
              <DrSec title="Điều tra">
                <DrField lbl="Trạng thái">
                  <StatusBadge tone={STATUS_TABS.find((x) => x.v === sKey(sel.investigationStatus))?.tone || 'info'} dot>
                    {STATUS_LABEL[sel.investigationStatus] || '—'}
                  </StatusBadge>
                </DrField>
                <DrField lbl="Người báo cáo">{sel.reportedByName || sel.reportedBy}</DrField>
                <DrField lbl="Cán bộ điều tra">{sel.investigatorName || '—'}</DrField>
                {sel.investigationFindings && <DrField lbl="Kết quả ĐT">{sel.investigationFindings}</DrField>}
                {sel.correctiveActions && <DrField lbl="Biện pháp KP">{sel.correctiveActions}</DrField>}
                {sel.closedDate && <DrField lbl="Ngày đóng vụ">{dayjs(sel.closedDate).format('DD/MM/YYYY')}</DrField>}
              </DrSec>
            </>}
          </DrawerShell>

          <CrudModal
            open={crudOpen}
            onClose={() => setCrudOpen(false)}
            title={crudInit?.id ? 'Cập nhật vụ ATTP' : 'Báo cáo vụ ngộ độc TP'}
            fields={FS_FIELDS}
            initial={crudInit}
            size="xl"
            onSubmit={async (v, editing) => {
              if (editing && crudInit?.id) await updateIncident(String(crudInit.id), v);
              else await createIncident(v);
              tk(editing ? 'Đã cập nhật vụ' : 'Đã báo cáo vụ');
              load();
            }}
          />
        </>
      )}

      {/* ════════════ TAB: THANH KIỂM TRA ════════════ */}
      {tab === 'inspections' && (
        <>
          <KpiStrip items={[
            { lbl: 'Tổng kiểm tra', val: inspStats?.totalInspections ?? inspItems.length, sub: 'tổng số' },
            { lbl: 'Hạng A', val: inspStats?.complianceA ?? 0, sub: 'xuất sắc', tone: 'ok' },
            { lbl: 'Hạng B', val: inspStats?.complianceB ?? 0, sub: 'đạt khá', tone: 'info' },
            { lbl: 'Hạng C/D', val: (inspStats?.complianceC ?? 0) + (inspStats?.complianceD ?? 0), sub: 'cần cải thiện', tone: 'crit' },
          ]} />

          <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
            <SearchBox value={inspSearch} onChange={(v) => { setInspSearch(v); setInspPage(0); }}
              placeholder="Tìm cơ sở / mã kiểm tra / thanh tra viên…" />
            <Filter value={fCompliance} onChange={setFCompliance} options={complianceOpts} placeholder="▾ Xếp loại" />
            <Filter value={fFacType} onChange={setFFacType} options={inspFacTypes} placeholder="▾ Loại cơ sở" />
            <Btn variant="ghost" icon="x" onClick={() => { setInspSearch(''); setFCompliance(''); setFFacType(''); setInspPage(0); }}>Bỏ lọc</Btn>
            <span className="spacer" />
            <Btn variant="ghost" icon="refresh" onClick={loadInspections}>Làm mới</Btn>
            <Btn variant="primary" icon="plus" onClick={inspOpenCreate}>Kiểm tra mới</Btn>
          </div>

          <DataTable<FoodInspection>
            columns={inspCols} data={inspPaged} rowKey={(r) => r.id}
            onRowClick={setInspSel} actions={inspActions}
            empty={inspLoading ? 'Đang tải…' : 'Chưa có cuộc thanh kiểm'}
          />
          <Pager page={inspPage} setPage={setInspPage} totalPages={inspTotalPages} total={inspFiltered.length} perPage={PER} />

          <DrawerShell
            open={!!inspSel}
            onClose={() => setInspSel(null)}
            size="xl"
            title={inspSel ? `Thanh kiểm ${inspSel.inspectionCode}` : ''}
            sub={inspSel ? `${inspSel.facilityName} · ${dayjs(inspSel.inspectionDate).format('DD/MM/YYYY')}` : ''}
            footer={<>
              <Btn variant="ghost" onClick={() => setInspSel(null)}>Đóng</Btn>
              <Btn variant="primary" icon="edit" onClick={() => { if (inspSel) inspOpenEdit(inspSel); setInspSel(null); }}>Cập nhật</Btn>
            </>}
          >
            {inspSel && <>
              <DrSec title="Thông tin cơ sở">
                <DrField lbl="Mã kiểm tra"><span style={{ fontFamily: 'var(--font-mono)' }}>{inspSel.inspectionCode}</span></DrField>
                <DrField lbl="Ngày kiểm tra">{dayjs(inspSel.inspectionDate).format('DD/MM/YYYY')}</DrField>
                <DrField lbl="Tên cơ sở">{inspSel.facilityName}</DrField>
                <DrField lbl="Địa chỉ">{inspSel.facilityAddress}</DrField>
                <DrField lbl="Loại cơ sở">{inspSel.facilityType}</DrField>
                <DrField lbl="Thanh tra viên">{inspSel.inspectorName}</DrField>
              </DrSec>
              <DrSec title="Kết quả kiểm tra">
                <DrField lbl="Xếp loại">
                  <StatusBadge tone={COMPLIANCE_TONE[inspSel.complianceLevel] ?? 'info'} dot>
                    Hạng {inspSel.complianceLevel}
                  </StatusBadge>
                </DrField>
                <div style={{ padding: 'var(--space-14)', background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-2)' }}>
                  <Line label="Điểm tổng thể" value={inspSel.overallScore} bold />
                  <Line label="Điểm VSTP" value={inspSel.hygieneScore} />
                  <Line label="Điểm lưu trữ TP" value={inspSel.foodStorageScore} />
                  <Line label="Điểm đào tạo NV" value={inspSel.staffTrainingScore} />
                  <Line label="Điểm hồ sơ" value={inspSel.documentationScore} />
                </div>
                {inspSel.violations?.length > 0 && (
                  <DrField lbl="Vi phạm">
                    <ul style={{ margin: 0, paddingLeft: 16, color: 'var(--a-rd-text)', fontSize: 13 }}>
                      {inspSel.violations.map((v, i) => <li key={i}>{v}</li>)}
                    </ul>
                  </DrField>
                )}
                {inspSel.correctiveActions && <DrField lbl="Biện pháp KP">{inspSel.correctiveActions}</DrField>}
                {inspSel.reinspectionDate && <DrField lbl="Ngày tái kiểm">{dayjs(inspSel.reinspectionDate).format('DD/MM/YYYY')}</DrField>}
              </DrSec>
              <DrSec title="Tình trạng">
                <DrField lbl="Trạng thái">
                  <StatusBadge tone={INSP_STATUS_TONE[inspSel.status] ?? 'info'} dot>
                    {INSP_STATUS_LABEL[inspSel.status] || '—'}
                  </StatusBadge>
                </DrField>
                {inspSel.notes && <DrField lbl="Ghi chú">{inspSel.notes}</DrField>}
              </DrSec>
            </>}
          </DrawerShell>

          <CrudModal
            open={inspCrudOpen}
            onClose={() => setInspCrudOpen(false)}
            title={inspCrudInit?.id ? 'Cập nhật thanh kiểm' : 'Kiểm tra mới'}
            fields={INSP_FIELDS}
            initial={inspCrudInit}
            size="xl"
            onSubmit={async (v, editing) => {
              if (editing && inspCrudInit?.id) await updateInspection(String(inspCrudInit.id), v);
              else await createInspection(v);
              tk(editing ? 'Đã cập nhật thanh kiểm' : 'Đã tạo cuộc thanh kiểm');
              loadInspections();
            }}
          />
        </>
      )}

      {/* ════════════ TAB: THỐNG KÊ (parity v1 pages/FoodSafety.tsx:468-533) ════════════ */}
      {tab === 'statistics' && (
        <>
          <KpiStrip items={[
            { lbl: 'Tổng sự cố',        val: stats?.totalIncidents ?? 0, sub: 'ngộ độc TP', tone: 'warn' },
            { lbl: 'Người bị ảnh hưởng', val: stats?.totalAffected ?? 0, sub: 'tổng cộng', tone: 'info' },
            { lbl: 'Điểm tuân thủ TB',   val: `${Math.round(inspStats?.avgScore ?? stats?.avgComplianceScore ?? 0)}/100`, sub: 'thanh kiểm', tone: 'ok' },
            { lbl: 'CS xếp loại C/D',    val: (inspStats?.complianceC ?? 0) + (inspStats?.complianceD ?? 0), sub: 'cần chấn chỉnh', tone: 'crit' },
          ]} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14, padding: '12px 16px' }}>
            <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-2)', padding: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 'var(--fs-sm)', marginBottom: 8, textTransform: 'uppercase', color: 'var(--t-2)' }}>Sự cố theo tháng</div>
              {stats?.incidentsByMonth?.length
                ? stats.incidentsByMonth.map((m) => <Line key={m.month} label={m.month} value={m.count} />)
                : <span style={{ color: 'var(--t-3)', fontSize: 'var(--fs-sm)' }}>Chưa có dữ liệu</span>}
            </div>
            <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-2)', padding: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 'var(--fs-sm)', marginBottom: 8, textTransform: 'uppercase', color: 'var(--t-2)' }}>Xếp loại tuân thủ</div>
              <Line label="A — Xuất sắc"   value={`${inspStats?.complianceA ?? 0} CS`} tone="ok" />
              <Line label="B — Khá"        value={`${inspStats?.complianceB ?? 0} CS`} tone="info" />
              <Line label="C — Trung bình" value={`${inspStats?.complianceC ?? 0} CS`} tone="warn" />
              <Line label="D — Không đạt"  value={`${inspStats?.complianceD ?? 0} CS`} tone="crit" />
            </div>
          </div>
        </>
      )}
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

export default FoodSafetyV2;
