import React, { useEffect, useMemo, useState } from 'react';
import { useTabState } from '../../../hooks/useTabState';
import { fmtNum as fmt } from '../../../utils/format';
import dayjs from 'dayjs';
import { DatePicker } from 'antd';
import { searchCampaigns, createCampaign, updateCampaign, searchMaterials, createMaterial } from '../api/healthEducation';
import type { HealthCampaign, HealthMaterial } from '../api/healthEducation';
import { normalizeArrayResponse } from '../../../utils/apiNormalize';
import {
  KpiStrip, TopTabs, StatusTabs, SearchBox, DataTable, Pager, StatusBadge, ActBtn, Btn,
  DrawerShell, DrSec, DrField, CrudModal, useTabCounts, tk, ti, Ico,
  type ColumnDef, type CrudFieldCfg,
} from '@/_v2kit';
import { RefreshButton } from '../../../components/actions';

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

// Parity v1 (#352 P4): tab Tài liệu GDSK (HealthMaterial list + tạo mới)
const MATERIAL_TYPE_LABEL: Record<string, string> = {
  poster: 'Poster', brochure: 'Tờ rơi', video: 'Video', audio: 'Audio',
  presentation: 'Slide', infographic: 'Infographic', other: 'Khác',
};
const MATERIAL_STATUS: Record<number, { l: string; tone: 'ok' | 'info' | 'warn' }> = {
  0: { l: 'Bản nháp', tone: 'warn' }, 1: { l: 'Đã xuất bản', tone: 'ok' }, 2: { l: 'Lưu trữ', tone: 'info' },
};
const MATERIAL_FIELDS: CrudFieldCfg[] = [
  { key: 'title', label: 'Tiêu đề', required: true },
  { key: 'materialType', label: 'Loại tài liệu', type: 'select', required: true,
    options: Object.entries(MATERIAL_TYPE_LABEL).map(([value, label]) => ({ value, label })) },
  { key: 'topic', label: 'Chủ đề' },
  { key: 'author', label: 'Tác giả' },
  { key: 'language', label: 'Ngôn ngữ', type: 'select',
    options: [{ value: 'vi', label: 'Tiếng Việt' }, { value: 'en', label: 'English' }] },
];

type Tab = 'campaigns' | 'materials';
const TOP_TABS = [
  { v: 'campaigns' as Tab, l: 'Chiến dịch', ic: 'calendar' },
  { v: 'materials' as Tab, l: 'Tài liệu', ic: 'file-text' },
];

type SKey = 'planning' | 'active' | 'completed' | 'cancelled';
const STATUS_TABS = [
  { v: 'planning' as SKey,  l: 'Lên KH',       tone: 'warn' as const },
  { v: 'active' as SKey,    l: 'Đang diễn ra', tone: 'info' as const },
  { v: 'completed' as SKey, l: 'Hoàn thành',   tone: 'ok' as const },
  { v: 'cancelled' as SKey, l: 'Hủy',          tone: 'crit' as const },
];

const sKey = (n: number): SKey =>
  n === 0 ? 'planning' : n === 1 ? 'active' : n === 2 ? 'completed' : 'cancelled';

const PER = 18;

const HealthEducationV2: React.FC = () => {
  const [tab, setTab] = useTabState<Tab>('campaigns', 'tab');
  const [items, setItems] = useState<HealthCampaign[]>([]);
  const [materials, setMaterials] = useState<HealthMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useTabState<SKey | 'all'>('all', 'stab');
  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<HealthCampaign | null>(null);
  const [matOpen, setMatOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [cs, ms] = await Promise.allSettled([
        searchCampaigns({
          keyword: search,
          fromDate: range?.[0]?.format('YYYY-MM-DD'),
          toDate: range?.[1]?.format('YYYY-MM-DD'),
        }),
        searchMaterials({ keyword: search }),
      ]);
      if (cs.status === 'fulfilled') setItems(normalizeArrayResponse<HealthCampaign>(cs.value));
      if (ms.status === 'fulfilled') setMaterials(normalizeArrayResponse<HealthMaterial>(ms.value));
      if (cs.status === 'rejected') ti('Không tải được chiến dịch');
    } catch { ti('Không tải được dữ liệu GDSK'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [range]);

  const counts = useTabCounts(items, STATUS_TABS, (r) => sKey(r.status));

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (stab !== 'all' && sKey(r.status) !== stab) return false;
      if (!k) return true;
      return [r.title, r.campaignCode, r.targetAudience, r.location, r.organizerName]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab]);

  const filteredMaterials = useMemo(() => {
    const k = search.trim().toLowerCase();
    if (!k) return materials;
    return materials.filter((m) => [m.title, m.materialCode, m.topic, m.author]
      .some((v) => (v || '').toLowerCase().includes(k)));
  }, [materials, search]);

  const totalPages = Math.max(1, Math.ceil((tab === 'campaigns' ? filtered.length : filteredMaterials.length) / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);
  const pagedMaterials = filteredMaterials.slice(page * PER, (page + 1) * PER);

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

  const matCols: ColumnDef<HealthMaterial>[] = [
    { key: 'code', label: 'Mã TL', code: true, render: (r) => r.materialCode },
    { key: 'title', label: 'Tiêu đề', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.title}</div>
        {r.topic && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.topic}</div>}
      </div>
    ) },
    { key: 'type', label: 'Loại', render: (r) => (
      <StatusBadge tone="info">{MATERIAL_TYPE_LABEL[r.materialType] || r.materialType}</StatusBadge>
    ) },
    { key: 'author', label: 'Tác giả', render: (r) => r.author },
    { key: 'date', label: 'Ngày tạo', mono: true, render: (r) => r.createdDate ? dayjs(r.createdDate).format('DD/MM/YYYY') : '—' },
    { key: 'dl', label: 'Lượt tải', mono: true, render: (r) => r.downloadCount },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const s = MATERIAL_STATUS[r.status] || MATERIAL_STATUS[0];
      return <StatusBadge tone={s.tone} dot>{s.l}</StatusBadge>;
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
        { lbl: 'Tài liệu', val: materials.length, sub: 'truyền thông' },
      ]} />

      <TopTabs<Tab> tab={tab} setTab={(v) => { setTab(v); setPage(0); }} tabs={TOP_TABS} actions={
        <>
          <RefreshButton onRefresh={async () => { await load(); }} />
          {tab === 'campaigns' ? (
            <Btn variant="primary" onClick={openCreate}>
              <Ico name="plus" size={12} /> Chiến dịch mới
            </Btn>
          ) : (
            <Btn variant="primary" onClick={() => setMatOpen(true)}>
              <Ico name="plus" size={12} /> Tài liệu mới
            </Btn>
          )}
        </>
      } />

      <div className="ab-toolbar" style={{ borderTop: 'none' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder={tab === 'campaigns' ? 'Tìm tiêu đề / địa điểm / đối tượng…' : 'Tìm tiêu đề / chủ đề / tác giả…'} />
        {tab === 'campaigns' && (
          <DatePicker.RangePicker value={range} format="DD/MM/YYYY" size="small"
            onChange={(v) => { setRange(v as [dayjs.Dayjs, dayjs.Dayjs] | null); setPage(0); }} />
        )}
        <Btn variant="ghost" onClick={() => { setSearch(''); setStab('all'); setRange(null); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </Btn>
        <span className="spacer" />
        {tab === 'campaigns' && (
          <Btn variant="ghost" onClick={() => window.print()}>
            <Ico name="archive" size={12} /> Xuất danh sách
          </Btn>
        )}
      </div>

      {tab === 'campaigns' && <>
        <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

        <DataTable<HealthCampaign>
          columns={cols} data={paged} rowKey={(r) => r.id}
          loading={loading}
          onRowClick={setSel} actions={actions}
          empty="Chưa có chiến dịch GDSK"
        />
        <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />
      </>}

      {tab === 'materials' && <>
        <DataTable<HealthMaterial>
          columns={matCols} data={pagedMaterials} rowKey={(r) => r.id}
          loading={loading}
          empty="Chưa có tài liệu GDSK"
        />
        <Pager page={page} setPage={setPage} totalPages={totalPages} total={filteredMaterials.length} perPage={PER} />
      </>}

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

      <CrudModal
        open={matOpen}
        onClose={() => setMatOpen(false)}
        title="Tài liệu GDSK mới"
        fields={MATERIAL_FIELDS}
        initial={{ language: 'vi' }}
        onSubmit={async (v) => {
          await createMaterial(v);
          tk('Đã tạo tài liệu');
          load();
        }}
      />
    </div>
  );
};

export default HealthEducationV2;
