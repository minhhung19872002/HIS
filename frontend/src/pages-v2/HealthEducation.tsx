import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { searchCampaigns } from '../api/healthEducation';
import type { HealthCampaign } from '../api/healthEducation';
import {
  KpiStrip, StatusTabs, SearchBox, DataTable, Pager, StatusBadge, ActBtn,
  DrawerShell, DrSec, DrField, tk, ti, Ico,
  type ColumnDef,
} from './_v2kit';

const STATUS_LABEL: Record<number, string> = {
  0: 'Lên kế hoạch', 1: 'Đang diễn ra', 2: 'Hoàn thành', 3: 'Hủy',
};

type SKey = 'planning' | 'active' | 'completed' | 'cancelled';
const STATUS_TABS = [
  { v: 'planning' as SKey,  l: 'Lên KH',       tone: 'warn' as const },
  { v: 'active' as SKey,    l: 'Đang diễn ra', tone: 'info' as const },
  { v: 'completed' as SKey, l: 'Hoàn thành',   tone: 'ok' as const },
  { v: 'cancelled' as SKey, l: 'Hủy',          tone: 'crit' as const },
];

const sKey = (n: number): SKey =>
  n === 0 ? 'planning' : n === 1 ? 'active' : n === 2 ? 'completed' : 'cancelled';

const fmt = (n: number) => (n || 0).toLocaleString('vi-VN');
const PER = 18;

const HealthEducationV2: React.FC = () => {
  const [items, setItems] = useState<HealthCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<HealthCampaign | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r: any = await searchCampaigns({ keyword: search });
      const list = (r?.items || (Array.isArray(r) ? r : [])) as HealthCampaign[];
      setItems(list);
    } catch { ti('Không tải được chiến dịch'); }
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
      if (!k) return true;
      return [r.title, r.campaignCode, r.targetAudience, r.location, r.organizerName]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const cols: ColumnDef<HealthCampaign>[] = [
    { key: 'code', label: 'Mã CD', code: true, render: (r) => r.campaignCode },
    { key: 'title', label: 'Chiến dịch', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.title}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)' }}>📍 {r.location}</div>
      </div>
    ) },
    { key: 'audience', label: 'Đối tượng', render: (r) => r.targetAudience },
    { key: 'period', label: 'Thời gian', mono: true, render: (r) => (
      <div>
        <div>{dayjs(r.startDate).format('DD/MM')} – {dayjs(r.endDate).format('DD/MM/YY')}</div>
        <div style={{ fontSize: 10, color: 'var(--t-2)' }}>{dayjs(r.endDate).diff(dayjs(r.startDate), 'day') + 1} ngày</div>
      </div>
    ) },
    { key: 'count', label: 'Người TG', mono: true, render: (r) => r.participantCount.toLocaleString('vi-VN') },
    { key: 'budget', label: 'Ngân sách', mono: true, render: (r) => r.budget !== undefined ? `${fmt(r.budget)} đ` : '—' },
    { key: 'org', label: 'Người tổ chức', render: (r) => r.organizerName },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === sKey(r.status));
      return <StatusBadge tone={t?.tone || 'info'} dot>{STATUS_LABEL[r.status] || '—'}</StatusBadge>;
    } },
  ];

  const actions = (r: HealthCampaign) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      <ActBtn ic="print" title="In poster" onClick={() => tk(`In poster ${r.campaignCode}`)} />
    </div>
  );

  const totalParticipants = items.reduce((s, c) => s + c.participantCount, 0);

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng chiến dịch', val: items.length, sub: 'tất cả' },
        { lbl: 'Đang diễn ra', val: counts.active || 0, sub: 'hiện tại', tone: 'info' },
        { lbl: 'Hoàn thành', val: counts.completed || 0, sub: `${Math.round(((counts.completed || 0) / Math.max(1, items.length)) * 100)}%`, tone: 'ok' },
        { lbl: 'Tổng người TG', val: totalParticipants.toLocaleString('vi-VN'), sub: 'lượt' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm tiêu đề / địa điểm / đối tượng…" />
        <button className="ab-btn ghost" type="button" onClick={() => { setSearch(''); setStab('all'); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </button>
        <button className="ab-btn ghost" type="button" onClick={() => tk('Mở thư viện tài liệu')}>
          <Ico name="archive" size={12} /> Tài liệu
        </button>
        <button className="ab-btn primary" type="button" onClick={() => tk('Mở chiến dịch mới')}>
          <Ico name="plus" size={12} /> Chiến dịch mới
        </button>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<HealthCampaign>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có chiến dịch GDSK'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? sel.title : ''}
        sub={sel ? `${sel.campaignCode} · ${sel.location}` : ''}
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setSel(null)}>Đóng</button>
          <button type="button" className="ab-btn" onClick={() => tk('Đã in báo cáo')}>
            <Ico name="print" size={12} /> In báo cáo
          </button>
          <button type="button" className="ab-btn primary" onClick={() => tk('Mở cập nhật')}>
            <Ico name="edit" size={12} /> Cập nhật
          </button>
        </>}
      >
        {sel && <>
          <DrSec title="Chiến dịch">
            <DrField lbl="Mã"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.campaignCode}</span></DrField>
            <DrField lbl="Tiêu đề">{sel.title}</DrField>
            <DrField lbl="Mô tả">{sel.description}</DrField>
            <DrField lbl="Đối tượng">{sel.targetAudience}</DrField>
            <DrField lbl="Địa điểm">{sel.location}</DrField>
          </DrSec>
          <DrSec title="Thời gian & nguồn lực">
            <DrField lbl="Bắt đầu">{dayjs(sel.startDate).format('DD/MM/YYYY')}</DrField>
            <DrField lbl="Kết thúc">{dayjs(sel.endDate).format('DD/MM/YYYY')}</DrField>
            <DrField lbl="Số ngày"><span style={{ fontFamily: 'var(--font-mono)' }}>{dayjs(sel.endDate).diff(dayjs(sel.startDate), 'day') + 1}</span></DrField>
            <DrField lbl="Người tổ chức">{sel.organizerName}</DrField>
            <DrField lbl="Người tham gia"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.participantCount.toLocaleString('vi-VN')}</span></DrField>
            {sel.budget !== undefined && <DrField lbl="Ngân sách"><span style={{ fontFamily: 'var(--font-mono)' }}>{fmt(sel.budget)} đ</span></DrField>}
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

export default HealthEducationV2;
