import React, { useEffect, useMemo, useState } from 'react';
import { fmtNum as fmt } from '../../../utils/format';
import dayjs from 'dayjs';
import {
  getTrainingClasses, getTrainingDashboard, saveTrainingClass, getClassStudents,
  getClinicalDirections, saveClinicalDirection,
  getResearchProjects, saveResearchProject,
  getCreditSummary, enrollStudent, updateStudentStatus, issueCertificate,
} from '../api/trainingResearch';
import type {
  TrainingClassDto, TrainingDashboardDto, TrainingStudentDto,
  ClinicalDirectionDto, ResearchProjectDto, CreditSummaryDto,
} from '../api/trainingResearch';
import {
  KpiStrip, TopTabs, StatusTabs, SearchBox, Filter, DataTable, Pager,
  StatusBadge, ActBtn, Btn, CrudModal,
  DrawerShell, DrSec, DrField, tk, ti,
  type ColumnDef, type CrudFieldCfg,
} from '@/_v2kit';

// ─── Field configs ───────────────────────────────────────────────────────────

const CLASS_FIELDS: CrudFieldCfg[] = [
  { key: 'classCode', label: 'Mã lớp', required: true, disabledOnEdit: true, placeholder: 'VD: ĐT-2026-...' },
  { key: 'className', label: 'Tên lớp', required: true },
  { key: 'trainingType', label: 'Loại đào tạo', type: 'select', required: true, options: [
    { value: 1, label: 'Nội bộ' }, { value: 2, label: 'Bên ngoài' },
    { value: 3, label: 'CME' }, { value: 4, label: 'Chỉ đạo tuyến' }] },
  { key: 'location', label: 'Địa điểm' },
  { key: 'startDate', label: 'Ngày bắt đầu', type: 'date' },
  { key: 'endDate', label: 'Ngày kết thúc', type: 'date' },
  { key: 'maxStudents', label: 'Sĩ số tối đa', type: 'number' },
  { key: 'creditHours', label: 'Số tín chỉ', type: 'number' },
  { key: 'fee', label: 'Học phí (đ)', type: 'number' },
  { key: 'status', label: 'Trạng thái', type: 'select', options: [
    { value: 1, label: 'Kế hoạch' }, { value: 2, label: 'Đang diễn ra' },
    { value: 3, label: 'Hoàn thành' }, { value: 4, label: 'Hủy' }] },
  { key: 'description', label: 'Mô tả', type: 'textarea' },
];

const DIR_FIELDS: CrudFieldCfg[] = [
  { key: 'directionType', label: 'Loại', type: 'select', required: true, options: [
    { value: 1, label: 'Tuyến trên' }, { value: 2, label: 'Tuyến dưới' }] },
  { key: 'partnerHospital', label: 'Bệnh viện đối tác', required: true },
  { key: 'startDate', label: 'Ngày bắt đầu', type: 'date', required: true },
  { key: 'endDate', label: 'Ngày kết thúc', type: 'date' },
  { key: 'status', label: 'Trạng thái', type: 'select', options: [
    { value: 1, label: 'Kế hoạch' }, { value: 2, label: 'Đang thực hiện' }, { value: 3, label: 'Hoàn thành' }] },
  { key: 'objectives', label: 'Mục tiêu', type: 'textarea' },
  { key: 'notes', label: 'Ghi chú', type: 'textarea' },
];

const PROJ_FIELDS: CrudFieldCfg[] = [
  { key: 'projectCode', label: 'Mã đề tài', required: true, disabledOnEdit: true },
  { key: 'title', label: 'Tên đề tài', required: true },
  { key: 'level', label: 'Cấp', type: 'select', required: true, options: [
    { value: 1, label: 'Cấp Quốc gia' }, { value: 2, label: 'Cấp Bộ' }, { value: 3, label: 'Cấp Cơ sở' }] },
  { key: 'status', label: 'Trạng thái', type: 'select', options: [
    { value: 1, label: 'Đề xuất' }, { value: 2, label: 'Phê duyệt' },
    { value: 3, label: 'Đang thực hiện' }, { value: 4, label: 'Hoàn thành' }, { value: 5, label: 'Đã công bố' }] },
  { key: 'startDate', label: 'Ngày bắt đầu', type: 'date', required: true },
  { key: 'endDate', label: 'Ngày kết thúc', type: 'date' },
  { key: 'budget', label: 'Ngân sách (đ)', type: 'number' },
  { key: 'abstract', label: 'Tóm tắt', type: 'textarea' },
  { key: 'findings', label: 'Kết quả', type: 'textarea' },
  { key: 'publicationInfo', label: 'Thông tin công bố', type: 'textarea' },
];

const ENROLL_FIELDS: CrudFieldCfg[] = [
  { key: 'studentType', label: 'Loại học viên', type: 'select', required: true, options: [
    { value: 1, label: 'Nội bộ' }, { value: 2, label: 'Bên ngoài' }, { value: 3, label: 'Thực tập sinh' }] },
  { key: 'externalName', label: 'Họ tên (học viên ngoài)' },
  { key: 'notes', label: 'Ghi chú', type: 'textarea' },
];

const CERT_FIELDS: CrudFieldCfg[] = [
  { key: 'certificateNumber', label: 'Số chứng chỉ', required: true },
  { key: 'certificateDate', label: 'Ngày cấp', type: 'date' },
];

// ─── Labels / status maps ────────────────────────────────────────────────────

const CLASS_STATUS_LABEL: Record<number, string> = {
  0: 'Lên kế hoạch', 1: 'Đang mở', 2: 'Hoàn thành', 3: 'Tạm dừng', 4: 'Hủy',
};

const RESEARCH_LEVEL_LABEL: Record<number, string> = { 1: 'Quốc gia', 2: 'Cấp Bộ', 3: 'Cơ sở' };

type SKey = 'planning' | 'active' | 'completed' | 'paused' | 'cancelled';
const STATUS_TABS = [
  { v: 'planning' as SKey,  l: 'Lên KH',     tone: 'warn' as const },
  { v: 'active' as SKey,    l: 'Đang mở',    tone: 'info' as const },
  { v: 'completed' as SKey, l: 'Hoàn thành', tone: 'ok' as const },
  { v: 'paused' as SKey,    l: 'Tạm dừng',   tone: 'warn' as const },
  { v: 'cancelled' as SKey, l: 'Hủy',        tone: 'crit' as const },
];

const sKey = (n: number): SKey =>
  n === 0 ? 'planning' : n === 1 ? 'active' : n === 2 ? 'completed' : n === 3 ? 'paused' : 'cancelled';

type MainTab = 'classes' | 'directions' | 'research' | 'certificates';
const MAIN_TABS: { v: MainTab; l: string }[] = [
  { v: 'classes',      l: 'Lớp đào tạo' },
  { v: 'directions',   l: 'Chỉ đạo tuyến' },
  { v: 'research',     l: 'Nghiên cứu KH' },
  { v: 'certificates', l: 'Chứng chỉ CME' },
];

const PER = 18;

// ─── Component ───────────────────────────────────────────────────────────────

const TrainingResearchV2: React.FC = () => {
  const [mainTab, setMainTab] = useState<MainTab>('classes');

  // ── Classes ──────────────────────────────────────────────────────────────
  const [items, setItems] = useState<TrainingClassDto[]>([]);
  const [dash, setDash] = useState<TrainingDashboardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fType, setFType] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<TrainingClassDto | null>(null);
  const [crudOpen, setCrudOpen] = useState(false);
  const [crudInit, setCrudInit] = useState<Record<string, unknown> | null>(null);

  const openCreate = () => { setCrudInit({ trainingType: 1, status: 1, maxStudents: 30, creditHours: 0, fee: 0 }); setCrudOpen(true); };
  const openEdit  = (r: TrainingClassDto) => { setCrudInit({ ...r } as Record<string, unknown>); setCrudOpen(true); };

  // ── Students ─────────────────────────────────────────────────────────────
  const [studentsOpen, setStudentsOpen] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [students, setStudents] = useState<TrainingStudentDto[]>([]);
  const [studentsClass, setStudentsClass] = useState<TrainingClassDto | null>(null);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [certOpen, setCertOpen] = useState(false);
  const [certStudent, setCertStudent] = useState<TrainingStudentDto | null>(null);

  // ── Directions ───────────────────────────────────────────────────────────
  const [dirs, setDirs] = useState<ClinicalDirectionDto[]>([]);
  const [dirsLoading, setDirsLoading] = useState(false);
  const [dirsLoaded, setDirsLoaded] = useState(false);
  const [dirSearch, setDirSearch] = useState('');
  const [dirPage, setDirPage] = useState(0);
  const [dirSel, setDirSel] = useState<ClinicalDirectionDto | null>(null);
  const [dirCrudOpen, setDirCrudOpen] = useState(false);
  const [dirCrudInit, setDirCrudInit] = useState<Record<string, unknown> | null>(null);

  const openDirCreate = () => { setDirCrudInit({ directionType: 1, status: 1 }); setDirCrudOpen(true); };
  const openDirEdit   = (r: ClinicalDirectionDto) => { setDirCrudInit({ ...r } as Record<string, unknown>); setDirCrudOpen(true); };

  // ── Research ─────────────────────────────────────────────────────────────
  const [projs, setProjs] = useState<ResearchProjectDto[]>([]);
  const [projsLoading, setProjsLoading] = useState(false);
  const [projsLoaded, setProjsLoaded] = useState(false);
  const [projSearch, setProjSearch] = useState('');
  const [projPage, setProjPage] = useState(0);
  const [projSel, setProjSel] = useState<ResearchProjectDto | null>(null);
  const [projCrudOpen, setProjCrudOpen] = useState(false);
  const [projCrudInit, setProjCrudInit] = useState<Record<string, unknown> | null>(null);

  const openProjCreate = () => { setProjCrudInit({ level: 3, status: 1, budget: 0 }); setProjCrudOpen(true); };
  const openProjEdit   = (r: ResearchProjectDto) => { setProjCrudInit({ ...r } as Record<string, unknown>); setProjCrudOpen(true); };

  // ── Certificates ─────────────────────────────────────────────────────────
  const [credits, setCredits] = useState<CreditSummaryDto[]>([]);
  const [credLoading, setCredLoading] = useState(false);
  const [credLoaded, setCredLoaded] = useState(false);

  // ─── Loaders ─────────────────────────────────────────────────────────────

  const load = async () => {
    setLoading(true);
    try {
      const [list, d] = await Promise.all([
        getTrainingClasses({ keyword: search, pageSize: 200 }),
        getTrainingDashboard(),
      ]);
      setItems(list);
      setDash(d);
    } catch { ti('Không tải được lớp đào tạo'); }
    finally { setLoading(false); }
  };

  const loadDirs = async () => {
    setDirsLoading(true);
    try {
      const data = await getClinicalDirections({ pageSize: 200 });
      setDirs(data);
      setDirsLoaded(true);
    } catch { ti('Không tải được danh sách chỉ đạo tuyến'); }
    finally { setDirsLoading(false); }
  };

  const loadProjs = async () => {
    setProjsLoading(true);
    try {
      const data = await getResearchProjects({ pageSize: 200 });
      setProjs(data);
      setProjsLoaded(true);
    } catch { ti('Không tải được danh sách đề tài'); }
    finally { setProjsLoading(false); }
  };

  const loadCredits = async () => {
    setCredLoading(true);
    try {
      const data = await getCreditSummary();
      setCredits(data);
      setCredLoaded(true);
    } catch { ti('Không tải được dữ liệu tín chỉ'); }
    finally { setCredLoading(false); }
  };

  const openStudents = async (r: TrainingClassDto) => {
    setStudentsClass(r);
    setStudentsOpen(true);
    setStudentsLoading(true);
    setStudents([]);
    try {
      const data = await getClassStudents(r.id);
      setStudents(Array.isArray(data) ? data : []);
    } catch {
      ti('Không tải được danh sách học viên');
      setStudentsOpen(false);
    } finally { setStudentsLoading(false); }
  };

  const reloadStudents = async () => {
    if (!studentsClass) return;
    setStudentsLoading(true);
    try {
      const data = await getClassStudents(studentsClass.id);
      setStudents(Array.isArray(data) ? data : []);
    } catch { ti('Không tải được danh sách học viên'); }
    finally { setStudentsLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  useEffect(() => {
    if (mainTab === 'directions'   && !dirsLoaded) loadDirs();
    if (mainTab === 'research'     && !projsLoaded) loadProjs();
    if (mainTab === 'certificates' && !credLoaded) loadCredits();
    /* eslint-disable-next-line */
  }, [mainTab]);

  // ─── Derived: Classes ─────────────────────────────────────────────────────

  const types = useMemo(() => {
    const set = new Set(items.map((r) => r.trainingTypeName).filter(Boolean) as string[]);
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
      if (fType && r.trainingTypeName !== fType) return false;
      if (!k) return true;
      return [r.classCode, r.className, r.instructorName, r.departmentName]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged      = filtered.slice(page * PER, (page + 1) * PER);

  // ─── Derived: Directions ──────────────────────────────────────────────────

  const filteredDirs = useMemo(() => {
    const k = dirSearch.trim().toLowerCase();
    if (!k) return dirs;
    return dirs.filter((r) =>
      [r.partnerHospital, r.responsibleDoctorName, r.objectives]
        .some((v) => (v || '').toLowerCase().includes(k))
    );
  }, [dirs, dirSearch]);

  const dirTotalPages = Math.max(1, Math.ceil(filteredDirs.length / PER));
  const dirPaged      = filteredDirs.slice(dirPage * PER, (dirPage + 1) * PER);

  // ─── Derived: Research ────────────────────────────────────────────────────

  const filteredProjs = useMemo(() => {
    const k = projSearch.trim().toLowerCase();
    if (!k) return projs;
    return projs.filter((r) =>
      [r.projectCode, r.title, r.principalInvestigatorName]
        .some((v) => (v || '').toLowerCase().includes(k))
    );
  }, [projs, projSearch]);

  const projTotalPages = Math.max(1, Math.ceil(filteredProjs.length / PER));
  const projPaged      = filteredProjs.slice(projPage * PER, (projPage + 1) * PER);

  // ─── Column defs ──────────────────────────────────────────────────────────

  const cols: ColumnDef<TrainingClassDto>[] = [
    { key: 'code',  label: 'Mã lớp', code: true, render: (r) => r.classCode },
    { key: 'name',  label: 'Tên lớp', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.className}</div>
        {r.location && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>📍 {r.location}</div>}
      </div>
    ) },
    { key: 'type',  label: 'Loại', render: (r) => (
      <StatusBadge tone="info">{r.trainingTypeName || `#${r.trainingType}`}</StatusBadge>
    ) },
    { key: 'instr', label: 'GV', render: (r) => r.instructorName || '—' },
    { key: 'date',  label: 'Thời gian', mono: true, render: (r) => r.startDate ? (
      <div>
        <div>{dayjs(r.startDate).format('DD/MM/YY')}</div>
        {r.endDate && <div style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-2)' }}>→ {dayjs(r.endDate).format('DD/MM')}</div>}
      </div>
    ) : '—' },
    { key: 'enr',   label: 'Học viên', mono: true, render: (r) => {
      const ratio = r.maxStudents ? r.enrolledCount / r.maxStudents : 0;
      const c = ratio >= 0.9 ? 'var(--a-rd-text)' : ratio >= 0.7 ? 'var(--a-or-text)' : 'var(--t-0)';
      return <span style={{ color: c }}>{r.enrolledCount}/{r.maxStudents}</span>;
    } },
    { key: 'cred',  label: 'Tín chỉ', mono: true, render: (r) => r.creditHours },
    { key: 'fee',   label: 'Học phí',  mono: true, render: (r) => r.fee ? fmt(r.fee) : 'Miễn phí' },
    { key: 'st',    label: 'Trạng thái', render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === sKey(r.status));
      return <StatusBadge tone={t?.tone || 'info'} dot>{r.statusName || CLASS_STATUS_LABEL[r.status] || '—'}</StatusBadge>;
    } },
  ];

  const classActions = (r: TrainingClassDto) => (
    <div className="ab-actions">
      <ActBtn ic="eye"  title="Chi tiết"  onClick={() => setSel(r)} />
      <ActBtn ic="user" title="Học viên"  onClick={() => openStudents(r)} />
      <ActBtn ic="edit" title="Sửa"       onClick={() => openEdit(r)} />
    </div>
  );

  const dirCols: ColumnDef<ClinicalDirectionDto>[] = [
    { key: 'type', label: 'Loại', render: (r) => (
      <StatusBadge tone={r.directionType === 1 ? 'info' : 'ok'}>
        {r.directionTypeName || (r.directionType === 1 ? 'Tuyến trên' : 'Tuyến dưới')}
      </StatusBadge>
    ) },
    { key: 'partner', label: 'Bệnh viện đối tác', render: (r) => (
      <span style={{ fontWeight: 500 }}>{r.partnerHospital}</span>
    ) },
    { key: 'date', label: 'Thời gian', mono: true, render: (r) => r.startDate ? (
      <div>
        <div>{dayjs(r.startDate).format('DD/MM/YY')}</div>
        {r.endDate && <div style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-2)' }}>→ {dayjs(r.endDate).format('DD/MM')}</div>}
      </div>
    ) : '—' },
    { key: 'doctor', label: 'BS phụ trách', render: (r) => r.responsibleDoctorName || '—' },
    { key: 'objectives', label: 'Mục tiêu', render: (r) => r.objectives
      ? <span style={{ display: 'block', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.objectives}</span>
      : '—'
    },
    { key: 'status', label: 'Trạng thái', render: (r) => {
      const tone = r.status === 3 ? 'ok' as const : r.status === 2 ? 'info' as const : 'warn' as const;
      const label = r.statusName || (r.status === 1 ? 'Kế hoạch' : r.status === 2 ? 'Đang thực hiện' : 'Hoàn thành');
      return <StatusBadge tone={tone} dot>{label}</StatusBadge>;
    } },
  ];

  const dirActions = (r: ClinicalDirectionDto) => (
    <div className="ab-actions">
      <ActBtn ic="eye"  title="Chi tiết" onClick={() => setDirSel(r)} />
      <ActBtn ic="edit" title="Sửa"      onClick={() => openDirEdit(r)} />
    </div>
  );

  const projCols: ColumnDef<ResearchProjectDto>[] = [
    { key: 'code',   label: 'Mã', code: true, render: (r) => r.projectCode },
    { key: 'title',  label: 'Tên đề tài', render: (r) => <span style={{ fontWeight: 500 }}>{r.title}</span> },
    { key: 'level',  label: 'Cấp', render: (r) => (
      <StatusBadge tone="info">{r.levelName || RESEARCH_LEVEL_LABEL[r.level] || `#${r.level}`}</StatusBadge>
    ) },
    { key: 'pi',     label: 'Chủ nhiệm', render: (r) => r.principalInvestigatorName || '—' },
    { key: 'budget', label: 'Ngân sách', mono: true, render: (r) =>
      r.budget > 0 ? `${(r.budget / 1_000_000).toFixed(0)} tr đ` : '—'
    },
    { key: 'date',   label: 'Bắt đầu', mono: true, render: (r) => r.startDate ? dayjs(r.startDate).format('DD/MM/YY') : '—' },
    { key: 'status', label: 'Trạng thái', render: (r) => {
      const toneMap: Record<number, 'info' | 'ok' | 'warn'> = { 1: 'info', 2: 'info', 3: 'warn', 4: 'ok', 5: 'ok' };
      return <StatusBadge tone={toneMap[r.status] ?? 'info'} dot>{r.statusName || `#${r.status}`}</StatusBadge>;
    } },
  ];

  const projActions = (r: ResearchProjectDto) => (
    <div className="ab-actions">
      <ActBtn ic="eye"  title="Chi tiết" onClick={() => setProjSel(r)} />
      <ActBtn ic="edit" title="Sửa"      onClick={() => openProjEdit(r)} />
    </div>
  );

  const creditCols: ColumnDef<CreditSummaryDto>[] = [
    { key: 'name', label: 'Nhân viên', render: (r) => r.staffName },
    { key: 'dept', label: 'Khoa',      render: (r) => r.departmentName || '—' },
    { key: 'cred', label: 'Tín chỉ đạt / Yêu cầu', mono: true, render: (r) => `${r.totalCredits} / ${r.requiredCredits}` },
    { key: 'pct',  label: 'Tiến độ', mono: true, render: (r) => {
      const pct = Math.round(r.compliancePercent);
      const c = r.isCompliant ? 'var(--a-gn-text)' : pct >= 50 ? 'var(--a-or-text)' : 'var(--a-rd-text)';
      return <span style={{ color: c }}>{pct}%</span>;
    } },
    { key: 'ok', label: 'Đạt CME', render: (r) => (
      <StatusBadge tone={r.isCompliant ? 'ok' : 'crit'} dot>{r.isCompliant ? 'Đạt' : 'Chưa đạt'}</StatusBadge>
    ) },
  ];

  // ─── KPI ─────────────────────────────────────────────────────────────────

  const totalStudents = dash?.totalStudents ?? items.reduce((s, c) => s + (c.enrolledCount || 0), 0);

  // ─── JSX ─────────────────────────────────────────────────────────────────

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Lớp đào tạo',   val: dash?.totalClasses ?? items.length,              sub: 'tổng số' },
        { lbl: 'Đang mở',       val: dash?.activeClasses ?? counts.active,            sub: 'có thể đăng ký', tone: 'info' },
        { lbl: 'Tổng học viên', val: totalStudents.toLocaleString('vi-VN'),           sub: 'lượt', tone: 'ok' },
        { lbl: 'Chứng chỉ',     val: dash?.certificatesIssued ?? 0,                  sub: 'đã phát hành', tone: 'ok' },
        { lbl: 'NCKH',          val: dash?.researchProjects ?? 0,                    sub: 'đề tài', tone: 'info' },
        { lbl: 'CME tuân thủ',  val: `${(dash?.cmeCompliancePercent ?? 0).toFixed(0)}`, unit: '%', sub: 'tỷ lệ NV', tone: 'warn' },
      ]} />

      <TopTabs<MainTab>
        tab={mainTab}
        setTab={setMainTab}
        tabs={MAIN_TABS}
        actions={
          mainTab === 'classes'    ? <Btn variant="primary" icon="plus" onClick={openCreate}>Mở lớp</Btn>
          : mainTab === 'directions' ? <Btn variant="primary" icon="plus" onClick={openDirCreate}>Thêm mới</Btn>
          : mainTab === 'research'   ? <Btn variant="primary" icon="plus" onClick={openProjCreate}>Thêm đề tài</Btn>
          : undefined
        }
      />

      {/* ── Tab: Lớp đào tạo ──────────────────────────────────────────────── */}
      {mainTab === 'classes' && <>
        <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
            placeholder="Tìm tên / mã lớp / GV…" />
          <Filter value={fType} onChange={setFType} options={types} placeholder="▾ Loại đào tạo" />
          <Btn variant="ghost" icon="x" onClick={() => { setSearch(''); setFType(''); setStab('all'); }}>Bỏ lọc</Btn>
          <span className="spacer" />
          <Btn variant="ghost" icon="refresh" onClick={load} loading={loading}>Làm mới</Btn>
        </div>

        <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

        <DataTable<TrainingClassDto>
          columns={cols} data={paged} rowKey={(r) => r.id}
          onRowClick={setSel} actions={classActions} loading={loading}
          empty={'Chưa có lớp đào tạo'}
        />
        <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />
      </>}

      {/* ── Tab: Chỉ đạo tuyến ────────────────────────────────────────────── */}
      {mainTab === 'directions' && <>
        <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
          <SearchBox value={dirSearch} onChange={(v) => { setDirSearch(v); setDirPage(0); }}
            placeholder="Tìm bệnh viện / BS phụ trách…" />
          <Btn variant="ghost" icon="x" onClick={() => { setDirSearch(''); setDirPage(0); }}>Bỏ lọc</Btn>
          <span className="spacer" />
          <Btn variant="ghost" icon="refresh" onClick={loadDirs} loading={dirsLoading}>Làm mới</Btn>
        </div>

        <DataTable<ClinicalDirectionDto>
          columns={dirCols} data={dirPaged} rowKey={(r) => r.id}
          onRowClick={setDirSel} actions={dirActions} loading={dirsLoading}
          empty={'Chưa có dữ liệu chỉ đạo tuyến'}
        />
        <Pager page={dirPage} setPage={setDirPage} totalPages={dirTotalPages} total={filteredDirs.length} perPage={PER} />
      </>}

      {/* ── Tab: Nghiên cứu KH ────────────────────────────────────────────── */}
      {mainTab === 'research' && <>
        <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
          <SearchBox value={projSearch} onChange={(v) => { setProjSearch(v); setProjPage(0); }}
            placeholder="Tìm mã / tên / chủ nhiệm đề tài…" />
          <Btn variant="ghost" icon="x" onClick={() => { setProjSearch(''); setProjPage(0); }}>Bỏ lọc</Btn>
          <span className="spacer" />
          <Btn variant="ghost" icon="refresh" onClick={loadProjs} loading={projsLoading}>Làm mới</Btn>
        </div>

        <DataTable<ResearchProjectDto>
          columns={projCols} data={projPaged} rowKey={(r) => r.id}
          onRowClick={setProjSel} actions={projActions} loading={projsLoading}
          empty={'Chưa có đề tài nghiên cứu'}
        />
        <Pager page={projPage} setPage={setProjPage} totalPages={projTotalPages} total={filteredProjs.length} perPage={PER} />
      </>}

      {/* ── Tab: Chứng chỉ CME ────────────────────────────────────────────── */}
      {mainTab === 'certificates' && <>
        <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
          <span className="spacer" />
          <Btn variant="ghost" icon="refresh" onClick={loadCredits} loading={credLoading}>Làm mới</Btn>
        </div>
        <DataTable<CreditSummaryDto>
          columns={creditCols} data={credits} rowKey={(r) => r.staffId} loading={credLoading}
          empty={'Chưa có dữ liệu tín chỉ'}
        />
      </>}

      {/* ─── Drawer: Chi tiết lớp ────────────────────────────────────────── */}
      <DrawerShell
        open={!!sel} onClose={() => setSel(null)} size="lg"
        title={sel ? sel.className : ''}
        sub={sel ? `${sel.classCode} · ${sel.trainingTypeName || ''}` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
          <Btn icon="user" onClick={() => { if (sel) { setSel(null); openStudents(sel); } }}>Học viên</Btn>
          <Btn variant="primary" icon="edit" onClick={() => { if (sel) { openEdit(sel); setSel(null); } }}>Chỉnh sửa</Btn>
        </>}
      >
        {sel && <>
          <DrSec title="Lớp học">
            <DrField lbl="Mã lớp"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.classCode}</span></DrField>
            <DrField lbl="Tên">{sel.className}</DrField>
            <DrField lbl="Loại">{sel.trainingTypeName || `#${sel.trainingType}`}</DrField>
            <DrField lbl="Khoa">{sel.departmentName || '—'}</DrField>
            <DrField lbl="GV phụ trách">{sel.instructorName || '—'}</DrField>
            <DrField lbl="Địa điểm">{sel.location || '—'}</DrField>
          </DrSec>
          <DrSec title="Lịch trình">
            {sel.startDate && <DrField lbl="Bắt đầu">{dayjs(sel.startDate).format('DD/MM/YYYY')}</DrField>}
            {sel.endDate   && <DrField lbl="Kết thúc">{dayjs(sel.endDate).format('DD/MM/YYYY')}</DrField>}
            <DrField lbl="Học viên"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.enrolledCount} / {sel.maxStudents}</span></DrField>
            <DrField lbl="Tín chỉ"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.creditHours}</span></DrField>
            <DrField lbl="Học phí"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.fee ? `${fmt(sel.fee)} đ` : 'Miễn phí'}</span></DrField>
            <DrField lbl="Trạng thái">
              <StatusBadge tone={STATUS_TABS.find((x) => x.v === sKey(sel.status))?.tone || 'info'} dot>
                {sel.statusName || CLASS_STATUS_LABEL[sel.status] || '—'}
              </StatusBadge>
            </DrField>
          </DrSec>
          {sel.description && (
            <DrSec title="Mô tả">
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 'var(--fs-md)', color: 'var(--t-1)' }}>{sel.description}</div>
            </DrSec>
          )}
        </>}
      </DrawerShell>

      <CrudModal
        open={crudOpen} onClose={() => setCrudOpen(false)}
        title={crudInit?.id ? 'Cập nhật lớp đào tạo' : 'Mở lớp đào tạo mới'}
        fields={CLASS_FIELDS} initial={crudInit} size="lg"
        onSubmit={async (v, editing) => {
          await saveTrainingClass(v as Partial<TrainingClassDto>, editing ? (crudInit?.id as string) : undefined);
          tk(editing ? 'Đã cập nhật lớp đào tạo' : 'Đã mở lớp đào tạo');
          load();
        }}
      />

      {/* ─── Drawer: Học viên ────────────────────────────────────────────── */}
      <DrawerShell
        open={studentsOpen} onClose={() => setStudentsOpen(false)} size="lg"
        title={studentsClass ? `Học viên: ${studentsClass.className}` : 'Học viên'}
        sub={studentsClass ? `${studentsClass.classCode} · ${studentsLoading ? 'Đang tải…' : `${students.length} học viên`}` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setStudentsOpen(false)}>Đóng</Btn>
          <Btn variant="primary" icon="plus" onClick={() => setEnrollOpen(true)}>Thêm học viên</Btn>
        </>}
      >
        {studentsLoading && (
          <div style={{ padding: 'var(--space-32)', textAlign: 'center', color: 'var(--t-2)' }}>Đang tải…</div>
        )}
        {!studentsLoading && students.length === 0 && (
          <div style={{ padding: 'var(--space-32)', textAlign: 'center', color: 'var(--t-2)' }}>Chưa có học viên đăng ký</div>
        )}
        {!studentsLoading && students.length > 0 && (
          <table className="ab-tbl" style={{ width: '100%', fontSize: 'var(--fs-sm)' }}>
            <thead>
              <tr><th>#</th><th>Tên học viên</th><th>Loại</th><th>Điểm</th><th>Trạng thái</th><th>Chứng chỉ</th><th /></tr>
            </thead>
            <tbody>
              {students.map((s, i) => (
                <tr key={s.id}>
                  <td className="mono">{i + 1}</td>
                  <td>{s.displayName || '—'}</td>
                  <td>{s.studentTypeName || `#${s.studentType}`}</td>
                  <td className="mono">{s.score != null ? s.score : '—'}</td>
                  <td>
                    <StatusBadge tone={s.attendanceStatus === 2 ? 'ok' : s.attendanceStatus === 3 ? 'crit' : 'info'} dot>
                      {s.attendanceStatusName || `#${s.attendanceStatus}`}
                    </StatusBadge>
                  </td>
                  <td>{s.certificateNumber || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {s.attendanceStatus < 3 && (
                        <Btn variant="ghost" onClick={async () => {
                          try {
                            await updateStudentStatus(s.id, { attendanceStatus: s.attendanceStatus + 1 });
                            tk('Đã cập nhật trạng thái');
                            await reloadStudents();
                          } catch { ti('Không cập nhật được'); }
                        }}>
                          {s.attendanceStatus === 1 ? 'Bắt đầu' : 'Hoàn thành'}
                        </Btn>
                      )}
                      {s.attendanceStatus === 3 && !s.certificateNumber && (
                        <ActBtn ic="award" title="Cấp chứng chỉ" onClick={() => { setCertStudent(s); setCertOpen(true); }} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DrawerShell>

      <CrudModal
        open={enrollOpen} onClose={() => setEnrollOpen(false)}
        title={`Thêm học viên — ${studentsClass?.className || ''}`}
        fields={ENROLL_FIELDS} initial={{ studentType: 1 }}
        onSubmit={async (v) => {
          await enrollStudent({
            classId:      studentsClass!.id,
            studentType:  v.studentType as number,
            externalName: v.externalName as string | undefined,
            notes:        v.notes as string | undefined,
          });
          tk('Đã thêm học viên');
          await reloadStudents();
        }}
      />

      <CrudModal
        open={certOpen} onClose={() => { setCertOpen(false); setCertStudent(null); }}
        title={`Cấp chứng chỉ — ${certStudent?.displayName || ''}`}
        fields={CERT_FIELDS} initial={null}
        onSubmit={async (v) => {
          await issueCertificate(certStudent!.id, {
            certificateNumber: v.certificateNumber as string,
            certificateDate:   v.certificateDate as string | undefined,
          });
          tk('Đã cấp chứng chỉ');
          setCertStudent(null);
          await reloadStudents();
        }}
      />

      {/* ─── Drawer: Chi tiết chỉ đạo tuyến ────────────────────────────── */}
      <DrawerShell
        open={!!dirSel} onClose={() => setDirSel(null)} size="lg"
        title={dirSel ? dirSel.partnerHospital : ''}
        sub={dirSel ? (dirSel.directionTypeName || (dirSel.directionType === 1 ? 'Tuyến trên' : 'Tuyến dưới')) : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setDirSel(null)}>Đóng</Btn>
          <Btn variant="primary" icon="edit" onClick={() => { if (dirSel) { openDirEdit(dirSel); setDirSel(null); } }}>Chỉnh sửa</Btn>
        </>}
      >
        {dirSel && <>
          <DrSec title="Thông tin">
            <DrField lbl="Loại">{dirSel.directionTypeName || (dirSel.directionType === 1 ? 'Tuyến trên' : 'Tuyến dưới')}</DrField>
            <DrField lbl="Bệnh viện đối tác">{dirSel.partnerHospital}</DrField>
            <DrField lbl="BS phụ trách">{dirSel.responsibleDoctorName || '—'}</DrField>
            <DrField lbl="Trạng thái">
              <StatusBadge tone={dirSel.status === 3 ? 'ok' : dirSel.status === 2 ? 'info' : 'warn'} dot>
                {dirSel.statusName || (dirSel.status === 1 ? 'Kế hoạch' : dirSel.status === 2 ? 'Đang thực hiện' : 'Hoàn thành')}
              </StatusBadge>
            </DrField>
          </DrSec>
          <DrSec title="Lịch trình">
            {dirSel.startDate && <DrField lbl="Bắt đầu">{dayjs(dirSel.startDate).format('DD/MM/YYYY')}</DrField>}
            {dirSel.endDate   && <DrField lbl="Kết thúc">{dayjs(dirSel.endDate).format('DD/MM/YYYY')}</DrField>}
          </DrSec>
          {dirSel.objectives && (
            <DrSec title="Mục tiêu">
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 'var(--fs-md)', color: 'var(--t-1)' }}>{dirSel.objectives}</div>
            </DrSec>
          )}
          {dirSel.notes && (
            <DrSec title="Ghi chú">
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 'var(--fs-md)', color: 'var(--t-1)' }}>{dirSel.notes}</div>
            </DrSec>
          )}
        </>}
      </DrawerShell>

      <CrudModal
        open={dirCrudOpen} onClose={() => setDirCrudOpen(false)}
        title={dirCrudInit?.id ? 'Cập nhật chỉ đạo tuyến' : 'Thêm chỉ đạo tuyến mới'}
        fields={DIR_FIELDS} initial={dirCrudInit} size="lg"
        onSubmit={async (v, editing) => {
          await saveClinicalDirection(v as Partial<ClinicalDirectionDto>, editing ? (dirCrudInit?.id as string) : undefined);
          tk(editing ? 'Đã cập nhật' : 'Đã thêm chỉ đạo tuyến');
          loadDirs();
        }}
      />

      {/* ─── Drawer: Chi tiết đề tài NCKH ───────────────────────────────── */}
      <DrawerShell
        open={!!projSel} onClose={() => setProjSel(null)} size="lg"
        title={projSel ? projSel.title : ''}
        sub={projSel ? `${projSel.projectCode} · ${projSel.levelName || RESEARCH_LEVEL_LABEL[projSel.level] || ''}` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setProjSel(null)}>Đóng</Btn>
          <Btn variant="primary" icon="edit" onClick={() => { if (projSel) { openProjEdit(projSel); setProjSel(null); } }}>Chỉnh sửa</Btn>
        </>}
      >
        {projSel && <>
          <DrSec title="Đề tài">
            <DrField lbl="Mã"><span style={{ fontFamily: 'var(--font-mono)' }}>{projSel.projectCode}</span></DrField>
            <DrField lbl="Tên">{projSel.title}</DrField>
            <DrField lbl="Cấp">
              <StatusBadge tone="info">{projSel.levelName || RESEARCH_LEVEL_LABEL[projSel.level] || `#${projSel.level}`}</StatusBadge>
            </DrField>
            <DrField lbl="Chủ nhiệm">{projSel.principalInvestigatorName || '—'}</DrField>
            <DrField lbl="Ngân sách">
              <span style={{ fontFamily: 'var(--font-mono)' }}>
                {projSel.budget > 0 ? `${(projSel.budget / 1_000_000).toFixed(0)} tr đ` : '—'}
              </span>
            </DrField>
            <DrField lbl="Trạng thái">
              <StatusBadge tone={({ 1: 'info', 2: 'info', 3: 'warn', 4: 'ok', 5: 'ok' } as Record<number, 'info'|'ok'|'warn'>)[projSel.status] ?? 'info'} dot>
                {projSel.statusName || `#${projSel.status}`}
              </StatusBadge>
            </DrField>
          </DrSec>
          <DrSec title="Thời gian">
            {projSel.startDate && <DrField lbl="Bắt đầu">{dayjs(projSel.startDate).format('DD/MM/YYYY')}</DrField>}
            {projSel.endDate   && <DrField lbl="Kết thúc">{dayjs(projSel.endDate).format('DD/MM/YYYY')}</DrField>}
          </DrSec>
          {projSel.abstract && (
            <DrSec title="Tóm tắt">
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 'var(--fs-md)', color: 'var(--t-1)' }}>{projSel.abstract}</div>
            </DrSec>
          )}
          {projSel.findings && (
            <DrSec title="Kết quả">
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 'var(--fs-md)', color: 'var(--t-1)' }}>{projSel.findings}</div>
            </DrSec>
          )}
          {projSel.publicationInfo && (
            <DrSec title="Thông tin công bố">
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 'var(--fs-md)', color: 'var(--t-1)' }}>{projSel.publicationInfo}</div>
            </DrSec>
          )}
        </>}
      </DrawerShell>

      <CrudModal
        open={projCrudOpen} onClose={() => setProjCrudOpen(false)}
        title={projCrudInit?.id ? 'Cập nhật đề tài' : 'Thêm đề tài nghiên cứu'}
        fields={PROJ_FIELDS} initial={projCrudInit} size="lg"
        onSubmit={async (v, editing) => {
          await saveResearchProject(v as Partial<ResearchProjectDto>, editing ? (projCrudInit?.id as string) : undefined);
          tk(editing ? 'Đã cập nhật đề tài' : 'Đã thêm đề tài nghiên cứu');
          loadProjs();
        }}
      />
    </div>
  );
};

export default TrainingResearchV2;
