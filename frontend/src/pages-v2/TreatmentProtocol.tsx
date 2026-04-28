import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { searchProtocols } from '../api/treatmentProtocol';
import type { TreatmentProtocolDto } from '../api/treatmentProtocol';
import { GenericListPage } from './_GenericListPage';

const STATUS_CLS: Record<number, string> = { 0: 'ghost', 1: 'cy', 2: 'ok', 3: 'warn', 4: 'crit' };

const TreatmentProtocolV2: React.FC = () => {
  const [items, setItems] = useState<TreatmentProtocolDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sel, setSel] = useState<TreatmentProtocolDto | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await searchProtocols({ keyword, pageSize: 100 });
      const list = r.data?.items || [];
      setItems(list);
      if (list.length > 0 && !sel) setSel(list[0]);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const stats = useMemo(() => [
    { label: 'Phác đồ', value: items.length },
    { label: 'Đã duyệt', value: items.filter((p) => p.status === 2).length, tone: 'ok' as const },
    { label: 'Nháp', value: items.filter((p) => p.status === 0 || p.status === 1).length, tone: 'cy' as const },
    { label: 'Hết hiệu lực', value: items.filter((p) => p.status === 4).length, tone: 'crit' as const },
  ], [items]);

  return (
    <GenericListPage<TreatmentProtocolDto>
      title="Phác đồ điều trị" v1Path="/treatment-protocols"
      items={items} loading={loading}
      keyword={keyword} onKeywordChange={setKeyword} onSearch={load}
      searchPlaceholder="Tìm tên / mã / ICD..."
      selectedId={sel?.id} onSelect={setSel}
      stats={stats}
      columns={[
        { key: 'code', label: 'Mã', render: (r) => <span className="mono">{r.code}</span> },
        { key: 'name', label: 'Tên phác đồ', render: (r) => <span style={{ fontWeight: 500 }}>{r.name}</span> },
        { key: 'icd', label: 'ICD', render: (r) => (
          <><span className="mono">{r.icdCode || '—'}</span>
            {r.icdName && <div className="muted" style={{ fontSize: 11 }}>{r.icdName}</div>}</>
        ) },
        { key: 'group', label: 'Nhóm bệnh', render: (r) => <span className="muted">{r.diseaseGroup || '—'}</span> },
        { key: 'dept', label: 'Khoa', render: (r) => <span className="muted">{r.department || '—'}</span> },
        { key: 'ver', label: 'Ver', render: (r) => <span className="mono">v{r.version}</span> },
        { key: 'steps', label: 'Bước', render: (r) => <span className="mono">{r.stepCount}</span> },
        { key: 'status', label: 'TT', render: (r) => <span className={`chip ${STATUS_CLS[r.status] || 'ghost'}`}>{r.statusName || ''}</span> },
      ]}
      detailTitle={sel?.code || 'Chọn phác đồ'}
      detailFields={!sel ? null : [
        { label: 'Mã phác đồ', value: <span className="mono">{sel.code}</span> },
        { label: 'Tên', value: sel.name },
        { label: 'ICD', value: sel.icdCode ? `${sel.icdCode} · ${sel.icdName || ''}` : '—' },
        { label: 'Nhóm bệnh', value: sel.diseaseGroup || '—' },
        { label: 'Khoa', value: sel.department || '—' },
        { label: 'Phiên bản', value: <span className="mono">v{sel.version}</span> },
        { label: 'Số bước', value: <span className="mono">{sel.stepCount}</span> },
        { label: 'Trạng thái', value: sel.statusName || '' },
        ...(sel.approvedDate ? [{ label: 'Duyệt', value: <span className="mono">{dayjs(sel.approvedDate).format('DD/MM/YYYY')}</span> }] : []),
        ...(sel.effectiveDate ? [{ label: 'Hiệu lực', value: <span className="mono">{dayjs(sel.effectiveDate).format('DD/MM/YYYY')}</span> }] : []),
        ...(sel.expiryDate ? [{ label: 'Hết hạn', value: <span className="mono">{dayjs(sel.expiryDate).format('DD/MM/YYYY')}</span> }] : []),
        ...(sel.description ? [{ label: 'Mô tả', value: sel.description }] : []),
      ]}
    />
  );
};

export default TreatmentProtocolV2;
