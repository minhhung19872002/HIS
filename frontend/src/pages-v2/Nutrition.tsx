import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Input } from 'antd';
import {
  getDietOrders, getDietOrderById, createDietOrder, updateDietOrder, cancelDietOrder, getDietTypes,
} from '../api/nutrition';
import type { CreateDietOrderDto } from '../api/nutrition';
import { getInpatientList } from '../api/inpatient';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn, Btn, CrudModal, ModalShell,
  DrawerShell, DrSec, DrField, tk, ti, te,
  type ColumnDef, type CrudFieldCfg,
} from './_v2kit';

type Row = {
  id: string;
  orderCode?: string;
  patientName?: string;
  patientCode?: string;
  medicalRecordCode?: string;
  departmentName?: string;
  bedNumber?: string;
  dietType?: string;
  dietTypeName?: string;
  dietCategory?: string;
  texture?: string;
  consistency?: string;
  calorieLevel?: number;
  proteinLevel?: number;
  energyKcal?: number;
  proteinGrams?: number;
  fluidMl?: number;
  feedingRoute?: string;
  mealFrequency?: number;
  restrictions?: string[] | string;
  allergies?: string[] | string;
  status?: string | number;
  statusName?: string;
  orderedBy?: string;
  orderedByName?: string;
  startDate?: string;
  endDate?: string;
};

type SKey = 'active' | 'inactive';
const STATUS_TABS = [
  { v: 'active' as SKey,   l: 'Đang dùng', tone: 'ok' as const },
  { v: 'inactive' as SKey, l: 'Đã ngưng',  tone: 'warn' as const },
];

const isActive = (s: string | number | undefined) => s === 'Active' || s === 1 || s === '1';

const PER = 18;

const NutritionV2: React.FC = () => {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fDept, setFDept] = useState('');
  const [fRoute, setFRoute] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<Row | null>(null);
  const [dietTypeOpts, setDietTypeOpts] = useState<{ value: string; label: string }[]>([]);
  const [admissionOpts, setAdmissionOpts] = useState<{ value: string; label: string }[]>([]);
  const [crudOpen, setCrudOpen] = useState(false);
  const [crudInit, setCrudInit] = useState<Record<string, unknown> | null>(null);
  const [cancelRow, setCancelRow] = useState<Row | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const openCreate = () => {
    setCrudInit({ texture: 'Regular', feedingRoute: 'Oral', mealFrequency: 3, snacksIncluded: false, energyKcal: 0, proteinGrams: 0, startDate: dayjs().format('YYYY-MM-DD') });
    setCrudOpen(true);
  };
  const openEdit = async (r: Row) => {
    try { setCrudInit({ ...(await getDietOrderById(r.id)).data } as Record<string, unknown>); setCrudOpen(true); }
    catch { te('Không tải được chi tiết đơn'); }
  };
  const doCancel = async () => {
    if (!cancelRow) return;
    setCancelling(true);
    try {
      await cancelDietOrder(cancelRow.id, cancelReason.trim() || 'Ngưng theo chỉ định');
      tk('Đã ngưng đơn dinh dưỡng'); setCancelRow(null); setCancelReason(''); load();
    } catch { te('Ngưng đơn thất bại'); }
    finally { setCancelling(false); }
  };

  const dietFields: CrudFieldCfg[] = useMemo(() => [
    { key: 'admissionId', label: 'Bệnh nhân (nội trú)', type: 'select', required: true, options: admissionOpts, showSearch: true, disabledOnEdit: true },
    { key: 'dietType', label: 'Chế độ ăn', type: 'select', required: true, options: dietTypeOpts, showSearch: true },
    { key: 'texture', label: 'Cấu trúc', type: 'select', required: true, options: [
      { value: 'Regular', label: 'Thường' }, { value: 'Soft', label: 'Mềm' }, { value: 'Pureed', label: 'Xay nhuyễn' }, { value: 'Liquid', label: 'Lỏng' }] },
    { key: 'feedingRoute', label: 'Đường nuôi', type: 'select', required: true, options: [
      { value: 'Oral', label: 'Đường miệng' }, { value: 'NG', label: 'Sonde dạ dày (NG)' }, { value: 'PEG', label: 'Mở thông dạ dày (PEG)' }, { value: 'TPN', label: 'Nuôi tĩnh mạch (TPN)' }] },
    { key: 'energyKcal', label: 'Năng lượng (kcal)', type: 'number', required: true },
    { key: 'proteinGrams', label: 'Protein (g)', type: 'number', required: true },
    { key: 'fluidMl', label: 'Dịch (ml)', type: 'number' },
    { key: 'mealFrequency', label: 'Số bữa / ngày', type: 'number', required: true },
    { key: 'snacksIncluded', label: 'Có bữa phụ', type: 'switch' },
    { key: 'startDate', label: 'Ngày bắt đầu', type: 'date', required: true },
    { key: 'endDate', label: 'Ngày kết thúc', type: 'date' },
    { key: 'specialInstructions', label: 'Hướng dẫn đặc biệt', type: 'textarea' },
  ], [admissionOpts, dietTypeOpts]);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getDietOrders({ keyword: search, pageSize: 200 });
      const body = r.data as unknown;
      const list = (Array.isArray(body) ? body : ((body as { items?: Row[] })?.items || [])) as Row[];
      setItems(list);
    } catch { ti('Không tải được đơn dinh dưỡng'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  useEffect(() => {
    (async () => {
      try {
        const [dt, ip] = await Promise.all([getDietTypes(), getInpatientList({ pageSize: 300 })]);
        setDietTypeOpts((dt.data || []).map((t) => ({ value: t.code, label: t.name })));
        setAdmissionOpts((ip.data?.items || []).map((p) => ({ value: p.admissionId, label: `${p.patientName} · ${p.bedName || p.roomName || p.departmentName}` })));
      } catch { /* options optional — modal vẫn mở được, chỉ thiếu gợi ý */ }
    })();
  }, []);

  const depts = useMemo(() => {
    const set = new Set(items.map((r) => r.departmentName).filter(Boolean) as string[]);
    return Array.from(set).map((v) => ({ v, l: v }));
  }, [items]);
  const routes = useMemo(() => {
    const set = new Set(items.map((r) => r.feedingRoute || 'Oral').filter(Boolean));
    return Array.from(set).map((v) => ({ v, l: v }));
  }, [items]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    c.active = items.filter((r) => isActive(r.status)).length;
    c.inactive = items.length - c.active;
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (stab === 'active' && !isActive(r.status)) return false;
      if (stab === 'inactive' && isActive(r.status)) return false;
      if (fDept && r.departmentName !== fDept) return false;
      if (fRoute && (r.feedingRoute || 'Oral') !== fRoute) return false;
      if (!k) return true;
      return [r.orderCode, r.patientName, r.patientCode, r.medicalRecordCode]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fDept, fRoute]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const kcal = (r: Row) => r.energyKcal ?? r.calorieLevel ?? '—';
  const protein = (r: Row) => r.proteinGrams ?? r.proteinLevel ?? '—';
  const allergyText = (r: Row) => {
    const a = r.allergies; if (!a) return '—';
    return Array.isArray(a) ? (a.join(', ') || '—') : a;
  };
  const restrictText = (r: Row) => {
    const a = r.restrictions; if (!a) return '—';
    return Array.isArray(a) ? (a.join(', ') || '—') : a;
  };

  const cols: ColumnDef<Row>[] = [
    { key: 'code', label: 'Mã đơn', code: true, render: (r) => r.orderCode || '—' },
    { key: 'pt', label: 'Bệnh nhân', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.patientName || '—'}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.patientCode || r.medicalRecordCode || ''}</div>
      </div>
    ) },
    { key: 'loc', label: 'Khoa · Giường', render: (r) => (
      <div>
        <div>{r.departmentName || '—'}</div>
        {r.bedNumber && <div style={{ fontSize: 11, color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>G {r.bedNumber}</div>}
      </div>
    ) },
    { key: 'diet', label: 'Chế độ ăn', render: (r) => (
      <StatusBadge tone="info">{r.dietTypeName || r.dietType || '—'}</StatusBadge>
    ) },
    { key: 'tex', label: 'Cấu trúc', render: (r) => r.texture || '—' },
    { key: 'kp', label: 'kcal · Pro', mono: true, render: (r) => `${kcal(r)} · ${protein(r)}g` },
    { key: 'route', label: 'Đường', render: (r) => r.feedingRoute || 'Oral' },
    { key: 'allerg', label: 'Dị ứng', render: (r) => {
      const t = allergyText(r);
      return t === '—' ? <span style={{ color: 'var(--t-2)' }}>—</span>
        : <span style={{ fontSize: 11, color: 'var(--a-or-text)' }}>{t}</span>;
    } },
    { key: 'st', label: 'Trạng thái', render: (r) => (
      <StatusBadge tone={isActive(r.status) ? 'ok' : 'warn'} dot>{r.statusName || (isActive(r.status) ? 'Đang dùng' : 'Đã ngưng')}</StatusBadge>
    ) },
  ];

  const actions = (r: Row) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      <ActBtn ic="edit" title="Sửa" onClick={() => openEdit(r)} />
      {isActive(r.status) && <ActBtn ic="x" title="Ngưng đơn" tone="crit" onClick={() => { setCancelRow(r); setCancelReason(''); }} />}
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Đơn dinh dưỡng', val: items.length, sub: 'tổng' },
        { lbl: 'Đang dùng', val: counts.active, sub: `${Math.round((counts.active / Math.max(1, items.length)) * 100)}%`, tone: 'ok' },
        { lbl: 'Nuôi đặc biệt', val: items.filter((d) => (d.feedingRoute || 'Oral').toLowerCase() !== 'oral').length, sub: 'NG / TPN', tone: 'warn' },
        { lbl: 'Có dị ứng', val: items.filter((d) => {
          const a = d.allergies; return Array.isArray(a) ? a.length > 0 : !!a;
        }).length, sub: 'cần chú ý', tone: 'crit' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm BN / mã đơn / khoa…" />
        <Filter value={fDept} onChange={setFDept} options={depts} placeholder="▾ Khoa" />
        <Filter value={fRoute} onChange={setFRoute} options={routes} placeholder="▾ Đường nuôi" />
        <Btn variant="ghost" icon="x" onClick={() => { setSearch(''); setFDept(''); setFRoute(''); setStab('all'); }}>Bỏ lọc</Btn>
        <span className="spacer" />
        <Btn variant="ghost" icon="refresh" onClick={load}>Làm mới</Btn>
        <Btn variant="primary" icon="plus" onClick={openCreate}>Đơn mới</Btn>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<Row>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có đơn dinh dưỡng'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? `Đơn ${sel.orderCode || '—'}` : ''}
        sub={sel ? `${sel.patientName || '—'} · ${sel.dietTypeName || sel.dietType || '—'}` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
          <Btn icon="print" onClick={() => window.print()}>In thực đơn</Btn>
          {sel && isActive(sel.status) && (
            <Btn variant="crit" icon="x" onClick={() => { setCancelRow(sel); setCancelReason(''); setSel(null); }}>Ngưng đơn</Btn>
          )}
          <Btn variant="primary" icon="edit" onClick={() => { if (sel) { openEdit(sel); setSel(null); } }}>Chỉnh sửa</Btn>
        </>}
      >
        {sel && <>
          <DrSec title="Bệnh nhân">
            <DrField lbl="Họ tên">{sel.patientName || '—'}</DrField>
            <DrField lbl="Mã BN"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.patientCode || sel.medicalRecordCode || '—'}</span></DrField>
            <DrField lbl="Khoa">{sel.departmentName || '—'}</DrField>
            {sel.bedNumber && <DrField lbl="Giường">{sel.bedNumber}</DrField>}
          </DrSec>
          <DrSec title="Chế độ ăn">
            <DrField lbl="Loại">{sel.dietTypeName || sel.dietType || '—'}</DrField>
            <DrField lbl="Phân loại">{sel.dietCategory || '—'}</DrField>
            <DrField lbl="Cấu trúc">{sel.texture || '—'}</DrField>
            <DrField lbl="Đường nuôi">{sel.feedingRoute || 'Oral'}</DrField>
            {sel.mealFrequency && <DrField lbl="Số bữa"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.mealFrequency}</span></DrField>}
          </DrSec>
          <DrSec title="Định lượng">
            <div style={{ padding: 14, background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 6 }}>
              <Line label="Năng lượng" value={`${kcal(sel)} kcal`} />
              <Line label="Protein" value={`${protein(sel)} g`} />
              {sel.fluidMl && <Line label="Dịch" value={`${sel.fluidMl} ml`} />}
            </div>
          </DrSec>
          <DrSec title="Hạn chế & dị ứng">
            <DrField lbl="Hạn chế">{restrictText(sel)}</DrField>
            <DrField lbl="Dị ứng">{allergyText(sel)}</DrField>
          </DrSec>
          <DrSec title="Chỉ định">
            <DrField lbl="BS">{sel.orderedByName || sel.orderedBy || '—'}</DrField>
            {sel.startDate && <DrField lbl="Bắt đầu">{dayjs(sel.startDate).format('DD/MM/YYYY')}</DrField>}
            {sel.endDate && <DrField lbl="Kết thúc">{dayjs(sel.endDate).format('DD/MM/YYYY')}</DrField>}
            <DrField lbl="Trạng thái">
              <StatusBadge tone={isActive(sel.status) ? 'ok' : 'warn'} dot>
                {sel.statusName || (isActive(sel.status) ? 'Đang dùng' : 'Đã ngưng')}
              </StatusBadge>
            </DrField>
          </DrSec>
        </>}
      </DrawerShell>

      <CrudModal
        open={crudOpen}
        onClose={() => setCrudOpen(false)}
        title={crudInit?.id ? 'Cập nhật đơn dinh dưỡng' : 'Đơn dinh dưỡng mới'}
        fields={dietFields}
        initial={crudInit}
        size="lg"
        onSubmit={async (v, editing) => {
          const dto = v as unknown as CreateDietOrderDto;
          if (editing && crudInit?.id) await updateDietOrder(crudInit.id as string, dto);
          else await createDietOrder(dto);
          tk(editing ? 'Đã cập nhật đơn dinh dưỡng' : 'Đã tạo đơn dinh dưỡng');
          load();
        }}
      />

      <ModalShell
        open={!!cancelRow}
        onClose={() => setCancelRow(null)}
        title="Ngưng đơn dinh dưỡng"
        sub={cancelRow?.orderCode}
        size="sm"
        footer={<>
          <Btn variant="ghost" onClick={() => setCancelRow(null)}>Huỷ</Btn>
          <Btn variant="crit" disabled={cancelling} onClick={doCancel}>{cancelling ? 'Đang ngưng…' : 'Ngưng đơn'}</Btn>
        </>}
      >
        <DrField lbl="Lý do ngưng">
          <Input.TextArea rows={3} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Nhập lý do ngưng đơn…" />
        </DrField>
      </ModalShell>
    </div>
  );
};

const Line: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
    <span style={{ color: 'var(--t-2)' }}>{label}</span>
    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--t-0)' }}>{value}</span>
  </div>
);

export default NutritionV2;
