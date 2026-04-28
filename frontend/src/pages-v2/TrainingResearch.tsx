import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { getTrainingClasses, getTrainingDashboard } from '../api/trainingResearch';
import type { TrainingClassDto, TrainingDashboardDto } from '../api/trainingResearch';
import { GenericListPage } from './_GenericListPage';

const STATUS_CLS: Record<number, string> = { 0: 'ghost', 1: 'cy', 2: 'ok', 3: 'warn', 4: 'crit' };

const TrainingResearchV2: React.FC = () => {
  const [items, setItems] = useState<TrainingClassDto[]>([]);
  const [dash, setDash] = useState<TrainingDashboardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sel, setSel] = useState<TrainingClassDto | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [list, d] = await Promise.all([getTrainingClasses({ keyword, pageSize: 100 }), getTrainingDashboard()]);
      setItems(list);
      setDash(d);
      if (list.length > 0 && !sel) setSel(list[0]);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const stats = useMemo(() => [
    { label: 'Lớp đào tạo', value: dash?.totalClasses ?? items.length },
    { label: 'Đang mở', value: dash?.activeClasses ?? items.filter((c) => c.status === 1).length, tone: 'cy' as const },
    { label: 'Học viên', value: dash?.totalStudents ?? items.reduce((s, c) => s + (c.enrolledCount || 0), 0), tone: 'ok' as const },
    { label: 'CME tuân thủ', value: `${(dash?.cmeCompliancePercent ?? 0).toFixed(0)}%`, tone: 'warn' as const },
  ], [items, dash]);

  return (
    <GenericListPage<TrainingClassDto>
      title="Đào tạo & NCKH — Lớp học" v1Path="/training-research"
      items={items} loading={loading}
      keyword={keyword} onKeywordChange={setKeyword} onSearch={load}
      searchPlaceholder="Tìm tên lớp / mã..."
      selectedId={sel?.id} onSelect={setSel}
      stats={stats}
      columns={[
        { key: 'code', label: 'Mã', render: (r) => <span className="mono">{r.classCode}</span> },
        { key: 'name', label: 'Tên lớp', render: (r) => <span style={{ fontWeight: 500 }}>{r.className}</span> },
        { key: 'type', label: 'Loại', render: (r) => <span className="muted">{r.trainingTypeName || `#${r.trainingType}`}</span> },
        { key: 'instr', label: 'GV', render: (r) => <span className="muted">{r.instructorName || '—'}</span> },
        { key: 'date', label: 'Bắt đầu', render: (r) => r.startDate ? <span className="mono">{dayjs(r.startDate).format('DD/MM/YY')}</span> : <span className="muted">—</span> },
        { key: 'enr', label: 'HV', render: (r) => <span className="mono">{r.enrolledCount}/{r.maxStudents}</span> },
        { key: 'cred', label: 'Tín chỉ', render: (r) => <span className="mono">{r.creditHours}</span> },
        { key: 'status', label: 'TT', render: (r) => <span className={`chip ${STATUS_CLS[r.status] || 'ghost'}`}>{r.statusName || ''}</span> },
      ]}
      detailTitle={sel?.classCode || 'Chọn lớp'}
      detailFields={!sel ? null : [
        { label: 'Mã lớp', value: <span className="mono">{sel.classCode}</span> },
        { label: 'Tên lớp', value: sel.className },
        { label: 'Loại', value: sel.trainingTypeName || `#${sel.trainingType}` },
        { label: 'GV', value: sel.instructorName || '—' },
        { label: 'Khoa', value: sel.departmentName || '—' },
        ...(sel.startDate ? [{ label: 'Bắt đầu', value: <span className="mono">{dayjs(sel.startDate).format('DD/MM/YYYY')}</span> }] : []),
        ...(sel.endDate ? [{ label: 'Kết thúc', value: <span className="mono">{dayjs(sel.endDate).format('DD/MM/YYYY')}</span> }] : []),
        { label: 'Địa điểm', value: sel.location || '—' },
        { label: 'Học viên', value: <span className="mono">{sel.enrolledCount}/{sel.maxStudents}</span> },
        { label: 'Tín chỉ', value: <span className="mono">{sel.creditHours}</span> },
        { label: 'Học phí', value: <span className="mono">{(sel.fee || 0).toLocaleString('vi-VN')} đ</span> },
        ...(sel.description ? [{ label: 'Mô tả', value: sel.description }] : []),
      ]}
    />
  );
};

export default TrainingResearchV2;
