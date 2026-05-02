import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { searchSchoolExams, getSchoolStats } from '../api/schoolHealth';
import type { SchoolExam, SchoolStats } from '../api/schoolHealth';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn,
  DrawerShell, DrSec, DrField, tk, ti, Ico,
  type ColumnDef,
} from './_v2kit';

const STATUS_LABEL: Record<number, string> = { 0: 'Chờ', 1: 'Hoàn tất', 2: 'Cần theo dõi' };

type SKey = 'pending' | 'done' | 'follow';
const STATUS_TABS = [
  { v: 'pending' as SKey, l: 'Chờ',          tone: 'warn' as const },
  { v: 'done' as SKey,    l: 'Hoàn tất',     tone: 'ok' as const },
  { v: 'follow' as SKey,  l: 'Cần theo dõi', tone: 'info' as const },
];

const sKey = (n: number): SKey => n === 0 ? 'pending' : n === 1 ? 'done' : 'follow';

const NUTRITION: Record<string, { l: string; tone: 'ok' | 'info' | 'warn' | 'crit' }> = {
  normal:      { l: 'Bình thường', tone: 'ok' },
  underweight: { l: 'Thiếu cân',   tone: 'warn' },
  overweight:  { l: 'Thừa cân',    tone: 'warn' },
  obese:       { l: 'Béo phì',     tone: 'crit' },
  stunted:     { l: 'Còi cọc',     tone: 'crit' },
};

const PER = 18;

const SchoolHealthV2: React.FC = () => {
  const [items, setItems] = useState<SchoolExam[]>([]);
  const [stats, setStats] = useState<SchoolStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fSchool, setFSchool] = useState('');
  const [fGrade, setFGrade] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<SchoolExam | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [list, s] = await Promise.all([searchSchoolExams({ keyword: search }), getSchoolStats()]);
      setItems(list);
      setStats(s);
    } catch { ti('Không tải được dữ liệu y tế học đường'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const schools = useMemo(() => {
    const set = new Set(items.map((r) => r.schoolName).filter(Boolean));
    return Array.from(set).map((v) => ({ v, l: v }));
  }, [items]);
  const grades = useMemo(() => {
    const set = new Set(items.map((r) => r.grade).filter(Boolean));
    return Array.from(set).map((v) => ({ v, l: `Khối ${v}` }));
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
      if (fSchool && r.schoolName !== fSchool) return false;
      if (fGrade && r.grade !== fGrade) return false;
      if (!k) return true;
      return [r.studentName, r.studentCode, r.schoolName, r.className]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fSchool, fGrade]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const flagCount = (r: SchoolExam) =>
    (r.visionFlag ? 1 : 0) + (r.hearingFlag ? 1 : 0) + (r.dentalFlag ? 1 : 0) + (r.scoliosisFlag ? 1 : 0);

  const cols: ColumnDef<SchoolExam>[] = [
    { key: 'code', label: 'Mã HS', code: true, render: (r) => r.studentCode },
    { key: 'name', label: 'Học sinh', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.studentName}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.gender === 1 ? 'Nam' : 'Nữ'} · {dayjs(r.dateOfBirth).format('DD/MM/YYYY')}</div>
      </div>
    ) },
    { key: 'sch', label: 'Trường / Lớp', render: (r) => (
      <div>
        <div>{r.schoolName}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.grade} · {r.className}</div>
      </div>
    ) },
    { key: 'date', label: 'Ngày khám', mono: true, render: (r) => dayjs(r.examDate).format('DD/MM/YYYY') },
    { key: 'bmi', label: 'BMI', mono: true, render: (r) => r.bmi.toFixed(1) },
    { key: 'nut', label: 'Dinh dưỡng', render: (r) => {
      const n = NUTRITION[r.nutritionStatus];
      return n ? <StatusBadge tone={n.tone}>{n.l}</StatusBadge> : <span style={{ color: 'var(--t-2)' }}>{r.nutritionStatus}</span>;
    } },
    { key: 'flag', label: 'Cờ', render: (r) => {
      const c = flagCount(r);
      if (!c) return <span style={{ color: 'var(--t-2)' }}>—</span>;
      return <span style={{ color: 'var(--a-or-text)', fontWeight: 600 }}>{c}</span>;
    } },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === sKey(r.status));
      return <StatusBadge tone={t?.tone || 'info'} dot>{STATUS_LABEL[r.status] || '—'}</StatusBadge>;
    } },
  ];

  const actions = (r: SchoolExam) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      <ActBtn ic="print" title="In phiếu" onClick={() => tk(`Đã in phiếu ${r.studentCode}`)} />
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Trường khám', val: stats?.schoolsExamined ?? 0, sub: 'tổng số' },
        { lbl: 'HS đã khám', val: stats?.studentsExamined ?? items.length, sub: 'tổng số', tone: 'info' },
        { lbl: 'Hoàn tất', val: `${(stats?.completionRate ?? 0).toFixed(1)}`, unit: '%', sub: 'tỷ lệ', tone: 'ok' },
        { lbl: 'Cần theo dõi', val: stats?.needsFollowUp ?? counts.follow ?? 0, sub: 'có vấn đề', tone: 'warn' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm tên / mã HS / trường…" />
        <Filter value={fSchool} onChange={setFSchool} options={schools} placeholder="▾ Trường" />
        <Filter value={fGrade} onChange={setFGrade} options={grades} placeholder="▾ Khối" />
        <button className="ab-btn ghost" type="button" onClick={() => { setSearch(''); setFSchool(''); setFGrade(''); setStab('all'); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </button>
        <button className="ab-btn primary" type="button" onClick={() => tk('Mở khám hàng loạt')}>
          <Ico name="plus" size={12} /> Khám lớp
        </button>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<SchoolExam>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có học sinh nào'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? sel.studentName : ''}
        sub={sel ? `${sel.studentCode} · ${sel.schoolName}` : ''}
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setSel(null)}>Đóng</button>
          <button type="button" className="ab-btn" onClick={() => tk('Đã in phiếu khám')}>
            <Ico name="print" size={12} /> In phiếu
          </button>
          <button type="button" className="ab-btn primary" onClick={() => tk('Mở chỉnh sửa')}>
            <Ico name="edit" size={12} /> Chỉnh sửa
          </button>
        </>}
      >
        {sel && <>
          <DrSec title="Học sinh">
            <DrField lbl="Mã HS"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.studentCode}</span></DrField>
            <DrField lbl="Họ tên">{sel.studentName}</DrField>
            <DrField lbl="Giới tính">{sel.gender === 1 ? 'Nam' : 'Nữ'}</DrField>
            <DrField lbl="Ngày sinh">{dayjs(sel.dateOfBirth).format('DD/MM/YYYY')}</DrField>
          </DrSec>
          <DrSec title="Trường lớp">
            <DrField lbl="Trường">{sel.schoolName} ({sel.schoolCode})</DrField>
            <DrField lbl="Khối · Lớp">{sel.grade} · {sel.className}</DrField>
            <DrField lbl="Năm học">{sel.academicYear}</DrField>
          </DrSec>
          <DrSec title="Thể chất">
            <DrField lbl="Ngày khám">{dayjs(sel.examDate).format('DD/MM/YYYY')}</DrField>
            <DrField lbl="BS khám">{sel.examDoctor}</DrField>
            <DrField lbl="Cao · Cân"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.height} cm · {sel.weight} kg</span></DrField>
            <DrField lbl="BMI"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.bmi.toFixed(1)}</span></DrField>
            <DrField lbl="Dinh dưỡng">
              {NUTRITION[sel.nutritionStatus] ? (
                <StatusBadge tone={NUTRITION[sel.nutritionStatus].tone}>{NUTRITION[sel.nutritionStatus].l}</StatusBadge>
              ) : sel.nutritionStatus}
            </DrField>
          </DrSec>
          <DrSec title="Khám chuyên khoa">
            <DrField lbl="Thị lực"><span style={{ fontFamily: 'var(--font-mono)' }}>L: {sel.visionLeft} · R: {sel.visionRight}</span></DrField>
            <DrField lbl="Mắt">{sel.visionFlag ? <StatusBadge tone="warn" dot>Cần khám lại</StatusBadge> : <StatusBadge tone="ok" dot>Bình thường</StatusBadge>}</DrField>
            <DrField lbl="Tai">{sel.hearingFlag ? <StatusBadge tone="warn" dot>Cần khám lại</StatusBadge> : <StatusBadge tone="ok" dot>Bình thường</StatusBadge>}</DrField>
            <DrField lbl="Răng">{sel.dentalFlag ? <StatusBadge tone="warn" dot>Cần khám lại</StatusBadge> : <StatusBadge tone="ok" dot>Bình thường</StatusBadge>}</DrField>
            <DrField lbl="Cong vẹo CS">{sel.scoliosisFlag ? <StatusBadge tone="warn" dot>Cần khám lại</StatusBadge> : <StatusBadge tone="ok" dot>Bình thường</StatusBadge>}</DrField>
          </DrSec>
          {(sel.conclusion || sel.recommendations) && (
            <DrSec title="Kết luận">
              {sel.conclusion && <DrField lbl="Kết luận">{sel.conclusion}</DrField>}
              {sel.recommendations && <DrField lbl="Khuyến nghị">{sel.recommendations}</DrField>}
            </DrSec>
          )}
        </>}
      </DrawerShell>
    </div>
  );
};

export default SchoolHealthV2;
