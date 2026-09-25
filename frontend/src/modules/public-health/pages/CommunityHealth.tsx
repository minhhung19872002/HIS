import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTabState } from '../../../hooks/useTabState';
import dayjs from 'dayjs';
import {
  searchHouseholds, createHousehold, updateHousehold,
  searchNcdScreenings, createNcdScreening,
  searchTeams, createTeam, updateTeam,
} from '../api/communityHealth';
import { apiClient } from '../../../services/apiClient';
import { normalizeArrayResponse } from '../../../utils/apiNormalize';
import type { Household, NcdScreening, CommunityTeam } from '../api/communityHealth';
import {
  TopTabs, KpiStrip, StatusTabs, SearchBox, DataTable, Pager,
  StatusBadge, ActBtn, Btn, DrawerShell, DrSec, DrField, CrudModal,
  SimpleV2Page, useTabCounts, tk, tw,
  type TopTab, type ColumnDef, type StatusTab, type CrudFieldCfg, type KpiItem,
} from '@/_v2kit';
import { friendlyErrorMessage } from '@/utils/friendlyError';

type Tab = 'households' | 'ncd' | 'teams';
const TABS: TopTab<Tab>[] = [
  { v: 'households', l: 'Hộ gia đình',  ic: 'user' },
  { v: 'ncd',        l: 'Sàng lọc NCD', ic: 'flask' },
  { v: 'teams',      l: 'Đội y tế',     ic: 'list' },
];

// ── Household ──
type HKey = 'active' | 'inactive' | 'moved';
const HH_TABS: StatusTab<HKey>[] = [
  { v: 'active',   l: 'Đang quản lý', tone: 'ok' },
  { v: 'inactive', l: 'Tạm ngưng',    tone: 'info' },
  { v: 'moved',    l: 'Đã chuyển',    tone: 'crit' },
];
const hhStatus = (s: number): HKey => s === 1 ? 'inactive' : s === 2 ? 'moved' : 'active';
const RISK_TONE: Record<string, 'ok' | 'warn' | 'crit'> = {
  Low: 'ok', Medium: 'warn', High: 'crit', VeryHigh: 'crit',
};
const RISK_LABEL: Record<string, string> = { Low: 'Thấp', Medium: 'TB', High: 'Cao', VeryHigh: 'Rất cao' };

const HH_FIELDS: CrudFieldCfg[] = [
  { key: 'headName',    label: 'Chủ hộ',      required: true },
  { key: 'address',     label: 'Địa chỉ',     required: true },
  { key: 'ward',        label: 'Phường/Xã',    required: true },
  { key: 'district',    label: 'Quận/Huyện',   required: true },
  { key: 'province',    label: 'Tỉnh/Thành' },
  { key: 'phone',       label: 'Điện thoại' },
  { key: 'memberCount', label: 'Số thành viên', type: 'number', required: true },
  { key: 'riskLevel',   label: 'Mức rủi ro', type: 'select', required: true, options: [
    { value: 'Low', label: 'Thấp' }, { value: 'Medium', label: 'Trung bình' },
    { value: 'High', label: 'Cao' }, { value: 'VeryHigh', label: 'Rất cao' },
  ]},
  { key: 'hasElderlyMember', label: 'Người cao tuổi', type: 'select', options: [
    { value: 'true', label: 'Có' }, { value: 'false', label: 'Không' },
  ]},
  { key: 'hasChildUnder5',   label: 'Trẻ dưới 5 tuổi', type: 'select', options: [
    { value: 'true', label: 'Có' }, { value: 'false', label: 'Không' },
  ]},
  { key: 'hasPregnant',      label: 'Phụ nữ mang thai', type: 'select', options: [
    { value: 'true', label: 'Có' }, { value: 'false', label: 'Không' },
  ]},
  { key: 'hasChronicDisease', label: 'Bệnh mạn tính', type: 'select', options: [
    { value: 'true', label: 'Có' }, { value: 'false', label: 'Không' },
  ]},
  { key: 'lastVisitDate', label: 'Ngày thăm gần nhất', type: 'date' },
  { key: 'nextVisitDate', label: 'Hẹn thăm tiếp', type: 'date' },
  { key: 'status', label: 'Trạng thái quản lý', type: 'select', options: [
    { value: 0, label: 'Đang quản lý' }, { value: 1, label: 'Tạm ngưng' }, { value: 2, label: 'Đã chuyển đi' },
  ]},
  { key: 'notes', label: 'Ghi chú', type: 'textarea' },
];
const HH_BOOL_KEYS = ['hasElderlyMember', 'hasChildUnder5', 'hasPregnant', 'hasChronicDisease'] as const;

// ── NCD Screening ──
const NCD_STATUS_TABS: StatusTab<string>[] = [
  { v: 'completed',        l: 'Đã hoàn thành',  tone: 'ok' },
  { v: 'pending-follow-up', l: 'Cần theo dõi',  tone: 'warn' },
  { v: 'referred',         l: 'Đã chuyển viện', tone: 'crit' },
];
const ncdStatus = (s: number): string =>
  s === 1 ? 'pending-follow-up' : s === 2 ? 'referred' : 'completed';
const BP_TONE: Record<string, 'ok' | 'warn' | 'crit'> = {
  Normal: 'ok', Elevated: 'warn', Stage1: 'warn', Stage2: 'crit', Crisis: 'crit',
};
const BP_LABEL: Record<string, string> = {
  Normal: 'Bình thường', Elevated: 'Tiền THA', Stage1: 'THA1', Stage2: 'THA2', Crisis: 'Khủng hoảng',
};
const GLU_LABEL: Record<string, string> = {
  Normal: 'Bình thường', Prediabetes: 'Tiền ĐTĐ', Diabetes: 'Đái tháo đường',
};
const CVD_TONE = (r: NcdScreening): 'ok' | 'warn' | 'crit' => {
  if (r.cvdRiskLevel === 'High' || r.cvdRiskLevel === 'VeryHigh') return 'crit';
  if (r.cvdRiskLevel === 'Medium') return 'warn';
  return 'ok';
};

// Đối tượng = BN đã có trong HIS (BE bắt buộc patientId) — ô chọn BN ghép trong component (ncdFields)
const NCD_FIELDS_REST: CrudFieldCfg[] = [
  { key: 'screeningDate', label: 'Ngày sàng lọc', type: 'date', required: true },
  { key: 'screenerName',  label: 'Người thực hiện', required: true },
  { key: 'systolicBP',    label: 'Huyết áp tâm thu (mmHg)', type: 'number', required: true },
  { key: 'diastolicBP',   label: 'Huyết áp tâm trương (mmHg)', type: 'number', required: true },
  { key: 'fastingGlucose', label: 'Đường huyết lúc đói (mmol/L)', type: 'number' },
  { key: 'height',        label: 'Chiều cao (cm)', type: 'number', required: true },
  { key: 'weight',        label: 'Cân nặng (kg)',  type: 'number', required: true },
  { key: 'isSmoker',      label: 'Hút thuốc', type: 'select', options: [
    { value: 'true', label: 'Có' }, { value: 'false', label: 'Không' },
  ]},
  { key: 'alcoholUse',    label: 'Rượu bia', type: 'select', options: [
    { value: 'None', label: 'Không' }, { value: 'Occasional', label: 'Thỉnh thoảng' },
    { value: 'Regular', label: 'Thường xuyên' }, { value: 'Heavy', label: 'Nhiều' },
  ]},
  { key: 'followUpRequired', label: 'Cần theo dõi', type: 'select', options: [
    { value: 'true', label: 'Có' }, { value: 'false', label: 'Không' },
  ]},
  { key: 'followUpDate',  label: 'Ngày tái khám', type: 'date' },
  { key: 'referralRequired', label: 'Chuyển tuyến điều trị', type: 'switch' },
  { key: 'followUpNotes', label: 'Kết luận / ghi chú', type: 'textarea' },
];

// ── Teams ──
const TEAM_FIELDS: CrudFieldCfg[] = [
  { key: 'teamName',     label: 'Tên đội', required: true },
  { key: 'leaderName',   label: 'Đội trưởng', required: true },
  { key: 'wardAssigned', label: 'Phường/Xã phụ trách', required: true },
  { key: 'phone',        label: 'Điện thoại' },
  { key: 'notes',        label: 'Ghi chú', type: 'textarea' },
];
const TEAM_EDIT_FIELDS: CrudFieldCfg[] = [
  ...TEAM_FIELDS.filter((f) => f.key !== 'phone' && f.key !== 'notes'),
  { key: 'memberCount', label: 'Số thành viên', type: 'number' },
  { key: 'status', label: 'Trạng thái', type: 'select', options: [
    { value: 0, label: 'Hoạt động' }, { value: 1, label: 'Tạm ngưng' },
  ]},
];

const fmtDMY = (iso?: string) => iso ? dayjs(iso).format('DD/MM/YYYY') : '—';
const PER = 20;

const CommunityHealthV2: React.FC = () => {
  const [tab, setTab] = useTabState<Tab>('households', 'tab');
  // #352: CRUD hộ gia đình — HH_FIELDS đã định nghĩa sẵn nhưng chưa gắn CrudModal nào,
  // nên v2 chỉ xem được, không tạo/sửa được hộ (v1 có cả 2: pages/CommunityHealth.tsx:448, :273).
  const [hhCrudOpen, setHhCrudOpen] = useState(false);
  const [hhCrudInit, setHhCrudInit] = useState<Record<string, unknown> | null>(null);
  const hhReloadRef = useRef<(() => void) | null>(null);

  // ── NCD state ──
  const [ncdRows, setNcdRows]     = useState<NcdScreening[]>([]);
  const [ncdLoad, setNcdLoad]     = useState(false);
  const [ncdLoaded, setNcdLoaded] = useState(false);
  const [ncdSearch, setNcdSearch] = useState('');
  const [ncdStab, setNcdStab]     = useTabState<string>('all', 'stab');
  const [ncdPage, setNcdPage]     = useState(0);
  const [ncdSel, setNcdSel]       = useState<NcdScreening | null>(null);
  const [ncdCreate, setNcdCreate] = useState(false);

  // ── Teams state ──
  const [teams, setTeams]           = useState<CommunityTeam[]>([]);
  const [teamsLoad, setTeamsLoad]   = useState(false);
  const [teamsLoaded, setTeamsLoaded] = useState(false);
  const [teamSearch, setTeamSearch] = useState('');
  const [teamCreate, setTeamCreate] = useState(false);
  const [teamEdit, setTeamEdit] = useState<CommunityTeam | null>(null);

  // Đội y tế cho ô "Đội phụ trách" của hộ gia đình (trước đây không gán được đội → cột Đội luôn "—")
  useEffect(() => { searchTeams().then(setTeams).catch(() => { /* đã cảnh báo trong api */ }); }, []);
  const hhFields = useMemo<CrudFieldCfg[]>(() => [
    ...HH_FIELDS.slice(0, 8),
    { key: 'assignedTeamId', label: 'Đội phụ trách', type: 'select',
      options: teams.filter((t) => t.status === 0).map((t) => ({ value: t.id, label: `${t.teamCode} — ${t.teamName}` })) },
    ...HH_FIELDS.slice(8),
  ], [teams]);

  // Ô chọn BN cho phiếu sàng lọc NCD
  const [ncdPatientOpts, setNcdPatientOpts] = useState<Array<{ id: string; patientCode: string; fullName: string }>>([]);
  const searchNcdPatients = useCallback((kw: string) => {
    if (!kw || kw.trim().length < 2) return;
    apiClient.post<unknown>('/patients/search', { keyword: kw.trim(), page: 1, pageSize: 20 })
      .then((r) => setNcdPatientOpts(normalizeArrayResponse<{ id: string; patientCode: string; fullName: string }>(r.data)))
      .catch(() => { /* đang gõ dở — không toast */ });
  }, []);
  const ncdFields = useMemo<CrudFieldCfg[]>(() => [
    { key: 'patientId', label: 'Đối tượng (bệnh nhân)', type: 'autocomplete', required: true,
      options: ncdPatientOpts.map((p) => ({ value: p.id, label: `${p.patientCode} — ${p.fullName}` })),
      onSearch: searchNcdPatients, debounce: 300, placeholder: 'Gõ mã BN hoặc họ tên (≥ 2 ký tự)…' },
    ...NCD_FIELDS_REST,
  ], [ncdPatientOpts, searchNcdPatients]);

  const loadNcd = useCallback(async () => {
    setNcdLoad(true);
    try { setNcdRows(await searchNcdScreenings()); setNcdLoaded(true); }
    catch (e) { tw(friendlyErrorMessage(e, 'Không tải được danh sách sàng lọc NCD. Vui lòng thử lại.')); }
    finally { setNcdLoad(false); }
  }, []);

  const loadTeams = useCallback(async () => {
    setTeamsLoad(true);
    try { setTeams(await searchTeams()); setTeamsLoaded(true); }
    catch (e) { tw(friendlyErrorMessage(e, 'Không tải được danh sách đội y tế. Vui lòng thử lại.')); }
    finally { setTeamsLoad(false); }
  }, []);

  useEffect(() => {
    if (tab === 'ncd' && !ncdLoaded) loadNcd();
    if (tab === 'teams' && !teamsLoaded) loadTeams();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Households (SimpleV2Page) ──
  const hhCols: ColumnDef<Household>[] = [
    { key: 'code',    label: 'Mã hộ', mono: true, width: 130, render: (r) => r.householdCode },
    { key: 'head',    label: 'Chủ hộ · Địa chỉ', render: (r) => (
      <div className="cell-2l"><b>{r.headName}</b><i>{r.address}, {r.ward}, {r.district}</i></div>
    )},
    { key: 'cnt',     label: 'Thành viên', mono: true, width: 100, render: (r) => `${r.memberCount} người` },
    { key: 'risk',    label: 'Rủi ro', width: 100, render: (r) => (
      <span className={`chip ${RISK_TONE[r.riskLevel] ?? 'info'}`}>
        {RISK_LABEL[r.riskLevel] ?? r.riskLevel}
      </span>
    )},
    { key: 'flags',   label: 'Đối tượng', width: 180, render: (r) => (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {r.hasElderlyMember && <span className="chip warn">NCT</span>}
        {r.hasChildUnder5   && <span className="chip warn">Trẻ &lt;5</span>}
        {r.hasPregnant      && <span className="chip warn">Thai</span>}
        {r.hasChronicDisease && <span className="chip crit">Mạn tính</span>}
      </div>
    )},
    { key: 'team',    label: 'Đội', render: (r) => r.assignedTeamName || '—' },
    { key: 'last',    label: 'Thăm gần', mono: true, width: 100, render: (r) => fmtDMY(r.lastVisitDate) },
    { key: 'st',      label: 'TT', width: 120, render: (r) => {
      const k = hhStatus(r.status);
      const t = HH_TABS.find((x) => x.v === k);
      return <StatusBadge tone={t?.tone} dot>{t?.l}</StatusBadge>;
    }},
  ];
  const hhKpis = (rows: Household[]): KpiItem[] => {
    const high = rows.filter((r) => r.riskLevel === 'High' || r.riskLevel === 'VeryHigh').length;
    const overdue = rows.filter((r) => r.nextVisitDate && dayjs(r.nextVisitDate).isBefore(dayjs(), 'day')).length;
    return [
      { lbl: 'Tổng hộ', val: rows.length },
      { lbl: 'Tổng người', val: rows.reduce((s, r) => s + (r.memberCount || 0), 0), sub: 'thành viên' },
      { lbl: 'Rủi ro cao', val: high, tone: 'crit' },
      { lbl: 'Quá hạn thăm', val: overdue, tone: 'warn' },
      { lbl: 'Có NCT', val: rows.filter((r) => r.hasElderlyMember).length, tone: 'warn' },
      { lbl: 'Có thai phụ', val: rows.filter((r) => r.hasPregnant).length, tone: 'warn' },
    ];
  };

  // ── NCD filtered ──
  const ncdFiltered = useMemo(() => {
    const s = ncdSearch.toLowerCase();
    return ncdRows.filter((r) => {
      if (ncdStab !== 'all' && ncdStatus(r.status) !== ncdStab) return false;
      if (!s) return true;
      return [r.patientName, r.patientCode, r.screenerName].some((f) => (f ?? '').toLowerCase().includes(s));
    });
  }, [ncdRows, ncdSearch, ncdStab]);
  const ncdPages = Math.max(1, Math.ceil(ncdFiltered.length / PER));
  const ncdCounts = useTabCounts(ncdRows, NCD_STATUS_TABS, (r) => ncdStatus(r.status));

  const ncdCols: ColumnDef<NcdScreening>[] = [
    { key: 'pat',   label: 'Đối tượng', render: (r) => (
      <div className="cell-2l"><b>{r.patientName}</b><i className="mono">{r.patientCode}</i></div>
    )},
    { key: 'date',  label: 'Ngày SL', mono: true, width: 100, render: (r) => fmtDMY(r.screeningDate) },
    { key: 'bp',    label: 'Huyết áp', mono: true, width: 120, render: (r) => (
      <span>
        <b>{r.systolicBP}/{r.diastolicBP}</b>{' '}
        <StatusBadge tone={BP_TONE[r.bpClassification] ?? 'ok'} dot>
          {BP_LABEL[r.bpClassification] ?? r.bpClassification}
        </StatusBadge>
      </span>
    )},
    { key: 'bmi',   label: 'BMI', mono: true, width: 70, render: (r) => r.bmi?.toFixed(1) ?? '—' },
    { key: 'glu',   label: 'Đường huyết', render: (r) => r.glucoseClassification
        ? <StatusBadge tone={r.glucoseClassification === 'Normal' ? 'ok' : 'warn'}>{GLU_LABEL[r.glucoseClassification]}</StatusBadge>
        : <span style={{ color: 'var(--t-3)' }}>—</span>
    },
    { key: 'cvd',   label: 'CVD Risk', mono: true, width: 80, render: (r) => (
      <StatusBadge tone={CVD_TONE(r)}>{r.cvdRiskLevel}</StatusBadge>
    )},
    { key: 'fu',    label: 'Theo dõi', width: 90, render: (r) =>
      r.followUpRequired
        ? <span className="chip warn">Có · {fmtDMY(r.followUpDate)}</span>
        : <span style={{ color: 'var(--t-3)' }}>Không</span>
    },
    { key: 'st',    label: 'TT', width: 130, render: (r) => {
      const sk = ncdStatus(r.status);
      const t = NCD_STATUS_TABS.find((x) => x.v === sk);
      return <StatusBadge tone={t?.tone as 'ok' | 'warn' | 'crit' | 'info' | undefined}>{t?.l}</StatusBadge>;
    }},
  ];

  // ── Teams filtered ──
  const teamsFiltered = useMemo(() => {
    const s = teamSearch.toLowerCase();
    return teams.filter((t) => !s || [t.teamName, t.leaderName, t.wardAssigned].some(
      (f) => (f ?? '').toLowerCase().includes(s),
    ));
  }, [teams, teamSearch]);
  const teamCols: ColumnDef<CommunityTeam>[] = [
    { key: 'code',   label: 'Mã đội', mono: true, width: 120, render: (r) => r.teamCode },
    { key: 'name',   label: 'Tên đội', render: (r) => r.teamName },
    { key: 'leader', label: 'Đội trưởng', render: (r) => r.leaderName },
    { key: 'ward',   label: 'Phụ trách', render: (r) => r.wardAssigned },
    { key: 'cnt',    label: 'Thành viên', mono: true, width: 100, render: (r) => `${r.memberCount} người` },
    { key: 'hh',     label: 'Hộ đang TH', mono: true, width: 100, render: (r) => r.activeHouseholds },
    { key: 'cov',    label: 'Bao phủ', mono: true, width: 90, render: (r) => (
      <StatusBadge tone={r.visitCoverage >= 80 ? 'ok' : r.visitCoverage >= 50 ? 'warn' : 'crit'}>
        {r.visitCoverage}%
      </StatusBadge>
    )},
    { key: 'st',     label: 'TT', width: 110, render: (r) => (
      <StatusBadge tone={r.status === 0 ? 'ok' : 'info'}>{r.status === 0 ? 'Hoạt động' : 'Tạm ngưng'}</StatusBadge>
    )},
  ];

  return (
    <div>
      <TopTabs<Tab>
        tab={tab}
        setTab={setTab}
        tabs={TABS}
        actions={
          <Btn
            icon="refresh"
            onClick={tab === 'ncd' ? loadNcd : tab === 'teams' ? loadTeams : undefined}
          />
        }
      />
      <div style={{ paddingTop: 12 }}>

        {/* ── TAB 1: Hộ gia đình ── */}
        {tab === 'households' && (
          <SimpleV2Page<Household>
            title=""
            load={() => searchHouseholds()}
            rowKey={(r) => r.id}
            columns={hhCols}
            searchPlaceholder="Tìm chủ hộ / mã hộ / địa chỉ…"
            searchOf={(r) => `${r.headName} ${r.householdCode} ${r.address} ${r.ward}`}
            statusTabs={HH_TABS as unknown as StatusTab<string>[]}
            statusOf={(r) => hhStatus(r.status)}
            filters={[{
              key: 'risk', placeholder: '▾ Mức rủi ro',
              options: Object.entries(RISK_LABEL).map(([v, l]) => ({ v, l })),
              valueOf: (r) => r.riskLevel,
            }]}
            kpis={hhKpis}
            pageSize={20}
            emptyMessage="Chưa có hộ gia đình"
            headerActions={(reload) => {
              hhReloadRef.current = reload;
              return (
                <Btn variant="primary" icon="plus" onClick={() => { setHhCrudInit(null); setHhCrudOpen(true); }}>
                  Thêm hộ gia đình
                </Btn>
              );
            }}
            rowActions={(r, reload) => {
              hhReloadRef.current = reload;
              return (
                <div className="ab-actions">
                  <ActBtn ic="edit" title="Sửa hộ gia đình" onClick={() => {
                    // select Có/Không dùng giá trị chuỗi 'true'/'false' → chuyển boolean của BE sang chuỗi
                    const init: Record<string, unknown> = { ...r, province: undefined };
                    HH_BOOL_KEYS.forEach((k) => { init[k] = String(!!r[k]); });
                    setHhCrudInit(init);
                    setHhCrudOpen(true);
                  }} />
                </div>
              );
            }}
            drawerTitle={(r) => `${r.headName} · ${r.householdCode}`}
            drawerSub={(r) => `${r.memberCount} thành viên · ${r.ward}, ${r.district}`}
            drawer={(r) => (
              <>
                <DrSec title="Thông tin hộ">
                  <DrField lbl="Mã hộ"><span className="mono" style={{ color: 'var(--a-cy)' }}>{r.householdCode}</span></DrField>
                  <DrField lbl="Chủ hộ"><b>{r.headName}</b></DrField>
                  <DrField lbl="Địa chỉ">{r.address}, {r.ward}, {r.district}, {r.province}</DrField>
                  {r.phone && <DrField lbl="Điện thoại"><span className="mono">{r.phone}</span></DrField>}
                  <DrField lbl="Số thành viên"><b>{r.memberCount} người</b></DrField>
                  <DrField lbl="Mức rủi ro">
                    <span className={`chip ${RISK_TONE[r.riskLevel] ?? 'info'}`}>{RISK_LABEL[r.riskLevel] ?? r.riskLevel}</span>
                  </DrField>
                </DrSec>
                <DrSec title="Đối tượng đặc biệt">
                  <DrField lbl="">
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {r.hasElderlyMember  && <span className="chip warn">Người cao tuổi</span>}
                      {r.hasChildUnder5    && <span className="chip warn">Trẻ dưới 5 tuổi</span>}
                      {r.hasPregnant       && <span className="chip warn">Phụ nữ mang thai</span>}
                      {r.hasChronicDisease && <span className="chip crit">Bệnh mạn tính</span>}
                      {!r.hasElderlyMember && !r.hasChildUnder5 && !r.hasPregnant && !r.hasChronicDisease &&
                        <span style={{ color: 'var(--t-3)' }}>Không có</span>}
                    </div>
                  </DrField>
                </DrSec>
                <DrSec title="Thăm hộ">
                  <DrField lbl="Đội phụ trách">{r.assignedTeamName || '—'}</DrField>
                  <DrField lbl="Thăm gần nhất">{fmtDMY(r.lastVisitDate)}</DrField>
                  <DrField lbl="Thăm tiếp">{fmtDMY(r.nextVisitDate)}</DrField>
                </DrSec>
                {r.notes && <DrSec title="Ghi chú"><DrField lbl="">{r.notes}</DrField></DrSec>}
              </>
            )}
          />
        )}

        {/* #352: modal tạo/sửa hộ gia đình — dùng đúng HH_FIELDS vốn đã khai báo mà chưa ai gắn */}
        <CrudModal
          open={hhCrudOpen}
          onClose={() => { setHhCrudOpen(false); setHhCrudInit(null); }}
          title={hhCrudInit ? 'Sửa hộ gia đình' : 'Thêm hộ gia đình'}
          fields={hhFields}
          initial={hhCrudInit ?? undefined}
          size="lg"
          onSubmit={async (v) => {
            const payload = {
              ...v,
              memberCount: v.memberCount ? Number(v.memberCount) : 0,
              assignedTeamId: v.assignedTeamId || undefined,
              status: v.status != null && v.status !== '' ? Number(v.status) : undefined,
              hasElderlyMember: v.hasElderlyMember === 'true' || v.hasElderlyMember === true,
              hasChildUnder5: v.hasChildUnder5 === 'true' || v.hasChildUnder5 === true,
              hasPregnant: v.hasPregnant === 'true' || v.hasPregnant === true,
              hasChronicDisease: v.hasChronicDisease === 'true' || v.hasChronicDisease === true,
            } as unknown as Partial<Household>;
            const id = (hhCrudInit as { id?: string } | null)?.id;
            if (id) { await updateHousehold(id, payload); tk('Đã cập nhật hộ gia đình'); }
            else { await createHousehold(payload); tk('Đã thêm hộ gia đình'); }
            setHhCrudInit(null);
            hhReloadRef.current?.();
          }}
        />

        {/* ── TAB 2: Sàng lọc NCD ── */}
        {tab === 'ncd' && (
          <div>
            <KpiStrip items={[
              { lbl: 'Tổng SL', val: ncdRows.length },
              { lbl: 'THA phát hiện', val: ncdRows.filter((r) => r.bpClassification !== 'Normal').length, tone: 'warn' },
              { lbl: 'ĐTĐ phát hiện', val: ncdRows.filter((r) => r.glucoseClassification === 'Diabetes').length, tone: 'crit' },
              { lbl: 'Thừa cân/Béo phì', val: ncdRows.filter((r) => (r.bmi ?? 0) >= 25).length, tone: 'warn' },
              { lbl: 'CVD nguy cơ cao', val: ncdRows.filter((r) => r.cvdRiskLevel === 'High' || r.cvdRiskLevel === 'VeryHigh').length, tone: 'crit' },
              { lbl: 'Cần theo dõi', val: ncdRows.filter((r) => r.followUpRequired).length, tone: 'info' },
            ]} />
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <SearchBox value={ncdSearch} onChange={setNcdSearch} placeholder="Tìm tên / mã đối tượng…" />
              <Btn variant="primary" icon="plus" onClick={() => setNcdCreate(true)}>Sàng lọc mới</Btn>
              <Btn icon="refresh" onClick={loadNcd} loading={ncdLoad} />
            </div>
            <StatusTabs
              value={ncdStab}
              onChange={(v) => { setNcdStab(v); setNcdPage(0); }}
              tabs={NCD_STATUS_TABS}
              counts={ncdCounts}
            />
            <DataTable<NcdScreening>
              columns={ncdCols}
              data={ncdFiltered}
              page={ncdPage}
              perPage={PER}
              onSortChange={() => setNcdPage(0)}
              rowKey={(r) => r.id}
              onRowClick={setNcdSel}
              loading={ncdLoad}
              empty="Chưa có kết quả sàng lọc"
            />
            <Pager
              page={ncdPage}
              totalPages={ncdPages}
              setPage={(p) => setNcdPage(typeof p === 'function' ? p(ncdPage) : p)}
              total={ncdFiltered.length}
              perPage={PER}
            />
            <DrawerShell
              open={!!ncdSel}
              onClose={() => setNcdSel(null)}
              title={ncdSel?.patientName ?? ''}
              sub={ncdSel ? `Sàng lọc NCD · ${fmtDMY(ncdSel.screeningDate)}` : ''}
            >
              {ncdSel && (
                <>
                  <DrSec title="Đối tượng">
                    <DrField lbl="Họ tên">{ncdSel.patientName}</DrField>
                    {ncdSel.patientCode && <DrField lbl="Mã"><span className="mono">{ncdSel.patientCode}</span></DrField>}
                    <DrField lbl="Giới tính">{ncdSel.gender === 1 ? 'Nam' : 'Nữ'}</DrField>
                    <DrField lbl="Ngày sinh">{fmtDMY(ncdSel.dateOfBirth)}</DrField>
                    <DrField lbl="Người SL">{ncdSel.screenerName || '—'}</DrField>
                  </DrSec>
                  <DrSec title="Kết quả đo">
                    <DrField lbl="Huyết áp">
                      <b>{ncdSel.systolicBP}/{ncdSel.diastolicBP} mmHg</b>{' '}
                      <StatusBadge tone={BP_TONE[ncdSel.bpClassification] ?? 'ok'}>
                        {BP_LABEL[ncdSel.bpClassification] ?? ncdSel.bpClassification}
                      </StatusBadge>
                    </DrField>
                    {ncdSel.fastingGlucose != null && (
                      <DrField lbl="Đường huyết lúc đói">
                        <b>{ncdSel.fastingGlucose} mmol/L</b>{' '}
                        {ncdSel.glucoseClassification && (
                          <StatusBadge tone={ncdSel.glucoseClassification === 'Normal' ? 'ok' : 'warn'}>
                            {GLU_LABEL[ncdSel.glucoseClassification]}
                          </StatusBadge>
                        )}
                      </DrField>
                    )}
                    <DrField lbl="BMI">
                      <b>{ncdSel.bmi?.toFixed(1)}</b>{' '}
                      <StatusBadge tone={ncdSel.bmi >= 25 ? 'warn' : 'ok'}>{ncdSel.bmiClassification}</StatusBadge>
                    </DrField>
                  </DrSec>
                  <DrSec title="Nguy cơ tim mạch">
                    <DrField lbl="Điểm CVD"><b>{ncdSel.cvdRiskScore}</b></DrField>
                    <DrField lbl="Mức nguy cơ"><StatusBadge tone={CVD_TONE(ncdSel)}>{ncdSel.cvdRiskLevel}</StatusBadge></DrField>
                    <DrField lbl="Hút thuốc">{ncdSel.isSmoker ? 'Có' : 'Không'}</DrField>
                    <DrField lbl="Rượu bia">{ncdSel.alcoholUse}</DrField>
                    <DrField lbl="Tiền sử gia đình CVD">{ncdSel.familyHistoryCVD ? 'Có' : 'Không'}</DrField>
                  </DrSec>
                  {(ncdSel.followUpRequired || ncdSel.referralRequired || ncdSel.followUpNotes) && (
                    <DrSec title="Theo dõi">
                      {ncdSel.followUpDate && <DrField lbl="Tái khám">{fmtDMY(ncdSel.followUpDate)}</DrField>}
                      {ncdSel.followUpNotes && <DrField lbl="Kết luận">{ncdSel.followUpNotes}</DrField>}
                      {ncdSel.referralRequired && (
                        <DrField lbl="Chuyển tuyến"><b style={{ color: 'var(--s-crit)' }}>Có{ncdSel.referralFacility ? ` — ${ncdSel.referralFacility}` : ''}</b></DrField>
                      )}
                    </DrSec>
                  )}
                </>
              )}
            </DrawerShell>
            <CrudModal
              open={ncdCreate}
              onClose={() => setNcdCreate(false)}
              title="Sàng lọc NCD"
              fields={ncdFields}
              size="lg"
              onSubmit={async (v) => {
                await createNcdScreening({
                  ...v,
                  systolicBP: Number(v.systolicBP) || 0,
                  diastolicBP: Number(v.diastolicBP) || 0,
                  fastingGlucose: v.fastingGlucose ? Number(v.fastingGlucose) : undefined,
                  height: Number(v.height) || 0,
                  weight: Number(v.weight) || 0,
                  isSmoker: v.isSmoker === 'true',
                  followUpRequired: v.followUpRequired === 'true',
                  referralRequired: !!v.referralRequired,
                } as Partial<NcdScreening> & { height?: number; weight?: number; referralRequired?: boolean });
                tk('Đã lưu kết quả sàng lọc');
                loadNcd();
              }}
            />
          </div>
        )}

        {/* ── TAB 3: Đội y tế cộng đồng ── */}
        {tab === 'teams' && (
          <div>
            <KpiStrip items={[
              { lbl: 'Tổng đội', val: teams.length },
              { lbl: 'Hoạt động', val: teams.filter((t) => t.status === 0).length, tone: 'ok' },
              { lbl: 'Bao phủ TB', val: teams.length
                ? `${Math.round(teams.reduce((s, t) => s + (t.visitCoverage || 0), 0) / teams.length)}%`
                : '—', tone: 'info' },
              { lbl: 'Hộ đang TH', val: teams.reduce((s, t) => s + (t.activeHouseholds || 0), 0) },
            ]} />
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <SearchBox value={teamSearch} onChange={setTeamSearch} placeholder="Tìm tên đội / đội trưởng…" />
              <Btn variant="primary" icon="plus" onClick={() => setTeamCreate(true)}>Thêm đội</Btn>
              <Btn icon="refresh" onClick={loadTeams} loading={teamsLoad} />
            </div>
            <DataTable<CommunityTeam>
              columns={teamCols}
              data={teamsFiltered}
              rowKey={(r) => r.id}
              loading={teamsLoad}
              actions={(r) => (
                <div className="ab-actions">
                  <ActBtn ic="edit" title="Sửa đội / tạm ngưng" onClick={() => setTeamEdit(r)} />
                </div>
              )}
              empty="Chưa có đội y tế"
            />
            <CrudModal
              open={!!teamEdit}
              onClose={() => setTeamEdit(null)}
              title="Cập nhật đội y tế"
              sub={teamEdit ? `${teamEdit.teamCode} · ${teamEdit.teamName}` : undefined}
              fields={TEAM_EDIT_FIELDS}
              initial={teamEdit ? { ...teamEdit } as unknown as Record<string, unknown> : null}
              size="md"
              onSubmit={async (v) => {
                if (!teamEdit) return;
                await updateTeam(teamEdit.id, {
                  teamName: v.teamName, leaderName: v.leaderName, wardAssigned: v.wardAssigned,
                  memberCount: v.memberCount != null ? Number(v.memberCount) : undefined,
                  status: v.status != null ? Number(v.status) : undefined,
                } as Partial<CommunityTeam>);
                tk('Đã cập nhật đội y tế');
                setTeamEdit(null);
                loadTeams();
              }}
            />
            <CrudModal
              open={teamCreate}
              onClose={() => setTeamCreate(false)}
              title="Thêm đội y tế"
              fields={TEAM_FIELDS}
              size="md"
              onSubmit={async (v) => {
                await createTeam(v as Partial<CommunityTeam>);
                tk('Đã tạo đội y tế');
                loadTeams();
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityHealthV2;
