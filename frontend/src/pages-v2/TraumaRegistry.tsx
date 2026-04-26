import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { searchCases } from '../api/traumaRegistry';
import type { TraumaCase } from '../api/traumaRegistry';
import { GenericListPage } from './_GenericListPage';

const TRIAGE: Record<string, { text: string; cls: string }> = {
  red: { text: 'ĐỎ', cls: 'crit' }, yellow: { text: 'VÀNG', cls: 'warn' },
  green: { text: 'XANH', cls: 'ok' }, black: { text: 'ĐEN', cls: 'ghost' },
};

const TraumaRegistryV2: React.FC = () => {
  const [items, setItems] = useState<TraumaCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sel, setSel] = useState<TraumaCase | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await searchCases({ keyword });
      const list = (r?.items || (Array.isArray(r) ? r : [])) as TraumaCase[];
      setItems(list);
      if (list.length > 0 && !sel) setSel(list[0]);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const stats = useMemo(() => [
    { label: 'Tổng ca', value: items.length },
    { label: 'Triage đỏ', value: items.filter((c) => c.triageCategory === 'red').length, tone: 'crit' as const },
    { label: 'ICU', value: items.filter((c) => c.status === 1).length, tone: 'warn' as const },
    { label: 'PT cần', value: items.filter((c) => c.surgeryRequired).length, tone: 'cy' as const },
  ], [items]);

  return (
    <GenericListPage<TraumaCase>
      title="Đăng ký chấn thương" v1Path="/trauma-registry"
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
        { key: 'mech', label: 'Cơ chế', render: (r) => <span className="muted">{r.injuryMechanism}</span> },
        { key: 'triage', label: 'Triage', render: (r) => {
          const t = TRIAGE[r.triageCategory] || { text: '—', cls: 'ghost' };
          return <span className={`chip ${t.cls}`}>{t.text}</span>;
        } },
        { key: 'iss', label: 'ISS', render: (r) => <span className="mono">{r.issScore}</span> },
        { key: 'date', label: 'Ngày bị', render: (r) => <span className="mono">{dayjs(r.injuryDate).format('DD/MM HH:mm')}</span> },
      ]}
      detailTitle={sel?.patientName || 'Chọn ca'}
      detailFields={!sel ? null : [
        { label: 'Mã ca', value: <span className="mono">{sel.caseCode}</span> },
        { label: 'BN', value: `${sel.patientName} · ${sel.patientCode}` },
        { label: 'Cơ chế', value: sel.injuryMechanism },
        { label: 'Loại', value: sel.injuryType },
        { label: 'Triage', value: TRIAGE[sel.triageCategory]?.text || '—' },
        { label: 'ISS / RTS / GCS', value: <span className="mono">{sel.issScore} / {sel.rtsScore} / {sel.gcsScore}</span> },
        { label: 'Bị thương', value: <span className="mono">{dayjs(sel.injuryDate).format('DD/MM/YYYY HH:mm')}</span> },
        { label: 'Nhập viện', value: <span className="mono">{dayjs(sel.admissionDate).format('DD/MM/YYYY HH:mm')}</span> },
        { label: 'Cần PT', value: sel.surgeryRequired ? 'Có' : 'Không' },
        { label: 'BS phụ trách', value: sel.attendingDoctor },
        { label: 'Kết quả', value: sel.outcome },
      ]}
    />
  );
};

export default TraumaRegistryV2;
