import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { searchVaccinations } from '../api/immunization';
import type { Vaccination } from '../api/immunization';
import { GenericListPage } from './_GenericListPage';

const STATUS: Record<number, { text: string; cls: string }> = {
  0: { text: 'Lên lịch', cls: 'warn' }, 1: { text: 'Đã tiêm', cls: 'ok' },
  2: { text: 'Bỏ', cls: 'crit' }, 3: { text: 'Hoãn', cls: 'ghost' },
};

const ImmunizationV2: React.FC = () => {
  const [items, setItems] = useState<Vaccination[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sel, setSel] = useState<Vaccination | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await searchVaccinations({ keyword });
      const list = (r?.items || (Array.isArray(r) ? r : [])) as Vaccination[];
      setItems(list);
      if (list.length > 0 && !sel) setSel(list[0]);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const today = dayjs();
  const stats = useMemo(() => [
    { label: 'Tổng mũi', value: items.length },
    { label: 'Đã tiêm', value: items.filter((v) => v.status === 1).length, tone: 'ok' as const },
    { label: 'Đến hạn 30d', value: items.filter((v) => v.nextDueDate && dayjs(v.nextDueDate).diff(today, 'day') < 30 && dayjs(v.nextDueDate).isAfter(today)).length, tone: 'warn' as const },
    { label: 'Phản ứng có hại', value: items.filter((v) => v.adverseEvent).length, tone: 'crit' as const },
  ], [items, today]);

  return (
    <GenericListPage<Vaccination>
      title="Tiêm chủng" v1Path="/immunization"
      items={items} loading={loading}
      keyword={keyword} onKeywordChange={setKeyword} onSearch={load}
      searchPlaceholder="Tìm BN / vaccine..."
      selectedId={sel?.id} onSelect={setSel}
      stats={stats}
      columns={[
        { key: 'pt', label: 'BN', render: (r) => (
          <><div style={{ fontWeight: 500 }}>{r.patientName}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--t-3)' }}>{r.patientCode}</div></>
        ) },
        { key: 'vac', label: 'Vaccine', render: (r) => <span style={{ fontWeight: 500 }}>{r.vaccineName}</span> },
        { key: 'dose', label: 'Mũi', render: (r) => <span className="mono">{r.doseNumber}/{r.totalDoses}</span> },
        { key: 'lot', label: 'Lô', render: (r) => <span className="mono">{r.lotNumber}</span> },
        { key: 'date', label: 'Tiêm', render: (r) => <span className="mono">{dayjs(r.vaccinationDate).format('DD/MM/YYYY')}</span> },
        { key: 'next', label: 'Mũi tiếp', render: (r) => <span className="mono">{r.nextDueDate ? dayjs(r.nextDueDate).format('DD/MM/YYYY') : '—'}</span> },
        { key: 'status', label: 'TT', render: (r) => {
          const s = STATUS[r.status] || { text: '—', cls: 'ghost' };
          return <span className={`chip ${s.cls}`}>{s.text}</span>;
        } },
      ]}
      detailTitle={sel?.patientName || 'Chọn mũi tiêm'}
      detailFields={!sel ? null : [
        { label: 'BN', value: `${sel.patientName} · ${sel.patientCode}` },
        { label: 'DOB', value: <span className="mono">{dayjs(sel.dateOfBirth).format('DD/MM/YYYY')}</span> },
        { label: 'Vaccine', value: `${sel.vaccineCode} · ${sel.vaccineName}` },
        { label: 'Mũi', value: <span className="mono">{sel.doseNumber}/{sel.totalDoses}</span> },
        { label: 'Lô', value: <span className="mono">{sel.lotNumber}</span> },
        { label: 'Vị trí', value: sel.site },
        { label: 'Đường dùng', value: sel.route },
        { label: 'Ngày tiêm', value: <span className="mono">{dayjs(sel.vaccinationDate).format('DD/MM/YYYY')}</span> },
        { label: 'Người tiêm', value: sel.administeredBy },
        ...(sel.nextDueDate ? [{ label: 'Mũi tiếp theo', value: <span className="mono">{dayjs(sel.nextDueDate).format('DD/MM/YYYY')}</span> }] : []),
        ...(sel.adverseEvent ? [{ label: 'Phản ứng', value: <span style={{ color: 'var(--s-crit)' }}>{sel.adverseEvent}</span> }] : []),
      ]}
    />
  );
};

export default ImmunizationV2;
