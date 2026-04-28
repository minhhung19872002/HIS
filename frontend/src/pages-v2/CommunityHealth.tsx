import React, { useEffect, useMemo, useState } from 'react';
import { searchHouseholds, getStats } from '../api/communityHealth';
import type { Household, CommunityHealthStats } from '../api/communityHealth';
import { GenericListPage } from './_GenericListPage';

const RISK: Record<string, { text: string; cls: string }> = {
  Low: { text: 'Thấp', cls: 'ok' },
  Medium: { text: 'Vừa', cls: 'cy' },
  High: { text: 'Cao', cls: 'warn' },
  VeryHigh: { text: 'Rất cao', cls: 'crit' },
};

const STATUS: Record<number, string> = { 0: 'Đang theo dõi', 1: 'Ngừng', 2: 'Chuyển đi' };

const CommunityHealthV2: React.FC = () => {
  const [items, setItems] = useState<Household[]>([]);
  const [stats, setStats] = useState<CommunityHealthStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sel, setSel] = useState<Household | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [list, s] = await Promise.all([searchHouseholds({ keyword }), getStats()]);
      setItems(list);
      setStats(s);
      if (list.length > 0 && !sel) setSel(list[0]);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const statRows = useMemo(() => [
    { label: 'Hộ gia đình', value: stats?.totalHouseholds ?? items.length },
    { label: 'Nhân khẩu', value: stats?.totalMembers ?? '—' },
    { label: 'Sàng lọc/tháng', value: stats?.screeningsThisMonth ?? 0, tone: 'cy' as const },
    { label: 'Hộ nguy cơ cao', value: stats?.highRiskHouseholds ?? 0, tone: 'crit' as const },
  ], [items, stats]);

  return (
    <GenericListPage<Household>
      title="Y tế cộng đồng — Hộ gia đình" v1Path="/community-health"
      items={items} loading={loading}
      keyword={keyword} onKeywordChange={setKeyword} onSearch={load}
      searchPlaceholder="Tìm chủ hộ / địa chỉ..."
      selectedId={sel?.id} onSelect={setSel}
      stats={statRows}
      columns={[
        { key: 'code', label: 'Mã hộ', render: (r) => <span className="mono">{r.householdCode}</span> },
        { key: 'head', label: 'Chủ hộ', render: (r) => <span style={{ fontWeight: 500 }}>{r.headName}</span> },
        { key: 'addr', label: 'Địa chỉ', render: (r) => <span className="muted">{r.ward}, {r.district}</span> },
        { key: 'mem', label: 'NK', render: (r) => <span className="mono">{r.memberCount}</span> },
        { key: 'risk', label: 'Nguy cơ', render: (r) => {
          const risk = RISK[String(r.riskLevel)] || { text: String(r.riskLevel), cls: 'ghost' };
          return <span className={`chip ${risk.cls}`}>{risk.text}</span>;
        } },
        { key: 'team', label: 'Tổ', render: (r) => <span className="muted">{r.assignedTeamName || '—'}</span> },
      ]}
      detailTitle={sel?.householdCode || 'Chọn hộ'}
      detailFields={!sel ? null : [
        { label: 'Mã hộ', value: <span className="mono">{sel.householdCode}</span> },
        { label: 'Chủ hộ', value: sel.headName },
        { label: 'Địa chỉ', value: `${sel.address}, ${sel.ward}, ${sel.district}, ${sel.province}` },
        { label: 'SĐT', value: <span className="mono">{sel.phone || '—'}</span> },
        { label: 'Số NK', value: <span className="mono">{sel.memberCount}</span> },
        { label: 'Nguy cơ', value: RISK[String(sel.riskLevel)]?.text || String(sel.riskLevel) },
        { label: 'Tổ phụ trách', value: sel.assignedTeamName || '—' },
        { label: 'Đối tượng', value: [
          sel.hasElderlyMember && 'NCT',
          sel.hasChildUnder5 && 'Trẻ <5',
          sel.hasPregnant && 'PNCT',
          sel.hasChronicDisease && 'BMT',
        ].filter(Boolean).join(', ') || '—' },
        { label: 'Trạng thái', value: STATUS[sel.status] || '—' },
      ]}
    />
  );
};

export default CommunityHealthV2;
