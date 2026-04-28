import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { searchTreatments } from '../api/traditionalMedicine';
import type { TraditionalTreatment } from '../api/traditionalMedicine';
import { GenericListPage } from './_GenericListPage';

const TYPE: Record<string, string> = {
  acupuncture: 'Châm cứu', herbal: 'Thuốc bắc', massage: 'Xoa bóp',
  cupping: 'Giác hơi', moxibustion: 'Cứu ngải', combined: 'Kết hợp',
};
const STATUS: Record<number, { text: string; cls: string }> = {
  0: { text: 'Đang điều trị', cls: 'cy' }, 1: { text: 'Hoàn thành', cls: 'ok' }, 2: { text: 'Hủy', cls: 'crit' },
};

const TraditionalMedicineV2: React.FC = () => {
  const [items, setItems] = useState<TraditionalTreatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sel, setSel] = useState<TraditionalTreatment | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r: any = await searchTreatments({ keyword });
      const list = (r?.items || (Array.isArray(r) ? r : [])) as TraditionalTreatment[];
      setItems(list);
      if (list.length > 0 && !sel) setSel(list[0]);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const stats = useMemo(() => [
    { label: 'Tổng phác đồ', value: items.length },
    { label: 'Đang điều trị', value: items.filter((t) => t.status === 0).length, tone: 'cy' as const },
    { label: 'Châm cứu', value: items.filter((t) => t.treatmentType === 'acupuncture' || t.treatmentType === 'combined').length },
    { label: 'Hoàn thành', value: items.filter((t) => t.status === 1).length, tone: 'ok' as const },
  ], [items]);

  return (
    <GenericListPage<TraditionalTreatment>
      title="YHCT — Y học cổ truyền" v1Path="/traditional-medicine"
      items={items} loading={loading}
      keyword={keyword} onKeywordChange={setKeyword} onSearch={load}
      searchPlaceholder="Tìm BN..."
      selectedId={sel?.id} onSelect={setSel}
      stats={stats}
      columns={[
        { key: 'code', label: 'Mã', render: (r) => <span className="mono">{r.treatmentCode}</span> },
        { key: 'pt', label: 'BN', render: (r) => (
          <><div style={{ fontWeight: 500 }}>{r.patientName}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--t-3)' }}>{r.patientCode}</div></>
        ) },
        { key: 'type', label: 'Loại', render: (r) => <span className="muted">{TYPE[r.treatmentType] || r.treatmentType}</span> },
        { key: 'dx', label: 'Chẩn đoán', render: (r) => <span className="muted">{r.diagnosis}</span> },
        { key: 'sessions', label: 'Buổi', render: (r) => <span className="mono">{r.completedSessions || 0}/{r.totalSessions || '?'}</span> },
        { key: 'doc', label: 'BS', render: (r) => <span className="muted">{r.doctorName}</span> },
        { key: 'status', label: 'TT', render: (r) => {
          const s = STATUS[r.status] || { text: '—', cls: 'ghost' };
          return <span className={`chip ${s.cls}`}>{s.text}</span>;
        } },
      ]}
      detailTitle={sel?.patientName || 'Chọn phác đồ'}
      detailFields={!sel ? null : [
        { label: 'Mã phác đồ', value: <span className="mono">{sel.treatmentCode}</span> },
        { label: 'BN', value: `${sel.patientName} · ${sel.patientCode}` },
        { label: 'Loại', value: TYPE[sel.treatmentType] || sel.treatmentType },
        { label: 'Chẩn đoán', value: sel.diagnosis },
        { label: 'Bắt đầu', value: <span className="mono">{dayjs(sel.startDate).format('DD/MM/YYYY')}</span> },
        ...(sel.endDate ? [{ label: 'Kết thúc', value: <span className="mono">{dayjs(sel.endDate).format('DD/MM/YYYY')}</span> }] : []),
        { label: 'Buổi điều trị', value: <span className="mono">{sel.completedSessions || 0}/{sel.totalSessions || '?'}</span> },
        { label: 'BS điều trị', value: sel.doctorName },
      ]}
    />
  );
};

export default TraditionalMedicineV2;
