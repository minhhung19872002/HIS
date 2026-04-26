import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { searchWasteRecords } from '../api/environmentalHealth';
import type { WasteRecord } from '../api/environmentalHealth';
import { GenericListPage } from './_GenericListPage';

const TYPE: Record<string, string> = {
  infectious: 'Lây nhiễm', sharp: 'Sắc nhọn', pharmaceutical: 'Dược', chemical: 'Hóa học', radioactive: 'Phóng xạ', general: 'Thông thường',
};

const EnvironmentalHealthV2: React.FC = () => {
  const [items, setItems] = useState<WasteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sel, setSel] = useState<WasteRecord | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await searchWasteRecords({ keyword });
      const list = (r?.items || (Array.isArray(r) ? r : [])) as WasteRecord[];
      setItems(list);
      if (list.length > 0 && !sel) setSel(list[0]);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const stats = useMemo(() => [
    { label: 'Tổng phiếu', value: items.length },
    { label: 'Đạt chuẩn', value: items.filter((r) => r.isCompliant).length, tone: 'ok' as const },
    { label: 'Vi phạm', value: items.filter((r) => !r.isCompliant).length, tone: 'crit' as const },
    { label: 'Lây nhiễm (kg)', value: items.filter((r) => r.wasteType === 'infectious').reduce((s, r) => s + r.quantity, 0), tone: 'warn' as const },
  ], [items]);

  return (
    <GenericListPage<WasteRecord>
      title="Môi trường y tế · CT chất thải" v1Path="/environmental-health"
      items={items} loading={loading}
      keyword={keyword} onKeywordChange={setKeyword} onSearch={load}
      searchPlaceholder="Tìm phiếu..."
      selectedId={sel?.id} onSelect={setSel}
      stats={stats}
      columns={[
        { key: 'code', label: 'Mã phiếu', render: (r) => <span className="mono">{r.recordCode}</span> },
        { key: 'date', label: 'Ngày', render: (r) => <span className="mono">{dayjs(r.recordDate).format('DD/MM/YYYY')}</span> },
        { key: 'type', label: 'Loại CT', render: (r) => <span className="muted">{TYPE[r.wasteType] || r.wasteType}</span> },
        { key: 'qty', label: 'SL', render: (r) => <span className="mono">{r.quantity} {r.unit}</span> },
        { key: 'source', label: 'Nguồn', render: (r) => <span className="muted">{r.source}</span> },
        { key: 'method', label: 'PP xử lý', render: (r) => <span className="muted">{r.disposalMethod}</span> },
        { key: 'comp', label: 'Đạt chuẩn', render: (r) => r.isCompliant ? <span className="chip ok">✓</span> : <span className="chip crit">✗</span> },
      ]}
      detailTitle={sel?.recordCode || 'Chọn phiếu'}
      detailFields={!sel ? null : [
        { label: 'Mã', value: <span className="mono">{sel.recordCode}</span> },
        { label: 'Ngày', value: <span className="mono">{dayjs(sel.recordDate).format('DD/MM/YYYY')}</span> },
        { label: 'Loại CT', value: TYPE[sel.wasteType] || sel.wasteType },
        { label: 'Số lượng', value: <span className="mono">{sel.quantity} {sel.unit}</span> },
        { label: 'Nguồn', value: sel.source },
        { label: 'PP xử lý', value: sel.disposalMethod },
        { label: 'Người xử lý', value: sel.handlerName },
        { label: 'Đạt chuẩn', value: sel.isCompliant ? <span style={{ color: 'var(--s-ok)' }}>Có</span> : <span style={{ color: 'var(--s-crit)' }}>Không</span> },
        ...(sel.notes ? [{ label: 'Ghi chú', value: sel.notes }] : []),
      ]}
    />
  );
};

export default EnvironmentalHealthV2;
