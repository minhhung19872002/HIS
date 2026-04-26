import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { searchPrenatal } from '../api/reproductiveHealth';
import type { PrenatalRecord } from '../api/reproductiveHealth';
import { GenericListPage } from './_GenericListPage';

const RISK: Record<string, { text: string; cls: string }> = {
  low: { text: 'Thấp', cls: 'ok' }, medium: { text: 'TB', cls: 'warn' },
  high: { text: 'Cao', cls: 'crit' }, very_high: { text: 'Rất cao', cls: 'crit' },
};

const ReproductiveHealthV2: React.FC = () => {
  const [items, setItems] = useState<PrenatalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sel, setSel] = useState<PrenatalRecord | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await searchPrenatal({ keyword });
      const list = (r?.items || (Array.isArray(r) ? r : [])) as PrenatalRecord[];
      setItems(list);
      if (list.length > 0 && !sel) setSel(list[0]);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const today = dayjs();
  const stats = useMemo(() => [
    { label: 'Đang theo dõi', value: items.filter((p) => p.status === 0).length, tone: 'cy' as const },
    { label: 'Nguy cơ cao', value: items.filter((p) => p.riskLevel === 'high' || p.riskLevel === 'very_high').length, tone: 'crit' as const },
    { label: 'Sắp sinh (4 tuần)', value: items.filter((p) => dayjs(p.expectedDeliveryDate).diff(today, 'day') < 28 && dayjs(p.expectedDeliveryDate).isAfter(today)).length, tone: 'warn' as const },
    { label: 'Đã sinh', value: items.filter((p) => p.status === 1).length, tone: 'ok' as const },
  ], [items, today]);

  return (
    <GenericListPage<PrenatalRecord>
      title="SK sinh sản — Tiền sản" v1Path="/reproductive-health"
      items={items} loading={loading}
      keyword={keyword} onKeywordChange={setKeyword} onSearch={load}
      searchPlaceholder="Tìm thai phụ..."
      selectedId={sel?.id} onSelect={setSel}
      stats={stats}
      columns={[
        { key: 'code', label: 'Mã HS', render: (r) => <span className="mono">{r.recordCode}</span> },
        { key: 'pt', label: 'Thai phụ', render: (r) => (
          <><div style={{ fontWeight: 500 }}>{r.patientName}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--t-3)' }}>{r.patientCode}</div></>
        ) },
        { key: 'weeks', label: 'Tuần thai', render: (r) => <span className="mono">{r.gestationalWeeks}w</span> },
        { key: 'edd', label: 'Ngày sinh dự kiến', render: (r) => <span className="mono">{dayjs(r.expectedDeliveryDate).format('DD/MM/YYYY')}</span> },
        { key: 'gp', label: 'G/P', render: (r) => <span className="mono">{r.gravida}/{r.para}</span> },
        { key: 'risk', label: 'Nguy cơ', render: (r) => {
          const x = RISK[r.riskLevel] || { text: '—', cls: 'ghost' };
          return <span className={`chip ${x.cls}`}>{x.text}</span>;
        } },
        { key: 'visits', label: 'Lần khám', render: (r) => <span className="mono">{r.visitCount}</span> },
      ]}
      detailTitle={sel?.patientName || 'Chọn HS'}
      detailFields={!sel ? null : [
        { label: 'Mã HS', value: <span className="mono">{sel.recordCode}</span> },
        { label: 'Thai phụ', value: `${sel.patientName} · ${sel.patientCode}` },
        { label: 'DOB', value: <span className="mono">{dayjs(sel.dateOfBirth).format('DD/MM/YYYY')}</span> },
        { label: 'Tuần thai', value: <span className="mono">{sel.gestationalWeeks} tuần</span> },
        { label: 'Ngày sinh dự kiến', value: <span className="mono">{dayjs(sel.expectedDeliveryDate).format('DD/MM/YYYY')}</span> },
        { label: 'G/P', value: <span className="mono">{sel.gravida}/{sel.para}</span> },
        ...(sel.bloodType ? [{ label: 'Nhóm máu', value: sel.bloodType }] : []),
        { label: 'Nguy cơ', value: RISK[sel.riskLevel]?.text || '—' },
        { label: 'BS', value: sel.doctorName },
        { label: 'Lần khám', value: String(sel.visitCount) },
      ]}
    />
  );
};

export default ReproductiveHealthV2;
