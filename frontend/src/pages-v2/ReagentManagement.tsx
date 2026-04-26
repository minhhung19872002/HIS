import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { getReagents } from '../api/reagent';
import type { Reagent } from '../api/reagent';
import { GenericListPage } from './_GenericListPage';

const STATUS: Record<number, { text: string; cls: string }> = {
  0: { text: 'Sẵn dùng', cls: 'ok' }, 1: { text: 'Đang dùng', cls: 'cy' },
  2: { text: 'Sắp hết', cls: 'warn' }, 3: { text: 'Hết hạn', cls: 'crit' }, 4: { text: 'Đã hủy', cls: 'ghost' },
};

const ReagentManagementV2: React.FC = () => {
  const [items, setItems] = useState<Reagent[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sel, setSel] = useState<Reagent | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getReagents({ keyword });
      const list = (r?.items || (Array.isArray(r) ? r : [])) as Reagent[];
      setItems(list);
      if (list.length > 0 && !sel) setSel(list[0]);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const stats = useMemo(() => [
    { label: 'Tổng SKU', value: items.length },
    { label: 'Sẵn dùng', value: items.filter((r) => r.status === 0).length, tone: 'ok' as const },
    { label: 'Sắp hết', value: items.filter((r) => r.isLowStock).length, tone: 'warn' as const },
    { label: 'Hết hạn', value: items.filter((r) => r.isExpired).length, tone: 'crit' as const },
  ], [items]);

  return (
    <GenericListPage<Reagent>
      title="Hóa chất XN" v1Path="/reagent-management"
      items={items} loading={loading}
      keyword={keyword} onKeywordChange={setKeyword} onSearch={load}
      searchPlaceholder="Tìm tên / mã / lô..."
      selectedId={sel?.id} onSelect={setSel}
      stats={stats}
      columns={[
        { key: 'code', label: 'Mã', render: (r) => <span className="mono">{r.code}</span> },
        { key: 'name', label: 'Tên', render: (r) => <span style={{ fontWeight: 500 }}>{r.name}</span> },
        { key: 'lot', label: 'Lô', render: (r) => <span className="mono">{r.lotNumber}</span> },
        { key: 'mfg', label: 'Hãng', render: (r) => <span className="muted">{r.manufacturer}</span> },
        { key: 'qty', label: 'Tồn', render: (r) => <span className="mono" style={{ color: r.isLowStock ? 'var(--s-warn)' : undefined }}>{r.remainingQuantity} {r.unit}</span> },
        { key: 'exp', label: 'HSD', render: (r) => <span className="mono" style={{ color: r.isExpired ? 'var(--s-crit)' : undefined }}>{dayjs(r.expiryDate).format('DD/MM/YYYY')}</span> },
        { key: 'status', label: 'TT', render: (r) => {
          const s = STATUS[r.status] || { text: '—', cls: 'ghost' };
          return <span className={`chip ${s.cls}`}>{s.text}</span>;
        } },
      ]}
      detailTitle={sel?.name || 'Chọn hóa chất'}
      detailFields={!sel ? null : [
        { label: 'Mã', value: <span className="mono">{sel.code}</span> },
        { label: 'Tên', value: sel.name },
        { label: 'Hãng', value: sel.manufacturer },
        { label: 'Lô', value: <span className="mono">{sel.lotNumber}</span> },
        ...(sel.catalogNumber ? [{ label: 'Catalog', value: sel.catalogNumber }] : []),
        { label: 'Máy XN', value: sel.analyzerName || '—' },
        { label: 'XN dùng', value: sel.testNames?.join(', ') || '—' },
        { label: 'Tồn', value: <span className="mono">{sel.remainingQuantity}/{sel.quantity} {sel.unit}</span> },
        { label: 'Min stock', value: <span className="mono">{sel.minimumStock} {sel.unit}</span> },
        { label: 'HSD', value: <span className="mono">{dayjs(sel.expiryDate).format('DD/MM/YYYY')}</span> },
        { label: 'Bảo quản', value: sel.storageCondition },
      ]}
    />
  );
};

export default ReagentManagementV2;
