import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { getCultureStocks, getCultureStockStats } from '../api/cultureStock';
import type { CultureStock, CultureStockStats } from '../api/cultureStock';
import { GenericListPage } from './_GenericListPage';

const STATUS: Record<number, { text: string; cls: string }> = {
  0: { text: 'Hoạt động', cls: 'ok' },
  1: { text: 'Sắp hết', cls: 'warn' },
  2: { text: 'Hết hạn', cls: 'crit' },
  3: { text: 'Hết', cls: 'ghost' },
  4: { text: 'Đã hủy', cls: 'ghost' },
};

const CultureCollectionV2: React.FC = () => {
  const [items, setItems] = useState<CultureStock[]>([]);
  const [stats, setStats] = useState<CultureStockStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sel, setSel] = useState<CultureStock | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [list, s] = await Promise.all([getCultureStocks({ keyword }), getCultureStockStats()]);
      setItems(list);
      setStats(s);
      if (list.length > 0 && !sel) setSel(list[0]);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const statRows = useMemo(() => [
    { label: 'Tổng chủng', value: stats?.totalStocks ?? items.length },
    { label: 'Hoạt động', value: stats?.activeCount ?? 0, tone: 'ok' as const },
    { label: 'Sắp hết hạn', value: stats?.expiringIn30Days ?? 0, tone: 'warn' as const },
    { label: 'Cần KT viability', value: stats?.needViabilityCheck ?? 0, tone: 'cy' as const },
  ], [items, stats]);

  return (
    <GenericListPage<CultureStock>
      title="Lưu chủng vi sinh" v1Path="/culture-collection"
      items={items} loading={loading}
      keyword={keyword} onKeywordChange={setKeyword} onSearch={load}
      searchPlaceholder="Tìm mã chủng / VSV..."
      selectedId={sel?.id} onSelect={setSel}
      stats={statRows}
      columns={[
        { key: 'code', label: 'Mã chủng', render: (r) => <span className="mono">{r.stockCode}</span> },
        { key: 'org', label: 'Vi sinh vật', render: (r) => (
          <><div style={{ fontWeight: 500 }}>{r.organismName}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--t-3)' }}>{r.organismCode}</div></>
        ) },
        { key: 'loc', label: 'Vị trí', render: (r) => <span className="muted">{r.locationDisplay}</span> },
        { key: 'method', label: 'PP', render: (r) => <span className="muted">{r.preservationMethod}</span> },
        { key: 'aliq', label: 'Ống', render: (r) => <span className="mono">{r.remainingAliquots}/{r.aliquotCount}</span> },
        { key: 'pass', label: 'Passage', render: (r) => <span className="mono">P{r.passageNumber}</span> },
        { key: 'status', label: 'TT', render: (r) => {
          const s = STATUS[r.status] || { text: '—', cls: 'ghost' };
          return <span className={`chip ${s.cls}`}>{s.text}</span>;
        } },
      ]}
      detailTitle={sel?.stockCode || 'Chọn chủng'}
      detailFields={!sel ? null : [
        { label: 'Mã chủng', value: <span className="mono">{sel.stockCode}</span> },
        { label: 'Vi sinh vật', value: `${sel.organismName} (${sel.organismCode})` },
        { label: 'Khoa học', value: sel.scientificName || '—' },
        { label: 'Gram', value: sel.gramStain || '—' },
        { label: 'Vị trí', value: sel.locationDisplay },
        { label: 'PP bảo quản', value: sel.preservationMethod },
        { label: 'Nhiệt độ', value: sel.storageTemperature || '—' },
        { label: 'Ống còn / tổng', value: <span className="mono">{sel.remainingAliquots}/{sel.aliquotCount}</span> },
        { label: 'Passage', value: <span className="mono">P{sel.passageNumber}</span> },
        { label: 'Ngày lưu', value: <span className="mono">{dayjs(sel.preservationDate).format('DD/MM/YYYY')}</span> },
        ...(sel.expiryDate ? [{ label: 'Hết hạn', value: <span className="mono">{dayjs(sel.expiryDate).format('DD/MM/YYYY')}</span> }] : []),
        ...(sel.lastViabilityCheck ? [{ label: 'KT viability', value: <span className="mono">{dayjs(sel.lastViabilityCheck).format('DD/MM/YYYY')} · {sel.lastViabilityResult ? 'Sống' : 'Chết'}</span> }] : []),
      ]}
    />
  );
};

export default CultureCollectionV2;
