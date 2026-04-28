import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { searchOccExams } from '../api/occupationalHealth';
import type { OccExam } from '../api/occupationalHealth';
import { GenericListPage } from './_GenericListPage';

const STATUS: Record<number, { text: string; cls: string }> = {
  0: { text: 'Chờ', cls: 'warn' }, 1: { text: 'Đang khám', cls: 'cy' },
  2: { text: 'Xong', cls: 'cy' }, 3: { text: 'Đã chứng nhận', cls: 'ok' },
};
const CLASS: Record<string, { text: string; cls: string }> = {
  pass: { text: 'Đạt', cls: 'ok' }, fail: { text: 'Không đạt', cls: 'crit' }, restricted: { text: 'Hạn chế', cls: 'warn' },
};

const OccupationalHealthV2: React.FC = () => {
  const [items, setItems] = useState<OccExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sel, setSel] = useState<OccExam | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r: any = await searchOccExams({ keyword });
      const list = (r?.items || (Array.isArray(r) ? r : [])) as OccExam[];
      setItems(list);
      if (list.length > 0 && !sel) setSel(list[0]);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const stats = useMemo(() => [
    { label: 'Tổng khám', value: items.length },
    { label: 'Đã chứng nhận', value: items.filter((e) => e.status === 3).length, tone: 'ok' as const },
    { label: 'Bệnh nghề nghiệp', value: items.filter((e) => e.occupationalDisease).length, tone: 'crit' as const },
    { label: 'Hạn chế', value: items.filter((e) => e.classification === 'restricted').length, tone: 'warn' as const },
  ], [items]);

  return (
    <GenericListPage<OccExam>
      title="Khám SK nghề nghiệp" v1Path="/occupational-health"
      items={items} loading={loading}
      keyword={keyword} onKeywordChange={setKeyword} onSearch={load}
      searchPlaceholder="Tìm BN / công ty..."
      selectedId={sel?.id} onSelect={setSel}
      stats={stats}
      columns={[
        { key: 'code', label: 'Mã KS', render: (r) => <span className="mono">{r.examCode}</span> },
        { key: 'pt', label: 'NV', render: (r) => (
          <><div style={{ fontWeight: 500 }}>{r.patientName}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--t-3)' }}>{r.patientCode}</div></>
        ) },
        { key: 'comp', label: 'Công ty', render: (r) => <span className="muted">{r.companyName}</span> },
        { key: 'occ', label: 'Nghề', render: (r) => <span className="muted">{r.occupation}</span> },
        { key: 'years', label: 'Năm TX', render: (r) => <span className="mono">{r.yearsOfExposure}</span> },
        { key: 'date', label: 'Ngày khám', render: (r) => <span className="mono">{dayjs(r.examDate).format('DD/MM/YYYY')}</span> },
        { key: 'class', label: 'Loại', render: (r) => {
          const c = CLASS[r.classification] || { text: r.classification, cls: 'ghost' };
          return <span className={`chip ${c.cls}`}>{c.text}</span>;
        } },
        { key: 'status', label: 'TT', render: (r) => {
          const s = STATUS[r.status] || { text: '—', cls: 'ghost' };
          return <span className={`chip ${s.cls}`}>{s.text}</span>;
        } },
      ]}
      detailTitle={sel?.patientName || 'Chọn KS'}
      detailFields={!sel ? null : [
        { label: 'Mã KS', value: <span className="mono">{sel.examCode}</span> },
        { label: 'NV', value: `${sel.patientName} · ${sel.patientCode}` },
        { label: 'Giới tính', value: sel.gender === 1 ? 'Nam' : 'Nữ' },
        { label: 'Công ty', value: sel.companyName },
        { label: 'Khoa/Phòng', value: sel.department },
        { label: 'Nghề', value: sel.occupation },
        { label: 'Năm tiếp xúc', value: <span className="mono">{sel.yearsOfExposure}</span> },
        { label: 'Yếu tố nguy cơ', value: sel.hazardTypes?.join(', ') || '—' },
        { label: 'BS khám', value: sel.examDoctor },
        { label: 'Phân loại', value: CLASS[sel.classification]?.text || sel.classification },
        ...(sel.occupationalDisease ? [{ label: 'BNN', value: <span style={{ color: 'var(--s-crit)' }}>{sel.occupationalDisease}</span> }] : []),
      ]}
    />
  );
};

export default OccupationalHealthV2;
