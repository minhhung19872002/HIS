import React, { useEffect, useMemo, useState } from 'react';
import { fmtNum as fmt } from '../utils/format';
import dayjs from 'dayjs';
import {
  getGuidanceBatches, createGuidanceBatch, updateGuidanceBatch, deleteGuidanceBatch,
  getGuidanceActivities, createGuidanceActivity,
} from '../api/clinicalGuidance';
import type { GuidanceBatchDto, CreateGuidanceBatchDto, GuidanceActivityDto, CreateGuidanceActivityDto } from '../api/clinicalGuidance';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn, Btn,
  DrawerShell, DrSec, DrField, CrudModal, useTabCounts, tk, ti, te, cf,
  type ColumnDef, type CrudFieldCfg,
} from './_v2kit';

const BATCH_FIELDS: CrudFieldCfg[] = [
  { key: 'title', label: 'Nội dung đợt', required: true },
  { key: 'targetFacility', label: 'Cơ sở nhận chỉ đạo', required: true },
  { key: 'guidanceType', label: 'Loại đợt', type: 'select', required: true, options: [
    { value: 1, label: 'Chuyển giao kỹ thuật' }, { value: 2, label: 'Đào tạo' },
    { value: 3, label: 'Hỗ trợ chuyên môn' }, { value: 4, label: 'Giám sát' }] },
  { key: 'startDate', label: 'Bắt đầu', type: 'date', required: true },
  { key: 'endDate', label: 'Kết thúc', type: 'date', required: true },
  { key: 'teamMembers', label: 'Thành viên đoàn', type: 'textarea' },
  { key: 'budget', label: 'Ngân sách (VND)', type: 'number' },
  { key: 'notes', label: 'Ghi chú', type: 'textarea' },
];

const TYPE_LABEL: Record<number, string> = {
  0: 'Khám chữa bệnh', 1: 'Đào tạo', 2: 'Chuyển giao KT', 3: 'Hỗ trợ',
};
const STATUS_LABEL: Record<number, string> = {
  0: 'Lên kế hoạch', 1: 'Đang triển khai', 2: 'Hoàn tất', 3: 'Hủy',
};

type SKey = 'planning' | 'inprogress' | 'completed' | 'cancelled';
const STATUS_TABS = [
  { v: 'planning' as SKey,   l: 'Lên KH',         tone: 'warn' as const },
  { v: 'inprogress' as SKey, l: 'Đang triển khai', tone: 'info' as const },
  { v: 'completed' as SKey,  l: 'Hoàn tất',       tone: 'ok' as const },
  { v: 'cancelled' as SKey,  l: 'Hủy',            tone: 'crit' as const },
];

const sKey = (n: number): SKey =>
  n === 0 ? 'planning' : n === 1 ? 'inprogress' : n === 2 ? 'completed' : 'cancelled';

const PER = 18;

const ACT_TYPE_LABEL: Record<number, string> = {
  0: 'Khám bệnh', 1: 'Phẫu thuật', 2: 'Đào tạo', 3: 'Hội chẩn', 4: 'Chuyển giao KT', 5: 'Hỗ trợ vật tư',
};

const ClinicalGuidanceV2: React.FC = () => {
  const [items, setItems] = useState<GuidanceBatchDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fType, setFType] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<GuidanceBatchDto | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getGuidanceBatches({ keyword: search });
      const list = (r?.items || (Array.isArray(r) ? r : [])) as GuidanceBatchDto[];
      setItems(list);
    } catch { ti('Không tải được danh sách chỉ đạo tuyến'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const types = useMemo(() => Object.entries(TYPE_LABEL).map(([v, l]) => ({ v, l })), []);

  const counts = useTabCounts(items, STATUS_TABS, (r) => sKey(r.status));

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (stab !== 'all' && sKey(r.status) !== stab) return false;
      if (fType && String(r.guidanceType) !== fType) return false;
      if (!k) return true;
      return [r.title, r.batchCode, r.targetFacility]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const cols: ColumnDef<GuidanceBatchDto>[] = [
    { key: 'code', label: 'Mã đợt', code: true, render: (r) => r.batchCode },
    { key: 'title', label: 'Nội dung', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.title}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>→ {r.targetFacility}</div>
      </div>
    ) },
    { key: 'type', label: 'Loại', render: (r) => (
      <StatusBadge tone="info">{TYPE_LABEL[r.guidanceType] || '—'}</StatusBadge>
    ) },
    { key: 'date', label: 'Thời gian', mono: true, render: (r) => (
      <div>
        <div>{dayjs(r.startDate).format('DD/MM')}–{dayjs(r.endDate).format('DD/MM/YY')}</div>
        <div style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-2)' }}>{dayjs(r.endDate).diff(dayjs(r.startDate), 'day') + 1} ngày</div>
      </div>
    ) },
    { key: 'budget', label: 'Ngân sách', mono: true, render: (r) => r.budget ? `${fmt(r.budget)} đ` : '—' },
    { key: 'cnt', label: 'Hoạt động', mono: true, render: (r) => r.activityCount || 0 },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === sKey(r.status));
      return <StatusBadge tone={t?.tone || 'info'} dot>{STATUS_LABEL[r.status] || '—'}</StatusBadge>;
    } },
  ];

  const [crudOpen, setCrudOpen] = useState(false);
  const [crudInit, setCrudInit] = useState<Record<string, unknown> | null>(null);
  const openCreate = () => { setCrudInit({ guidanceType: 1 }); setCrudOpen(true); };
  const openEdit = (r: GuidanceBatchDto) => { setCrudInit({ ...r } as Record<string, unknown>); setCrudOpen(true); };

  // Activities drawer
  const [actBatch, setActBatch] = useState<GuidanceBatchDto | null>(null);
  const [activities, setActivities] = useState<GuidanceActivityDto[]>([]);
  const [actLoading, setActLoading] = useState(false);
  const [actCrudOpen, setActCrudOpen] = useState(false);
  const [actCrudInit, setActCrudInit] = useState<Record<string, unknown> | null>(null);

  const openActivities = async (batch: GuidanceBatchDto) => {
    setActBatch(batch);
    setActivities([]);
    setActLoading(true);
    try {
      const list = await getGuidanceActivities(batch.id);
      setActivities(list);
    } catch { ti('Không tải được danh sách hoạt động'); }
    finally { setActLoading(false); }
  };

  const actFields: CrudFieldCfg[] = [
    { key: 'activityType', label: 'Loại hoạt động', type: 'select', required: true, options:
      Object.entries(ACT_TYPE_LABEL).map(([v, l]) => ({ value: Number(v), label: l })) },
    { key: 'activityDate', label: 'Ngày thực hiện', type: 'date', required: true },
    { key: 'description', label: 'Mô tả', required: true, type: 'textarea' },
    { key: 'staffName', label: 'Nhân sự thực hiện' },
    { key: 'result', label: 'Kết quả', type: 'textarea' },
    { key: 'notes', label: 'Ghi chú', type: 'textarea' },
  ];
  const del = (r: GuidanceBatchDto) => cf(`Xoá đợt chỉ đạo "${r.title}"?`, async () => {
    try { await deleteGuidanceBatch(r.id); tk('Đã xoá'); load(); } catch { te('Xoá thất bại'); }
  }, { tone: 'crit', confirm: 'Xoá' });

  const actions = (r: GuidanceBatchDto) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      <ActBtn ic="activity" title="Hoạt động" onClick={() => openActivities(r)} />
      <ActBtn ic="edit" title="Sửa" onClick={() => openEdit(r)} />
      <ActBtn ic="trash" title="Xoá" tone="crit" onClick={() => del(r)} />
    </div>
  );

  const totalBudget = items.reduce((s, b) => s + (b.budget || 0), 0);

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng đợt', val: items.length, sub: 'tất cả' },
        { lbl: 'Đang triển khai', val: counts.inprogress || 0, sub: 'hiện tại', tone: 'info' },
        { lbl: 'Đã hoàn tất', val: counts.completed || 0, sub: `${Math.round(((counts.completed || 0) / Math.max(1, items.length)) * 100)}%`, tone: 'ok' },
        { lbl: 'Tổng ngân sách', val: Math.round(totalBudget / 1_000_000), unit: 'tr', sub: 'VND', tone: 'warn' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm nội dung / cơ sở / mã đợt…" />
        <Filter value={fType} onChange={setFType} options={types} placeholder="▾ Loại đợt" />
        <Btn variant="ghost" icon="x" onClick={() => { setSearch(''); setFType(''); setStab('all'); }}>Bỏ lọc</Btn>
        <span className="spacer" />
        <Btn variant="ghost" icon="refresh" onClick={load}>Làm mới</Btn>
        <Btn variant="primary" icon="plus" onClick={openCreate}>Đợt mới</Btn>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<GuidanceBatchDto>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có đợt chỉ đạo'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? sel.title : ''}
        sub={sel ? `${sel.batchCode} · ${sel.targetFacility}` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
          <Btn icon="activity" onClick={() => { if (sel) { setSel(null); openActivities(sel); } }}>Hoạt động</Btn>
          <Btn variant="primary" icon="edit" onClick={() => { if (sel) openEdit(sel); setSel(null); }}>Sửa đợt</Btn>
        </>}
      >
        {sel && <>
          <DrSec title="Đợt chỉ đạo">
            <DrField lbl="Mã"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.batchCode}</span></DrField>
            <DrField lbl="Tiêu đề">{sel.title}</DrField>
            <DrField lbl="Cơ sở đích">{sel.targetFacility}</DrField>
            <DrField lbl="Loại">{TYPE_LABEL[sel.guidanceType] || '—'}</DrField>
            <DrField lbl="Trạng thái">
              <StatusBadge tone={STATUS_TABS.find((x) => x.v === sKey(sel.status))?.tone || 'info'} dot>
                {STATUS_LABEL[sel.status] || '—'}
              </StatusBadge>
            </DrField>
          </DrSec>
          <DrSec title="Thời gian & nguồn lực">
            <DrField lbl="Bắt đầu">{dayjs(sel.startDate).format('DD/MM/YYYY')}</DrField>
            <DrField lbl="Kết thúc">{dayjs(sel.endDate).format('DD/MM/YYYY')}</DrField>
            <DrField lbl="Số ngày"><span style={{ fontFamily: 'var(--font-mono)' }}>{dayjs(sel.endDate).diff(dayjs(sel.startDate), 'day') + 1}</span></DrField>
            {sel.teamMembers && <DrField lbl="Thành viên">{sel.teamMembers}</DrField>}
            {sel.budget !== undefined && <DrField lbl="Ngân sách"><span style={{ fontFamily: 'var(--font-mono)' }}>{fmt(sel.budget)} đ</span></DrField>}
            <DrField lbl="Số hoạt động"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.activityCount || 0}</span></DrField>
          </DrSec>
          {sel.notes && (
            <DrSec title="Ghi chú">
              <div style={{ fontSize: 'var(--fs-md)', color: 'var(--t-1)' }}>{sel.notes}</div>
            </DrSec>
          )}
        </>}
      </DrawerShell>

      <CrudModal
        open={crudOpen}
        onClose={() => setCrudOpen(false)}
        title={crudInit?.id ? 'Cập nhật đợt chỉ đạo' : 'Đợt chỉ đạo tuyến mới'}
        fields={BATCH_FIELDS}
        initial={crudInit}
        size="lg"
        onSubmit={async (v, editing) => {
          const dto = v as unknown as CreateGuidanceBatchDto;
          if (editing && crudInit?.id) await updateGuidanceBatch(String(crudInit.id), dto);
          else await createGuidanceBatch(dto);
          tk(editing ? 'Đã cập nhật đợt' : 'Đã tạo đợt');
          load();
        }}
      />

      {/* Drawer danh sách hoạt động của batch đang chọn */}
      <DrawerShell
        open={!!actBatch}
        onClose={() => setActBatch(null)}
        size="lg"
        title={actBatch ? `Hoạt động: ${actBatch.title}` : ''}
        sub={actBatch ? `${actBatch.batchCode} · ${activities.length} hoạt động` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setActBatch(null)}>Đóng</Btn>
          <Btn variant="primary" icon="plus" onClick={() => {
            if (actBatch) setActCrudInit({ batchId: actBatch.id, activityDate: dayjs().format('YYYY-MM-DD') });
            setActCrudOpen(true);
          }}>Thêm hoạt động</Btn>
        </>}
      >
        {actLoading && <div style={{ padding: 'var(--space-24)', textAlign: 'center', color: 'var(--t-2)' }}>Đang tải…</div>}
        {!actLoading && activities.length === 0 && (
          <div style={{ padding: 'var(--space-24)', textAlign: 'center', color: 'var(--t-3)' }}>Chưa có hoạt động nào</div>
        )}
        {!actLoading && activities.map((act) => (
          <DrSec key={act.id} title={`${ACT_TYPE_LABEL[act.activityType] || '—'} · ${dayjs(act.activityDate).format('DD/MM/YYYY')}`}>
            <DrField lbl="Mô tả">{act.description}</DrField>
            {act.staffName && <DrField lbl="Nhân sự">{act.staffName}</DrField>}
            {act.result && <DrField lbl="Kết quả">{act.result}</DrField>}
            {act.notes && <DrField lbl="Ghi chú">{act.notes}</DrField>}
          </DrSec>
        ))}
      </DrawerShell>

      {/* Modal tạo hoạt động mới */}
      <CrudModal
        open={actCrudOpen}
        onClose={() => setActCrudOpen(false)}
        title="Thêm hoạt động"
        fields={actFields}
        initial={actCrudInit}
        size="md"
        onSubmit={async (v) => {
          const dto: CreateGuidanceActivityDto = {
            batchId: actBatch!.id,
            activityType: Number(v.activityType),
            description: v.description as string,
            activityDate: v.activityDate as string,
            staffName: v.staffName as string | undefined,
            result: v.result as string | undefined,
            notes: v.notes as string | undefined,
          };
          await createGuidanceActivity(dto);
          tk('Đã thêm hoạt động');
          setActCrudOpen(false);
          // Reload activities list
          if (actBatch) {
            const list = await getGuidanceActivities(actBatch.id);
            setActivities(list);
          }
        }}
      />
    </div>
  );
};

export default ClinicalGuidanceV2;
