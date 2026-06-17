import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { searchCampaigns, createCampaign, updateCampaign } from '../api/healthEducation';
import type { HealthCampaign } from '../api/healthEducation';
import { normalizeArrayResponse } from '../utils/apiNormalize';
import {
  KpiStrip, StatusTabs, SearchBox, DataTable, Pager, StatusBadge, ActBtn, Btn,
  DrawerShell, DrSec, DrField, CrudModal, tk, ti, Ico,
  type ColumnDef, type CrudFieldCfg,
} from './_v2kit';

const CAMPAIGN_FIELDS: CrudFieldCfg[] = [
  { key: 'campaignCode', label: 'Mã chiến dịch', required: true, disabledOnEdit: true },
  { key: 'title', label: 'Tiêu đề', required: true },
  { key: 'description', label: 'Mô tả', type: 'textarea' },
  { key: 'startDate', label: 'Bắt đầu', type: 'date', required: true },
  { key: 'endDate', label: 'Kết thúc', type: 'date' },
  { key: 'targetAudience', label: 'Đối tượng' },
  { key: 'location', label: 'Địa điểm' },
  { key: 'organizerName', label: 'Người tổ chức' },
  { key: 'participantCount', label: 'Số người TG', type: 'number' },
  { key: 'budget', label: 'Kinh phí', type: 'number' },
  { key: 'status', label: 'Trạng thái', type: 'select', options: [
    { value: 0, label: 'Kế hoạch' }, { value: 1, label: 'Đang diễn ra' }, { value: 2, label: 'Hoàn thành' }, { value: 3, label: 'Đã huỷ' }] },
  { key: 'notes', label: 'Ghi chú', type: 'textarea' },
];

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
      const r = await searchCampaigns({ keyword: search });
      setItems(normalizeArrayResponse<HealthCampaign>(r));
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
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>📍 {r.location}</div>
      </div>
    ) },
    { key: 'audience', label: 'Đối tượng', render: (r) => r.targetAudience },
    { key: 'period', label: 'Thời gian', mono: true, render: (r) => (
      <div>
        <div>{dayjs(r.startDate).format('DD/MM')} – {dayjs(r.endDate).format('DD/MM/YY')}</div>
        <div style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-2)' }}>{dayjs(r.endDate).diff(dayjs(r.startDate), 'day') + 1} ngày</div>
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

  const [crudOpen, setCrudOpen] = useState(false);
  const [crudInit, setCrudInit] = useState<Record<string, unknown> | null>(null);
  const openCreate = () => { setCrudInit({ status: 0, participantCount: 0 }); setCrudOpen(true); };
  const openEdit = (r: HealthCampaign) => { setCrudInit({ ...r } as Record<string, unknown>); setCrudOpen(true); };

  const actions = (r: HealthCampaign) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      <ActBtn ic="edit" title="Sửa" onClick={() => openEdit(r)} />
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
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
        <Btn variant="ghost" onClick={() => { setSearch(''); setStab('all'); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </Btn>
        <span className="spacer" />
        <Btn variant="ghost" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </Btn>
        <Btn variant="ghost" onClick={() => window.print()}>
          <Ico name="archive" size={12} /> Xuất danh sách
        </Btn>
        <Btn variant="primary" onClick={openCreate}>
          <Ico name="plus" size={12} /> Chiến dịch mới
        </Btn>
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
          <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
          <Btn onClick={() => window.print()}>
            <Ico name="print" size={12} /> In báo cáo
          </Btn>
          <Btn variant="primary" onClick={() => { if (sel) openEdit(sel); setSel(null); }}>
            <Ico name="edit" size={12} /> Cập nhật
          </Btn>
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

      <CrudModal
        open={crudOpen}
        onClose={() => setCrudOpen(false)}
        title={crudInit?.id ? 'Cập nhật chiến dịch GDSK' : 'Chiến dịch GDSK mới'}
        fields={CAMPAIGN_FIELDS}
        initial={crudInit}
        size="lg"
        onSubmit={async (v, editing) => {
          if (editing && crudInit?.id) await updateCampaign(String(crudInit.id), v);
          else await createCampaign(v);
          tk(editing ? 'Đã cập nhật chiến dịch' : 'Đã tạo chiến dịch');
          load();
        }}
      />
    </div>
  );
};

export default HealthEducationV2;
