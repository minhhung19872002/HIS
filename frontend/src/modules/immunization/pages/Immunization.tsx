import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  searchVaccinations, recordVaccination, searchCampaigns, getCampaignStats, getAefiReports,
} from '../api/immunization';
import type { Vaccination, Campaign, AefiReport, CampaignStats } from '../api/immunization';
import {
  TopTabs, KpiStrip, StatusTabs, SearchBox, DataTable, Pager,
  StatusBadge, Btn, DrawerShell, DrSec, DrField, CrudModal,
  SimpleV2Page, useTabCounts, tk,
  type TopTab, type ColumnDef, type StatusTab, type CrudFieldCfg, type KpiItem,
} from '../../../pages-v2/_v2kit';

type Tab = 'vaccinations' | 'campaigns' | 'aefi' | 'statistics';
const TABS: TopTab<Tab>[] = [
  { v: 'vaccinations', l: 'Hồ sơ tiêm',  ic: 'flask' },
  { v: 'campaigns',    l: 'Chiến dịch',   ic: 'calendar' },
  { v: 'aefi',         l: 'AEFI',         ic: 'alert' },
  { v: 'statistics',   l: 'Thống kê',     ic: 'chart' },
];

type VKey = 'scheduled' | 'completed' | 'missed' | 'deferred';
const VAX_TABS: StatusTab<VKey>[] = [
  { v: 'scheduled', l: 'Đã lên lịch', tone: 'info' },
  { v: 'completed', l: 'Đã tiêm',     tone: 'ok' },
  { v: 'missed',    l: 'Bỏ lỡ',       tone: 'crit' },
  { v: 'deferred',  l: 'Hoãn',        tone: 'warn' },
];
const vaxStatus = (s: number): VKey =>
  s === 1 ? 'completed' : s === 2 ? 'missed' : s === 3 ? 'deferred' : 'scheduled';

const SITE_OPTS = [
  { value: 'Đùi trái', label: 'Đùi trái' },
  { value: 'Đùi phải', label: 'Đùi phải' },
  { value: 'Cánh tay trái', label: 'Cánh tay trái' },
  { value: 'Cánh tay phải', label: 'Cánh tay phải' },
];
const ROUTE_OPTS = [
  { value: 'IM', label: 'Tiêm bắp (IM)' },
  { value: 'SC', label: 'Tiêm dưới da (SC)' },
  { value: 'ID', label: 'Tiêm trong da (ID)' },
  { value: 'Oral', label: 'Uống' },
];
const VAX_FIELDS: CrudFieldCfg[] = [
  { key: 'patientName',    label: 'Họ tên bệnh nhân', required: true },
  { key: 'patientCode',    label: 'Mã bệnh nhân' },
  { key: 'vaccineName',    label: 'Tên vắc-xin', required: true },
  { key: 'vaccineCode',    label: 'Mã vắc-xin' },
  { key: 'lotNumber',      label: 'Số lô', required: true },
  { key: 'doseNumber',     label: 'Mũi thứ', type: 'number', required: true },
  { key: 'totalDoses',     label: 'Tổng số mũi', type: 'number', required: true },
  { key: 'site',           label: 'Vị trí tiêm', type: 'select', required: true, options: SITE_OPTS },
  { key: 'route',          label: 'Đường tiêm',  type: 'select', required: true, options: ROUTE_OPTS },
  { key: 'vaccinationDate', label: 'Ngày tiêm',  type: 'date', required: true },
  { key: 'nextDueDate',    label: 'Ngày mũi tiếp', type: 'date' },
  { key: 'administeredBy', label: 'Người tiêm' },
  { key: 'notes',          label: 'Ghi chú', type: 'textarea' },
];

const SEV_LABEL: Record<number, string> = { 1: 'Nhẹ', 2: 'Trung bình', 3: 'Nặng', 4: 'Nghiêm trọng' };
const SEV_TONE: Record<number, 'ok' | 'info' | 'warn' | 'crit'> = { 1: 'ok', 2: 'info', 3: 'warn', 4: 'crit' };
const CAMP_ST_LBL: Record<number, string> = { 0: 'Kế hoạch', 1: 'Đang TH', 2: 'Hoàn thành', 3: 'Hủy' };
const CAMP_ST_TONE: Record<number, 'ok' | 'info' | 'warn' | 'crit'> = { 0: 'info', 1: 'warn', 2: 'ok', 3: 'crit' };

const fmtDMY = (iso?: string) => iso ? dayjs(iso).format('DD/MM/YYYY') : '—';
const PER = 20;
const CARD: React.CSSProperties = {
  padding: '16px 20px', background: 'var(--bg-1)',
  border: '1px solid var(--line)', borderRadius: 'var(--r-2)',
};

const ImmunizationV2: React.FC = () => {
  const [tab, setTab] = useState<Tab>('vaccinations');

  // ── Vaccinations ──
  const [vaxRows, setVaxRows]   = useState<Vaccination[]>([]);
  const [vaxLoad, setVaxLoad]   = useState(false);
  const [vaxCreate, setVaxCreate] = useState(false);
  const [reloadVer, setReloadVer] = useState(0);

  // ── AEFI ──
  const [aefiRows, setAefiRows]     = useState<AefiReport[]>([]);
  const [aefiLoad, setAefiLoad]     = useState(false);
  const [aefiLoaded, setAefiLoaded] = useState(false);
  const [aefiSearch, setAefiSearch] = useState('');
  const [aefiPage, setAefiPage]     = useState(0);
  const [aefiSel, setAefiSel]       = useState<AefiReport | null>(null);

  // ── Campaigns & Stats ──
  const [campaigns, setCampaigns]       = useState<Campaign[]>([]);
  const [campSearch, setCampSearch]     = useState('');
  const [campStats, setCampStats]       = useState<CampaignStats | null>(null);
  const [campLoaded, setCampLoaded]     = useState(false);
  const [campLoad, setCampLoad]         = useState(false);

  const loadVax = useCallback(async () => {
    setVaxLoad(true);
    try { setVaxRows(await searchVaccinations()); }
    finally { setVaxLoad(false); }
  }, []);

  const loadAefi = useCallback(async () => {
    setAefiLoad(true);
    try { setAefiRows(await getAefiReports()); setAefiLoaded(true); }
    finally { setAefiLoad(false); }
  }, []);

  const loadCamp = useCallback(async () => {
    setCampLoad(true);
    try {
      const [c, s] = await Promise.all([searchCampaigns(), getCampaignStats()]);
      setCampaigns(c); setCampStats(s); setCampLoaded(true);
    } finally { setCampLoad(false); }
  }, []);

  useEffect(() => { loadVax(); }, [loadVax, reloadVer]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (tab === 'aefi' && !aefiLoaded) loadAefi();
    if ((tab === 'campaigns' || tab === 'statistics') && !campLoaded) loadCamp();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleVaxSubmit = async (v: Record<string, unknown>) => {
    await recordVaccination({
      patientName: String(v.patientName ?? ''),
      patientCode: String(v.patientCode ?? '') || undefined,
      vaccineName: String(v.vaccineName ?? ''),
      vaccineCode: String(v.vaccineCode ?? '') || undefined,
      lotNumber: String(v.lotNumber ?? ''),
      doseNumber: Number(v.doseNumber) || 1,
      totalDoses: Number(v.totalDoses) || 1,
      site: String(v.site ?? ''),
      route: String(v.route ?? ''),
      vaccinationDate: String(v.vaccinationDate ?? ''),
      nextDueDate: v.nextDueDate ? String(v.nextDueDate) : undefined,
      administeredBy: String(v.administeredBy ?? '') || undefined,
      notes: String(v.notes ?? '') || undefined,
    } as Partial<Vaccination>);
    tk('Đã ghi nhận tiêm chủng');
    setReloadVer((n) => n + 1);
  };

  // ── Vaccination list (SimpleV2Page) columns ──
  const vaxCols: ColumnDef<Vaccination>[] = [
    { key: 'patient', label: 'Bệnh nhân', render: (r) => (
      <div className="cell-2l">
        <b>{r.patientName}</b>
        <i className="mono">{r.patientCode} · {r.gender === 1 ? 'Nam' : 'Nữ'}</i>
      </div>
    )},
    { key: 'vaccine', label: 'Vắc-xin', render: (r) => (
      <div className="cell-2l"><b>{r.vaccineName}</b><i className="mono">{r.vaccineCode}</i></div>
    )},
    { key: 'dose',  label: 'Mũi', mono: true, width: 80,  render: (r) => `${r.doseNumber}/${r.totalDoses}` },
    { key: 'lot',   label: 'Số lô', mono: true, width: 130, render: (r) => r.lotNumber || '—' },
    { key: 'route', label: 'Đường', width: 90,             render: (r) => `${r.route} · ${r.site}` },
    { key: 'when',  label: 'Ngày tiêm', mono: true, width: 100, render: (r) => fmtDMY(r.vaccinationDate) },
    { key: 'next',  label: 'Mũi tiếp', mono: true, width: 100, render: (r) => fmtDMY(r.nextDueDate) },
    { key: 'aefi',  label: 'AEFI', width: 70, render: (r) =>
      r.adverseEvent ? <span className="chip crit">Có</span> : <span style={{ color: 'var(--t-3)' }}>—</span>
    },
    { key: 'st', label: 'TT', width: 120, render: (r) => {
      const sk = vaxStatus(r.status);
      const t = VAX_TABS.find((x) => x.v === sk);
      return <StatusBadge tone={t?.tone} dot>{t?.l}</StatusBadge>;
    }},
  ];

  // ── AEFI columns ──
  const aefiFiltered = useMemo(() => {
    const s = aefiSearch.toLowerCase();
    return aefiRows.filter((r) => !s || [r.patientName, r.vaccineName, r.symptoms].some(
      (f) => (f ?? '').toLowerCase().includes(s),
    ));
  }, [aefiRows, aefiSearch]);
  const aefiPages = Math.max(1, Math.ceil(aefiFiltered.length / PER));
  const aefiPaged = aefiFiltered.slice(aefiPage * PER, (aefiPage + 1) * PER);
  const aefiCols: ColumnDef<AefiReport>[] = [
    { key: 'pat',     label: 'Bệnh nhân', render: (r) => r.patientName },
    { key: 'vax',     label: 'Vắc-xin',  render: (r) => r.vaccineName },
    { key: 'vdate',   label: 'Ngày tiêm', mono: true, width: 100, render: (r) => fmtDMY(r.vaccinationDate) },
    { key: 'rdate',   label: 'Ngày PU',   mono: true, width: 100, render: (r) => fmtDMY(r.reactionDate) },
    { key: 'sev',     label: 'Mức độ', width: 120, render: (r) => (
      <StatusBadge tone={SEV_TONE[r.severity] ?? 'info'}>{SEV_LABEL[r.severity] ?? '—'}</StatusBadge>
    )},
    { key: 'sym',     label: 'Triệu chứng', render: (r) => (
      <span style={{ display: 'block', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {r.symptoms}
      </span>
    )},
    { key: 'outcome', label: 'Kết quả', render: (r) => r.outcome },
  ];

  // ── Campaign columns ──
  const campFiltered = useMemo(() => {
    const s = campSearch.toLowerCase();
    return campaigns.filter((c) => !s || c.name.toLowerCase().includes(s));
  }, [campaigns, campSearch]);
  const campCols: ColumnDef<Campaign>[] = [
    { key: 'name', label: 'Tên chiến dịch', render: (r) => r.name },
    { key: 'vax',  label: 'Vắc-xin', render: (r) => r.vaccineName },
    { key: 'from', label: 'Từ ngày', mono: true, width: 100, render: (r) => fmtDMY(r.startDate) },
    { key: 'to',   label: 'Đến ngày', mono: true, width: 100, render: (r) => fmtDMY(r.endDate) },
    { key: 'area', label: 'Khu vực', render: (r) => r.area },
    { key: 'tgt',  label: 'Mục tiêu', mono: true, width: 90, render: (r) => r.targetPopulation.toLocaleString() },
    { key: 'done', label: 'Đã TH', mono: true, width: 90, render: (r) => {
      const pct = r.targetPopulation > 0
        ? Math.round(r.completedCount / r.targetPopulation * 100) : 0;
      return (
        <span>{r.completedCount.toLocaleString()} <small style={{ color: 'var(--t-2)' }}>({pct}%)</small></span>
      );
    }},
    { key: 'st', label: 'TT', width: 110, render: (r) => (
      <StatusBadge tone={CAMP_ST_TONE[r.status] ?? 'info'}>{CAMP_ST_LBL[r.status] ?? '—'}</StatusBadge>
    )},
  ];

  // ── KPI data ──
  const today = dayjs();
  const vaxKpis = (rows: Vaccination[]): KpiItem[] => {
    const aefi = rows.filter((r) => r.adverseEvent).length;
    const overdue = rows.filter((r) => r.nextDueDate && dayjs(r.nextDueDate).isBefore(today)).length;
    return [
      { lbl: 'Tổng mũi', val: rows.length },
      { lbl: 'Hôm nay', val: rows.filter((r) => dayjs(r.vaccinationDate).isSame(today, 'day')).length, tone: 'info' },
      { lbl: 'Đã tiêm', val: rows.filter((r) => r.status === 1).length, tone: 'ok' },
      { lbl: 'Bỏ lỡ', val: rows.filter((r) => r.status === 2).length, tone: 'crit' },
      { lbl: 'Quá hạn mũi sau', val: overdue, tone: 'warn' },
      { lbl: 'AEFI', val: aefi, sub: 'phản ứng', tone: aefi > 0 ? 'crit' : 'ok' },
    ];
  };

  const vaxCountsByStatus = useTabCounts(vaxRows, VAX_TABS, (r) => vaxStatus(r.status));

  return (
    <div>
      <TopTabs<Tab>
        tab={tab}
        setTab={setTab}
        tabs={TABS}
        actions={<Btn icon="refresh" onClick={tab === 'vaccinations' ? loadVax : tab === 'aefi' ? loadAefi : loadCamp} />}
      />
      <div style={{ paddingTop: 12 }}>

        {/* ── TAB 1: Hồ sơ tiêm chủng ── */}
        {tab === 'vaccinations' && (
          <>
            <SimpleV2Page<Vaccination>
              key={reloadVer}
              title=""
              load={searchVaccinations}
              rowKey={(r) => r.id}
              columns={vaxCols}
              searchPlaceholder="Tìm BN / vắc-xin / số lô…"
              searchOf={(r) => `${r.patientName} ${r.patientCode} ${r.vaccineName} ${r.vaccineCode} ${r.lotNumber}`}
              statusTabs={VAX_TABS as unknown as StatusTab<string>[]}
              statusOf={(r) => vaxStatus(r.status)}
              headerActions={() => (
                <Btn variant="primary" icon="plus" onClick={() => setVaxCreate(true)}>Ghi nhận tiêm</Btn>
              )}
              kpis={vaxKpis}
              pageSize={20}
              emptyMessage={vaxLoad ? 'Đang tải…' : 'Chưa có hồ sơ tiêm chủng'}
              drawerTitle={(r) => `${r.patientName} · ${r.vaccineName}`}
              drawerSub={(r) => `Mũi ${r.doseNumber}/${r.totalDoses} · ${fmtDMY(r.vaccinationDate)}`}
              drawer={(r) => (
                <>
                  <DrSec title="Bệnh nhân">
                    <DrField lbl="Họ tên">{r.patientName}</DrField>
                    <DrField lbl="Mã BN"><span className="mono">{r.patientCode}</span></DrField>
                    <DrField lbl="Giới tính">{r.gender === 1 ? 'Nam' : 'Nữ'}</DrField>
                  </DrSec>
                  <DrSec title="Vắc-xin">
                    <DrField lbl="Tên">{r.vaccineName}</DrField>
                    <DrField lbl="Mã"><span className="mono" style={{ color: 'var(--a-cy)' }}>{r.vaccineCode}</span></DrField>
                    <DrField lbl="Số lô">{r.lotNumber}</DrField>
                    <DrField lbl="Mũi"><b>{r.doseNumber}/{r.totalDoses}</b></DrField>
                    <DrField lbl="Đường tiêm">{r.route}</DrField>
                    <DrField lbl="Vị trí">{r.site}</DrField>
                  </DrSec>
                  <DrSec title="Thời gian">
                    <DrField lbl="Ngày tiêm">{fmtDMY(r.vaccinationDate)}</DrField>
                    {r.administeredBy && <DrField lbl="Người tiêm">{r.administeredBy}</DrField>}
                    <DrField lbl="Mũi tiếp">{fmtDMY(r.nextDueDate)}</DrField>
                  </DrSec>
                  {r.adverseEvent && (
                    <DrSec title="AEFI — Phản ứng sau tiêm">
                      <DrField lbl="">
                        <span style={{ color: 'var(--s-crit)', whiteSpace: 'pre-wrap' }}>{r.adverseEvent}</span>
                      </DrField>
                    </DrSec>
                  )}
                  {r.notes && <DrSec title="Ghi chú"><DrField lbl="">{r.notes}</DrField></DrSec>}
                </>
              )}
            />
            <CrudModal
              open={vaxCreate}
              onClose={() => setVaxCreate(false)}
              title="Ghi nhận tiêm chủng"
              fields={VAX_FIELDS}
              initial={{ doseNumber: 1, totalDoses: 3 }}
              size="lg"
              onSubmit={handleVaxSubmit}
            />
          </>
        )}

        {/* ── TAB 2: Chiến dịch tiêm chủng ── */}
        {tab === 'campaigns' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <SearchBox value={campSearch} onChange={setCampSearch} placeholder="Tìm tên chiến dịch…" />
              <Btn icon="refresh" onClick={loadCamp} loading={campLoad} />
            </div>
            <DataTable<Campaign>
              columns={campCols}
              data={campFiltered}
              rowKey={(r) => r.id}
              empty={campLoad ? 'Đang tải…' : 'Chưa có chiến dịch tiêm chủng'}
            />
          </div>
        )}

        {/* ── TAB 3: AEFI ── */}
        {tab === 'aefi' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <SearchBox value={aefiSearch} onChange={setAefiSearch} placeholder="Tìm tên BN / vắc-xin / triệu chứng…" />
              <Btn icon="refresh" onClick={loadAefi} loading={aefiLoad} />
            </div>
            <DataTable<AefiReport>
              columns={aefiCols}
              data={aefiPaged}
              rowKey={(r) => r.id}
              onRowClick={setAefiSel}
              empty={aefiLoad ? 'Đang tải…' : 'Không có báo cáo AEFI'}
            />
            <Pager
              page={aefiPage}
              totalPages={aefiPages}
              setPage={(p) => setAefiPage(typeof p === 'function' ? p(aefiPage) : p)}
              total={aefiFiltered.length}
              perPage={PER}
            />
            <DrawerShell
              open={!!aefiSel}
              onClose={() => setAefiSel(null)}
              title={aefiSel?.patientName ?? ''}
              sub={aefiSel ? `${aefiSel.vaccineName} · ${fmtDMY(aefiSel.reactionDate)}` : ''}
            >
              {aefiSel && (
                <>
                  <DrSec title="Thông tin">
                    <DrField lbl="Bệnh nhân">{aefiSel.patientName}</DrField>
                    <DrField lbl="Vắc-xin">{aefiSel.vaccineName}</DrField>
                    <DrField lbl="Ngày tiêm">{fmtDMY(aefiSel.vaccinationDate)}</DrField>
                    <DrField lbl="Ngày phản ứng">{fmtDMY(aefiSel.reactionDate)}</DrField>
                  </DrSec>
                  <DrSec title="Phản ứng">
                    <DrField lbl="Mức độ">
                      <StatusBadge tone={SEV_TONE[aefiSel.severity] ?? 'info'}>
                        {SEV_LABEL[aefiSel.severity] ?? '—'}
                      </StatusBadge>
                    </DrField>
                    <DrField lbl="Triệu chứng">{aefiSel.symptoms}</DrField>
                    <DrField lbl="Kết quả">{aefiSel.outcome}</DrField>
                    <DrField lbl="Người báo cáo">{aefiSel.reportedBy}</DrField>
                  </DrSec>
                </>
              )}
            </DrawerShell>
          </div>
        )}

        {/* ── TAB 4: Thống kê ── */}
        {tab === 'statistics' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            <div style={CARD}>
              <div style={{ fontSize: 11, color: 'var(--t-2)', fontWeight: 600, marginBottom: 14 }}>
                TỶ LỆ TIÊM CHỦNG
              </div>
              <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                <StatNum n={campStats?.totalVaccinated ?? 0} lbl="Tổng đã tiêm" />
                <StatNum n={`${campStats?.coveragePercent ?? 0}%`} lbl="Tỷ lệ bao phủ" color="var(--a-cy)" />
                <StatNum n={campStats?.activeCampaigns ?? 0} lbl="CD đang TH" color="var(--s-warn)" />
              </div>
            </div>
            <div style={CARD}>
              <div style={{ fontSize: 11, color: 'var(--t-2)', fontWeight: 600, marginBottom: 14 }}>
                HỒ SƠ TIÊM CHỦNG
              </div>
              <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                <StatNum n={vaxRows.length} lbl="Tổng hồ sơ" />
                {VAX_TABS.map((t) => (
                  <StatNum
                    key={t.v}
                    n={(vaxCountsByStatus as Record<string, number>)[t.v] ?? 0}
                    lbl={t.l}
                    color={t.tone === 'ok' ? 'var(--s-ok)' : t.tone === 'crit' ? 'var(--s-crit)' : t.tone === 'warn' ? 'var(--s-warn)' : undefined}
                  />
                ))}
              </div>
            </div>
            <div style={CARD}>
              <div style={{ fontSize: 11, color: 'var(--t-2)', fontWeight: 600, marginBottom: 14 }}>
                AEFI
              </div>
              <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                <StatNum n={aefiRows.length} lbl="Tổng báo cáo" />
                {[1, 2, 3, 4].map((sev) => (
                  <StatNum
                    key={sev}
                    n={aefiRows.filter((r) => r.severity === sev).length}
                    lbl={SEV_LABEL[sev]}
                    color={sev >= 3 ? 'var(--s-crit)' : sev === 2 ? 'var(--s-warn)' : undefined}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const StatNum: React.FC<{ n: number | string; lbl: string; color?: string }> = ({ n, lbl, color }) => (
  <div>
    <div style={{ fontSize: 28, fontWeight: 700, color: color ?? 'var(--t-0)' }}>{n}</div>
    <div style={{ fontSize: 11, color: 'var(--t-2)', marginTop: 2 }}>{lbl}</div>
  </div>
);

export default ImmunizationV2;
