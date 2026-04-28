import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { searchCases } from '../api/forensic';
import type { ForensicCase } from '../api/forensic';
import { GenericListPage } from './_GenericListPage';

const TYPE: Record<string, string> = {
  disability: 'Giám định KT', driver: 'Lái xe', employment: 'Việc làm',
  insurance: 'Bảo hiểm', court: 'Toà án',
};
const STATUS: Record<number, { text: string; cls: string }> = {
  0: { text: 'Chờ', cls: 'warn' }, 1: { text: 'Đang khám', cls: 'cy' },
  2: { text: 'Xong', cls: 'cy' }, 3: { text: 'Đã duyệt', cls: 'ok' },
};

const MedicalForensicsV2: React.FC = () => {
  const [items, setItems] = useState<ForensicCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sel, setSel] = useState<ForensicCase | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r: any = await searchCases({ keyword });
      const list = (r?.items || (Array.isArray(r) ? r : [])) as ForensicCase[];
      setItems(list);
      if (list.length > 0 && !sel) setSel(list[0]);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const stats = useMemo(() => [
    { label: 'Tổng ca', value: items.length },
    { label: 'Chờ khám', value: items.filter((c) => c.status === 0).length, tone: 'warn' as const },
    { label: 'Đang khám', value: items.filter((c) => c.status === 1).length, tone: 'cy' as const },
    { label: 'Đã duyệt', value: items.filter((c) => c.status === 3).length, tone: 'ok' as const },
  ], [items]);

  return (
    <GenericListPage<ForensicCase>
      title="Giám định y khoa" v1Path="/medical-forensics"
      items={items} loading={loading}
      keyword={keyword} onKeywordChange={setKeyword} onSearch={load}
      searchPlaceholder="Tìm BN / mã ca..."
      selectedId={sel?.id} onSelect={setSel}
      stats={stats}
      columns={[
        { key: 'code', label: 'Mã', render: (r) => <span className="mono">{r.caseCode}</span> },
        { key: 'pt', label: 'BN', render: (r) => (
          <><div style={{ fontWeight: 500 }}>{r.patientName}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--t-3)' }}>{r.patientCode}</div></>
        ) },
        { key: 'type', label: 'Loại', render: (r) => <span className="muted">{TYPE[r.caseType] || r.caseType}</span> },
        { key: 'org', label: 'Cơ quan YC', render: (r) => <span className="muted">{r.requestingOrganization}</span> },
        { key: 'pct', label: '% mất KN', render: (r) => <span className="mono">{r.disabilityPercent ?? '—'}</span> },
        { key: 'date', label: 'Ngày YC', render: (r) => <span className="mono">{dayjs(r.requestDate).format('DD/MM/YYYY')}</span> },
        { key: 'status', label: 'TT', render: (r) => {
          const s = STATUS[r.status] || { text: '—', cls: 'ghost' };
          return <span className={`chip ${s.cls}`}>{s.text}</span>;
        } },
      ]}
      detailTitle={sel?.patientName || 'Chọn ca'}
      detailFields={!sel ? null : [
        { label: 'Mã ca', value: <span className="mono">{sel.caseCode}</span> },
        { label: 'BN', value: `${sel.patientName} · ${sel.patientCode}` },
        { label: 'Loại', value: TYPE[sel.caseType] || sel.caseType },
        { label: 'Cơ quan YC', value: sel.requestingOrganization },
        { label: 'Mục đích', value: sel.purpose },
        { label: 'Ngày YC', value: <span className="mono">{dayjs(sel.requestDate).format('DD/MM/YYYY')}</span> },
        ...(sel.disabilityPercent !== undefined ? [{ label: '% mất KN', value: <span className="mono">{sel.disabilityPercent}%</span> }] : []),
        ...(sel.examinerName ? [{ label: 'BS giám định', value: sel.examinerName }] : []),
        ...(sel.conclusion ? [{ label: 'Kết luận', value: sel.conclusion }] : []),
        ...(sel.approvedBy ? [{ label: 'Duyệt bởi', value: sel.approvedBy }] : []),
      ]}
    />
  );
};

export default MedicalForensicsV2;
