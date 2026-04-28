import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { getCouples, getIvfDashboard } from '../api/ivfLab';
import type { IvfCouple, IvfDashboard } from '../api/ivfLab';
import { GenericListPage } from './_GenericListPage';

const IvfLabV2: React.FC = () => {
  const [items, setItems] = useState<IvfCouple[]>([]);
  const [dash, setDash] = useState<IvfDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sel, setSel] = useState<IvfCouple | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [list, d] = await Promise.all([getCouples({ keyword, pageSize: 100 }), getIvfDashboard()]);
      setItems(list);
      setDash(d);
      if (list.length > 0 && !sel) setSel(list[0]);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const stats = useMemo(() => [
    { label: 'Cặp đôi', value: dash?.totalCouples ?? items.length },
    { label: 'Chu kỳ đang hoạt động', value: dash?.activeCycles ?? 0, tone: 'cy' as const },
    { label: 'Phôi đông', value: dash?.frozenEmbryos ?? 0, tone: 'ok' as const },
    { label: 'Tỷ lệ TC', value: `${(dash?.successRate ?? 0).toFixed(1)}%`, tone: 'warn' as const },
  ], [items, dash]);

  return (
    <GenericListPage<IvfCouple>
      title="IVF — Cặp đôi điều trị" v1Path="/ivf-lab"
      items={items} loading={loading}
      keyword={keyword} onKeywordChange={setKeyword} onSearch={load}
      searchPlaceholder="Tìm tên vợ/chồng / mã..."
      selectedId={sel?.id} onSelect={setSel}
      stats={stats}
      columns={[
        { key: 'wife', label: 'Vợ', render: (r) => (
          <><div style={{ fontWeight: 500 }}>{r.wifeName || '—'}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--t-3)' }}>{r.wifeCode}</div></>
        ) },
        { key: 'hus', label: 'Chồng', render: (r) => (
          <><div>{r.husbandName || '—'}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--t-3)' }}>{r.husbandCode}</div></>
        ) },
        { key: 'dur', label: 'Vô sinh (tháng)', render: (r) => <span className="mono">{r.infertilityDurationMonths}</span> },
        { key: 'cause', label: 'Nguyên nhân', render: (r) => <span className="muted">{r.infertilityCause || '—'}</span> },
        { key: 'cyc', label: 'Chu kỳ', render: (r) => <span className="mono">{r.cycleCount}</span> },
      ]}
      detailTitle={sel ? `${sel.wifeName || '?'} & ${sel.husbandName || '?'}` : 'Chọn cặp đôi'}
      detailFields={!sel ? null : [
        { label: 'Vợ', value: `${sel.wifeName || '—'} (${sel.wifeCode || ''})` },
        ...(sel.wifeDob ? [{ label: 'Sinh', value: <span className="mono">{dayjs(sel.wifeDob).format('DD/MM/YYYY')}</span> }] : []),
        { label: 'Chồng', value: `${sel.husbandName || '—'} (${sel.husbandCode || ''})` },
        ...(sel.husbandDob ? [{ label: 'Sinh (chồng)', value: <span className="mono">{dayjs(sel.husbandDob).format('DD/MM/YYYY')}</span> }] : []),
        ...(sel.marriageDate ? [{ label: 'Kết hôn', value: <span className="mono">{dayjs(sel.marriageDate).format('DD/MM/YYYY')}</span> }] : []),
        { label: 'Thời gian vô sinh', value: <span className="mono">{sel.infertilityDurationMonths} tháng</span> },
        { label: 'Nguyên nhân', value: sel.infertilityCause || '—' },
        { label: 'Số chu kỳ đã thực hiện', value: <span className="mono">{sel.cycleCount}</span> },
      ]}
    />
  );
};

export default IvfLabV2;
