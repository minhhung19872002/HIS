import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { getSampleStorageRecords } from '../api/sampleStorage';
import type { SampleStorageRecord } from '../api/sampleStorage';
import { GenericListPage } from './_GenericListPage';

const STATUS: Record<number, { text: string; cls: string }> = {
  0: { text: 'Đã lưu', cls: 'ok' }, 1: { text: 'Đã lấy', cls: 'cy' },
  2: { text: 'Đã hủy', cls: 'ghost' }, 3: { text: 'Hết hạn', cls: 'crit' },
};

const SampleStorageV2: React.FC = () => {
  const [items, setItems] = useState<SampleStorageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sel, setSel] = useState<SampleStorageRecord | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getSampleStorageRecords({ keyword });
      const list = (r?.items || (Array.isArray(r) ? r : [])) as SampleStorageRecord[];
      setItems(list);
      if (list.length > 0 && !sel) setSel(list[0]);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const stats = useMemo(() => [
    { label: 'Tổng mẫu', value: items.length },
    { label: 'Đang lưu', value: items.filter((s) => s.status === 0).length, tone: 'ok' as const },
    { label: 'Hết hạn', value: items.filter((s) => s.isExpired).length, tone: 'crit' as const },
    { label: 'Đã lấy', value: items.filter((s) => s.status === 1).length, tone: 'cy' as const },
  ], [items]);

  return (
    <GenericListPage<SampleStorageRecord>
      title="Lưu mẫu" v1Path="/sample-storage"
      items={items} loading={loading}
      keyword={keyword} onKeywordChange={setKeyword} onSearch={load}
      searchPlaceholder="Tìm barcode / BN..."
      selectedId={sel?.id} onSelect={setSel}
      stats={stats}
      columns={[
        { key: 'barcode', label: 'Barcode', render: (r) => <span className="mono">{r.sampleBarcode}</span> },
        { key: 'pt', label: 'BN', render: (r) => r.patientName ? (
          <><div style={{ fontWeight: 500 }}>{r.patientName}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--t-3)' }}>{r.patientCode}</div></>
        ) : '—' },
        { key: 'type', label: 'Loại mẫu', render: (r) => <span className="muted">{r.sampleType}</span> },
        { key: 'tube', label: 'Ống', render: (r) => r.tubeColor },
        { key: 'loc', label: 'Vị trí', render: (r) => <span className="mono">{r.storageLocation}</span> },
        { key: 'cond', label: 'Bảo quản', render: (r) => <span className="muted">{r.storageCondition}{r.temperature !== undefined ? ` (${r.temperature}°C)` : ''}</span> },
        { key: 'stored', label: 'Lưu lúc', render: (r) => <span className="mono">{dayjs(r.storedAt).format('DD/MM HH:mm')}</span> },
        { key: 'status', label: 'TT', render: (r) => {
          const s = STATUS[r.status] || { text: '—', cls: 'ghost' };
          return <span className={`chip ${s.cls}`}>{s.text}</span>;
        } },
      ]}
      detailTitle={sel?.sampleBarcode || 'Chọn mẫu'}
      detailFields={!sel ? null : [
        { label: 'Barcode', value: <span className="mono">{sel.sampleBarcode}</span> },
        ...(sel.requestCode ? [{ label: 'Yêu cầu', value: <span className="mono">{sel.requestCode}</span> }] : []),
        ...(sel.patientName ? [{ label: 'BN', value: `${sel.patientName} · ${sel.patientCode}` }] : []),
        { label: 'Loại mẫu', value: sel.sampleType },
        { label: 'Ống', value: sel.tubeColor },
        { label: 'Vị trí', value: <span className="mono">{sel.storageLocation}</span> },
        { label: 'Bảo quản', value: `${sel.storageCondition}${sel.temperature !== undefined ? ` · ${sel.temperature}°C` : ''}` },
        { label: 'Lưu lúc', value: <span className="mono">{dayjs(sel.storedAt).format('DD/MM/YYYY HH:mm')}</span> },
        { label: 'Lưu bởi', value: sel.storedBy },
        ...(sel.expiryDate ? [{ label: 'HSD', value: <span className="mono" style={{ color: sel.isExpired ? 'var(--s-crit)' : undefined }}>{dayjs(sel.expiryDate).format('DD/MM/YYYY')}</span> }] : []),
        ...(sel.retrievedAt ? [{ label: 'Đã lấy', value: <span className="mono">{dayjs(sel.retrievedAt).format('DD/MM HH:mm')} · {sel.retrievedBy}</span> }] : []),
      ]}
    />
  );
};

export default SampleStorageV2;
