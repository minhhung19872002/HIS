import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { DatePicker } from 'antd';
import {
  searchWasteRecords, createWasteRecord, updateWasteRecord, searchMonitoring, createMonitoring,
  getWasteStats, getMonitoringStats, getBiosafetyStatus,
} from '../modules/public-health/api/environmentalHealth';
import type { WasteRecord, MonitoringRecord, WasteStats, MonitoringStats, BiosafetyStatus } from '../modules/public-health/api/environmentalHealth';
import { normalizeArrayResponse } from '../utils/apiNormalize';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn, Btn,
  DrawerShell, DrSec, DrField, CrudModal, tk, ti, Ico,
  type ColumnDef, type CrudFieldCfg,
} from './_v2kit';

const MONITORING_FIELDS: CrudFieldCfg[] = [
  { key: 'recordCode', label: 'Mã phiếu', required: true, disabledOnEdit: true },
  { key: 'monitoringDate', label: 'Ngày quan trắc', type: 'date', required: true },
  { key: 'monitoringType', label: 'Loại quan trắc', type: 'select', required: true, options: [
    { value: 'air', label: 'Không khí' }, { value: 'water', label: 'Nước' },
    { value: 'surface', label: 'Bề mặt' }, { value: 'noise', label: 'Tiếng ồn' },
    { value: 'radiation', label: 'Phóng xạ' }] },
  { key: 'location', label: 'Địa điểm', required: true },
  { key: 'parameter', label: 'Thông số đo', required: true },
  { key: 'value', label: 'Giá trị', type: 'number', required: true },
  { key: 'unit', label: 'Đơn vị' },
  { key: 'standardLimit', label: 'Giới hạn chuẩn', type: 'number' },
  { key: 'isCompliant', label: 'Đạt chuẩn', type: 'switch' },
  { key: 'measuredBy', label: 'Người đo' },
  { key: 'notes', label: 'Ghi chú', type: 'textarea' },
];

const WASTE_FIELDS: CrudFieldCfg[] = [
  { key: 'recordCode', label: 'Mã phiếu', required: true, disabledOnEdit: true },
  { key: 'recordDate', label: 'Ngày', type: 'date', required: true },
  { key: 'wasteType', label: 'Loại chất thải', type: 'select', required: true, options: [
    { value: 'infectious', label: 'Lây nhiễm' }, { value: 'sharp', label: 'Sắc nhọn' },
    { value: 'pharmaceutical', label: 'Dược phẩm' }, { value: 'chemical', label: 'Hoá chất' },
    { value: 'radioactive', label: 'Phóng xạ' }, { value: 'general', label: 'Thông thường' }] },
  { key: 'quantity', label: 'Khối lượng', type: 'number', required: true },
  { key: 'unit', label: 'Đơn vị', placeholder: 'kg' },
  { key: 'source', label: 'Nguồn phát sinh' },
  { key: 'handlerName', label: 'Người xử lý' },
  { key: 'disposalMethod', label: 'PP xử lý' },
  { key: 'isCompliant', label: 'Đạt chuẩn', type: 'switch' },
  { key: 'notes', label: 'Ghi chú', type: 'textarea' },
];

const TYPE_LABEL: Record<string, string> = {
  infectious: 'Lây nhiễm', sharp: 'Sắc nhọn', pharmaceutical: 'Dược',
  chemical: 'Hóa học', radioactive: 'Phóng xạ', general: 'Thông thường',
};
const TYPE_TONE: Record<string, 'ok' | 'info' | 'warn' | 'crit'> = {
  infectious: 'crit', sharp: 'crit', radioactive: 'crit',
  chemical: 'warn', pharmaceutical: 'warn', general: 'info',
};

type SKey = 'compliant' | 'noncompliant';
const STATUS_TABS = [
  { v: 'compliant' as SKey,    l: 'Đạt chuẩn',  tone: 'ok' as const },
  { v: 'noncompliant' as SKey, l: 'Vi phạm',    tone: 'crit' as const },
];

const PER = 18;

const EnvironmentalHealthV2: React.FC = () => {
  const [items, setItems] = useState<WasteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fType, setFType] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<WasteRecord | null>(null);
  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  // Thống kê server (parity v1): waste stats + monitoring stats + an toàn sinh học
  const [wasteStats, setWasteStats] = useState<WasteStats>({ totalCollectedThisMonth: 0, nonCompliantItems: 0, infectiousWasteKg: 0, generalWasteKg: 0 });
  const [monitoringStats, setMonitoringStats] = useState<MonitoringStats>({ totalMonitoringCount: 0, nonCompliantCount: 0 });
  const [biosafety, setBiosafety] = useState<BiosafetyStatus>({ level: 0, isCompliant: true });

  const load = async () => {
    setLoading(true);
    try {
      const params = {
        keyword: search || undefined,
        fromDate: range?.[0]?.format('YYYY-MM-DD'),
        toDate: range?.[1]?.format('YYYY-MM-DD'),
      };
      const results = await Promise.allSettled([
        searchWasteRecords(params),
        getWasteStats(),
        getMonitoringStats(),
        getBiosafetyStatus(),
      ]);
      if (results[0].status === 'fulfilled') setItems(normalizeArrayResponse<WasteRecord>(results[0].value));
      if (results[1].status === 'fulfilled') setWasteStats(results[1].value);
      if (results[2].status === 'fulfilled') setMonitoringStats(results[2].value);
      if (results[3].status === 'fulfilled') setBiosafety(results[3].value);
    } catch { ti('Không tải được dữ liệu chất thải'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [range]);

  const types = useMemo(() => Object.entries(TYPE_LABEL).map(([v, l]) => ({ v, l })), []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    c.compliant = items.filter((r) => r.isCompliant).length;
    c.noncompliant = items.filter((r) => !r.isCompliant).length;
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (stab === 'compliant' && !r.isCompliant) return false;
      if (stab === 'noncompliant' && r.isCompliant) return false;
      if (fType && r.wasteType !== fType) return false;
      if (!k) return true;
      return [r.recordCode, r.source, r.disposalMethod, r.handlerName]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const cols: ColumnDef<WasteRecord>[] = [
    { key: 'code', label: 'Mã phiếu', code: true, render: (r) => r.recordCode },
    { key: 'date', label: 'Ngày', mono: true, render: (r) => dayjs(r.recordDate).format('DD/MM/YYYY') },
    { key: 'type', label: 'Loại CT', render: (r) => (
      <StatusBadge tone={TYPE_TONE[r.wasteType] || 'info'}>{TYPE_LABEL[r.wasteType] || r.wasteType}</StatusBadge>
    ) },
    { key: 'qty', label: 'Số lượng', mono: true, render: (r) => `${r.quantity} ${r.unit}` },
    { key: 'src', label: 'Nguồn', render: (r) => r.source },
    { key: 'method', label: 'PP xử lý', render: (r) => r.disposalMethod },
    { key: 'handler', label: 'Người xử lý', render: (r) => r.handlerName },
    { key: 'comp', label: 'Đạt chuẩn', render: (r) => r.isCompliant
      ? <StatusBadge tone="ok" dot>Đạt</StatusBadge>
      : <StatusBadge tone="crit" dot>Vi phạm</StatusBadge>
    },
  ];

  const [crudOpen, setCrudOpen] = useState(false);
  const [crudInit, setCrudInit] = useState<Record<string, unknown> | null>(null);
  const openCreate = () => { setCrudInit({ isCompliant: true, unit: 'kg', wasteType: 'infectious' }); setCrudOpen(true); };
  const openEdit = (r: WasteRecord) => { setCrudInit({ ...r } as Record<string, unknown>); setCrudOpen(true); };

  // Quan trắc môi trường
  const [monitorOpen, setMonitorOpen] = useState(false);
  const [monitorings, setMonitorings] = useState<MonitoringRecord[]>([]);
  const [monitorLoading, setMonitorLoading] = useState(false);
  const [monitorCrudOpen, setMonitorCrudOpen] = useState(false);
  const loadMonitorings = async () => {
    setMonitorLoading(true);
    try {
      const r = await searchMonitoring({
        fromDate: range?.[0]?.format('YYYY-MM-DD'),
        toDate: range?.[1]?.format('YYYY-MM-DD'),
      });
      setMonitorings(r);
    }
    catch { ti('Không tải được dữ liệu quan trắc'); }
    finally { setMonitorLoading(false); }
  };

  const MONITOR_TYPE_LABEL: Record<string, string> = {
    air: 'Không khí', water: 'Nước', surface: 'Bề mặt', noise: 'Tiếng ồn', radiation: 'Phóng xạ',
  };

  const actions = (r: WasteRecord) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      <ActBtn ic="edit" title="Sửa" onClick={() => openEdit(r)} />
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Thu gom tháng (kg)', val: wasteStats.totalCollectedThisMonth, sub: `lây nhiễm ${wasteStats.infectiousWasteKg} kg · thường ${wasteStats.generalWasteKg} kg`, tone: 'info' },
        { lbl: 'Không tuân thủ', val: wasteStats.nonCompliantItems, sub: 'cần khắc phục', tone: 'crit' },
        { lbl: 'Giám sát (lượt)', val: monitoringStats.totalMonitoringCount, sub: `${monitoringStats.nonCompliantCount} vi phạm`, tone: 'ok' },
        { lbl: 'An toàn sinh học', val: biosafety.isCompliant ? 'Đạt' : 'Chưa đạt', sub: biosafety.level ? `cấp độ ${biosafety.level}` : undefined, tone: biosafety.isCompliant ? 'ok' : 'crit' },
        { lbl: 'Tổng phiếu', val: items.length, sub: `${counts.compliant} đạt · ${counts.noncompliant} vi phạm` },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm phiếu / nguồn / PP xử lý…" />
        <DatePicker.RangePicker value={range} format="DD/MM/YYYY" size="small"
          onChange={(v) => { setRange(v as [dayjs.Dayjs, dayjs.Dayjs] | null); setPage(0); }} />
        <Filter value={fType} onChange={setFType} options={types} placeholder="▾ Loại chất thải" />
        <Btn variant="ghost" onClick={() => { setSearch(''); setFType(''); setStab('all'); setRange(null); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </Btn>
        <span className="spacer" />
        <Btn variant="ghost" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </Btn>
        <Btn variant="ghost" onClick={() => { setMonitorOpen(true); loadMonitorings(); }}>
          <Ico name="activity" size={12} /> Quan trắc
        </Btn>
        <Btn variant="primary" onClick={openCreate}>
          <Ico name="plus" size={12} /> Phiếu mới
        </Btn>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<WasteRecord>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có phiếu chất thải'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="md"
        title={sel ? `Phiếu ${sel.recordCode}` : ''}
        sub={sel ? `${TYPE_LABEL[sel.wasteType] || sel.wasteType} · ${dayjs(sel.recordDate).format('DD/MM/YYYY')}` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
          <Btn onClick={() => { if (sel) openEdit(sel); setSel(null); }}>
            <Ico name="edit" size={12} /> Sửa
          </Btn>
          <Btn variant="primary" onClick={() => window.print()}>
            <Ico name="print" size={12} /> In phiếu
          </Btn>
        </>}
      >
        {sel && <>
          <DrSec title="Phiếu chất thải">
            <DrField lbl="Mã phiếu"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.recordCode}</span></DrField>
            <DrField lbl="Ngày">{dayjs(sel.recordDate).format('DD/MM/YYYY')}</DrField>
            <DrField lbl="Loại CT">
              <StatusBadge tone={TYPE_TONE[sel.wasteType] || 'info'}>{TYPE_LABEL[sel.wasteType] || sel.wasteType}</StatusBadge>
            </DrField>
            <DrField lbl="Số lượng"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.quantity} {sel.unit}</span></DrField>
            <DrField lbl="Nguồn">{sel.source}</DrField>
          </DrSec>
          <DrSec title="Xử lý">
            <DrField lbl="PP xử lý">{sel.disposalMethod}</DrField>
            <DrField lbl="Người xử lý">{sel.handlerName}</DrField>
            <DrField lbl="Đạt chuẩn">
              {sel.isCompliant
                ? <StatusBadge tone="ok" dot>Đạt</StatusBadge>
                : <StatusBadge tone="crit" dot>Vi phạm</StatusBadge>}
            </DrField>
            {sel.notes && <DrField lbl="Ghi chú">{sel.notes}</DrField>}
          </DrSec>
        </>}
      </DrawerShell>

      <CrudModal
        open={crudOpen}
        onClose={() => setCrudOpen(false)}
        title={crudInit?.id ? 'Cập nhật phiếu chất thải' : 'Phiếu chất thải mới'}
        fields={WASTE_FIELDS}
        initial={crudInit}
        size="lg"
        onSubmit={async (v, editing) => {
          if (editing && crudInit?.id) await updateWasteRecord(String(crudInit.id), v);
          else await createWasteRecord(v);
          tk(editing ? 'Đã cập nhật phiếu' : 'Đã tạo phiếu');
          load();
        }}
      />

      {/* Drawer quan trắc môi trường */}
      <DrawerShell
        open={monitorOpen}
        onClose={() => setMonitorOpen(false)}
        size="lg"
        title="Quan trắc môi trường"
        sub={`${monitorings.length} bản ghi`}
        footer={<>
          <Btn variant="ghost" onClick={() => setMonitorOpen(false)}>Đóng</Btn>
          <Btn variant="primary" onClick={() => setMonitorCrudOpen(true)}>
            <Ico name="plus" size={12} /> Bản ghi mới
          </Btn>
        </>}
      >
        {monitorLoading ? (
          <div style={{ padding: 'var(--space-24)', textAlign: 'center', color: 'var(--t-2)' }}>Đang tải…</div>
        ) : monitorings.length === 0 ? (
          <div style={{ padding: 'var(--space-24)', textAlign: 'center', color: 'var(--t-2)' }}>Chưa có bản ghi quan trắc</div>
        ) : monitorings.map((m) => (
          <DrSec key={m.id} title={`${MONITOR_TYPE_LABEL[m.monitoringType] || m.monitoringType} · ${m.location}`}>
            <DrField lbl="Ngày">{dayjs(m.monitoringDate).format('DD/MM/YYYY')}</DrField>
            <DrField lbl="Thông số">{m.parameter}</DrField>
            <DrField lbl="Kết quả">
              <span style={{ fontFamily: 'var(--font-mono)' }}>{m.value} {m.unit}</span>
              {' / '}
              <span style={{ color: 'var(--t-2)', fontSize: 'var(--fs-xs)' }}>giới hạn {m.standardLimit} {m.unit}</span>
            </DrField>
            <DrField lbl="Kết luận">
              {m.isCompliant
                ? <StatusBadge tone="ok" dot>Đạt chuẩn</StatusBadge>
                : <StatusBadge tone="crit" dot>Vi phạm</StatusBadge>}
            </DrField>
            {m.measuredBy && <DrField lbl="Người đo">{m.measuredBy}</DrField>}
            {m.notes && <DrField lbl="Ghi chú">{m.notes}</DrField>}
          </DrSec>
        ))}
      </DrawerShell>

      {/* Modal tạo bản ghi quan trắc mới */}
      <CrudModal
        open={monitorCrudOpen}
        onClose={() => setMonitorCrudOpen(false)}
        title="Bản ghi quan trắc mới"
        fields={MONITORING_FIELDS}
        initial={{ isCompliant: true, monitoringType: 'air' }}
        size="lg"
        onSubmit={async (v) => {
          await createMonitoring(v as Partial<MonitoringRecord>);
          tk('Đã thêm bản ghi quan trắc');
          setMonitorCrudOpen(false);
          loadMonitorings();
        }}
      />
    </div>
  );
};

export default EnvironmentalHealthV2;
