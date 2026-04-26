import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { getMicrobiologyCultures } from '../api/microbiology';
import type { MicrobiologyCulture } from '../api/microbiology';
import { GenericListPage } from './_GenericListPage';

const STATUS: Record<number, { text: string; cls: string }> = {
  0: { text: 'Chờ', cls: 'warn' }, 1: { text: 'Đang ủ', cls: 'cy' },
  2: { text: 'Có vsv mọc', cls: 'crit' }, 3: { text: 'Không mọc', cls: 'ok' },
  4: { text: 'Đã định danh', cls: 'cy' }, 5: { text: 'Hoàn tất', cls: 'ok' },
};

const MicrobiologyV2: React.FC = () => {
  const [items, setItems] = useState<MicrobiologyCulture[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sel, setSel] = useState<MicrobiologyCulture | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getMicrobiologyCultures({ keyword });
      const list = (r?.items || (Array.isArray(r) ? r : [])) as MicrobiologyCulture[];
      setItems(list);
      if (list.length > 0 && !sel) setSel(list[0]);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const stats = useMemo(() => [
    { label: 'Tổng cấy', value: items.length },
    { label: 'Đang ủ', value: items.filter((c) => c.status === 1).length, tone: 'cy' as const },
    { label: 'Có vi sinh vật', value: items.filter((c) => c.status === 2 || c.status === 4).length, tone: 'crit' as const },
    { label: 'Hoàn tất', value: items.filter((c) => c.status === 5).length, tone: 'ok' as const },
  ], [items]);

  return (
    <GenericListPage<MicrobiologyCulture>
      title="Vi sinh — Cấy" v1Path="/microbiology"
      items={items} loading={loading}
      keyword={keyword} onKeywordChange={setKeyword} onSearch={load}
      searchPlaceholder="Tìm BN / mã yêu cầu..."
      selectedId={sel?.id} onSelect={setSel}
      stats={stats}
      columns={[
        { key: 'code', label: 'Mã YC', render: (r) => <span className="mono">{r.requestCode}</span> },
        { key: 'pt', label: 'BN', render: (r) => (
          <><div style={{ fontWeight: 500 }}>{r.patientName}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--t-3)' }}>{r.patientCode}</div></>
        ) },
        { key: 'sample', label: 'Loại mẫu', render: (r) => <span className="muted">{r.sampleType}</span> },
        { key: 'barcode', label: 'Barcode', render: (r) => <span className="mono">{r.sampleBarcode}</span> },
        { key: 'type', label: 'Loại cấy', render: (r) => <span className="muted">{r.cultureType}</span> },
        { key: 'date', label: 'Cấy', render: (r) => <span className="mono">{dayjs(r.cultureDate).format('DD/MM HH:mm')}</span> },
        { key: 'status', label: 'TT', render: (r) => {
          const s = STATUS[r.status] || { text: '—', cls: 'ghost' };
          return <span className={`chip ${s.cls}`}>{s.text}</span>;
        } },
      ]}
      detailTitle={sel?.requestCode || 'Chọn cấy'}
      detailFields={!sel ? null : [
        { label: 'Mã YC', value: <span className="mono">{sel.requestCode}</span> },
        { label: 'BN', value: `${sel.patientName} · ${sel.patientCode}` },
        { label: 'Loại mẫu', value: sel.sampleType },
        { label: 'Barcode', value: <span className="mono">{sel.sampleBarcode}</span> },
        { label: 'Loại cấy', value: sel.cultureType },
        { label: 'Ngày cấy', value: <span className="mono">{dayjs(sel.cultureDate).format('DD/MM/YYYY HH:mm')}</span> },
        ...(sel.incubationStart ? [{ label: 'Bắt đầu ủ', value: <span className="mono">{dayjs(sel.incubationStart).format('DD/MM HH:mm')}</span> }] : []),
        ...(sel.resultDate ? [{ label: 'Có KQ', value: <span className="mono">{dayjs(sel.resultDate).format('DD/MM HH:mm')}</span> }] : []),
        { label: 'Vi sinh vật', value: sel.organisms?.length ? sel.organisms.map((o) => o.organismName).join(', ') : '—' },
      ]}
    />
  );
};

export default MicrobiologyV2;
