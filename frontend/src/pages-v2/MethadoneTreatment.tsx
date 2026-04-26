import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { searchMethadonePatients } from '../api/methadone';
import type { MethadonePatient } from '../api/methadone';
import { GenericListPage } from './_GenericListPage';

const PHASE: Record<string, string> = {
  induction: 'Khởi liều', stabilization: 'Ổn định', maintenance: 'Duy trì', tapering: 'Giảm liều',
};
const STATUS: Record<number, { text: string; cls: string }> = {
  0: { text: 'Đang điều trị', cls: 'cy' }, 1: { text: 'Tạm dừng', cls: 'warn' },
  2: { text: 'Ra điều trị', cls: 'ghost' }, 3: { text: 'Chuyển', cls: 'ghost' },
};

const MethadoneTreatmentV2: React.FC = () => {
  const [items, setItems] = useState<MethadonePatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sel, setSel] = useState<MethadonePatient | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await searchMethadonePatients({ keyword });
      const list = (r?.items || (Array.isArray(r) ? r : [])) as MethadonePatient[];
      setItems(list);
      if (list.length > 0 && !sel) setSel(list[0]);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const stats = useMemo(() => [
    { label: 'Tổng BN', value: items.length },
    { label: 'Đang điều trị', value: items.filter((p) => p.status === 0).length, tone: 'cy' as const },
    { label: 'Bỏ liều', value: items.filter((p) => p.missedDoses > 0).length, tone: 'warn' as const },
    { label: 'TB liều mg', value: items.length > 0 ? Math.round(items.reduce((s, p) => s + p.currentDose, 0) / items.length) : 0 },
  ], [items]);

  return (
    <GenericListPage<MethadonePatient>
      title="Điều trị Methadone" v1Path="/methadone-treatment"
      items={items} loading={loading}
      keyword={keyword} onKeywordChange={setKeyword} onSearch={load}
      searchPlaceholder="Tìm BN..."
      selectedId={sel?.id} onSelect={setSel}
      stats={stats}
      columns={[
        { key: 'pt', label: 'BN', render: (r) => (
          <><div style={{ fontWeight: 500 }}>{r.patientName}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--t-3)' }}>{r.patientCode}</div></>
        ) },
        { key: 'enroll', label: 'Đăng ký', render: (r) => <span className="mono">{dayjs(r.enrollmentDate).format('DD/MM/YYYY')}</span> },
        { key: 'phase', label: 'Pha', render: (r) => <span className="muted">{PHASE[r.phase] || r.phase}</span> },
        { key: 'dose', label: 'Liều', render: (r) => <span className="mono">{r.currentDose}mg</span> },
        { key: 'type', label: 'PP', render: (r) => r.doseType === 'witnessed' ? 'Có mặt' : 'Mang về' },
        { key: 'last', label: 'Liều cuối', render: (r) => <span className="mono">{r.lastDoseDate ? dayjs(r.lastDoseDate).format('DD/MM') : '—'}</span> },
        { key: 'miss', label: 'Bỏ liều', render: (r) => <span className="mono" style={{ color: r.missedDoses > 0 ? 'var(--s-warn)' : undefined }}>{r.missedDoses}</span> },
        { key: 'status', label: 'TT', render: (r) => {
          const s = STATUS[r.status] || { text: '—', cls: 'ghost' };
          return <span className={`chip ${s.cls}`}>{s.text}</span>;
        } },
      ]}
      detailTitle={sel?.patientName || 'Chọn BN'}
      detailFields={!sel ? null : [
        { label: 'BN', value: `${sel.patientName} · ${sel.patientCode}` },
        { label: 'Giới', value: sel.gender === 1 ? 'Nam' : 'Nữ' },
        { label: 'DOB', value: <span className="mono">{dayjs(sel.dateOfBirth).format('DD/MM/YYYY')}</span> },
        { label: 'SĐT', value: sel.phone },
        { label: 'Địa chỉ', value: sel.address },
        { label: 'Đăng ký', value: <span className="mono">{dayjs(sel.enrollmentDate).format('DD/MM/YYYY')}</span> },
        { label: 'Pha điều trị', value: PHASE[sel.phase] || sel.phase },
        { label: 'Liều hiện tại', value: <span className="mono">{sel.currentDose} mg</span> },
        { label: 'PP cấp', value: sel.doseType === 'witnessed' ? 'Có mặt' : 'Mang về' },
        { label: 'BS phụ trách', value: sel.attendingDoctor },
        { label: 'Bỏ liều', value: String(sel.missedDoses) },
        ...(sel.urineTestDate ? [{ label: 'XN nước tiểu cuối', value: <span className="mono">{dayjs(sel.urineTestDate).format('DD/MM/YYYY')}</span> }] : []),
      ]}
    />
  );
};

export default MethadoneTreatmentV2;
