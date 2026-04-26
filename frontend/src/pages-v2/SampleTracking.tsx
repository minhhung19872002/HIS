import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { getSampleRejections } from '../api/sampleTracking';
import type { SampleRejection } from '../api/sampleTracking';
import { GenericListPage } from './_GenericListPage';

const SampleTrackingV2: React.FC = () => {
  const [items, setItems] = useState<SampleRejection[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sel, setSel] = useState<SampleRejection | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getSampleRejections({
        fromDate: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
        toDate: dayjs().format('YYYY-MM-DD'),
        keyword,
      });
      const list = (r?.items || (Array.isArray(r) ? r : [])) as SampleRejection[];
      setItems(list);
      if (list.length > 0 && !sel) setSel(list[0]);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const stats = useMemo(() => [
    { label: 'Tổng từ chối', value: items.length },
    { label: 'Đã hủy bỏ TC', value: items.filter((r) => r.isUndone).length, tone: 'cy' as const },
    { label: 'Đã lấy lại', value: items.filter((r) => r.reCollected).length, tone: 'ok' as const },
    { label: 'Chưa xử lý', value: items.filter((r) => !r.isUndone && !r.reCollected).length, tone: 'warn' as const },
  ], [items]);

  return (
    <GenericListPage<SampleRejection>
      title="Theo dõi mẫu — Từ chối" v1Path="/sample-tracking"
      items={items} loading={loading}
      keyword={keyword} onKeywordChange={setKeyword} onSearch={load}
      searchPlaceholder="Tìm BN / barcode..."
      selectedId={sel?.id} onSelect={setSel}
      stats={stats}
      columns={[
        { key: 'barcode', label: 'Barcode', render: (r) => <span className="mono">{r.sampleBarcode}</span> },
        { key: 'pt', label: 'BN', render: (r) => (
          <><div style={{ fontWeight: 500 }}>{r.patientName}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--t-3)' }}>{r.patientCode}</div></>
        ) },
        { key: 'req', label: 'YC', render: (r) => <span className="mono">{r.requestCode}</span> },
        { key: 'reason', label: 'Lý do', render: (r) => <span className="muted">{r.rejectionReason}</span> },
        { key: 'rej', label: 'TC bởi', render: (r) => <span className="muted">{r.rejectedBy}</span> },
        { key: 'date', label: 'TC lúc', render: (r) => <span className="mono">{dayjs(r.rejectedAt).format('DD/MM HH:mm')}</span> },
        { key: 'recol', label: 'Lấy lại', render: (r) => r.reCollected ? <span className="chip ok">✓</span> : <span className="chip warn">Chưa</span> },
      ]}
      detailTitle={sel?.sampleBarcode || 'Chọn mẫu'}
      detailFields={!sel ? null : [
        { label: 'Barcode', value: <span className="mono">{sel.sampleBarcode}</span> },
        { label: 'BN', value: `${sel.patientName} · ${sel.patientCode}` },
        { label: 'Yêu cầu', value: <span className="mono">{sel.requestCode}</span> },
        { label: 'Mã từ chối', value: <span className="mono">{sel.rejectionCode}</span> },
        { label: 'Lý do', value: sel.rejectionReason },
        { label: 'Người TC', value: sel.rejectedBy },
        { label: 'Lúc TC', value: <span className="mono">{dayjs(sel.rejectedAt).format('DD/MM/YYYY HH:mm')}</span> },
        ...(sel.isUndone ? [{ label: 'Hủy TC', value: <span className="mono">{sel.undoneAt ? dayjs(sel.undoneAt).format('DD/MM HH:mm') : '—'} · {sel.undoneBy || '—'}</span> }] : []),
        ...(sel.reCollected ? [{ label: 'Lấy lại', value: <span className="mono">{sel.reCollectedAt ? dayjs(sel.reCollectedAt).format('DD/MM HH:mm') : '—'}</span> }] : []),
        ...(sel.notes ? [{ label: 'Ghi chú', value: sel.notes }] : []),
      ]}
    />
  );
};

export default SampleTrackingV2;
