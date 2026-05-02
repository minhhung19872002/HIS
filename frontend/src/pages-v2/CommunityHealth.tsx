import React, { useEffect, useMemo, useState } from 'react';
import { searchHouseholds, getStats } from '../api/communityHealth';
import type { Household, CommunityHealthStats } from '../api/communityHealth';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn,
  DrawerShell, DrSec, DrField, tk, ti, Ico,
  type ColumnDef,
} from './_v2kit';

const RISK_LABEL: Record<string, string> = { Low: 'Thấp', Medium: 'Vừa', High: 'Cao', VeryHigh: 'Rất cao' };
const RISK_TONE: Record<string, 'ok' | 'info' | 'warn' | 'crit'> = {
  Low: 'ok', Medium: 'info', High: 'warn', VeryHigh: 'crit',
};

const STATUS_LABEL: Record<number, string> = { 0: 'Đang theo dõi', 1: 'Ngừng theo dõi', 2: 'Chuyển đi' };

type SKey = 'tracking' | 'stopped' | 'transferred';
const STATUS_TABS = [
  { v: 'tracking' as SKey,    l: 'Đang theo dõi', tone: 'ok' as const },
  { v: 'stopped' as SKey,     l: 'Ngừng',         tone: 'warn' as const },
  { v: 'transferred' as SKey, l: 'Chuyển đi',     tone: 'info' as const },
];

const sKey = (n: number): SKey => n === 0 ? 'tracking' : n === 1 ? 'stopped' : 'transferred';

const PER = 18;

const CommunityHealthV2: React.FC = () => {
  const [items, setItems] = useState<Household[]>([]);
  const [stats, setStats] = useState<CommunityHealthStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fRisk, setFRisk] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<Household | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [list, s] = await Promise.all([searchHouseholds({ keyword: search }), getStats()]);
      setItems(list);
      setStats(s);
    } catch { ti('Không tải được dữ liệu hộ gia đình'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    STATUS_TABS.forEach((s) => { c[s.v] = items.filter((r) => sKey(r.status) === s.v).length; });
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (stab !== 'all' && sKey(r.status) !== stab) return false;
      if (fRisk && String(r.riskLevel) !== fRisk) return false;
      if (!k) return true;
      return [r.householdCode, r.headName, r.address, r.ward, r.district, r.phone]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fRisk]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const cols: ColumnDef<Household>[] = [
    { key: 'code', label: 'Mã hộ', code: true, render: (r) => r.householdCode },
    { key: 'head', label: 'Chủ hộ', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.headName}</div>
        {r.phone && <div style={{ fontSize: 11, color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>📞 {r.phone}</div>}
      </div>
    ) },
    { key: 'addr', label: 'Địa chỉ', render: (r) => (
      <div>
        <div style={{ fontSize: 12 }}>{r.address}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.ward}, {r.district}</div>
      </div>
    ) },
    { key: 'mem', label: 'Nhân khẩu', mono: true, render: (r) => r.memberCount },
    { key: 'tags', label: 'Đối tượng', render: (r) => {
      const tags: string[] = [];
      if (r.hasElderlyMember) tags.push('NCT');
      if (r.hasChildUnder5) tags.push('Trẻ<5');
      if (r.hasPregnant) tags.push('PNCT');
      if (r.hasChronicDisease) tags.push('BMT');
      if (!tags.length) return <span style={{ color: 'var(--t-2)' }}>—</span>;
      return <span style={{ fontSize: 11, color: 'var(--a-cy-text)' }}>{tags.join(' · ')}</span>;
    } },
    { key: 'risk', label: 'Nguy cơ', render: (r) => (
      <StatusBadge tone={RISK_TONE[String(r.riskLevel)] || 'info'} dot>
        {RISK_LABEL[String(r.riskLevel)] || String(r.riskLevel)}
      </StatusBadge>
    ) },
    { key: 'team', label: 'Tổ', render: (r) => r.assignedTeamName || '—' },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === sKey(r.status));
      return <StatusBadge tone={t?.tone || 'info'} dot>{STATUS_LABEL[r.status] || '—'}</StatusBadge>;
    } },
  ];

  const actions = (r: Household) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      <ActBtn ic="user" title="Thành viên" onClick={() => tk(`Mở thành viên hộ ${r.householdCode}`)} />
    </div>
  );

  const riskOpts = Object.entries(RISK_LABEL).map(([v, l]) => ({ v, l }));

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Hộ gia đình', val: stats?.totalHouseholds ?? items.length, sub: 'tổng số' },
        { lbl: 'Nhân khẩu', val: stats?.totalMembers ?? '—', sub: 'tổng số', tone: 'info' },
        { lbl: 'Sàng lọc tháng', val: stats?.screeningsThisMonth ?? 0, sub: 'tháng này', tone: 'ok' },
        { lbl: 'Hộ nguy cơ cao', val: stats?.highRiskHouseholds ?? 0, sub: 'cần chú ý', tone: 'crit' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm chủ hộ / địa chỉ / SĐT…" />
        <Filter value={fRisk} onChange={setFRisk} options={riskOpts} placeholder="▾ Nguy cơ" />
        <button className="ab-btn ghost" type="button" onClick={() => { setSearch(''); setFRisk(''); setStab('all'); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </button>
        <button className="ab-btn ghost" type="button" onClick={() => tk('Mở sàng lọc NCD')}>
          <Ico name="activity" size={12} /> Sàng lọc NCD
        </button>
        <button className="ab-btn primary" type="button" onClick={() => tk('Mở đăng ký hộ mới')}>
          <Ico name="plus" size={12} /> Hộ mới
        </button>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<Household>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có hộ gia đình'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? `Hộ ${sel.headName}` : ''}
        sub={sel ? `${sel.householdCode} · ${sel.ward}, ${sel.district}` : ''}
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setSel(null)}>Đóng</button>
          <button type="button" className="ab-btn" onClick={() => tk('Mở thành viên hộ')}>
            <Ico name="user" size={12} /> Thành viên
          </button>
          <button type="button" className="ab-btn primary" onClick={() => tk('Mở thăm khám')}>
            <Ico name="activity" size={12} /> Thăm khám
          </button>
        </>}
      >
        {sel && <>
          <DrSec title="Hộ gia đình">
            <DrField lbl="Mã hộ"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.householdCode}</span></DrField>
            <DrField lbl="Chủ hộ">{sel.headName}</DrField>
            {sel.phone && <DrField lbl="SĐT"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.phone}</span></DrField>}
            <DrField lbl="Địa chỉ">{sel.address}</DrField>
            <DrField lbl="Phường/Xã">{sel.ward}</DrField>
            <DrField lbl="Quận/Huyện">{sel.district}</DrField>
            <DrField lbl="Tỉnh/TP">{sel.province}</DrField>
            <DrField lbl="Số nhân khẩu"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.memberCount}</span></DrField>
          </DrSec>
          <DrSec title="Đối tượng đặc biệt">
            <DrField lbl="Người cao tuổi">{sel.hasElderlyMember ? 'Có' : 'Không'}</DrField>
            <DrField lbl="Trẻ < 5 tuổi">{sel.hasChildUnder5 ? 'Có' : 'Không'}</DrField>
            <DrField lbl="Phụ nữ có thai">{sel.hasPregnant ? 'Có' : 'Không'}</DrField>
            <DrField lbl="Bệnh mãn tính">{sel.hasChronicDisease ? 'Có' : 'Không'}</DrField>
          </DrSec>
          <DrSec title="Theo dõi">
            <DrField lbl="Mức nguy cơ">
              <StatusBadge tone={RISK_TONE[String(sel.riskLevel)] || 'info'} dot>
                {RISK_LABEL[String(sel.riskLevel)] || String(sel.riskLevel)}
              </StatusBadge>
            </DrField>
            <DrField lbl="Tổ phụ trách">{sel.assignedTeamName || '—'}</DrField>
            <DrField lbl="Trạng thái">
              <StatusBadge tone={STATUS_TABS.find((x) => x.v === sKey(sel.status))?.tone || 'info'} dot>
                {STATUS_LABEL[sel.status] || '—'}
              </StatusBadge>
            </DrField>
          </DrSec>
        </>}
      </DrawerShell>
    </div>
  );
};

export default CommunityHealthV2;
