import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { getScreeningRequests } from '../api/screening';
import type { ScreeningRequest } from '../api/screening';
import { GenericListPage } from './_GenericListPage';

const STATUS: Record<number, { text: string; cls: string }> = {
  0: { text: 'Chờ', cls: 'warn' }, 1: { text: 'Đã lấy mẫu', cls: 'cy' },
  2: { text: 'Đang xử lý', cls: 'cy' }, 3: { text: 'Có KQ', cls: 'ok' }, 4: { text: 'Hoàn tất', cls: 'ok' },
};

const ScreeningV2: React.FC = () => {
  const [items, setItems] = useState<ScreeningRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sel, setSel] = useState<ScreeningRequest | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getScreeningRequests({ keyword });
      const list = (r?.items || (Array.isArray(r) ? r : [])) as ScreeningRequest[];
      setItems(list);
      if (list.length > 0 && !sel) setSel(list[0]);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const stats = useMemo(() => [
    { label: 'Tổng YC', value: items.length },
    { label: 'Sàng lọc SS', value: items.filter((s) => s.screeningType === 'newborn').length, tone: 'cy' as const },
    { label: 'Sàng lọc thai', value: items.filter((s) => s.screeningType === 'prenatal').length, tone: 'cy' as const },
    { label: 'Có KQ', value: items.filter((s) => s.status >= 3).length, tone: 'ok' as const },
  ], [items]);

  return (
    <GenericListPage<ScreeningRequest>
      title="Sàng lọc — Sơ sinh / Tiền sản" v1Path="/screening"
      items={items} loading={loading}
      keyword={keyword} onKeywordChange={setKeyword} onSearch={load}
      searchPlaceholder="Tìm BN..."
      selectedId={sel?.id} onSelect={setSel}
      stats={stats}
      columns={[
        { key: 'code', label: 'Mã YC', render: (r) => <span className="mono">{r.requestCode}</span> },
        { key: 'type', label: 'Loại', render: (r) => <span className="chip cy">{r.screeningType === 'newborn' ? 'SS' : 'Thai'}</span> },
        { key: 'pt', label: 'BN', render: (r) => (
          <><div style={{ fontWeight: 500 }}>{r.patientName}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--t-3)' }}>{r.patientCode}</div></>
        ) },
        { key: 'baby', label: 'Bé / Tuần thai', render: (r) => r.babyName || `${r.pregnancyWeek || '?'} tuần` },
        { key: 'sample', label: 'Barcode', render: (r) => <span className="mono">{r.sampleBarcode || '—'}</span> },
        { key: 'date', label: 'Ngày YC', render: (r) => <span className="mono">{dayjs(r.requestDate).format('DD/MM HH:mm')}</span> },
        { key: 'status', label: 'TT', render: (r) => {
          const s = STATUS[r.status] || { text: '—', cls: 'ghost' };
          return <span className={`chip ${s.cls}`}>{s.text}</span>;
        } },
      ]}
      detailTitle={sel?.requestCode || 'Chọn YC'}
      detailFields={!sel ? null : [
        { label: 'Mã YC', value: <span className="mono">{sel.requestCode}</span> },
        { label: 'Loại', value: sel.screeningType === 'newborn' ? 'Sơ sinh' : 'Tiền sản' },
        { label: 'BN', value: `${sel.patientName} · ${sel.patientCode}` },
        ...(sel.babyName ? [{ label: 'Tên bé', value: sel.babyName }] : []),
        ...(sel.birthDate ? [{ label: 'Ngày sinh', value: <span className="mono">{dayjs(sel.birthDate).format('DD/MM/YYYY')}</span> }] : []),
        ...(sel.pregnancyWeek ? [{ label: 'Tuần thai', value: <span className="mono">{sel.pregnancyWeek} tuần</span> }] : []),
        ...(sel.motherName ? [{ label: 'Mẹ', value: sel.motherName }] : []),
        ...(sel.sampleBarcode ? [{ label: 'Barcode', value: <span className="mono">{sel.sampleBarcode}</span> }] : []),
        { label: 'Số kết quả', value: String(sel.results?.length || 0) },
      ]}
    />
  );
};

export default ScreeningV2;
