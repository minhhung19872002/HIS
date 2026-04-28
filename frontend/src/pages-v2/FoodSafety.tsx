import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { searchIncidents, getIncidentStats } from '../api/foodSafety';
import type { FoodSafetyIncident, FoodSafetyStats } from '../api/foodSafety';
import { GenericListPage } from './_GenericListPage';

const STATUS: Record<number, { text: string; cls: string }> = {
  0: { text: 'Báo cáo', cls: 'cy' },
  1: { text: 'Điều tra', cls: 'warn' },
  2: { text: 'Xác nhận', cls: 'crit' },
  3: { text: 'Đóng', cls: 'ghost' },
};

const SEVERITY: Record<number, { text: string; cls: string }> = {
  1: { text: 'Nhẹ', cls: 'ok' },
  2: { text: 'Vừa', cls: 'cy' },
  3: { text: 'Nặng', cls: 'warn' },
  4: { text: 'Nguy kịch', cls: 'crit' },
};

const FoodSafetyV2: React.FC = () => {
  const [items, setItems] = useState<FoodSafetyIncident[]>([]);
  const [stats, setStats] = useState<FoodSafetyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sel, setSel] = useState<FoodSafetyIncident | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [list, s] = await Promise.all([searchIncidents({ keyword }), getIncidentStats()]);
      setItems(list);
      setStats(s);
      if (list.length > 0 && !sel) setSel(list[0]);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const statRows = useMemo(() => [
    { label: 'Tổng vụ', value: stats?.totalIncidents ?? items.length },
    { label: 'Đang điều tra', value: stats?.activeInvestigations ?? items.filter((i) => i.investigationStatus === 1).length, tone: 'warn' as const },
    { label: 'Người ảnh hưởng', value: stats?.totalAffected ?? items.reduce((s, i) => s + (i.totalAffected || 0), 0), tone: 'cy' as const },
    { label: 'Tử vong', value: items.reduce((s, i) => s + (i.deaths || 0), 0), tone: 'crit' as const },
  ], [items, stats]);

  return (
    <GenericListPage<FoodSafetyIncident>
      title="An toàn thực phẩm — Vụ ngộ độc" v1Path="/food-safety"
      items={items} loading={loading}
      keyword={keyword} onKeywordChange={setKeyword} onSearch={load}
      searchPlaceholder="Tìm địa điểm / mã vụ..."
      selectedId={sel?.id} onSelect={setSel}
      stats={statRows}
      columns={[
        { key: 'code', label: 'Mã vụ', render: (r) => <span className="mono">{r.incidentCode}</span> },
        { key: 'date', label: 'Ngày', render: (r) => <span className="mono">{dayjs(r.incidentDate).format('DD/MM')}</span> },
        { key: 'loc', label: 'Địa điểm', render: (r) => (
          <><div style={{ fontWeight: 500 }}>{r.location}</div>
            <div className="muted" style={{ fontSize: 11 }}>{r.locationType}</div></>
        ) },
        { key: 'aff', label: 'AH/NV/TV', render: (r) => <span className="mono">{r.totalAffected}/{r.hospitalized}/{r.deaths}</span> },
        { key: 'sev', label: 'Mức', render: (r) => {
          const s = SEVERITY[r.severity] || { text: '—', cls: 'ghost' };
          return <span className={`chip ${s.cls}`}>{s.text}</span>;
        } },
        { key: 'status', label: 'TT', render: (r) => {
          const s = STATUS[r.investigationStatus] || { text: '—', cls: 'ghost' };
          return <span className={`chip ${s.cls}`}>{s.text}</span>;
        } },
      ]}
      detailTitle={sel?.incidentCode || 'Chọn vụ'}
      detailFields={!sel ? null : [
        { label: 'Mã vụ', value: <span className="mono">{sel.incidentCode}</span> },
        { label: 'Ngày xảy ra', value: <span className="mono">{dayjs(sel.incidentDate).format('DD/MM/YYYY')}</span> },
        { label: 'Báo cáo', value: <span className="mono">{dayjs(sel.reportDate).format('DD/MM/YYYY')}</span> },
        { label: 'Địa điểm', value: `${sel.location} (${sel.locationType})` },
        { label: 'Mô tả', value: sel.description },
        { label: 'TP nghi', value: sel.suspectedFood || '—' },
        { label: 'Nguyên nhân nghi', value: sel.suspectedCause || '—' },
        { label: 'Ảnh hưởng', value: <span className="mono">{sel.totalAffected} người</span> },
        { label: 'Nhập viện', value: <span className="mono">{sel.hospitalized}</span> },
        { label: 'Tử vong', value: <span className="mono">{sel.deaths}</span> },
        { label: 'Người báo cáo', value: sel.reportedByName || sel.reportedBy },
        { label: 'Cán bộ điều tra', value: sel.investigatorName || '—' },
      ]}
    />
  );
};

export default FoodSafetyV2;
