import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  searchPatients, getLabHistory, getPmtctRecords, getStats,
  enrollPatient, addLabResult, addPmtctRecord,
} from '../api/hivManagement';
import type { HivPatient, HivLabResult, PmtctRecord, HivStats } from '../api/hivManagement';
import {
  KpiStrip, TopTabs, StatusTabs, SearchBox, Filter, DataTable, Pager,
  StatusBadge, ActBtn, Btn, DrawerShell, DrSec, DrField, CrudModal,
  useTabCounts, tk, ti, Ico,
  type ColumnDef, type StatusTab, type CrudFieldCfg,
} from '@/_v2kit';

/* Quản lý HIV/AIDS v2 — port từ v1 pages/HivManagement.tsx
 * 4 tab nghiệp vụ: Danh sách BN · Xét nghiệm (CD4/VL) · PMTCT · Thống kê (cascade 90-90-90)
 */

// ─────────────────────────── Cấu hình nghiệp vụ ───────────────────────────

type TabKey = 'patients' | 'lab' | 'pmtct' | 'stats';

type ArtKey = 'PreART' | 'OnART' | 'Interrupted' | 'Transferred' | 'Deceased' | 'Lost';
const ART_TABS: StatusTab<ArtKey>[] = [
  { v: 'PreART',      l: 'Trước ART',  tone: 'info' },
  { v: 'OnART',       l: 'Đang ART',   tone: 'ok' },
  { v: 'Interrupted', l: 'Gián đoạn',  tone: 'warn' },
  { v: 'Transferred', l: 'Đã chuyển',  tone: 'info' },
  { v: 'Deceased',    l: 'Tử vong',    tone: 'crit' },
  { v: 'Lost',        l: 'Mất dấu',    tone: 'crit' },
];
const artTabOf = (s: string) => ART_TABS.find((t) => t.v === s);

const WHO_TONE: Record<number, 'ok' | 'warn' | 'crit'> = { 1: 'ok', 2: 'warn', 3: 'warn', 4: 'crit' };

const PMTCT_STATUS: Record<number, { l: string; tone: 'ok' | 'warn' | 'info' }> = {
  0: { l: 'Trước sinh', tone: 'info' },
  1: { l: 'Đã sinh',    tone: 'ok' },
  2: { l: 'Hậu sản',    tone: 'warn' },
  3: { l: 'Hoàn tất',   tone: 'info' },
};

const INFANT_RESULT: Record<string, { l: string; tone: 'ok' | 'warn' | 'crit' }> = {
  Negative:      { l: 'Âm tính',    tone: 'ok' },
  Positive:      { l: 'Dương tính', tone: 'crit' },
  Pending:       { l: 'Chờ KQ',     tone: 'warn' },
  Indeterminate: { l: 'Chưa rõ',    tone: 'warn' },
};

const ART_REGIMENS = [
  'TDF + 3TC + DTG',
  'TDF + 3TC + EFV',
  'ABC + 3TC + DTG',
  'AZT + 3TC + NVP',
  'AZT + 3TC + EFV',
  'TDF + 3TC + LPV/r',
  'ABC + 3TC + LPV/r',
];

const TEST_TYPE_OPTIONS = [
  { value: 'CD4',       label: 'CD4' },
  { value: 'ViralLoad', label: 'Tải lượng virus' },
  { value: 'HIV-DR',    label: 'Kháng thuốc HIV' },
  { value: 'CBC',       label: 'Công thức máu' },
  { value: 'Liver',     label: 'Chức năng gan' },
  { value: 'Kidney',    label: 'Chức năng thận' },
  { value: 'Lipid',     label: 'Mỡ máu' },
];

const fmtDMY = (iso?: string) => (iso ? dayjs(iso).format('DD/MM/YYYY') : '—');
const ageOf = (dob?: string) => (dob ? `${dayjs().diff(dayjs(dob), 'year')}t` : '—');
const genderOf = (g: number) => (g === 1 ? 'Nam' : g === 2 ? 'Nữ' : '—');
const fmtVL = (v?: number) => (v != null ? (v < 200 ? '< 200' : v.toLocaleString()) : '—');

const cardSt: React.CSSProperties = {
  padding: '12px 16px', background: 'var(--bg-1)',
  border: '1px solid var(--line)', borderRadius: 'var(--r-2)',
};

const SecTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    margin: '18px 0 10px', fontSize: 11, fontFamily: 'var(--font-mono)',
    textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--t-2)',
  }}>{children}</div>
);

const StatCard: React.FC<{ lbl: string; val: React.ReactNode; color?: string }> = ({ lbl, val, color }) => (
  <div style={cardSt}>
    <div style={{ fontSize: 12, color: 'var(--t-2)', marginBottom: 4 }}>{lbl}</div>
    <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: color || 'var(--t-0)' }}>{val}</div>
  </div>
);

const CascadeBar: React.FC<{ label: string; value: number; max: number; color: string }> = ({ label, value, max, color }) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: 'var(--t-1)' }}>{label}</span>
        <b className="mono" style={{ color: 'var(--t-0)' }}>{value} · {pct}%</b>
      </div>
      <div style={{ height: 8, background: 'var(--line-soft)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color, borderRadius: 4 }} />
      </div>
    </div>
  );
};

const PER = 15;

// ─────────────────────────── Component chính ───────────────────────────

const HivManagementV2: React.FC = () => {
  const [tab, setTab] = useState<TabKey>('patients');
  const [patients, setPatients] = useState<HivPatient[]>([]);
  const [stats, setStats] = useState<HivStats | null>(null);
  const [loading, setLoading] = useState(true);

  // tab Danh sách BN
  const [search, setSearch] = useState('');
  const [artTab, setArtTab] = useState<ArtKey | 'all'>('all');
  const [page, setPage] = useState(0);

  // drawer chi tiết
  const [sel, setSel] = useState<HivPatient | null>(null);
  const [labHistory, setLabHistory] = useState<HivLabResult[]>([]);
  const [labLoading, setLabLoading] = useState(false);

  // tab PMTCT
  const [pmtctPatientId, setPmtctPatientId] = useState('');
  const [pmtctRecords, setPmtctRecords] = useState<PmtctRecord[]>([]);
  const [pmtctLoading, setPmtctLoading] = useState(false);

  // modal
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [labOpen, setLabOpen] = useState(false);
  const [labInitial, setLabInitial] = useState<Record<string, unknown> | null>(null);
  const [pmtctOpen, setPmtctOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [p, s] = await Promise.allSettled([searchPatients(), getStats()]);
      if (p.status === 'fulfilled') setPatients(Array.isArray(p.value) ? p.value : []);
      if (s.status === 'fulfilled') setStats(s.value);
      if (p.status === 'rejected') ti('Không tải được danh sách bệnh nhân HIV');
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPmtct = async (patientId: string) => {
    setPmtctLoading(true);
    try {
      const data = patientId ? await getPmtctRecords({ patientId }) : [];
      setPmtctRecords(Array.isArray(data) ? data : []);
    } finally { setPmtctLoading(false); }
  };

  const refreshAll = () => {
    load();
    if (pmtctPatientId) loadPmtct(pmtctPatientId);
  };

  const openDetail = async (r: HivPatient) => {
    setSel(r);
    setLabHistory([]);
    setLabLoading(true);
    try { setLabHistory(await getLabHistory(r.id)); }
    catch { setLabHistory([]); }
    finally { setLabLoading(false); }
  };

  const openLabModal = (patientId?: string) => {
    setLabInitial({ ...(patientId ? { patientId } : {}), isAbnormal: false });
    setLabOpen(true);
  };

  // ── lọc + phân trang danh sách BN ──
  const counts = useTabCounts(patients, ART_TABS, (r) => r.artStatus as ArtKey);
  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return patients.filter((p) => {
      if (artTab !== 'all' && p.artStatus !== artTab) return false;
      if (!k) return true;
      return [p.fullName, p.patientCode, p.hivCode, p.cccd, p.phone]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [patients, search, artTab]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  // ── cảnh báo bất thường (tab Xét nghiệm) ──
  const cd4Alerts = useMemo(
    () => patients.filter((p) => p.lastCd4Count != null && p.lastCd4Count < 200), [patients]);
  const vlAlerts = useMemo(
    () => patients.filter((p) => p.lastViralLoad != null && p.lastViralLoad >= 200), [patients]);

  // ── options dùng chung cho form ──
  const patientOptions = useMemo(() => patients.map((p) => ({
    value: p.id, label: `${p.hivCode || p.patientCode || p.id} - ${p.fullName}`,
  })), [patients]);
  const mothers = useMemo(() => {
    const f = patients.filter((p) => p.gender === 2);
    return f.length ? f : patients; // phòng thủ khi backend thiếu dữ liệu giới tính
  }, [patients]);

  // ── cột bảng BN ──
  const patientColumns: ColumnDef<HivPatient>[] = [
    { key: 'hiv', label: 'Mã HIV', mono: true, width: 120, render: (r) => r.hivCode || r.patientCode || '—' },
    {
      key: 'patient', label: 'Bệnh nhân',
      render: (r) => (
        <div className="cell-2l">
          <b>{r.fullName || '—'}</b>
          <i className="mono">{r.patientCode || '—'} · {genderOf(r.gender)} · {ageOf(r.dateOfBirth)}</i>
        </div>
      ),
    },
    {
      key: 'art', label: 'ART', width: 110,
      render: (r) => {
        const t = artTabOf(r.artStatus);
        return t ? <StatusBadge tone={t.tone} dot>{t.l}</StatusBadge> : r.artStatus;
      },
    },
    {
      key: 'who', label: 'WHO', width: 60,
      render: (r) => <span className={`chip ${WHO_TONE[r.whoStage] || 'info'}`}>{r.whoStage}</span>,
    },
    { key: 'regimen', label: 'Phác đồ', width: 150, render: (r) => r.currentRegimen || '—' },
    {
      key: 'cd4', label: 'CD4', mono: true, width: 80,
      render: (r) => r.lastCd4Count != null
        ? <span style={{ color: r.lastCd4Count < 200 ? 'var(--s-crit)' : r.lastCd4Count < 350 ? 'var(--s-warn)' : 'var(--s-ok)' }}>{r.lastCd4Count}</span>
        : '—',
    },
    {
      key: 'vl', label: 'VL', mono: true, width: 100,
      render: (r) => r.lastViralLoad != null
        ? <span style={{ color: r.lastViralLoad >= 200 ? 'var(--s-crit)' : 'var(--s-ok)' }}>{fmtVL(r.lastViralLoad)}</span>
        : '—',
    },
    {
      key: 'supp', label: 'Ức chế VR', width: 80,
      render: (r) => (
        <span style={{ color: r.viralSuppressed ? 'var(--s-ok)' : 'var(--s-crit)' }}>
          <Ico name={r.viralSuppressed ? 'check' : 'x'} size={14} />
        </span>
      ),
    },
    { key: 'next', label: 'Hẹn khám', mono: true, width: 100, render: (r) => fmtDMY(r.nextAppointmentDate) },
  ];

  // ── cột bảng PMTCT ──
  const pmtctColumns: ColumnDef<PmtctRecord>[] = [
    { key: 'mother', label: 'Họ tên mẹ', render: (r) => r.patientName || '—' },
    {
      key: 'artBefore', label: 'ART trước thai', width: 110,
      render: (r) => <span className={`chip ${r.artBeforePregnancy ? 'ok' : 'warn'}`}>{r.artBeforePregnancy ? 'Có' : 'Không'}</span>,
    },
    {
      key: 'artDuring', label: 'ART trong thai kỳ', width: 130,
      render: (r) => <span className={`chip ${r.artDuringPregnancy ? 'ok' : 'crit'}`}>{r.artDuringPregnancy ? 'Có' : 'Không'}</span>,
    },
    { key: 'regimen', label: 'Phác đồ', width: 150, render: (r) => r.artRegimen || '—' },
    { key: 'vl', label: 'VL khi sinh', mono: true, width: 100, render: (r) => fmtVL(r.viralLoadAtDelivery) },
    { key: 'delivery', label: 'Ngày sinh', mono: true, width: 100, render: (r) => fmtDMY(r.deliveryDate) },
    {
      key: 'prophylaxis', label: 'Dự phòng trẻ', width: 100,
      render: (r) => <span className={`chip ${r.infantProphylaxis ? 'ok' : 'crit'}`}>{r.infantProphylaxis ? 'Có' : 'Không'}</span>,
    },
    {
      key: 'infantResult', label: 'KQ XN trẻ', width: 100,
      render: (r) => {
        const c = r.infantTestResult ? INFANT_RESULT[r.infantTestResult] : null;
        return c ? <span className={`chip ${c.tone}`}>{c.l}</span> : '—';
      },
    },
    {
      key: 'status', label: 'Trạng thái', width: 100,
      render: (r) => {
        const c = PMTCT_STATUS[r.status];
        return c ? <StatusBadge tone={c.tone} dot>{c.l}</StatusBadge> : '—';
      },
    },
  ];

  // ── cấu hình form (CrudModal) ──
  const enrollFields: CrudFieldCfg[] = [
    {
      key: 'patientId', label: 'Bệnh nhân hệ thống (ID)', required: true,
      placeholder: 'ID bệnh nhân đã có trong hệ thống (bắt buộc)',
    },
    { key: 'hivCode', label: 'Mã HIV', placeholder: 'Mã số chương trình HIV' },
    { key: 'diagnosisDate', label: 'Ngày chẩn đoán', type: 'date', required: true },
    {
      key: 'whoStage', label: 'Giai đoạn WHO', type: 'select', required: true,
      options: [1, 2, 3, 4].map((s) => ({ value: s, label: `Stage ${s}` })),
    },
    {
      key: 'artStatus', label: 'Trạng thái ART', type: 'select', required: true,
      options: ART_TABS.map((t) => ({ value: t.v, label: t.l })),
    },
    { key: 'artStartDate', label: 'Ngày bắt đầu ART', type: 'date' },
    {
      key: 'currentRegimen', label: 'Phác đồ', type: 'select',
      options: ART_REGIMENS.map((r) => ({ value: r, label: r })),
    },
  ];

  const labFields: CrudFieldCfg[] = [
    { key: 'patientId', label: 'Bệnh nhân', type: 'select', required: true, options: patientOptions },
    { key: 'testType', label: 'Loại xét nghiệm', type: 'select', required: true, options: TEST_TYPE_OPTIONS },
    { key: 'testDate', label: 'Ngày xét nghiệm', type: 'date', required: true },
    { key: 'result', label: 'Kết quả', type: 'number', required: true },
    { key: 'unit', label: 'Đơn vị', placeholder: 'cells/uL, copies/mL…' },
    { key: 'isAbnormal', label: 'Kết quả bất thường', type: 'switch' },
  ];

  const pmtctFields: CrudFieldCfg[] = [
    {
      key: 'patientId', label: 'Bà mẹ', type: 'select', required: true,
      options: mothers.map((p) => ({ value: p.id, label: `${p.hivCode || p.patientCode || p.id} - ${p.fullName}` })),
    },
    { key: 'gestationalAge', label: 'Tuổi thai (tuần)', type: 'number' },
    { key: 'artDuringPregnancy', label: 'ART trong thai kỳ', type: 'switch' },
    { key: 'deliveryDate', label: 'Ngày sinh', type: 'date' },
    {
      key: 'deliveryMode', label: 'Phương pháp sinh', type: 'select',
      options: [
        { value: 'Vaginal', label: 'Sinh thường' },
        { value: 'Cesarean', label: 'Mổ lấy thai' },
      ],
    },
    { key: 'infantProphylaxis', label: 'Dự phòng cho trẻ', type: 'switch' },
    { key: 'infantTestDate', label: 'Ngày XN trẻ', type: 'date' },
    {
      key: 'infantTestResult', label: 'KQ XN trẻ', type: 'select',
      options: Object.entries(INFANT_RESULT).map(([value, c]) => ({ value, label: c.l })),
    },
    {
      key: 'infantFeedingMethod', label: 'Nuôi con', type: 'select',
      options: [
        { value: 'Exclusive_BF', label: 'Bú mẹ hoàn toàn' },
        { value: 'Formula', label: 'Sữa công thức' },
        { value: 'Mixed', label: 'Kết hợp' },
      ],
    },
  ];

  const cascadeMax = Math.max(stats?.cascadeDiagnosed ?? 0, 1);

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'BN theo dõi', val: stats?.totalPatients ?? patients.length, sub: 'đăng ký' },
        { lbl: 'Đang ART', val: stats?.onArt ?? 0, sub: `${stats?.artCoverageRate ?? 0}%`, tone: 'ok' },
        { lbl: 'Ức chế virus', val: stats?.viralSuppressed ?? 0, sub: `${stats?.viralSuppressionRate ?? 0}%`, tone: 'ok' },
        { lbl: 'PMTCT', val: stats?.pmtctEnrolled ?? 0, sub: 'thai phụ' },
        { lbl: 'Mất dấu', val: stats?.lostToFollowUp ?? 0, sub: 'cần liên hệ', tone: 'crit' },
        { lbl: 'ĐK mới (tháng)', val: stats?.newEnrollmentsThisMonth ?? 0, tone: 'info' },
      ]} />

      <TopTabs<TabKey>
        tab={tab}
        setTab={setTab}
        tabs={[
          { v: 'patients', l: 'Danh sách BN', ic: 'users' },
          { v: 'lab',      l: 'Xét nghiệm',   ic: 'flask' },
          { v: 'pmtct',    l: 'PMTCT',        ic: 'heart' },
          { v: 'stats',    l: 'Thống kê',     ic: 'chart' },
        ]}
        actions={
          <Btn variant="ghost" size="sm" onClick={refreshAll}>
            <Ico name="refresh" size={12} /> Làm mới
          </Btn>
        }
      />

      {/* ── TAB 1: Danh sách BN ── */}
      {tab === 'patients' && (
        <>
          <div className="ab-toolbar">
            <SearchBox
              value={search}
              onChange={(v) => { setSearch(v); setPage(0); }}
              placeholder="Tìm tên BN / mã HIV / mã BN / CCCD…"
            />
            <span className="spacer" />
            <Btn variant="primary" onClick={() => setEnrollOpen(true)}>
              <Ico name="user-plus" size={12} /> Đăng ký BN
            </Btn>
          </div>

          <StatusTabs<ArtKey>
            value={artTab}
            onChange={(v) => { setArtTab(v); setPage(0); }}
            tabs={ART_TABS}
            counts={counts}
          />

          <DataTable<HivPatient>
            columns={patientColumns}
            data={paged}
            rowKey={(r) => r.id}
            onRowClick={openDetail}
            actions={(r) => (
              <div className="ab-actions">
                <ActBtn ic="eye" title="Xem chi tiết" onClick={() => openDetail(r)} />
                <ActBtn ic="flask" title="Thêm kết quả XN" onClick={() => openLabModal(r.id)} />
              </div>
            )}
            empty={loading ? 'Đang tải…' : 'Không có bệnh nhân HIV'}
          />
          <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />
        </>
      )}

      {/* ── TAB 2: Xét nghiệm ── */}
      {tab === 'lab' && (
        <>
          <div style={{ ...cardSt, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{ color: 'var(--s-info, var(--t-1))' }}><Ico name="info" size={16} /></span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--t-0)' }}>Theo dõi CD4 và tải lượng virus</div>
              <div style={{ fontSize: 12, color: 'var(--t-2)' }}>
                Chọn bệnh nhân từ tab Danh sách để xem lịch sử xét nghiệm, hoặc thêm kết quả mới tại đây.
              </div>
            </div>
            <Btn variant="primary" onClick={() => openLabModal()}>
              <Ico name="plus" size={12} /> Thêm kết quả XN
            </Btn>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
            <div style={cardSt}>
              <SecTitle>Cảnh báo CD4 &lt; 200 ({cd4Alerts.length})</SecTitle>
              {cd4Alerts.length === 0
                ? <div style={{ fontSize: 12.5, color: 'var(--t-2)' }}>Không có cảnh báo</div>
                : cd4Alerts.slice(0, 5).map((p) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--line-soft)', fontSize: 12.5 }}>
                    <span style={{ color: 'var(--t-0)' }}>{p.fullName} <i className="mono" style={{ color: 'var(--t-2)' }}>{p.hivCode}</i></span>
                    <b className="mono" style={{ color: 'var(--s-crit)' }}>CD4 = {p.lastCd4Count}</b>
                  </div>
                ))}
              {cd4Alerts.length > 5 && (
                <div style={{ fontSize: 12, color: 'var(--t-2)', paddingTop: 6 }}>+{cd4Alerts.length - 5} bệnh nhân khác</div>
              )}
            </div>
            <div style={cardSt}>
              <SecTitle>Cảnh báo VL ≥ 200 copies/mL ({vlAlerts.length})</SecTitle>
              {vlAlerts.length === 0
                ? <div style={{ fontSize: 12.5, color: 'var(--t-2)' }}>Không có cảnh báo</div>
                : vlAlerts.slice(0, 5).map((p) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--line-soft)', fontSize: 12.5 }}>
                    <span style={{ color: 'var(--t-0)' }}>{p.fullName} <i className="mono" style={{ color: 'var(--t-2)' }}>{p.hivCode}</i></span>
                    <b className="mono" style={{ color: 'var(--s-warn)' }}>VL = {p.lastViralLoad?.toLocaleString()}</b>
                  </div>
                ))}
              {vlAlerts.length > 5 && (
                <div style={{ fontSize: 12, color: 'var(--t-2)', paddingTop: 6 }}>+{vlAlerts.length - 5} bệnh nhân khác</div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── TAB 3: PMTCT ── */}
      {tab === 'pmtct' && (
        <>
          <div className="ab-toolbar">
            <Filter
              value={pmtctPatientId}
              onChange={(v) => { setPmtctPatientId(v); loadPmtct(v); }}
              options={mothers.map((p) => ({ v: p.id, l: `${p.hivCode || p.patientCode || p.id} - ${p.fullName}` }))}
              placeholder="▾ Chọn bà mẹ để xem hồ sơ"
            />
            <span className="spacer" />
            <Btn variant="primary" onClick={() => setPmtctOpen(true)}>
              <Ico name="plus" size={12} /> Thêm PMTCT
            </Btn>
          </div>

          <DataTable<PmtctRecord>
            columns={pmtctColumns}
            data={pmtctRecords}
            rowKey={(r) => r.id}
            empty={pmtctLoading
              ? 'Đang tải…'
              : pmtctPatientId ? 'Chưa có hồ sơ PMTCT' : 'Chọn bà mẹ để xem hồ sơ PMTCT'}
          />
        </>
      )}

      {/* ── TAB 4: Thống kê ── */}
      {tab === 'stats' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <StatCard lbl="Tỷ lệ ART" val={`${stats?.artCoverageRate ?? 0}%`} color="var(--s-ok)" />
            <StatCard lbl="Tỷ lệ ức chế VR" val={`${stats?.viralSuppressionRate ?? 0}%`} color="var(--s-ok)" />
            <StatCard lbl="Mất dấu" val={stats?.lostToFollowUp ?? 0} color="var(--s-crit)" />
            <StatCard lbl="Đăng ký mới (tháng)" val={stats?.newEnrollmentsThisMonth ?? 0} />
          </div>

          <SecTitle>Cascade 90-90-90</SecTitle>
          <div style={{ ...cardSt, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <CascadeBar label="Chẩn đoán" value={stats?.cascadeDiagnosed ?? 0} max={cascadeMax} color="var(--t-2)" />
            <CascadeBar label="Kết nối điều trị" value={stats?.cascadeLinked ?? 0} max={cascadeMax} color="var(--s-info, #1890ff)" />
            <CascadeBar label="Duy trì điều trị" value={stats?.cascadeRetained ?? 0} max={cascadeMax} color="var(--s-ok)" />
            <CascadeBar label="Ức chế virus" value={stats?.cascadeSuppressed ?? 0} max={cascadeMax} color="var(--s-warn)" />
          </div>

          <SecTitle>Kết quả PMTCT</SecTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <StatCard lbl="Bà mẹ HIV+" val={stats?.pmtctMothers ?? 0} />
            <StatCard lbl="Trẻ phơi nhiễm" val={stats?.pmtctInfantsExposed ?? 0} />
            <StatCard lbl="Trẻ đã xét nghiệm" val={stats?.pmtctInfantsTested ?? 0} />
            <StatCard lbl="Trẻ âm tính" val={stats?.pmtctInfantsNegative ?? 0} color="var(--s-ok)" />
            <StatCard
              lbl="Tỷ lệ lây truyền"
              val={`${stats?.pmtctTransmissionRate ?? 0}%`}
              color={(stats?.pmtctTransmissionRate ?? 0) > 2 ? 'var(--s-crit)' : 'var(--s-ok)'}
            />
          </div>
        </>
      )}

      {/* ── Drawer chi tiết bệnh nhân ── */}
      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span className="mono" style={{ color: 'var(--a-cy)' }}>{sel.hivCode || sel.patientCode}</span>
            <span>{sel.fullName}</span>
          </span>
        ) : ''}
        sub={sel ? `WHO ${sel.whoStage} · ${artTabOf(sel.artStatus)?.l || sel.artStatus} · CĐ ${fmtDMY(sel.diagnosisDate)}` : ''}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
            <Btn variant="primary" onClick={() => sel && openLabModal(sel.id)}>
              <Ico name="plus" size={12} /> Thêm XN
            </Btn>
          </>
        }
      >
        {sel && (
          <>
            <DrSec title="Bệnh nhân">
              <DrField lbl="Họ tên"><b>{sel.fullName || '—'}</b></DrField>
              <DrField lbl="Mã BN"><span className="mono">{sel.patientCode || '—'}</span></DrField>
              <DrField lbl="Mã HIV"><span className="mono" style={{ color: 'var(--a-cy)' }}>{sel.hivCode || '—'}</span></DrField>
              <DrField lbl="Giới · Tuổi">{genderOf(sel.gender)} · {ageOf(sel.dateOfBirth)}</DrField>
              <DrField lbl="Ngày sinh">{fmtDMY(sel.dateOfBirth)}</DrField>
              {sel.cccd && <DrField lbl="CCCD"><span className="mono">{sel.cccd}</span></DrField>}
              {sel.phone && <DrField lbl="Điện thoại"><span className="mono">{sel.phone}</span></DrField>}
              {sel.insuranceNumber && <DrField lbl="Số thẻ BHYT"><span className="mono">{sel.insuranceNumber}</span></DrField>}
              {sel.address && <DrField lbl="Địa chỉ">{sel.address}</DrField>}
            </DrSec>

            <DrSec title="Điều trị ART">
              <DrField lbl="Ngày chẩn đoán">{fmtDMY(sel.diagnosisDate)}</DrField>
              <DrField lbl="Ngày đăng ký">{fmtDMY(sel.enrollmentDate)}</DrField>
              <DrField lbl="Trạng thái ART">
                {(() => { const t = artTabOf(sel.artStatus); return t ? <StatusBadge tone={t.tone} dot>{t.l}</StatusBadge> : sel.artStatus; })()}
              </DrField>
              <DrField lbl="Bắt đầu ART">{fmtDMY(sel.artStartDate)}</DrField>
              <DrField lbl="Phác đồ"><b>{sel.currentRegimen || '—'}</b></DrField>
              <DrField lbl="Giai đoạn WHO">
                <span className={`chip ${WHO_TONE[sel.whoStage] || 'info'}`}>Stage {sel.whoStage}</span>
              </DrField>
              <DrField lbl="Tuân thủ">{sel.adherenceStatus || '—'}</DrField>
            </DrSec>

            <DrSec title="Kết quả XN gần nhất">
              <DrField lbl="CD4">
                <b className="mono">{sel.lastCd4Count != null ? `${sel.lastCd4Count} cells/uL` : '—'}</b>
              </DrField>
              <DrField lbl="Ngày XN CD4">{fmtDMY(sel.lastCd4Date)}</DrField>
              <DrField lbl="Viral Load">
                <b className="mono" style={{ color: sel.viralSuppressed ? 'var(--s-ok)' : 'var(--s-warn)' }}>
                  {sel.lastViralLoad != null ? `${fmtVL(sel.lastViralLoad)} copies/mL` : '—'}
                </b>
              </DrField>
              <DrField lbl="Ngày XN VL">{fmtDMY(sel.lastViralLoadDate)}</DrField>
              <DrField lbl="Ức chế virus">
                {sel.viralSuppressed ? <span className="chip ok">Đã ức chế</span> : <span className="chip warn">Chưa ức chế</span>}
              </DrField>
            </DrSec>

            {(sel.tbCoinfection || sel.hbvCoinfection || sel.hcvCoinfection || sel.isPregnant || sel.pmtctEnrolled) && (
              <DrSec title="Đồng nhiễm / đặc biệt">
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {sel.tbCoinfection && <span className="chip warn">Đồng nhiễm TB</span>}
                  {sel.hbvCoinfection && <span className="chip warn">Đồng nhiễm HBV</span>}
                  {sel.hcvCoinfection && <span className="chip warn">Đồng nhiễm HCV</span>}
                  {sel.isPregnant && <span className="chip info">Đang mang thai</span>}
                  {sel.pmtctEnrolled && <span className="chip ok">PMTCT</span>}
                </div>
              </DrSec>
            )}

            <DrSec title="Chăm sóc">
              <DrField lbl="BS phụ trách">{sel.assignedDoctorName || '—'}</DrField>
              <DrField lbl="Cơ sở">{sel.facilityName || '—'}</DrField>
              <DrField lbl="Hẹn khám tiếp">{fmtDMY(sel.nextAppointmentDate)}</DrField>
            </DrSec>

            {sel.notes && (
              <DrSec title="Ghi chú">
                <div style={{ fontSize: 12.5, color: 'var(--t-1)', whiteSpace: 'pre-wrap' }}>{sel.notes}</div>
              </DrSec>
            )}

            <DrSec title={`Lịch sử xét nghiệm${labHistory.length ? ` (${labHistory.length})` : ''}`}>
              {labLoading ? (
                <div style={{ color: 'var(--t-2)', padding: '8px 0', fontSize: 13 }}>Đang tải…</div>
              ) : labHistory.length === 0 ? (
                <div style={{ color: 'var(--t-2)', padding: '8px 0', fontSize: 13 }}>Chưa có xét nghiệm</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {labHistory.map((l) => (
                    <div key={l.id} style={{ background: 'var(--bg-1)', borderRadius: 6, padding: '8px 12px', fontSize: 13 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span className="mono" style={{ color: 'var(--t-2)', fontSize: 12 }}>{fmtDMY(l.testDate)}</span>
                        <span className="chip info">{l.testType}</span>
                        <b className="mono" style={{ color: l.isAbnormal ? 'var(--s-crit)' : 'var(--t-0)' }}>
                          {l.result} {l.unit}
                        </b>
                        {l.referenceRange && (
                          <span className="mono" style={{ color: 'var(--t-2)', fontSize: 12 }}>TC: {l.referenceRange}</span>
                        )}
                        <span className={`chip ${l.isAbnormal ? 'crit' : 'ok'}`} style={{ marginLeft: 'auto' }}>
                          {l.isAbnormal ? 'Bất thường' : 'Bình thường'}
                        </span>
                      </div>
                      {l.labName && <div style={{ color: 'var(--t-2)', fontSize: 12, marginTop: 2 }}>PXN: {l.labName}</div>}
                    </div>
                  ))}
                </div>
              )}
            </DrSec>
          </>
        )}
      </DrawerShell>

      {/* ── Modal: Đăng ký BN HIV ── */}
      <CrudModal
        open={enrollOpen}
        onClose={() => setEnrollOpen(false)}
        title="Đăng ký bệnh nhân HIV"
        sub="Đưa bệnh nhân đã có trong hệ thống vào chương trình quản lý HIV/AIDS"
        fields={enrollFields}
        initial={{ whoStage: 1, artStatus: 'PreART' }}
        size="lg"
        onSubmit={async (v) => {
          await enrollPatient(v as Partial<HivPatient>);
          tk('Đăng ký bệnh nhân thành công');
          load();
        }}
      />

      {/* ── Modal: Thêm kết quả xét nghiệm ── */}
      <CrudModal
        open={labOpen}
        onClose={() => setLabOpen(false)}
        title="Thêm kết quả xét nghiệm"
        fields={labFields}
        initial={labInitial}
        onSubmit={async (v) => {
          await addLabResult(v as Partial<HivLabResult>);
          tk('Lưu kết quả xét nghiệm thành công');
          if (sel && sel.id === v.patientId) {
            try { setLabHistory(await getLabHistory(sel.id)); } catch { /* giữ lịch sử cũ */ }
          }
        }}
      />

      {/* ── Modal: Thêm bản ghi PMTCT ── */}
      <CrudModal
        open={pmtctOpen}
        onClose={() => setPmtctOpen(false)}
        title="Thêm bản ghi PMTCT"
        sub="Dự phòng lây truyền HIV từ mẹ sang con"
        fields={pmtctFields}
        initial={{ artDuringPregnancy: true, infantProphylaxis: false }}
        size="lg"
        onSubmit={async (v) => {
          await addPmtctRecord(v as Partial<PmtctRecord>);
          tk('Lưu thông tin PMTCT thành công');
          const pid = String(v.patientId || '');
          if (pid) { setPmtctPatientId(pid); loadPmtct(pid); }
        }}
      />
    </div>
  );
};

export default HivManagementV2;
