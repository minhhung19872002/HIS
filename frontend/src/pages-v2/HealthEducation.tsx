import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { searchCampaigns } from '../api/healthEducation';
import type { HealthCampaign } from '../api/healthEducation';
import { GenericListPage } from './_GenericListPage';

const STATUS: Record<number, { text: string; cls: string }> = {
  0: { text: 'Lên kế hoạch', cls: 'warn' }, 1: { text: 'Đang diễn ra', cls: 'cy' },
  2: { text: 'Hoàn thành', cls: 'ok' }, 3: { text: 'Hủy', cls: 'crit' },
};

const HealthEducationV2: React.FC = () => {
  const [items, setItems] = useState<HealthCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sel, setSel] = useState<HealthCampaign | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r: any = await searchCampaigns({ keyword });
      const list = (r?.items || (Array.isArray(r) ? r : [])) as HealthCampaign[];
      setItems(list);
      if (list.length > 0 && !sel) setSel(list[0]);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const stats = useMemo(() => [
    { label: 'Tổng chiến dịch', value: items.length },
    { label: 'Đang diễn ra', value: items.filter((c) => c.status === 1).length, tone: 'cy' as const },
    { label: 'Hoàn thành', value: items.filter((c) => c.status === 2).length, tone: 'ok' as const },
    { label: 'Tổng người tham gia', value: items.reduce((s, c) => s + c.participantCount, 0) },
  ], [items]);

  return (
    <GenericListPage<HealthCampaign>
      title="Truyền thông giáo dục SK" v1Path="/health-education"
      items={items} loading={loading}
      keyword={keyword} onKeywordChange={setKeyword} onSearch={load}
      searchPlaceholder="Tìm chiến dịch..."
      selectedId={sel?.id} onSelect={setSel}
      stats={stats}
      columns={[
        { key: 'code', label: 'Mã', render: (r) => <span className="mono">{r.campaignCode}</span> },
        { key: 'title', label: 'Tiêu đề', render: (r) => <span style={{ fontWeight: 500 }}>{r.title}</span> },
        { key: 'audience', label: 'Đối tượng', render: (r) => <span className="muted">{r.targetAudience}</span> },
        { key: 'period', label: 'Thời gian', render: (r) => <span className="mono">{dayjs(r.startDate).format('DD/MM')} – {dayjs(r.endDate).format('DD/MM')}</span> },
        { key: 'count', label: 'TG', render: (r) => <span className="mono">{r.participantCount}</span> },
        { key: 'status', label: 'TT', render: (r) => {
          const s = STATUS[r.status] || { text: '—', cls: 'ghost' };
          return <span className={`chip ${s.cls}`}>{s.text}</span>;
        } },
      ]}
      detailTitle={sel?.title || 'Chọn chiến dịch'}
      detailFields={!sel ? null : [
        { label: 'Mã', value: <span className="mono">{sel.campaignCode}</span> },
        { label: 'Tiêu đề', value: sel.title },
        { label: 'Mô tả', value: sel.description },
        { label: 'Đối tượng', value: sel.targetAudience },
        { label: 'Địa điểm', value: sel.location },
        { label: 'Thời gian', value: <span className="mono">{dayjs(sel.startDate).format('DD/MM/YYYY')} – {dayjs(sel.endDate).format('DD/MM/YYYY')}</span> },
        { label: 'Người tổ chức', value: sel.organizerName },
        { label: 'Số người TG', value: String(sel.participantCount) },
        ...(sel.budget !== undefined ? [{ label: 'Ngân sách', value: <span className="mono">{sel.budget.toLocaleString('vi-VN')}đ</span> }] : []),
      ]}
    />
  );
};

export default HealthEducationV2;
