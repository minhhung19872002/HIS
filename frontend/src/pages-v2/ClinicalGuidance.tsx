import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { getGuidanceBatches } from '../api/clinicalGuidance';
import type { GuidanceBatchDto } from '../api/clinicalGuidance';
import { GenericListPage } from './_GenericListPage';

const TYPE: Record<number, string> = { 0: 'KCB', 1: 'Đào tạo', 2: 'Chuyển giao KT', 3: 'Hỗ trợ' };
const STATUS: Record<number, { text: string; cls: string }> = {
  0: { text: 'Lên KH', cls: 'warn' }, 1: { text: 'Đang TH', cls: 'cy' },
  2: { text: 'Xong', cls: 'ok' }, 3: { text: 'Hủy', cls: 'crit' },
};

const ClinicalGuidanceV2: React.FC = () => {
  const [items, setItems] = useState<GuidanceBatchDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sel, setSel] = useState<GuidanceBatchDto | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getGuidanceBatches({ keyword });
      const list = (r?.items || (Array.isArray(r) ? r : [])) as GuidanceBatchDto[];
      setItems(list);
      if (list.length > 0 && !sel) setSel(list[0]);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const stats = useMemo(() => [
    { label: 'Tổng đợt', value: items.length },
    { label: 'Đang TH', value: items.filter((b) => b.status === 1).length, tone: 'cy' as const },
    { label: 'Đã xong', value: items.filter((b) => b.status === 2).length, tone: 'ok' as const },
    { label: 'Tổng ngân sách (M)', value: Math.round(items.reduce((s, b) => s + (b.budget || 0), 0) / 1_000_000) },
  ], [items]);

  return (
    <GenericListPage<GuidanceBatchDto>
      title="Chỉ đạo tuyến" v1Path="/clinical-guidance"
      items={items} loading={loading}
      keyword={keyword} onKeywordChange={setKeyword} onSearch={load}
      searchPlaceholder="Tìm tiêu đề / cơ sở..."
      selectedId={sel?.id} onSelect={setSel}
      stats={stats}
      columns={[
        { key: 'code', label: 'Mã', render: (r) => <span className="mono">{r.batchCode}</span> },
        { key: 'title', label: 'Tiêu đề', render: (r) => <span style={{ fontWeight: 500 }}>{r.title}</span> },
        { key: 'target', label: 'Cơ sở đích', render: (r) => <span className="muted">{r.targetFacility}</span> },
        { key: 'type', label: 'Loại', render: (r) => <span className="muted">{TYPE[r.guidanceType] || '—'}</span> },
        { key: 'period', label: 'Thời gian', render: (r) => <span className="mono">{dayjs(r.startDate).format('DD/MM')} – {dayjs(r.endDate).format('DD/MM')}</span> },
        { key: 'count', label: 'HĐ', render: (r) => <span className="mono">{r.activityCount || 0}</span> },
        { key: 'status', label: 'TT', render: (r) => {
          const s = STATUS[r.status] || { text: '—', cls: 'ghost' };
          return <span className={`chip ${s.cls}`}>{s.text}</span>;
        } },
      ]}
      detailTitle={sel?.title || 'Chọn đợt'}
      detailFields={!sel ? null : [
        { label: 'Mã', value: <span className="mono">{sel.batchCode}</span> },
        { label: 'Tiêu đề', value: sel.title },
        { label: 'Cơ sở đích', value: sel.targetFacility },
        { label: 'Loại', value: TYPE[sel.guidanceType] || '—' },
        { label: 'Bắt đầu', value: <span className="mono">{dayjs(sel.startDate).format('DD/MM/YYYY')}</span> },
        { label: 'Kết thúc', value: <span className="mono">{dayjs(sel.endDate).format('DD/MM/YYYY')}</span> },
        ...(sel.teamMembers ? [{ label: 'Đội', value: sel.teamMembers }] : []),
        ...(sel.budget ? [{ label: 'Ngân sách', value: <span className="mono">{sel.budget.toLocaleString('vi-VN')}đ</span> }] : []),
        { label: 'Số HĐ', value: String(sel.activityCount || 0) },
        ...(sel.notes ? [{ label: 'Ghi chú', value: sel.notes }] : []),
      ]}
    />
  );
};

export default ClinicalGuidanceV2;
