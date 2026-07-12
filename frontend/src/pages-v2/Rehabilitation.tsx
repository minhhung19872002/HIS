import React, { useEffect, useMemo, useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { DatePicker, TimePicker, Select, Input, InputNumber, Radio } from 'antd';
import {
  getReferrals, acceptReferral, printReferral,
  getSessionsByDate, createSession, completeSession, cancelSession, markNoShow,
  getActiveTreatmentPlans, createAssessment, createTreatmentPlan,
} from '../modules/rehabilitation/api/rehabilitation';
import type {
  TreatmentSessionDto, TreatmentPlanDto,
  CreateTreatmentSessionDto, CompleteTreatmentSessionDto,
  CreateFunctionalAssessmentDto, CreateTreatmentPlanDto,
} from '../modules/rehabilitation/api/rehabilitation';
import {
  KpiStrip, TopTabs, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn, Btn,
  DrawerShell, DrSec, DrField, CrudModal, ModalShell, tk, ti, tw, te, Ico,
  type ColumnDef, type CrudFieldCfg,
} from './_v2kit';

type Row = {
  id: string;
  referralCode?: string;
  patientId?: string;
  patientName?: string;
  patientCode?: string;
  patientAge?: number;
  patientGender?: string;
  rehabType?: string;
  rehabTypeName?: string;
  diagnosis?: string;
  primaryDiagnosis?: string;
  diagnosisIcd?: string;
  diagnosisICD?: string;
  sourceDepartment?: string;
  referringDoctor?: string;
  referringDepartmentName?: string;
  referringDoctorName?: string;
  priority?: number;
  priorityName?: string;
  urgency?: string;
  rehabGoals?: string;
  goals?: string;
  precautions?: string;
  contraindications?: string;
  referralReason?: string;
  specificRequests?: string;
  status?: string | number;
  statusName?: string;
  referralDate?: string;
  acceptedDate?: string;
};

const URGENCY_LABEL: Record<string, string> = { Routine: 'Thường', Urgent: 'Khẩn', Stat: 'Cấp cứu' };
const URGENCY_TONE: Record<string, 'ok' | 'info' | 'warn' | 'crit'> = { Routine: 'ok', Urgent: 'warn', Stat: 'crit' };

type SKey = 'pending' | 'accepted' | 'progress' | 'completed' | 'cancelled';
const STATUS_TABS = [
  { v: 'pending' as SKey,   l: 'Chờ',           tone: 'warn' as const },
  { v: 'accepted' as SKey,  l: 'Chấp nhận',     tone: 'info' as const },
  { v: 'progress' as SKey,  l: 'Đang điều trị', tone: 'info' as const },
  { v: 'completed' as SKey, l: 'Hoàn tất',      tone: 'ok' as const },
  { v: 'cancelled' as SKey, l: 'Hủy/Từ chối',   tone: 'crit' as const },
];

const sKey = (st: string | number | undefined): SKey => {
  const k = String(st || '').toLowerCase();
  if (k === 'pending' || k === '0') return 'pending';
  if (k === 'accepted' || k === '1') return 'accepted';
  if (k === 'inprogress' || k === '2') return 'progress';
  if (k === 'completed' || k === '3') return 'completed';
  return 'cancelled';
};

// ──── Điều trị: loại PHCN dùng cho form Lập KH ────
const THERAPY_TYPES: { v: string; l: string }[] = [
  { v: 'PT', l: 'PT - Vật lý trị liệu' },
  { v: 'OT', l: 'OT - Hoạt động trị liệu' },
  { v: 'ST', l: 'ST - Ngôn ngữ trị liệu' },
  { v: 'Cardiac', l: 'Tim mạch' },
  { v: 'Pulmonary', l: 'Hô hấp' },
];

const PLAN_FIELDS: CrudFieldCfg[] = [
  { key: 'rehabType', label: 'Loại PHCN', type: 'select', required: true, options: THERAPY_TYPES.map((t) => ({ value: t.v, label: t.l })) },
  { key: 'frequency', label: 'Tần suất', type: 'select', options: [
    { value: 'Hàng ngày', label: 'Hàng ngày' }, { value: '3 lần/tuần', label: '3 lần/tuần' }, { value: '2 lần/tuần', label: '2 lần/tuần' }] },
  { key: 'duration', label: 'Thời lượng/buổi', placeholder: 'VD: 45 phút' },
  { key: 'plannedSessions', label: 'Tổng số buổi', type: 'number', required: true },
  { key: 'goals', label: 'Mục tiêu PHCN', type: 'textarea', placeholder: 'VD: Cải thiện khả năng đi lại, tăng độ độc lập sinh hoạt…' },
];

// ──── Barthel Index (đánh giá chức năng) ────
const BARTHEL_ITEMS: { key: string; label: string; options: number[] }[] = [
  { key: 'feeding', label: '1. Ăn uống', options: [0, 5, 10] },
  { key: 'bathing', label: '2. Tắm', options: [0, 5] },
  { key: 'grooming', label: '3. Vệ sinh cá nhân', options: [0, 5] },
  { key: 'dressing', label: '4. Mặc quần áo', options: [0, 5, 10] },
  { key: 'bowels', label: '5. Đại tiện', options: [0, 5, 10] },
  { key: 'bladder', label: '6. Tiểu tiện', options: [0, 5, 10] },
  { key: 'toilet', label: '7. Đi toilet', options: [0, 5, 10] },
  { key: 'transfer', label: '8. Di chuyển', options: [0, 5, 10, 15] },
  { key: 'mobility', label: '9. Đi lại', options: [0, 5, 10, 15] },
  { key: 'stairs', label: '10. Leo cầu thang', options: [0, 5, 10] },
];

// ──── Lịch buổi tập ────
type SessStatusKey = 'scheduled' | 'active' | 'completed' | 'cancelled' | 'noshow';
const SESS_STATUS_TABS = [
  { v: 'scheduled' as SessStatusKey, l: 'Đã lên lịch', tone: 'info' as const },
  { v: 'active' as SessStatusKey,    l: 'Đang tập',    tone: 'warn' as const },
  { v: 'completed' as SessStatusKey, l: 'Hoàn thành',  tone: 'ok' as const },
  { v: 'cancelled' as SessStatusKey, l: 'Đã hủy',      tone: 'crit' as const },
  { v: 'noshow' as SessStatusKey,    l: 'Không đến',   tone: 'crit' as const },
];

const sessKey = (st: string | number | undefined): SessStatusKey => {
  const k = String(st ?? '').toLowerCase();
  if (k === 'completed' || k === '2') return 'completed';
  if (k === 'cancelled' || k === '3') return 'cancelled';
  if (k === 'noshow' || k === 'no-show' || k === '4') return 'noshow';
  if (k === 'active' || k === 'inprogress' || k === '1') return 'active';
  return 'scheduled';
};

const SESSION_COMPLETE_FIELDS: CrudFieldCfg[] = [
  { key: 'postPainLevel', label: 'Mức đau sau buổi (0-10)', type: 'number' },
  { key: 'cooperationScore', label: 'Mức hợp tác (1-5)', type: 'number' },
  { key: 'progressNotes', label: 'Ghi chú buổi tập', type: 'textarea', placeholder: 'Nhận xét, diễn biến…' },
];

// ──── Bài tập mẫu (tham khảo, không qua API) ────
const EXERCISE_GROUPS: { title: string; items: string[] }[] = [
  { title: 'Vật lý trị liệu (PT)', items: ['Tập vận động khớp', 'Tăng cường cơ lực', 'Tập đi, thăng bằng', 'Điện trị liệu', 'Siêu âm trị liệu', 'Kéo giãn'] },
  { title: 'Hoạt động trị liệu (OT)', items: ['Tập sinh hoạt hàng ngày (ADL)', 'Vận động tinh', 'Huấn luyện tay', 'Sử dụng dụng cụ hỗ trợ', 'Cải tiến môi trường'] },
  { title: 'Ngôn ngữ trị liệu (ST)', items: ['Tập nói', 'Tập nuốt', 'Trị liệu giao tiếp', 'Tập nghe hiểu', 'Đọc, viết'] },
];

const PER = 18;

type MainTab = 'referrals' | 'schedule' | 'exercises';
const TOP_TABS: { v: MainTab; l: string; ic?: string }[] = [
  { v: 'referrals', l: 'Chỉ định PHCN', ic: 'file-text' },
  { v: 'schedule',  l: 'Lịch buổi tập', ic: 'calendar' },
  { v: 'exercises', l: 'Bài tập mẫu',   ic: 'activity' },
];

const RehabilitationV2: React.FC = () => {
  const [tab, setTab] = useState<MainTab>('referrals');
  const navigate = useNavigate();

  // ══════════════════════ Tab: Chỉ định PHCN (referrals) ══════════════════════
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fType, setFType] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<Row | null>(null);

  const accept = async (r: Row) => {
    try {
      await acceptReferral(r.id);
      tk(`Đã chấp nhận ${r.referralCode || ''}`.trim());
      setSel(null);
      load();
    } catch { ti('Chấp nhận thất bại'); }
  };

  const load = async () => {
    setLoading(true);
    try {
      const r = await getReferrals({ keyword: search, pageSize: 200 });
      const body = r.data as unknown;
      const list = (Array.isArray(body) ? body : ((body as { items?: Row[] })?.items || [])) as Row[];
      setItems(list);
    } catch { ti('Không tải được giấy giới thiệu PHCN'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const types = useMemo(() => {
    const set = new Set(items.map((r) => r.rehabTypeName || r.rehabType).filter(Boolean) as string[]);
    return Array.from(set).map((v) => ({ v, l: v }));
  }, [items]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    STATUS_TABS.forEach((s) => { c[s.v] = items.filter((r) => sKey(r.status) === s.v).length; });
    return c;
  }, [items]);

  const dx = (r: Row) => r.diagnosis || r.primaryDiagnosis || '';
  const dxIcd = (r: Row) => r.diagnosisIcd || r.diagnosisICD || '';
  const dept = (r: Row) => r.referringDepartmentName || r.sourceDepartment || '';
  const doc = (r: Row) => r.referringDoctorName || r.referringDoctor || '';
  const urgencyText = (r: Row) => {
    if (r.priority) return r.priority >= 3 ? 'Stat' : (r.priority === 2 ? 'Urgent' : 'Routine');
    return r.urgency || 'Routine';
  };

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (stab !== 'all' && sKey(r.status) !== stab) return false;
      if (fType && (r.rehabTypeName || r.rehabType) !== fType) return false;
      if (!k) return true;
      return [r.referralCode, r.patientName, r.patientCode, dx(r), dxIcd(r)]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  // ── Đánh giá chức năng (Barthel Index) ──
  const [assessTarget, setAssessTarget] = useState<Row | null>(null);
  const [assessScores, setAssessScores] = useState<Record<string, number>>({});
  const [assessPain, setAssessPain] = useState<number | undefined>(undefined);
  const [assessNotes, setAssessNotes] = useState('');
  const [assessSaving, setAssessSaving] = useState(false);
  const assessTotal = useMemo(() => Object.values(assessScores).reduce((s, v) => s + v, 0), [assessScores]);

  const openAssess = (r: Row) => {
    setAssessTarget(r); setAssessScores({}); setAssessPain(undefined); setAssessNotes('');
  };

  const submitAssess = async () => {
    if (!assessTarget) return;
    const target = assessTarget;
    const total = assessTotal;
    setAssessSaving(true);
    try {
      const dto: CreateFunctionalAssessmentDto = {
        referralId: target.id,
        assessmentType: 'Initial',
        chiefComplaint: dx(target),
        painLevel: assessPain,
        barthelIndex: total,
        problemList: assessNotes.trim() ? [assessNotes.trim()] : [],
        functionalLimitations: [],
        rehabPotential: total >= 60 ? 'Good' : total >= 30 ? 'Fair' : 'Poor',
        prognosis: total >= 60 ? 'Good' : total >= 30 ? 'Fair' : 'Guarded',
        goals: [{
          goalType: 'LTG', category: 'Functional',
          description: `Nâng điểm Barthel lên ${Math.min(total + 40, 100)}`, status: 'Active',
        }],
        recommendations: assessNotes.trim() || '',
      };
      await createAssessment(dto);
      tk('Đã lưu đánh giá chức năng');
      setAssessTarget(null);
      openPlan(target);
      load();
    } catch { te('Không thể lưu đánh giá. Vui lòng thử lại.'); }
    finally { setAssessSaving(false); }
  };

  // ── Lập kế hoạch PHCN ──
  const [planTarget, setPlanTarget] = useState<Row | null>(null);
  const [planCrudOpen, setPlanCrudOpen] = useState(false);
  const [planCrudInit, setPlanCrudInit] = useState<Record<string, unknown> | null>(null);

  const openPlan = (r: Row) => {
    setPlanTarget(r);
    setPlanCrudInit({ rehabType: r.rehabType || 'PT', frequency: '3 lần/tuần', duration: '45 phút', plannedSessions: 20 });
    setPlanCrudOpen(true);
  };

  const cols: ColumnDef<Row>[] = [
    { key: 'code', label: 'Mã GT', code: true, render: (r) => r.referralCode || '—' },
    { key: 'pt', label: 'Bệnh nhân', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.patientName || '—'}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>
          {r.patientCode || '—'}
          {r.patientAge !== undefined && r.patientAge > 0 && ` · ${r.patientAge}t`}
        </div>
      </div>
    ) },
    { key: 'type', label: 'Loại PHCN', render: (r) => (
      <StatusBadge tone="info">{r.rehabTypeName || r.rehabType || '—'}</StatusBadge>
    ) },
    { key: 'dx', label: 'Chẩn đoán', render: (r) => (
      <div>
        <div style={{ fontSize: 'var(--fs-sm)' }}>{dx(r) || '—'}</div>
        {dxIcd(r) && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{dxIcd(r)}</div>}
      </div>
    ) },
    { key: 'dept', label: 'Khoa GT', render: (r) => dept(r) || '—' },
    { key: 'date', label: 'Ngày GT', mono: true, render: (r) => r.referralDate ? dayjs(r.referralDate).format('DD/MM/YYYY') : '—' },
    { key: 'pri', label: 'Ưu tiên', render: (r) => {
      const u = urgencyText(r);
      return <StatusBadge tone={URGENCY_TONE[u] || 'info'} dot>{URGENCY_LABEL[u] || u}</StatusBadge>;
    } },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === sKey(r.status));
      return <StatusBadge tone={t?.tone || 'info'} dot>{r.statusName || t?.l || '—'}</StatusBadge>;
    } },
  ];

  const actions = (r: Row) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      {sKey(r.status) === 'pending' && (
        <ActBtn ic="check" title="Chấp nhận" onClick={() => accept(r)} />
      )}
      {sKey(r.status) !== 'pending' && sKey(r.status) !== 'cancelled' && <>
        <ActBtn ic="stethoscope" title="Đánh giá chức năng" onClick={() => openAssess(r)} />
        <ActBtn ic="file-text" title="Lập KH điều trị" onClick={() => openPlan(r)} />
      </>}
    </div>
  );

  // ══════════════════════ Tab: Lịch buổi tập (schedule) ══════════════════════
  const [scheduleDate, setScheduleDate] = useState<Dayjs>(dayjs());
  const [sessions, setSessions] = useState<TreatmentSessionDto[]>([]);
  const [sessLoading, setSessLoading] = useState(false);
  const [sessStab, setSessStab] = useState<SessStatusKey | 'all'>('all');
  const [sessPage, setSessPage] = useState(0);
  const [selSession, setSelSession] = useState<TreatmentSessionDto | null>(null);
  const [plans, setPlans] = useState<TreatmentPlanDto[]>([]);

  const loadSessions = async () => {
    setSessLoading(true);
    try {
      const r = await getSessionsByDate(scheduleDate.format('YYYY-MM-DD'));
      setSessions(Array.isArray(r.data) ? r.data : []);
    } catch { ti('Không tải được lịch buổi tập'); }
    finally { setSessLoading(false); }
  };

  const loadPlans = async () => {
    try {
      const r = await getActiveTreatmentPlans();
      setPlans(Array.isArray(r.data) ? r.data : []);
    } catch { ti('Không tải được danh sách kế hoạch điều trị'); }
  };

  useEffect(() => { if (tab === 'schedule') { loadSessions(); loadPlans(); } /* eslint-disable-next-line */ }, [tab]);
  useEffect(() => { if (tab === 'schedule') loadSessions(); /* eslint-disable-next-line */ }, [scheduleDate]);

  const sessCounts = useMemo(() => {
    const c: Record<string, number> = { all: sessions.length };
    SESS_STATUS_TABS.forEach((s) => { c[s.v] = sessions.filter((r) => sessKey(r.status) === s.v).length; });
    return c;
  }, [sessions]);

  const sessFiltered = useMemo(
    () => sessions.filter((r) => sessStab === 'all' || sessKey(r.status) === sessStab),
    [sessions, sessStab],
  );
  const sessTotalPages = Math.max(1, Math.ceil(sessFiltered.length / PER));
  const sessPaged = sessFiltered.slice(sessPage * PER, (sessPage + 1) * PER);

  const sessCols: ColumnDef<TreatmentSessionDto>[] = [
    { key: 'time', label: 'Giờ', mono: true, render: (r) => (
      <div>
        <div style={{ fontWeight: 600 }}>{r.startTime}</div>
        {r.duration ? <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.duration} phút</div> : null}
      </div>
    ) },
    { key: 'pt', label: 'Bệnh nhân', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.patientName || '—'}</div>
        {r.sessionNumber ? <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>Buổi #{r.sessionNumber}</div> : null}
      </div>
    ) },
    { key: 'ktv', label: 'KTV', render: (r) => r.therapistName || '—' },
    { key: 'loc', label: 'Địa điểm', render: (r) => r.location || '—' },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const t = SESS_STATUS_TABS.find((x) => x.v === sessKey(r.status));
      return <StatusBadge tone={t?.tone || 'info'} dot>{r.statusName || t?.l || '—'}</StatusBadge>;
    } },
  ];

  // ── Thêm buổi tập ──
  const [sessionFormOpen, setSessionFormOpen] = useState(false);
  const [sfPlanId, setSfPlanId] = useState('');
  const [sfDate, setSfDate] = useState<Dayjs>(dayjs());
  const [sfTime, setSfTime] = useState<Dayjs>(dayjs().hour(8).minute(0));
  const [sfLocation, setSfLocation] = useState('Phòng PHCN');
  const [sfSaving, setSfSaving] = useState(false);

  const openCreateSession = () => {
    setSfPlanId(''); setSfDate(scheduleDate); setSfTime(dayjs().hour(8).minute(0)); setSfLocation('Phòng PHCN');
    setSessionFormOpen(true);
  };

  const submitCreateSession = async () => {
    if (!sfPlanId) { tw('Chọn kế hoạch điều trị'); return; }
    setSfSaving(true);
    try {
      const dto: CreateTreatmentSessionDto = {
        planId: sfPlanId,
        sessionDate: sfDate.format('YYYY-MM-DD'),
        startTime: sfTime.format('HH:mm'),
        location: sfLocation || 'Phòng PHCN',
        patientStatus: 'Stable',
      };
      await createSession(dto);
      tk('Đã thêm buổi tập');
      setSessionFormOpen(false);
      loadSessions();
    } catch { te('Không thể thêm buổi tập. Vui lòng thử lại.'); }
    finally { setSfSaving(false); }
  };

  // ── Hoàn tất buổi tập ──
  const [completeTarget, setCompleteTarget] = useState<TreatmentSessionDto | null>(null);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completeInit, setCompleteInit] = useState<Record<string, unknown> | null>(null);

  const openComplete = (r: TreatmentSessionDto) => {
    setCompleteTarget(r);
    setCompleteInit({ postPainLevel: r.prePainLevel ?? 0, cooperationScore: 5, progressNotes: '' });
    setCompleteOpen(true);
  };

  // ── Huỷ / Không đến ──
  const [cancelTarget, setCancelTarget] = useState<TreatmentSessionDto | null>(null);
  const [cancelKind, setCancelKind] = useState<'cancel' | 'noshow'>('cancel');
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSaving, setCancelSaving] = useState(false);

  const openCancel = (r: TreatmentSessionDto, kind: 'cancel' | 'noshow') => {
    setCancelTarget(r); setCancelKind(kind); setCancelReason('');
  };

  const submitCancel = async () => {
    if (!cancelTarget) return;
    setCancelSaving(true);
    try {
      if (cancelKind === 'noshow') await markNoShow(cancelTarget.id, cancelReason || undefined);
      else await cancelSession(cancelTarget.id, cancelReason || 'Huỷ bởi KTV');
      tk(cancelKind === 'noshow' ? 'Đã đánh dấu không đến' : 'Đã huỷ buổi tập');
      setCancelTarget(null);
      setSelSession(null);
      loadSessions();
    } catch { te('Không thể cập nhật buổi tập. Vui lòng thử lại.'); }
    finally { setCancelSaving(false); }
  };

  const sessActions = (r: TreatmentSessionDto) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSelSession(r)} />
      {(sessKey(r.status) === 'scheduled' || sessKey(r.status) === 'active') && <>
        <ActBtn ic="check" title="Hoàn tất" onClick={() => openComplete(r)} />
        <ActBtn ic="x" title="Huỷ buổi" tone="crit" onClick={() => openCancel(r, 'cancel')} />
        <ActBtn ic="clock" title="Không đến" tone="warn" onClick={() => openCancel(r, 'noshow')} />
      </>}
    </div>
  );

  // ══════════════════════ Render ══════════════════════
  return (
    <div className="ab">
      <TopTabs<MainTab> tab={tab} setTab={setTab} tabs={TOP_TABS} />

      {/* ════════════ TAB: CHỈ ĐỊNH PHCN ════════════ */}
      {tab === 'referrals' && (
        <>
          <KpiStrip items={[
            { lbl: 'Tổng giấy GT', val: items.length, sub: 'tất cả' },
            { lbl: 'Khẩn / Cấp cứu', val: items.filter((r) => urgencyText(r) === 'Urgent' || urgencyText(r) === 'Stat').length, sub: 'cần xếp lịch', tone: 'warn' },
            { lbl: 'Đã chấp nhận', val: counts.accepted || 0, sub: 'đang lập KH', tone: 'info' },
            { lbl: 'Hoàn tất', val: counts.completed || 0, sub: `${Math.round(((counts.completed || 0) / Math.max(1, items.length)) * 100)}%`, tone: 'ok' },
          ]} />

          <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
            <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
              placeholder="Tìm BN / mã GT / chẩn đoán…" />
            <Filter value={fType} onChange={setFType} options={types} placeholder="▾ Loại PHCN" />
            <Btn variant="ghost" onClick={() => { setSearch(''); setFType(''); setStab('all'); }}>
              <Ico name="x" size={12} /> Bỏ lọc
            </Btn>
            <span className="spacer" />
            <Btn variant="ghost" onClick={load}>
              <Ico name="refresh" size={12} /> Làm mới
            </Btn>
            <Btn variant="primary" onClick={() => navigate('/rehabilitation')}>
              <Ico name="plus" size={12} /> Giấy GT
            </Btn>
          </div>

          <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

          <DataTable<Row>
            columns={cols} data={paged} rowKey={(r) => r.id}
            onRowClick={setSel} actions={actions}
            empty={loading ? 'Đang tải…' : 'Chưa có giấy giới thiệu PHCN'}
          />
          <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

          <DrawerShell
            open={!!sel}
            onClose={() => setSel(null)}
            size="lg"
            title={sel ? `Giấy GT ${sel.referralCode || '—'}` : ''}
            sub={sel ? `${sel.patientName || '—'} · ${sel.rehabTypeName || sel.rehabType || '—'}` : ''}
            footer={<>
              <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
              <Btn onClick={async () => {
                if (!sel) return;
                try {
                  const res = await printReferral(sel.id);
                  const url = URL.createObjectURL(res.data as Blob);
                  window.open(url, '_blank');
                } catch {
                  te('Không thể in giấy GT');
                }
              }}>
                <Ico name="print" size={12} /> In giấy GT
              </Btn>
              {sel && sKey(sel.status) === 'pending' && (
                <Btn variant="primary" onClick={() => accept(sel)}>
                  <Ico name="check" size={12} /> Chấp nhận
                </Btn>
              )}
              {sel && sKey(sel.status) !== 'pending' && sKey(sel.status) !== 'cancelled' && <>
                <Btn onClick={() => { const r = sel; setSel(null); openAssess(r); }}>
                  <Ico name="stethoscope" size={12} /> Đánh giá
                </Btn>
                <Btn variant="primary" onClick={() => { const r = sel; setSel(null); openPlan(r); }}>
                  <Ico name="file-text" size={12} /> Lập KH
                </Btn>
              </>}
            </>}
          >
            {sel && <>
              <DrSec title="Bệnh nhân">
                <DrField lbl="Họ tên">{sel.patientName || '—'}</DrField>
                <DrField lbl="Mã BN"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.patientCode || '—'}</span></DrField>
                {sel.patientAge !== undefined && sel.patientAge > 0 && <DrField lbl="Tuổi · GT">{sel.patientAge}t · {sel.patientGender || '—'}</DrField>}
              </DrSec>
              <DrSec title="Yêu cầu PHCN">
                <DrField lbl="Loại">{sel.rehabTypeName || sel.rehabType || '—'}</DrField>
                <DrField lbl="Ưu tiên">
                  <StatusBadge tone={URGENCY_TONE[urgencyText(sel)] || 'info'} dot>
                    {URGENCY_LABEL[urgencyText(sel)] || urgencyText(sel)}
                  </StatusBadge>
                </DrField>
                <DrField lbl="Chẩn đoán">{dx(sel) || '—'}</DrField>
                {dxIcd(sel) && <DrField lbl="Mã ICD"><span style={{ fontFamily: 'var(--font-mono)' }}>{dxIcd(sel)}</span></DrField>}
                <DrField lbl="Mục tiêu">{sel.rehabGoals || sel.goals || '—'}</DrField>
                <DrField lbl="Yêu cầu cụ thể">{sel.specificRequests || sel.referralReason || '—'}</DrField>
                {sel.precautions && <DrField lbl="Lưu ý">{sel.precautions}</DrField>}
              </DrSec>
              <DrSec title="Người giới thiệu">
                <DrField lbl="Khoa GT">{dept(sel) || '—'}</DrField>
                <DrField lbl="BS GT">{doc(sel) || '—'}</DrField>
                {sel.referralDate && <DrField lbl="Ngày GT">{dayjs(sel.referralDate).format('DD/MM/YYYY')}</DrField>}
                {sel.acceptedDate && <DrField lbl="Chấp nhận">{dayjs(sel.acceptedDate).format('DD/MM/YYYY')}</DrField>}
                <DrField lbl="Trạng thái">
                  <StatusBadge tone={STATUS_TABS.find((x) => x.v === sKey(sel.status))?.tone || 'info'} dot>
                    {sel.statusName || STATUS_TABS.find((x) => x.v === sKey(sel.status))?.l || '—'}
                  </StatusBadge>
                </DrField>
              </DrSec>
            </>}
          </DrawerShell>

          {/* Modal: Đánh giá chức năng (Barthel Index) */}
          <ModalShell
            open={!!assessTarget}
            onClose={() => setAssessTarget(null)}
            title="Đánh giá chức năng (Barthel Index)"
            sub={assessTarget ? `${assessTarget.patientName || '—'} · ${dx(assessTarget) || '—'}` : ''}
            size="lg"
            footer={<>
              <Btn variant="ghost" onClick={() => setAssessTarget(null)}>Huỷ</Btn>
              <Btn variant="primary" onClick={submitAssess} disabled={assessSaving}>
                <Ico name="check" size={12} /> {assessSaving ? 'Đang lưu…' : 'Lưu đánh giá'}
              </Btn>
            </>}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-10)' }}>
              {BARTHEL_ITEMS.map((it) => (
                <div key={it.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-12)' }}>
                  <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-1)' }}>{it.label}</span>
                  <Radio.Group
                    size="small"
                    value={assessScores[it.key]}
                    onChange={(e) => setAssessScores((p) => ({ ...p, [it.key]: e.target.value as number }))}
                  >
                    {it.options.map((opt) => <Radio.Button key={opt} value={opt}>{opt}</Radio.Button>)}
                  </Radio.Group>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid var(--line)', fontWeight: 700 }}>
                <span>Tổng điểm Barthel</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{assessTotal} / 100</span>
              </div>
              <FormRow label="Mức độ đau (0-10)">
                <InputNumber min={0} max={10} value={assessPain} onChange={(v) => setAssessPain(v ?? undefined)} style={{ width: '100%' }} />
              </FormRow>
              <FormRow label="Ghi chú / vấn đề">
                <Input.TextArea rows={3} value={assessNotes} onChange={(e) => setAssessNotes(e.target.value)} placeholder="Nhận xét, vấn đề chức năng…" />
              </FormRow>
            </div>
          </ModalShell>

          {/* Modal: Lập kế hoạch PHCN */}
          <CrudModal
            open={planCrudOpen}
            onClose={() => setPlanCrudOpen(false)}
            title="Lập kế hoạch PHCN"
            sub={planTarget ? `${planTarget.patientName || '—'} · ${dx(planTarget) || '—'}` : ''}
            fields={PLAN_FIELDS}
            initial={planCrudInit}
            size="lg"
            onSubmit={async (v) => {
              if (!planTarget) return;
              const dto: CreateTreatmentPlanDto = {
                referralId: planTarget.id,
                assessmentId: '',
                diagnosis: dx(planTarget) || '',
                diagnosisIcd: dxIcd(planTarget) || undefined,
                precautions: planTarget.precautions,
                contraindications: planTarget.contraindications,
                goals: [{
                  goalType: 'LTG', category: 'Functional',
                  description: (v.goals as string) || 'Cải thiện chức năng sinh hoạt hàng ngày', status: 'Active',
                }],
                interventions: [{
                  category: (v.rehabType as string) || 'PT',
                  intervention: THERAPY_TYPES.find((t) => t.v === v.rehabType)?.l || 'Vật lý trị liệu',
                  isActive: true,
                  frequency: v.frequency as string | undefined,
                }],
                frequency: (v.frequency as string) || '3 lần/tuần',
                duration: (v.duration as string) || '45 phút',
                plannedSessions: Number(v.plannedSessions) || 20,
                startDate: dayjs().format('YYYY-MM-DD'),
                notes: v.goals as string | undefined,
              };
              await createTreatmentPlan(dto);
              tk('Đã lập kế hoạch PHCN');
              load();
            }}
          />
        </>
      )}

      {/* ════════════ TAB: LỊCH BUỔI TẬP ════════════ */}
      {tab === 'schedule' && (
        <>
          <KpiStrip items={[
            { lbl: 'Buổi trong ngày', val: sessions.length, sub: scheduleDate.format('DD/MM/YYYY') },
            { lbl: 'Đã lên lịch', val: sessCounts.scheduled || 0, sub: 'chờ thực hiện', tone: 'info' },
            { lbl: 'Hoàn thành', val: sessCounts.completed || 0, sub: 'đã ghi nhận', tone: 'ok' },
            { lbl: 'Huỷ / Không đến', val: (sessCounts.cancelled || 0) + (sessCounts.noshow || 0), sub: 'cần theo dõi', tone: 'crit' },
          ]} />

          <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
            <Btn variant="ghost" icon="chevron-left" onClick={() => { setScheduleDate((d) => d.subtract(1, 'day')); setSessPage(0); }} />
            <DatePicker
              value={scheduleDate}
              onChange={(d) => { if (d) { setScheduleDate(d); setSessPage(0); } }}
              format="DD/MM/YYYY"
              allowClear={false}
              style={{ width: 140 }}
            />
            <Btn variant="ghost" icon="chevron-right" onClick={() => { setScheduleDate((d) => d.add(1, 'day')); setSessPage(0); }} />
            <Btn variant="ghost" onClick={() => { setScheduleDate(dayjs()); setSessPage(0); }}>Hôm nay</Btn>
            <span className="spacer" />
            <Btn variant="ghost" onClick={loadSessions}>
              <Ico name="refresh" size={12} /> Làm mới
            </Btn>
            <Btn variant="primary" onClick={openCreateSession}>
              <Ico name="plus" size={12} /> Thêm buổi tập
            </Btn>
          </div>

          <StatusTabs<SessStatusKey> value={sessStab} onChange={(v) => { setSessStab(v); setSessPage(0); }} tabs={SESS_STATUS_TABS} counts={sessCounts} />

          <DataTable<TreatmentSessionDto>
            columns={sessCols} data={sessPaged} rowKey={(r) => r.id}
            onRowClick={setSelSession} actions={sessActions}
            empty={sessLoading ? 'Đang tải…' : 'Chưa có buổi tập trong ngày'}
          />
          <Pager page={sessPage} setPage={setSessPage} totalPages={sessTotalPages} total={sessFiltered.length} perPage={PER} />

          <DrawerShell
            open={!!selSession}
            onClose={() => setSelSession(null)}
            size="md"
            title={selSession ? (selSession.sessionNumber ? `Buổi #${selSession.sessionNumber}` : selSession.sessionCode || 'Buổi tập') : ''}
            sub={selSession ? `${selSession.patientName || '—'} · ${dayjs(selSession.sessionDate).format('DD/MM/YYYY')}` : ''}
            footer={<>
              <Btn variant="ghost" onClick={() => setSelSession(null)}>Đóng</Btn>
              {selSession && (sessKey(selSession.status) === 'scheduled' || sessKey(selSession.status) === 'active') && <>
                <Btn onClick={() => openCancel(selSession, 'cancel')}>
                  <Ico name="x" size={12} /> Huỷ buổi
                </Btn>
                <Btn variant="primary" onClick={() => openComplete(selSession)}>
                  <Ico name="check" size={12} /> Hoàn tất
                </Btn>
              </>}
            </>}
          >
            {selSession && <>
              <DrSec title="Buổi tập">
                <DrField lbl="Bệnh nhân">{selSession.patientName || '—'}</DrField>
                <DrField lbl="KTV">{selSession.therapistName || '—'}</DrField>
                <DrField lbl="Ngày">{dayjs(selSession.sessionDate).format('DD/MM/YYYY')}</DrField>
                <DrField lbl="Giờ">{selSession.startTime}{selSession.endTime ? ` – ${selSession.endTime}` : ''}</DrField>
                <DrField lbl="Địa điểm">{selSession.location || '—'}</DrField>
                <DrField lbl="Trạng thái">
                  <StatusBadge tone={SESS_STATUS_TABS.find((x) => x.v === sessKey(selSession.status))?.tone || 'info'} dot>
                    {selSession.statusName || SESS_STATUS_TABS.find((x) => x.v === sessKey(selSession.status))?.l || '—'}
                  </StatusBadge>
                </DrField>
              </DrSec>
              {selSession.progressNotes && (
                <DrSec title="Ghi nhận">
                  <DrField lbl="Ghi chú">{selSession.progressNotes}</DrField>
                  {selSession.patientResponse && <DrField lbl="Đáp ứng">{selSession.patientResponse}</DrField>}
                </DrSec>
              )}
            </>}
          </DrawerShell>

          {/* Modal: Ghi nhận kết quả buổi tập */}
          <CrudModal
            open={completeOpen}
            onClose={() => setCompleteOpen(false)}
            title="Ghi nhận kết quả buổi tập"
            sub={completeTarget ? `${completeTarget.patientName || '—'} · ${completeTarget.startTime || ''}` : ''}
            fields={SESSION_COMPLETE_FIELDS}
            initial={completeInit}
            size="sm"
            onSubmit={async (v) => {
              if (!completeTarget) return;
              const dto: CompleteTreatmentSessionDto = {
                sessionId: completeTarget.id,
                endTime: dayjs().format('HH:mm'),
                interventionsPerformed: [],
                patientResponse: (v.progressNotes as string) || 'Đáp ứng tốt',
                tolerance: v.cooperationScore ? `${v.cooperationScore}/5` : 'Tốt',
                goalsAddressed: [],
                progressNotes: (v.progressNotes as string) || '',
                homeExerciseReviewed: false,
                homeExerciseUpdated: false,
                postPainLevel: v.postPainLevel as number | undefined,
              };
              await completeSession(dto);
              tk('Đã ghi nhận buổi tập');
              setSelSession(null);
              loadSessions();
            }}
          />

          {/* Modal: Huỷ / Không đến */}
          <ModalShell
            open={!!cancelTarget}
            onClose={() => setCancelTarget(null)}
            title={cancelKind === 'noshow' ? 'Đánh dấu không đến' : 'Huỷ buổi tập'}
            sub={cancelTarget ? `${cancelTarget.patientName || '—'} · ${cancelTarget.startTime || ''}` : ''}
            size="sm"
            footer={<>
              <Btn variant="ghost" onClick={() => setCancelTarget(null)}>Đóng</Btn>
              <Btn variant="primary" onClick={submitCancel} disabled={cancelSaving}>
                {cancelSaving ? 'Đang lưu…' : 'Xác nhận'}
              </Btn>
            </>}
          >
            <FormRow label="Lý do">
              <Input.TextArea rows={3} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Nhập lý do…" />
            </FormRow>
          </ModalShell>

          {/* Modal: Thêm buổi tập */}
          <ModalShell
            open={sessionFormOpen}
            onClose={() => setSessionFormOpen(false)}
            title="Thêm buổi tập"
            size="md"
            footer={<>
              <Btn variant="ghost" onClick={() => setSessionFormOpen(false)}>Huỷ</Btn>
              <Btn variant="primary" onClick={submitCreateSession} disabled={sfSaving}>
                {sfSaving ? 'Đang lưu…' : 'Thêm buổi'}
              </Btn>
            </>}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
              <FormRow label="Kế hoạch điều trị *">
                <Select
                  value={sfPlanId || undefined}
                  onChange={(v) => setSfPlanId(v)}
                  style={{ width: '100%' }}
                  placeholder="— Chọn bệnh nhân / kế hoạch —"
                  showSearch
                  optionFilterProp="label"
                  options={plans.map((p) => ({ value: p.id, label: `${p.patientName} · ${p.rehabTypeName || p.rehabType}` }))}
                />
              </FormRow>
              <div style={{ display: 'flex', gap: 'var(--space-12)' }}>
                <FormRow label="Ngày tập *" style={{ flex: 1 }}>
                  <DatePicker value={sfDate} onChange={(d) => d && setSfDate(d)} format="DD/MM/YYYY" style={{ width: '100%' }} />
                </FormRow>
                <FormRow label="Giờ bắt đầu *" style={{ flex: 1 }}>
                  <TimePicker value={sfTime} onChange={(t) => t && setSfTime(t)} format="HH:mm" style={{ width: '100%' }} />
                </FormRow>
              </div>
              <FormRow label="Địa điểm">
                <Input value={sfLocation} onChange={(e) => setSfLocation(e.target.value)} placeholder="VD: Phòng PHCN" />
              </FormRow>
            </div>
          </ModalShell>
        </>
      )}

      {/* ════════════ TAB: BÀI TẬP MẪU ════════════ */}
      {tab === 'exercises' && (
        <div style={{ padding: 'var(--space-16)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--space-16)' }}>
          {EXERCISE_GROUPS.map((g) => (
            <div key={g.title} style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-2)', background: 'var(--d-1)' }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)', fontWeight: 700, fontSize: 'var(--fs-sm)', color: 'var(--t-0)' }}>
                {g.title}
              </div>
              <ul style={{ margin: 0, padding: '10px 14px 14px 30px', fontSize: 'var(--fs-sm)', color: 'var(--t-1)', lineHeight: 1.8 }}>
                {g.items.map((it) => <li key={it}>{it}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const FormRow: React.FC<{ label: string; children: React.ReactNode; style?: React.CSSProperties }> = ({ label, children, style }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', ...style }}>
    <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--t-2)' }}>{label}</span>
    {children}
  </div>
);

export default RehabilitationV2;
