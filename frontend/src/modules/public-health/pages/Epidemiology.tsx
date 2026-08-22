import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTabState } from '../../../hooks/useTabState';
import dayjs from 'dayjs';
import {
  searchDiseaseReports, getEpiStats, updateDiseaseReport, reportDisease, searchOutbreaks,
  createOutbreak, updateOutbreak, getNotifiableDiseases,
} from '../api/epidemiology';
import type { DiseaseReport, EpiStats, Outbreak, NotifiableDisease } from '../api/epidemiology';
import {
  KpiStrip, TopTabs, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn, Btn,
  DrawerShell, DrSec, DrField, CrudModal, tk, ti, te, Ico,
  type ColumnDef, type CrudFieldCfg,
} from '@/_v2kit';
import { RowActions, RefreshButton } from '../../../components/actions';

// ──── Báo cáo ca bệnh ────

// Field tĩnh của form ca bệnh — diseaseName được thay bằng select danh mục 28 bệnh trong drFields (useMemo)
const DR_FIELDS_HEAD: CrudFieldCfg[] = [
  { key: 'reportCode', label: 'Mã báo cáo', required: true, disabledOnEdit: true },
  { key: 'patientName', label: 'Họ tên BN', required: true },
  { key: 'patientCode', label: 'Mã BN' },
  { key: 'gender', label: 'Giới tính', type: 'select', options: [{ value: 1, label: 'Nam' }, { value: 2, label: 'Nữ' }] },
  { key: 'age', label: 'Tuổi', type: 'number' },
  { key: 'address', label: 'Địa chỉ' },
];
const DR_FIELDS_TAIL: CrudFieldCfg[] = [
  { key: 'diseaseCode', label: 'Mã bệnh (ICD)', placeholder: 'Bỏ trống → tự điền theo danh mục' },
  { key: 'diseaseGroup', label: 'Nhóm bệnh', type: 'select', options: [
    { value: 'A', label: 'Nhóm A · đặc biệt nguy hiểm' }, { value: 'B', label: 'Nhóm B · nguy hiểm' }, { value: 'C', label: 'Nhóm C · ít nguy hiểm' }] },
  { key: 'reportDate', label: 'Ngày báo cáo', type: 'date', required: true },
  { key: 'onsetDate', label: 'Ngày khởi phát', type: 'date' },
  { key: 'diagnosisDate', label: 'Ngày chẩn đoán', type: 'date' },
  { key: 'reportingDoctor', label: 'BS báo cáo' },
  { key: 'labConfirmed', label: 'XN khẳng định', type: 'switch' },
  { key: 'status', label: 'Trạng thái', type: 'select', options: [
    { value: 0, label: 'Nháp' }, { value: 1, label: 'Đã gửi' }, { value: 2, label: 'Xác nhận' }, { value: 3, label: 'Đã đóng' }] },
  { key: 'notes', label: 'Ghi chú', type: 'textarea' },
];

const STATUS_LABEL: Record<number, string> = { 0: 'Nháp', 1: 'Đã gửi', 2: 'Xác nhận', 3: 'Đóng' };

type SKey = 'draft' | 'submitted' | 'confirmed' | 'closed';
const STATUS_TABS = [
  { v: 'draft' as SKey,     l: 'Nháp',      tone: 'warn' as const },
  { v: 'submitted' as SKey, l: 'Đã gửi',    tone: 'info' as const },
  { v: 'confirmed' as SKey, l: 'Xác nhận',  tone: 'ok' as const },
  { v: 'closed' as SKey,    l: 'Đóng',      tone: 'warn' as const },
];

const sKey = (n: number): SKey =>
  n === 0 ? 'draft' : n === 1 ? 'submitted' : n === 2 ? 'confirmed' : 'closed';

const GROUP_TONE: Record<string, 'crit' | 'warn' | 'info'> = { A: 'crit', B: 'warn', C: 'info' };

// ──── Ổ dịch ────

const OUTBREAK_FIELDS: CrudFieldCfg[] = [
  { key: 'name', label: 'Tên ổ dịch', required: true },
  { key: 'diseaseName', label: 'Tên bệnh', required: true },
  { key: 'diseaseCode', label: 'Mã bệnh (ICD)' },
  { key: 'location', label: 'Địa điểm', required: true },
  { key: 'startDate', label: 'Ngày phát hiện', type: 'date', required: true },
  { key: 'endDate', label: 'Ngày kết thúc', type: 'date' },
  { key: 'caseCount', label: 'Số ca', type: 'number' },
  { key: 'deathCount', label: 'Tử vong', type: 'number' },
  { key: 'riskLevel', label: 'Mức nguy cơ', type: 'select', required: true, options: [
    { value: 1, label: 'Thấp' }, { value: 2, label: 'Trung bình' }, { value: 3, label: 'Cao' }, { value: 4, label: 'Nguy cấp' }] },
  { key: 'status', label: 'Trạng thái', type: 'select', options: [
    { value: 0, label: 'Nghi ngờ' }, { value: 1, label: 'Xác nhận' }, { value: 2, label: 'Kiểm soát' }, { value: 3, label: 'Đã giải quyết' }] },
  { key: 'description', label: 'Mô tả', type: 'textarea' },
  { key: 'responseActions', label: 'Biện pháp đáp ứng', type: 'textarea' },
];

const OUTBREAK_STATUS_LABEL: Record<number, string> = { 0: 'Nghi ngờ', 1: 'Xác nhận', 2: 'Kiểm soát', 3: 'Đã giải quyết' };
const OUTBREAK_STATUS_TONE: Record<number, 'ok' | 'info' | 'warn' | 'crit'> = { 0: 'warn', 1: 'crit', 2: 'ok', 3: 'ok' };
const RISK_LABEL: Record<number, string> = { 1: 'Thấp', 2: 'Trung bình', 3: 'Cao', 4: 'Nguy cấp' };
const riskTone = (n: number): 'info' | 'warn' | 'crit' => (n >= 3 ? 'crit' : n === 2 ? 'warn' : 'info');

const riskOpts = [
  { v: '1', l: 'Thấp' }, { v: '2', l: 'Trung bình' }, { v: '3', l: 'Cao' }, { v: '4', l: 'Nguy cấp' },
];

// ──── Shared ────

const PER = 18;

type MainTab = 'reports' | 'outbreaks' | 'notifiable' | 'stats';
const TOP_TABS: { v: MainTab; l: string; ic?: string }[] = [
  { v: 'reports',    l: 'Báo cáo ca bệnh',       ic: 'alert' },
  { v: 'outbreaks',  l: 'Ổ dịch',                ic: 'zap' },
  { v: 'notifiable', l: 'Bệnh phải khai báo',    ic: 'shield' },
  { v: 'stats',      l: 'Thống kê',              ic: 'chart' },
];

const EpidemiologyV2: React.FC = () => {
  const [tab, setTab] = useTabState<MainTab>('reports', 'tab');

  // ── Báo cáo ca bệnh ──
  const [items, setItems] = useState<DiseaseReport[]>([]);
  const [stats, setStats] = useState<EpiStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useTabState<SKey | 'all'>('all', 'stab');
  const [fGroup, setFGroup] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<DiseaseReport | null>(null);
  const [crudOpen, setCrudOpen] = useState(false);
  const [crudInit, setCrudInit] = useState<Record<string, unknown> | null>(null);
  const [newReportOpen, setNewReportOpen] = useState(false);
  const [sending, setSending] = useState<string | null>(null); // id báo cáo đang gửi — chặn double-submit

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, s] = await Promise.all([
        searchDiseaseReports({
          keyword: search || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
        }),
        getEpiStats(),
      ]);
      setItems(list);
      setStats(s);
    } catch { ti('Không tải được báo cáo dịch tễ'); }
    finally { setLoading(false); }
  }, [search, fromDate, toDate]);
  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    STATUS_TABS.forEach((s) => { c[s.v] = items.filter((r) => sKey(r.status) === s.v).length; });
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (stab !== 'all' && sKey(r.status) !== stab) return false;
      if (fGroup && r.diseaseGroup !== fGroup) return false;
      if (!k) return true;
      return [r.patientName, r.patientCode, r.reportCode, r.diseaseName, r.diseaseCode]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fGroup]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const cols: ColumnDef<DiseaseReport>[] = [
    { key: 'code', label: 'Mã BC', code: true, render: (r) => r.reportCode },
    { key: 'pt', label: 'Bệnh nhân', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.patientName}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.gender === 1 ? 'Nam' : 'Nữ'} · {r.age}t</div>
      </div>
    ) },
    { key: 'dis', label: 'Bệnh', render: (r) => (
      <div>
        <div style={{ fontWeight: 500 }}>{r.diseaseName}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{r.diseaseCode}</div>
      </div>
    ) },
    { key: 'grp', label: 'Nhóm', render: (r) => (
      <StatusBadge tone={GROUP_TONE[r.diseaseGroup] || 'info'} dot>{r.diseaseGroup}</StatusBadge>
    ) },
    { key: 'addr', label: 'Địa chỉ', render: (r) => <span style={{ fontSize: 'var(--fs-sm)' }}>{r.address}</span> },
    { key: 'date', label: 'Báo cáo', mono: true, render: (r) => dayjs(r.reportDate).format('DD/MM/YYYY') },
    { key: 'lab', label: 'XN', render: (r) => r.labConfirmed
      ? <StatusBadge tone="ok" dot>Khẳng định</StatusBadge>
      : <span style={{ color: 'var(--t-2)' }}>—</span>
    },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === sKey(r.status));
      return <StatusBadge tone={t?.tone || 'info'} dot>{STATUS_LABEL[r.status] || '—'}</StatusBadge>;
    } },
  ];

  const openEdit = (r: DiseaseReport) => { setCrudInit({ ...r } as Record<string, unknown>); setCrudOpen(true); };
  const sendReport = async (r: DiseaseReport) => {
    if (sending) return;
    setSending(r.id);
    try { await updateDiseaseReport(r.id, { status: 1 }); tk(`Đã gửi ${r.reportCode}`); load(); }
    catch { te('Gửi báo cáo thất bại'); }
    finally { setSending(null); }
  };

  const actions = (r: DiseaseReport) => (
    <div className="ab-actions">
      <RowActions actions={[
        { key: 'view', icon: 'eye', label: 'Chi tiết', primary: true, onClick: () => setSel(r) },
        { key: 'edit', icon: 'edit', label: 'Sửa', primary: true, onClick: () => openEdit(r) },
        { key: 'send', icon: 'send', label: 'Gửi báo cáo',
          hidden: r.status !== 0, disabled: sending === r.id, onClick: () => sendReport(r) },
      ]} />
    </div>
  );

  const groupOpts = [
    { v: 'A', l: 'Nhóm A · đặc biệt nguy hiểm' },
    { v: 'B', l: 'Nhóm B · nguy hiểm' },
    { v: 'C', l: 'Nhóm C · ít nguy hiểm' },
  ];

  // ── Ổ dịch ──
  const [outbreaks, setOutbreaks] = useState<Outbreak[]>([]);
  const [outbreakLoading, setOutbreakLoading] = useState(false);
  const [obSearch, setObSearch] = useState('');
  const [obRisk, setObRisk] = useState('');
  const [obPage, setObPage] = useState(0);
  const [obSel, setObSel] = useState<Outbreak | null>(null);
  const [obCrudOpen, setObCrudOpen] = useState(false);
  const [obCrudInit, setObCrudInit] = useState<Record<string, unknown> | null>(null);

  const loadOutbreaks = async () => {
    setOutbreakLoading(true);
    try { const r = await searchOutbreaks(); setOutbreaks(r); }
    catch { ti('Không tải được danh sách ổ dịch'); }
    finally { setOutbreakLoading(false); }
  };
  useEffect(() => { if (tab === 'outbreaks') loadOutbreaks(); /* eslint-disable-next-line */ }, [tab]);

  const obFiltered = useMemo(() => {
    const k = obSearch.trim().toLowerCase();
    return outbreaks.filter((o) => {
      if (obRisk && o.riskLevel !== Number(obRisk)) return false;
      if (!k) return true;
      return [o.name, o.diseaseName, o.diseaseCode, o.location].some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [outbreaks, obSearch, obRisk]);
  const obTotalPages = Math.max(1, Math.ceil(obFiltered.length / PER));
  const obPaged = obFiltered.slice(obPage * PER, (obPage + 1) * PER);

  const obCols: ColumnDef<Outbreak>[] = [
    { key: 'name', label: 'Ổ dịch', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.name}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.diseaseName} · <span style={{ fontFamily: 'var(--font-mono)' }}>{r.diseaseCode}</span></div>
      </div>
    ) },
    { key: 'loc', label: 'Địa điểm', render: (r) => <span style={{ fontSize: 'var(--fs-sm)' }}>{r.location}</span> },
    { key: 'date', label: 'Phát hiện', mono: true, render: (r) => dayjs(r.startDate).format('DD/MM/YYYY') },
    { key: 'cases', label: 'Ca / Tử vong', mono: true, render: (r) => (
      <span>
        {r.caseCount} / <span style={{ color: r.deathCount > 0 ? 'var(--s-crit)' : undefined, fontWeight: r.deathCount > 0 ? 600 : 400 }}>{r.deathCount}</span>
      </span>
    ) },
    { key: 'risk', label: 'Nguy cơ', render: (r) => (
      <StatusBadge tone={riskTone(r.riskLevel)} dot>{RISK_LABEL[r.riskLevel] || '—'}</StatusBadge>
    ) },
    { key: 'st', label: 'Trạng thái', render: (r) => (
      <StatusBadge tone={OUTBREAK_STATUS_TONE[r.status] ?? 'info'} dot>{OUTBREAK_STATUS_LABEL[r.status] || '—'}</StatusBadge>
    ) },
  ];

  const obOpenCreate = () => { setObCrudInit({ riskLevel: 1, status: 0, caseCount: 0, deathCount: 0 }); setObCrudOpen(true); };
  const obOpenEdit = (r: Outbreak) => { setObCrudInit({ ...r } as Record<string, unknown>); setObCrudOpen(true); };

  const obActions = (r: Outbreak) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setObSel(r)} />
      <ActBtn ic="edit" title="Cập nhật" onClick={() => obOpenEdit(r)} />
    </div>
  );

  // ── Bệnh phải khai báo ──
  const [notifiable, setNotifiable] = useState<NotifiableDisease[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifSearch, setNotifSearch] = useState('');

  const loadNotifiable = async () => {
    setNotifLoading(true);
    try { const r = await getNotifiableDiseases(); setNotifiable(r); }
    catch { ti('Không tải được danh mục bệnh phải khai báo'); }
    finally { setNotifLoading(false); }
  };
  // Nạp ngay từ mount: danh mục dùng cho cả tab liệt kê LẪN select trong form ca bệnh
  useEffect(() => { loadNotifiable(); /* eslint-disable-next-line */ }, []);

  // Form ca bệnh: tên bệnh = select từ danh mục 28 bệnh phải khai báo (parity v1) — fallback free-text khi danh mục rỗng
  const drFields = useMemo<CrudFieldCfg[]>(() => [
    ...DR_FIELDS_HEAD,
    notifiable.length > 0
      ? { key: 'diseaseName', label: 'Tên bệnh', type: 'select' as const, required: true,
          options: notifiable.map((d) => ({ value: d.name, label: `${d.code} · ${d.name} (Nhóm ${d.group})` })) }
      : { key: 'diseaseName', label: 'Tên bệnh', required: true },
    ...DR_FIELDS_TAIL,
  ], [notifiable]);

  // Chọn bệnh từ danh mục → tự điền mã ICD + nhóm nếu người dùng bỏ trống
  const enrichDisease = (v: Record<string, unknown>) => {
    const m = notifiable.find((d) => d.name === v.diseaseName);
    if (m) {
      if (!v.diseaseCode) v.diseaseCode = m.code;
      if (!v.diseaseGroup) v.diseaseGroup = m.group;
    }
    return v;
  };

  const newReportInitial = useMemo(() => (newReportOpen ? {
    reportCode: `BC${dayjs().format('YYMMDDHHmmss')}`,
    reportDate: dayjs().format('YYYY-MM-DD'),
    status: 0,
  } : null), [newReportOpen]);

  const notifFiltered = useMemo(() => {
    const k = notifSearch.trim().toLowerCase();
    if (!k) return notifiable;
    return notifiable.filter((d) => (d.name || '').toLowerCase().includes(k) || (d.code || '').toLowerCase().includes(k));
  }, [notifiable, notifSearch]);

  const notifCols: ColumnDef<NotifiableDisease>[] = [
    { key: 'code', label: 'Mã ICD', code: true, width: 120, render: (d) => d.code },
    { key: 'name', label: 'Tên bệnh', render: (d) => d.name },
    { key: 'group', label: 'Nhóm', width: 160, render: (d) => (
      <StatusBadge tone={GROUP_TONE[d.group] || 'info'} dot>Nhóm {d.group}</StatusBadge>
    ) },
  ];

  const SEL_DATE: React.CSSProperties = {
    height: 28, padding: '0 6px', borderRadius: 4, border: '1px solid var(--line)',
    background: 'var(--bg-1)', fontSize: 13,
  };

  const activeOutbreakCount = stats?.activeOutbreaks ?? 0;
  // parity v1: cảnh báo truy vết khẩn cấp nhóm A (ca chưa đóng)
  const groupAUrgent = useMemo(
    () => items.filter((r) => r.diseaseGroup === 'A' && r.status < 3).length,
    [items],
  );

  return (
    <div className="ab">
      <TopTabs<MainTab> tab={tab} setTab={setTab} tabs={TOP_TABS} />

      {/* Cross-tab active-outbreak alert banner */}
      {activeOutbreakCount > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px',
          background: 'color-mix(in srgb, var(--s-crit) 10%, transparent)',
          border: '1px solid color-mix(in srgb, var(--s-crit) 30%, transparent)',
          borderRadius: 6, marginBottom: 8, fontSize: 13,
        }}>
          <Ico name="alert" size={14} />
          <span style={{ fontWeight: 600, color: 'var(--s-crit)' }}>
            {activeOutbreakCount} ổ dịch đang hoạt động cần theo dõi khẩn
          </span>
          <Btn variant="ghost" onClick={() => setTab('outbreaks')} style={{ marginLeft: 'auto', fontSize: 12 }}>
            Xem ổ dịch →
          </Btn>
        </div>
      )}

      {/* parity v1: cảnh báo động ca bệnh nhóm A cần truy vết khẩn cấp */}
      {groupAUrgent > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px',
          background: 'color-mix(in srgb, var(--s-warn) 12%, transparent)',
          border: '1px solid color-mix(in srgb, var(--s-warn) 35%, transparent)',
          borderRadius: 6, marginBottom: 8, fontSize: 13,
        }}>
          <Ico name="zap" size={14} />
          <span style={{ fontWeight: 600, color: 'var(--s-warn)' }}>
            {groupAUrgent} ca bệnh nhóm A cần truy vết tiếp xúc khẩn cấp
          </span>
          <Btn variant="ghost" onClick={() => { setTab('reports'); setFGroup('A'); }} style={{ marginLeft: 'auto', fontSize: 12 }}>
            Xem ca nhóm A →
          </Btn>
        </div>
      )}

      {/* ════════════ TAB: BÁO CÁO CA BỆNH ════════════ */}
      {tab === 'reports' && (
        <>
          <KpiStrip items={[
            { lbl: 'Tổng báo cáo', val: stats?.totalReports ?? items.length, sub: 'tổng số' },
            { lbl: 'XN khẳng định', val: stats?.confirmedCases ?? items.filter((r) => r.labConfirmed).length, sub: 'có chắc chắn', tone: 'info' },
            { lbl: 'Ổ dịch',       val: activeOutbreakCount, sub: 'đang hoạt động', tone: 'warn' },
            { lbl: 'Tử vong',      val: stats?.deathCount ?? 0, sub: 'liên quan', tone: 'crit' },
          ]} />

          <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
            <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
              placeholder="Tìm BN / mã BC / bệnh…" />
            <Filter value={fGroup} onChange={setFGroup} options={groupOpts} placeholder="▾ Nhóm bệnh" />
            <input type="date" style={SEL_DATE} value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(0); }} title="Từ ngày" />
            <input type="date" style={SEL_DATE} value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(0); }} title="Đến ngày" />
            <Btn variant="ghost" onClick={() => { setSearch(''); setFGroup(''); setFromDate(''); setToDate(''); setStab('all'); }}>
              <Ico name="x" size={12} /> Bỏ lọc
            </Btn>
            <span className="spacer" />
            <RefreshButton onRefresh={async () => { await load(); }} />
            <Btn variant="primary" onClick={() => { setNewReportOpen(true); }}>
              <Ico name="plus" size={12} /> Báo cáo mới
            </Btn>
          </div>

          <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

          <DataTable<DiseaseReport>
            columns={cols} data={paged} rowKey={(r) => r.id}
            loading={loading}
            onRowClick={setSel} actions={actions}
            empty="Chưa có báo cáo dịch tễ"
          />
          <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

          <DrawerShell
            open={!!sel}
            onClose={() => setSel(null)}
            size="lg"
            title={sel ? `BC ${sel.reportCode}` : ''}
            sub={sel ? `${sel.diseaseName} · ${sel.patientName}` : ''}
            footer={<>
              <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
              <Btn onClick={() => window.print()}>
                <Ico name="print" size={12} /> In BC
              </Btn>
              <Btn onClick={() => { if (sel) openEdit(sel); setSel(null); }}>
                <Ico name="edit" size={12} /> Sửa
              </Btn>
              {sel && sel.status === 0 && (
                <Btn variant="primary" disabled={!!sending} onClick={() => { if (sel) sendReport(sel); setSel(null); }}>
                  <Ico name="send" size={12} /> Gửi báo cáo
                </Btn>
              )}
            </>}
          >
            {sel && <>
              <DrSec title="Bệnh nhân">
                <DrField lbl="Mã BC"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.reportCode}</span></DrField>
                <DrField lbl="Họ tên">{sel.patientName} · {sel.patientCode}</DrField>
                <DrField lbl="Tuổi · GT">{sel.age} tuổi · {sel.gender === 1 ? 'Nam' : 'Nữ'}</DrField>
                <DrField lbl="Địa chỉ">{sel.address}</DrField>
              </DrSec>
              <DrSec title="Bệnh">
                <DrField lbl="Tên bệnh">{sel.diseaseName}</DrField>
                <DrField lbl="Mã bệnh"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.diseaseCode}</span></DrField>
                <DrField lbl="Nhóm">
                  <StatusBadge tone={GROUP_TONE[sel.diseaseGroup] || 'info'} dot>Nhóm {sel.diseaseGroup}</StatusBadge>
                </DrField>
                <DrField lbl="Khởi phát">{dayjs(sel.onsetDate).format('DD/MM/YYYY')}</DrField>
                <DrField lbl="Chẩn đoán">{dayjs(sel.diagnosisDate).format('DD/MM/YYYY')}</DrField>
                <DrField lbl="XN khẳng định">
                  {sel.labConfirmed ? <StatusBadge tone="ok" dot>Có</StatusBadge> : <StatusBadge tone="warn" dot>Chưa</StatusBadge>}
                </DrField>
              </DrSec>
              <DrSec title="Báo cáo">
                <DrField lbl="Ngày BC">{dayjs(sel.reportDate).format('DD/MM/YYYY HH:mm')}</DrField>
                <DrField lbl="BS báo cáo">{sel.reportingDoctor}</DrField>
                <DrField lbl="Trạng thái">
                  <StatusBadge tone={STATUS_TABS.find((x) => x.v === sKey(sel.status))?.tone || 'info'} dot>
                    {STATUS_LABEL[sel.status] || '—'}
                  </StatusBadge>
                </DrField>
                {sel.outcome && <DrField lbl="Diễn biến">{sel.outcome}</DrField>}
                {sel.notes && <DrField lbl="Ghi chú">{sel.notes}</DrField>}
                {sel.outbreakId && <DrField lbl="Liên quan ổ dịch"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.outbreakId}</span></DrField>}
              </DrSec>
            </>}
          </DrawerShell>

          <CrudModal
            open={crudOpen}
            onClose={() => setCrudOpen(false)}
            title="Cập nhật báo cáo dịch tễ"
            fields={drFields}
            initial={crudInit}
            size="lg"
            onSubmit={async (v) => {
              if (crudInit?.id) await updateDiseaseReport(String(crudInit.id), enrichDisease(v));
              tk('Đã cập nhật báo cáo');
              load();
            }}
          />

          <CrudModal
            open={newReportOpen}
            onClose={() => setNewReportOpen(false)}
            title="Báo cáo ca bệnh truyền nhiễm"
            fields={drFields}
            initial={newReportInitial}
            size="lg"
            onSubmit={async (v) => {
              await reportDisease(enrichDisease(v) as Partial<DiseaseReport>);
              tk('Đã gửi báo cáo ca bệnh');
              setNewReportOpen(false);
              load();
            }}
          />
        </>
      )}

      {/* ════════════ TAB: Ổ DỊCH ════════════ */}
      {tab === 'outbreaks' && (
        <>
          <KpiStrip items={[
            { lbl: 'Tổng ổ dịch', val: outbreaks.length, sub: 'tổng số' },
            { lbl: 'Đang hoạt động', val: outbreaks.filter((o) => o.status <= 1).length, sub: 'cần theo dõi', tone: 'warn' },
            { lbl: 'Nguy cơ cao', val: outbreaks.filter((o) => o.riskLevel >= 3).length, sub: 'ưu tiên xử lý', tone: 'crit' },
            { lbl: 'Tổng ca bệnh', val: outbreaks.reduce((s, o) => s + (o.caseCount || 0), 0), sub: 'liên quan', tone: 'info' },
          ]} />

          <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
            <SearchBox value={obSearch} onChange={(v) => { setObSearch(v); setObPage(0); }}
              placeholder="Tìm tên ổ dịch / bệnh / địa điểm…" />
            <Filter value={obRisk} onChange={(v) => { setObRisk(v); setObPage(0); }} options={riskOpts} placeholder="▾ Mức nguy cơ" />
            <Btn variant="ghost" onClick={() => { setObSearch(''); setObRisk(''); }}>
              <Ico name="x" size={12} /> Bỏ lọc
            </Btn>
            <span className="spacer" />
            <RefreshButton onRefresh={async () => { await loadOutbreaks(); }} />
            <Btn variant="primary" onClick={obOpenCreate}>
              <Ico name="plus" size={12} /> Khai báo ổ dịch
            </Btn>
          </div>

          <DataTable<Outbreak>
            columns={obCols} data={obPaged} rowKey={(r) => r.id}
            loading={outbreakLoading}
            onRowClick={setObSel} actions={obActions}
            empty="Chưa có ổ dịch"
          />
          <Pager page={obPage} setPage={setObPage} totalPages={obTotalPages} total={obFiltered.length} perPage={PER} />

          <DrawerShell
            open={!!obSel}
            onClose={() => setObSel(null)}
            size="lg"
            title={obSel ? obSel.name : ''}
            sub={obSel ? `${obSel.diseaseName} · ${obSel.location}` : ''}
            footer={<>
              <Btn variant="ghost" onClick={() => setObSel(null)}>Đóng</Btn>
              <Btn variant="primary" onClick={() => { if (obSel) obOpenEdit(obSel); setObSel(null); }}>
                <Ico name="edit" size={12} /> Cập nhật
              </Btn>
            </>}
          >
            {obSel && <>
              <DrSec title="Ổ dịch">
                <DrField lbl="Bệnh">{obSel.diseaseName} · <span style={{ fontFamily: 'var(--font-mono)' }}>{obSel.diseaseCode}</span></DrField>
                <DrField lbl="Địa điểm">{obSel.location}</DrField>
                <DrField lbl="Phát hiện">{dayjs(obSel.startDate).format('DD/MM/YYYY')}</DrField>
                {obSel.endDate && <DrField lbl="Kết thúc">{dayjs(obSel.endDate).format('DD/MM/YYYY')}</DrField>}
              </DrSec>
              <DrSec title="Mức độ">
                <DrField lbl="Ca bệnh / Tử vong">
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{obSel.caseCount} / {obSel.deathCount}</span>
                </DrField>
                <DrField lbl="Mức nguy cơ">
                  <StatusBadge tone={riskTone(obSel.riskLevel)} dot>{RISK_LABEL[obSel.riskLevel] || '—'}</StatusBadge>
                </DrField>
                <DrField lbl="Trạng thái">
                  <StatusBadge tone={OUTBREAK_STATUS_TONE[obSel.status] ?? 'info'} dot>{OUTBREAK_STATUS_LABEL[obSel.status] || '—'}</StatusBadge>
                </DrField>
              </DrSec>
              {(obSel.description || obSel.responseActions) && (
                <DrSec title="Diễn biến & Biện pháp">
                  {obSel.description && <DrField lbl="Mô tả">{obSel.description}</DrField>}
                  {obSel.responseActions && <DrField lbl="Biện pháp">{obSel.responseActions}</DrField>}
                </DrSec>
              )}
            </>}
          </DrawerShell>

          <CrudModal
            open={obCrudOpen}
            onClose={() => setObCrudOpen(false)}
            title={obCrudInit?.id ? 'Cập nhật ổ dịch' : 'Khai báo ổ dịch mới'}
            fields={OUTBREAK_FIELDS}
            initial={obCrudInit}
            size="lg"
            onSubmit={async (v, editing) => {
              if (editing && obCrudInit?.id) await updateOutbreak(String(obCrudInit.id), v);
              else await createOutbreak(v);
              tk(editing ? 'Đã cập nhật ổ dịch' : 'Đã khai báo ổ dịch mới');
              loadOutbreaks();
            }}
          />
        </>
      )}

      {/* ════════════ TAB: BỆNH PHẢI KHAI BÁO ════════════ */}
      {tab === 'notifiable' && (
        <>
          <KpiStrip items={[
            { lbl: 'Tổng số bệnh', val: notifiable.length, sub: 'trong danh mục' },
            { lbl: 'Nhóm A', val: notifiable.filter((d) => d.group === 'A').length, sub: 'đặc biệt nguy hiểm', tone: 'crit' },
            { lbl: 'Nhóm B', val: notifiable.filter((d) => d.group === 'B').length, sub: 'nguy hiểm', tone: 'warn' },
            { lbl: 'Nhóm C', val: notifiable.filter((d) => d.group === 'C').length, sub: 'ít nguy hiểm', tone: 'info' },
          ]} />

          <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
            <SearchBox value={notifSearch} onChange={setNotifSearch} placeholder="Tìm tên bệnh / mã ICD…" />
            <span className="spacer" />
            <RefreshButton onRefresh={async () => { await loadNotifiable(); }} />
          </div>

          <DataTable<NotifiableDisease>
            columns={notifCols} data={notifFiltered} rowKey={(d) => d.code}
            loading={notifLoading}
            empty="Chưa có dữ liệu"
          />
        </>
      )}

      {/* ════════════ TAB: THỐNG KÊ ════════════ */}
      {tab === 'stats' && (
        <>
          <KpiStrip items={[
            { lbl: 'Tổng báo cáo', val: stats?.totalReports ?? 0, sub: 'tổng số' },
            { lbl: 'XN khẳng định', val: stats?.confirmedCases ?? 0, sub: 'có chắc chắn', tone: 'info' },
            { lbl: 'Ổ dịch', val: stats?.activeOutbreaks ?? 0, sub: 'đang hoạt động', tone: 'warn' },
            { lbl: 'Tử vong', val: stats?.deathCount ?? 0, sub: 'liên quan', tone: 'crit' },
          ]} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, borderTop: '1px solid var(--line)' }}>
            <div style={{ borderRight: '1px solid var(--line)' }}>
              <StatBlock
                title="Phân bố theo bệnh"
                rows={(stats?.diseaseDistribution ?? []).map((d) => ({ label: d.disease, count: d.count }))}
              />
            </div>
            <div>
              <StatBlock
                title="Xu hướng theo tháng"
                rows={(stats?.monthlyTrend ?? []).map((m) => ({ label: m.month, count: m.count }))}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const StatBlock: React.FC<{ title: string; rows: { label: string; count: number }[] }> = ({ title, rows }) => {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <DrSec title={title}>
      {rows.length === 0 ? (
        <div style={{ padding: '8px 0', color: 'var(--t-2)', fontSize: 'var(--fs-sm)' }}>Chưa có dữ liệu</div>
      ) : rows.map((r) => (
        <div key={r.label} style={{ padding: '6px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-sm)', marginBottom: 4 }}>
            <span>{r.label}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{r.count}</span>
          </div>
          <div style={{ height: 6, background: 'var(--d-1)', borderRadius: 'var(--r-2)', overflow: 'hidden' }}>
            <div style={{ width: `${(r.count / max) * 100}%`, height: '100%', background: 'var(--a-cy)' }} />
          </div>
        </div>
      ))}
    </DrSec>
  );
};

export default EpidemiologyV2;
