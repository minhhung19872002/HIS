import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { searchSchoolExams, getSchoolStats } from '../api/schoolHealth';
import type { SchoolExam, SchoolStats } from '../api/schoolHealth';
import { GenericListPage } from './_GenericListPage';

const STATUS: Record<number, { text: string; cls: string }> = {
  0: { text: 'Chờ', cls: 'warn' },
  1: { text: 'Hoàn tất', cls: 'ok' },
  2: { text: 'Cần theo dõi', cls: 'cy' },
};

const NUTRITION: Record<string, { text: string; cls: string }> = {
  normal: { text: 'BT', cls: 'ok' },
  underweight: { text: 'Thiếu', cls: 'warn' },
  overweight: { text: 'Thừa cân', cls: 'warn' },
  obese: { text: 'Béo phì', cls: 'crit' },
  stunted: { text: 'Còi cọc', cls: 'crit' },
};

const SchoolHealthV2: React.FC = () => {
  const [items, setItems] = useState<SchoolExam[]>([]);
  const [stats, setStats] = useState<SchoolStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sel, setSel] = useState<SchoolExam | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [list, s] = await Promise.all([searchSchoolExams({ keyword }), getSchoolStats()]);
      setItems(list);
      setStats(s);
      if (list.length > 0 && !sel) setSel(list[0]);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const statRows = useMemo(() => [
    { label: 'Trường khám', value: stats?.schoolsExamined ?? 0 },
    { label: 'HS đã khám', value: stats?.studentsExamined ?? items.length, tone: 'cy' as const },
    { label: 'Tỷ lệ hoàn tất', value: `${(stats?.completionRate ?? 0).toFixed(1)}%`, tone: 'ok' as const },
    { label: 'Cần theo dõi', value: stats?.needsFollowUp ?? items.filter((e) => e.status === 2).length, tone: 'warn' as const },
  ], [items, stats]);

  return (
    <GenericListPage<SchoolExam>
      title="Y tế học đường — Khám HS" v1Path="/school-health"
      items={items} loading={loading}
      keyword={keyword} onKeywordChange={setKeyword} onSearch={load}
      searchPlaceholder="Tìm HS / mã / trường..."
      selectedId={sel?.id} onSelect={setSel}
      stats={statRows}
      columns={[
        { key: 'code', label: 'Mã HS', render: (r) => <span className="mono">{r.studentCode}</span> },
        { key: 'name', label: 'Tên', render: (r) => <span style={{ fontWeight: 500 }}>{r.studentName}</span> },
        { key: 'school', label: 'Trường / Lớp', render: (r) => (
          <><div>{r.schoolName}</div>
            <div className="muted" style={{ fontSize: 11 }}>{r.grade} · {r.className}</div></>
        ) },
        { key: 'date', label: 'Khám', render: (r) => <span className="mono">{dayjs(r.examDate).format('DD/MM')}</span> },
        { key: 'bmi', label: 'BMI', render: (r) => <span className="mono">{r.bmi.toFixed(1)}</span> },
        { key: 'nut', label: 'DD', render: (r) => {
          const n = NUTRITION[r.nutritionStatus] || { text: r.nutritionStatus, cls: 'ghost' };
          return <span className={`chip ${n.cls}`}>{n.text}</span>;
        } },
        { key: 'flag', label: 'Cờ', render: (r) => (
          <>
            {r.visionFlag && <span className="chip warn" style={{ marginRight: 4 }}>Mắt</span>}
            {r.hearingFlag && <span className="chip warn" style={{ marginRight: 4 }}>Tai</span>}
            {r.dentalFlag && <span className="chip warn" style={{ marginRight: 4 }}>Răng</span>}
            {r.scoliosisFlag && <span className="chip warn">CV</span>}
            {!(r.visionFlag || r.hearingFlag || r.dentalFlag || r.scoliosisFlag) && <span className="muted">—</span>}
          </>
        ) },
        { key: 'status', label: 'TT', render: (r) => {
          const s = STATUS[r.status] || { text: '—', cls: 'ghost' };
          return <span className={`chip ${s.cls}`}>{s.text}</span>;
        } },
      ]}
      detailTitle={sel?.studentCode || 'Chọn HS'}
      detailFields={!sel ? null : [
        { label: 'Mã HS', value: <span className="mono">{sel.studentCode}</span> },
        { label: 'Tên', value: sel.studentName },
        { label: 'GT/Sinh', value: `${sel.gender === 1 ? 'Nam' : 'Nữ'} · ${dayjs(sel.dateOfBirth).format('DD/MM/YYYY')}` },
        { label: 'Trường', value: `${sel.schoolName} (${sel.schoolCode})` },
        { label: 'Lớp / Năm', value: `${sel.grade} · ${sel.className} · ${sel.academicYear}` },
        { label: 'Ngày khám', value: <span className="mono">{dayjs(sel.examDate).format('DD/MM/YYYY')}</span> },
        { label: 'BS khám', value: sel.examDoctor },
        { label: 'Cao / Cân', value: <span className="mono">{sel.height} cm · {sel.weight} kg</span> },
        { label: 'BMI / DD', value: <span className="mono">{sel.bmi.toFixed(1)} · {NUTRITION[sel.nutritionStatus]?.text || sel.nutritionStatus}</span> },
        { label: 'Thị lực', value: <span className="mono">L: {sel.visionLeft} · R: {sel.visionRight}</span> },
        { label: 'Kết luận', value: sel.conclusion || '—' },
        ...(sel.recommendations ? [{ label: 'Khuyến nghị', value: sel.recommendations }] : []),
      ]}
    />
  );
};

export default SchoolHealthV2;
