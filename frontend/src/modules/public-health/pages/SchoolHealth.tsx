import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  searchSchoolExams, getSchoolStats, getSchoolList, createSchoolExam, updateSchoolExam,
} from '../api/schoolHealth';
import type { SchoolExam, SchoolStats, School } from '../api/schoolHealth';
import {
  KpiStrip, StatusTabs, SearchBox, DataTable, Pager, StatusBadge, ActBtn, Btn,
  DrawerShell, DrSec, DrField, CrudModal, useTabCounts, tk, fmtDMYg, Ico,
  type ColumnDef, type StatusTab, type CrudFieldCfg,
} from '@/_v2kit';

// ─────────────────────────── Maps & options (port từ v1) ───────────────────────────

type StatusKey = 'pending' | 'completed' | 'needsFollowUp';
const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'pending',       l: 'Chờ khám',     tone: 'info' },
  { v: 'completed',     l: 'Hoàn thành',   tone: 'ok' },
  { v: 'needsFollowUp', l: 'Cần theo dõi', tone: 'warn' },
];
const statusKey = (s: number): StatusKey => s === 1 ? 'completed' : s === 2 ? 'needsFollowUp' : 'pending';

const NUTRITION_LABEL: Record<string, string> = {
  normal: 'Bình thường', underweight: 'Nhẹ cân', overweight: 'Thừa cân', obese: 'Béo phì', stunted: 'Thấp còi',
};
const NUTRITION_TONE: Record<string, 'ok' | 'warn' | 'crit'> = {
  normal: 'ok', underweight: 'warn', overweight: 'warn', obese: 'crit', stunted: 'crit',
};

const GRADE_OPTIONS = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `Lớp ${i + 1}` }));
const YEAR_OPTIONS = ['2025-2026', '2024-2025', '2023-2024'];
const FLAG_OPTIONS = [{ value: false, label: 'Bình thường' }, { value: true, label: 'Cần theo dõi' }];

const EXAM_FIELDS: CrudFieldCfg[] = [
  { key: 'studentName', label: 'Họ tên học sinh', required: true, placeholder: 'Họ và tên học sinh' },
  { key: 'gender', label: 'Giới tính', type: 'select', options: [{ value: 1, label: 'Nam' }, { value: 2, label: 'Nữ' }] },
  { key: 'dateOfBirth', label: 'Ngày sinh', type: 'date' },
  { key: 'examDate', label: 'Ngày khám', type: 'date' },
  { key: 'schoolName', label: 'Trường', required: true, placeholder: 'Tên trường' },
  { key: 'grade', label: 'Khối', type: 'select', required: true, options: GRADE_OPTIONS },
  { key: 'className', label: 'Lớp', placeholder: 'A1' },
  { key: 'academicYear', label: 'Năm học', placeholder: '2025-2026' },
  { key: 'height', label: 'Chiều cao (cm)', type: 'number', placeholder: 'cm' },
  { key: 'weight', label: 'Cân nặng (kg)', type: 'number', placeholder: 'kg' },
  { key: 'visionLeft', label: 'Thị lực trái', placeholder: '10/10' },
  { key: 'visionRight', label: 'Thị lực phải', placeholder: '10/10' },
  { key: 'nutritionStatus', label: 'Dinh dưỡng', type: 'select',
    options: Object.entries(NUTRITION_LABEL).map(([value, label]) => ({ value, label })) },
  { key: 'visionFlag', label: 'Cờ mắt', type: 'select', options: FLAG_OPTIONS },
  { key: 'hearingFlag', label: 'Cờ tai', type: 'select', options: FLAG_OPTIONS },
  { key: 'dentalFlag', label: 'Cờ răng', type: 'select', options: FLAG_OPTIONS },
  { key: 'scoliosisFlag', label: 'Cờ cột sống', type: 'select', options: FLAG_OPTIONS },
  { key: 'conclusion', label: 'Kết luận', type: 'textarea', placeholder: 'Kết luận khám sức khỏe...' },
  { key: 'recommendations', label: 'Khuyến nghị', type: 'textarea', placeholder: 'Lời khuyên, theo dõi...' },
];

const EMPTY_STATS: SchoolStats = { schoolsExamined: 0, studentsExamined: 0, completionRate: 0, needsFollowUp: 0 };

const SEL: React.CSSProperties = {
  height: 30, padding: '0 8px', borderRadius: 4,
  border: '1px solid var(--line)', background: 'var(--bg-1)',
  color: 'inherit', fontSize: 13,
};

const asArr = <T,>(r: unknown): T[] => {
  if (Array.isArray(r)) return r as T[];
  const o = r as { items?: T[]; data?: { items?: T[] } } | null | undefined;
  return o?.items ?? o?.data?.items ?? [];
};

const PER = 20;

// ─────────────────────────── Page ───────────────────────────

const SchoolHealthV2: React.FC = () => {
  const [rows, setRows] = useState<SchoolExam[]>([]);
  const [stats, setStats] = useState<SchoolStats>(EMPTY_STATS);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);

  // Bộ lọc server-side (giống v1: trường / năm học / khối)
  const [schoolFilter, setSchoolFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('2025-2026');
  const [gradeFilter, setGradeFilter] = useState('');

  // Bộ lọc client-side
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<StatusKey | 'all'>('all');
  const [page, setPage] = useState(0);

  const [sel, setSel] = useState<SchoolExam | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRow, setEditRow] = useState<SchoolExam | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [exRes, stRes, scRes] = await Promise.allSettled([
      searchSchoolExams({
        schoolCode: schoolFilter || undefined,
        academicYear: yearFilter || undefined,
        grade: gradeFilter || undefined,
      }),
      getSchoolStats(),
      getSchoolList(),
    ]);
    if (exRes.status === 'fulfilled') setRows(asArr<SchoolExam>(exRes.value));
    if (stRes.status === 'fulfilled' && stRes.value && typeof stRes.value === 'object') {
      setStats({ ...EMPTY_STATS, ...stRes.value });
    }
    if (scRes.status === 'fulfilled') setSchools(asArr<School>(scRes.value));
    setLoading(false);
  }, [schoolFilter, yearFilter, gradeFilter]);

  useEffect(() => { load(); }, [load]);

  const counts = useTabCounts(rows, STATUS_TABS, (r) => statusKey(r.status));

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (stab !== 'all' && statusKey(r.status) !== stab) return false;
      if (!k) return true;
      return [r.studentName, r.studentCode, r.schoolName, r.className]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [rows, search, stab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const openCreate = () => { setEditRow(null); setModalOpen(true); };
  const openEdit = (r: SchoolExam) => { setSel(null); setEditRow(r); setModalOpen(true); };

  const columns: ColumnDef<SchoolExam>[] = [
    { key: 'student', label: 'Học sinh', render: (r) => (
      <div className="cell-2l">
        <b>{r.studentName}</b>
        <i className="mono">{[r.studentCode, r.gender === 1 ? 'Nam' : 'Nữ', fmtDMYg(r.dateOfBirth)].filter(Boolean).join(' · ')}</i>
      </div>
    ) },
    { key: 'school', label: 'Trường · Lớp', render: (r) => (
      <div className="cell-2l"><b>{r.schoolName}</b><i>Lớp {r.grade}{r.className} · {r.academicYear}</i></div>
    ) },
    { key: 'body', label: 'Cao / Nặng', mono: true, width: 120,
      render: (r) => `${r.height ? `${r.height} cm` : '—'} · ${r.weight ? `${r.weight} kg` : '—'}` },
    { key: 'bmi', label: 'BMI', mono: true, width: 60, render: (r) => r.bmi
      ? <span style={{ color: r.bmi >= 25 || r.bmi < 18 ? 'var(--s-warn)' : 'var(--t-1)' }}>{r.bmi.toFixed(1)}</span>
      : '—' },
    { key: 'nutrition', label: 'Dinh dưỡng', width: 110, render: (r) => NUTRITION_LABEL[r.nutritionStatus]
      ? <span className={`chip ${NUTRITION_TONE[r.nutritionStatus] || 'info'}`}>{NUTRITION_LABEL[r.nutritionStatus]}</span>
      : <span style={{ color: 'var(--t-3)' }}>—</span> },
    { key: 'flags', label: 'Cờ cảnh báo', width: 180, render: (r) => (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {r.visionFlag && <span className="chip warn">Mắt</span>}
        {r.hearingFlag && <span className="chip warn">Tai</span>}
        {r.dentalFlag && <span className="chip warn">Răng</span>}
        {r.scoliosisFlag && <span className="chip crit">Cong vẹo CS</span>}
        {!r.visionFlag && !r.hearingFlag && !r.dentalFlag && !r.scoliosisFlag &&
          <span style={{ color: 'var(--t-3)' }}>—</span>}
      </div>
    ) },
    { key: 'date', label: 'Ngày khám', mono: true, width: 100, render: (r) => fmtDMYg(r.examDate) },
    { key: 'status', label: 'TT', width: 130, render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === statusKey(r.status));
      return <StatusBadge tone={t?.tone} dot>{t?.l}</StatusBadge>;
    } },
  ];

  const rowActions = (r: SchoolExam) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Xem chi tiết" onClick={() => setSel(r)} />
      <ActBtn ic="edit" title="Sửa phiếu khám" onClick={() => openEdit(r)} />
    </div>
  );

  const flagged = rows.filter((r) => r.visionFlag || r.hearingFlag || r.dentalFlag || r.scoliosisFlag).length;
  const malnutrition = rows.filter((r) => r.nutritionStatus && r.nutritionStatus !== 'normal').length;

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Trường đã khám', val: stats.schoolsExamined },
        { lbl: 'HS đã khám', val: stats.studentsExamined, tone: 'info' },
        { lbl: 'Tỷ lệ hoàn thành', val: stats.completionRate, unit: '%', tone: 'ok' },
        { lbl: 'Cần theo dõi', val: stats.needsFollowUp, tone: 'warn' },
        { lbl: 'Có cờ cảnh báo', val: flagged, sub: 'mắt/tai/răng/CS', tone: 'warn' },
        { lbl: 'DD bất thường', val: malnutrition, sub: 'trong danh sách', tone: 'warn' },
      ]} />

      <div className="ab-toolbar">
        <SearchBox
          value={search}
          onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm học sinh / mã HS / trường / lớp…"
        />
        <select style={SEL} value={schoolFilter} onChange={(e) => { setSchoolFilter(e.target.value); setPage(0); }}>
          <option value="">-- Trường --</option>
          {schools.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
        </select>
        <select style={SEL} value={yearFilter} onChange={(e) => { setYearFilter(e.target.value); setPage(0); }}>
          {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select style={SEL} value={gradeFilter} onChange={(e) => { setGradeFilter(e.target.value); setPage(0); }}>
          <option value="">-- Khối lớp --</option>
          {GRADE_OPTIONS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
        </select>
        <span className="spacer" />
        <Btn variant="primary" onClick={openCreate}>
          <Ico name="plus" size={12} /> Tạo phiếu khám
        </Btn>
        <Btn variant="ghost" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </Btn>
      </div>

      <StatusTabs<StatusKey>
        value={stab}
        onChange={(v) => { setStab(v); setPage(0); }}
        tabs={STATUS_TABS}
        counts={counts}
      />

      <DataTable<SchoolExam>
        columns={columns}
        data={paged}
        rowKey={(r) => r.id}
        onRowClick={setSel}
        actions={rowActions}
        empty={loading ? 'Đang tải…' : 'Không có phiếu khám sức khỏe'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel?.studentName || ''}
        sub={sel ? `${sel.schoolName} · Lớp ${sel.grade}${sel.className} · ${sel.academicYear}` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
          <Btn variant="primary" onClick={() => sel && openEdit(sel)}>
            <Ico name="edit" size={12} /> Sửa phiếu
          </Btn>
        </>}
      >
        {sel && (
          <>
            <DrSec title="Học sinh">
              <DrField lbl="Họ tên"><b>{sel.studentName}</b></DrField>
              <DrField lbl="Mã HS"><span className="mono" style={{ color: 'var(--a-cy)' }}>{sel.studentCode || '—'}</span></DrField>
              <DrField lbl="Giới tính">{sel.gender === 1 ? 'Nam' : 'Nữ'}</DrField>
              <DrField lbl="Ngày sinh">{fmtDMYg(sel.dateOfBirth)}</DrField>
              <DrField lbl="Trường"><b>{sel.schoolName}</b></DrField>
              <DrField lbl="Lớp">{sel.grade}{sel.className}</DrField>
              <DrField lbl="Năm học">{sel.academicYear}</DrField>
            </DrSec>

            <DrSec title="Khám & thể chất">
              <DrField lbl="Ngày khám">{fmtDMYg(sel.examDate)}</DrField>
              <DrField lbl="BS khám">{sel.examDoctor || '—'}</DrField>
              <DrField lbl="Chiều cao">{sel.height ? `${sel.height} cm` : '—'}</DrField>
              <DrField lbl="Cân nặng">{sel.weight ? `${sel.weight} kg` : '—'}</DrField>
              <DrField lbl="BMI"><b>{sel.bmi ? sel.bmi.toFixed(1) : '—'}</b></DrField>
              <DrField lbl="Dinh dưỡng">
                {NUTRITION_LABEL[sel.nutritionStatus]
                  ? <span className={`chip ${NUTRITION_TONE[sel.nutritionStatus] || 'info'}`}>{NUTRITION_LABEL[sel.nutritionStatus]}</span>
                  : '—'}
              </DrField>
            </DrSec>

            <DrSec title="Kết quả kiểm tra">
              <DrField lbl="Thị lực trái">{sel.visionLeft || '—'}</DrField>
              <DrField lbl="Thị lực phải">{sel.visionRight || '—'}</DrField>
              <DrField lbl="Cờ mắt">{sel.visionFlag ? <span className="chip warn">Cần theo dõi</span> : 'Bình thường'}</DrField>
              <DrField lbl="Cờ tai">{sel.hearingFlag ? <span className="chip warn">Cần theo dõi</span> : 'Bình thường'}</DrField>
              <DrField lbl="Cờ răng">{sel.dentalFlag ? <span className="chip warn">Cần theo dõi</span> : 'Bình thường'}</DrField>
              <DrField lbl="Cờ cột sống">{sel.scoliosisFlag ? <span className="chip crit">Cần theo dõi</span> : 'Bình thường'}</DrField>
              <DrField lbl="Trạng thái">
                {(() => {
                  const t = STATUS_TABS.find((x) => x.v === statusKey(sel.status));
                  return <StatusBadge tone={t?.tone} dot>{t?.l}</StatusBadge>;
                })()}
              </DrField>
            </DrSec>

            {sel.conclusion && (
              <DrSec title="Kết luận">
                <div style={{ fontSize: 12.5, color: 'var(--t-1)', whiteSpace: 'pre-wrap' }}>{sel.conclusion}</div>
              </DrSec>
            )}
            {sel.recommendations && (
              <DrSec title="Khuyến nghị">
                <div style={{ fontSize: 12.5, color: 'var(--t-1)', whiteSpace: 'pre-wrap' }}>{sel.recommendations}</div>
              </DrSec>
            )}
          </>
        )}
      </DrawerShell>

      <CrudModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditRow(null); }}
        title={editRow ? 'Sửa phiếu khám' : 'Tạo phiếu khám sức khỏe học sinh'}
        sub={editRow ? `${editRow.studentName} · ${editRow.schoolName}` : undefined}
        fields={EXAM_FIELDS}
        initial={editRow ? { ...editRow } : { academicYear: yearFilter }}
        size="lg"
        onSubmit={async (v, isEdit) => {
          const payload = v as Partial<SchoolExam>;
          if (isEdit && editRow) {
            await updateSchoolExam(editRow.id, payload);
            tk('Đã cập nhật phiếu khám');
          } else {
            await createSchoolExam(payload);
            tk('Đã tạo phiếu khám');
          }
          setEditRow(null);
          load();
        }}
      />
    </div>
  );
};

export default SchoolHealthV2;
