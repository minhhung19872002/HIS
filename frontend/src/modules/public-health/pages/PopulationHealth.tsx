import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { searchRecords, getStats, createRecord, updateRecord } from '../api/populationHealth';
import type { PopulationRecord, PopulationStats } from '../api/populationHealth';
import { normalizeArrayResponse } from '../../../utils/apiNormalize';
import { exportToExcel } from '../../../utils/excelExport';
import {
  KpiStrip, TopTabs, StatusTabs, SearchBox, DataTable, Pager, StatusBadge, ActBtn, Btn,
  DrawerShell, DrSec, DrField, CrudModal, tk, ti, Ico,
  type ColumnDef, type CrudFieldCfg,
} from '../../../pages-v2/_v2kit';

const POP_FIELDS: CrudFieldCfg[] = [
  { key: 'recordCode', label: 'Mã hồ sơ', required: true, disabledOnEdit: true },
  { key: 'fullName', label: 'Họ tên', required: true },
  { key: 'dateOfBirth', label: 'Ngày sinh', type: 'date' },
  { key: 'gender', label: 'Giới tính', type: 'select', options: [{ value: 1, label: 'Nam' }, { value: 2, label: 'Nữ' }] },
  { key: 'address', label: 'Địa chỉ' },
  { key: 'recordType', label: 'Loại hồ sơ', type: 'select', required: true, options: [
    { value: 'birth', label: 'Khai sinh' }, { value: 'family_planning', label: 'KHHGĐ' },
    { value: 'elderly_care', label: 'CS người già' }, { value: 'prenatal', label: 'Tiền sản' },
    { value: 'child_health', label: 'SK trẻ em' }, { value: 'other', label: 'Khác' }] },
  { key: 'familyCode', label: 'Mã hộ' },
  { key: 'healthInsuranceNumber', label: 'Số BHYT' },
  { key: 'managingUnit', label: 'Đơn vị QL', required: true },
  { key: 'status', label: 'Trạng thái', type: 'select', options: [
    { value: 0, label: 'Đang QL' }, { value: 1, label: 'Đã đóng' }, { value: 2, label: 'Chuyển đi' }] },
  { key: 'notes', label: 'Ghi chú', type: 'textarea' },
];

const TYPE_LABEL: Record<string, string> = {
  birth: 'Khai sinh', family_planning: 'KHHGD', elderly_care: 'CS người già',
  prenatal: 'Tiền sản', child_health: 'SK trẻ em', other: 'Khác',
};

type TKey = 'all' | 'birth' | 'family_planning' | 'elderly_care' | 'prenatal' | 'child_health';
const TYPE_TABS = [
  { v: 'all' as TKey, l: 'Tất cả', ic: 'list' },
  { v: 'birth' as TKey, l: 'Khai sinh', ic: 'heart' },
  { v: 'family_planning' as TKey, l: 'KHHGD', ic: 'user' },
  { v: 'elderly_care' as TKey, l: 'CS người già', ic: 'user' },
  { v: 'prenatal' as TKey, l: 'Tiền sản', ic: 'heart' },
  { v: 'child_health' as TKey, l: 'SK trẻ em', ic: 'heart' },
];

type SKey = 'active' | 'closed' | 'transferred';
const STATUS_TABS = [
  { v: 'active' as SKey,      l: 'Đang QL',     tone: 'ok' as const },
  { v: 'closed' as SKey,      l: 'Đã đóng',     tone: 'warn' as const },
  { v: 'transferred' as SKey, l: 'Đã chuyển',   tone: 'info' as const },
];

const sKey = (n: number): SKey => n === 0 ? 'active' : n === 1 ? 'closed' : 'transferred';

const PER = 18;

const PopulationHealthV2: React.FC = () => {
  const [items, setItems] = useState<PopulationRecord[]>([]);
  const [stats, setStats] = useState<PopulationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tType, setTType] = useState<TKey>('all');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<PopulationRecord | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await searchRecords({ keyword: search });
      setItems(normalizeArrayResponse<PopulationRecord>(r));
      const s = await getStats();
      setStats(s);
    } catch { ti('Không tải được dữ liệu dân số'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const counts = useMemo(() => {
    const baseList = tType === 'all' ? items : items.filter((r) => r.recordType === tType);
    const c: Record<string, number> = { all: baseList.length };
    STATUS_TABS.forEach((s) => { c[s.v] = baseList.filter((r) => sKey(r.status) === s.v).length; });
    return c;
  }, [items, tType]);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (tType !== 'all' && r.recordType !== tType) return false;
      if (stab !== 'all' && sKey(r.status) !== stab) return false;
      if (!k) return true;
      return [r.fullName, r.recordCode, r.address, r.familyCode, r.healthInsuranceNumber]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, tType, stab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const cols: ColumnDef<PopulationRecord>[] = [
    { key: 'code', label: 'Mã HS', code: true, render: (r) => r.recordCode },
    { key: 'name', label: 'Họ tên', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.fullName}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.gender === 1 ? 'Nam' : 'Nữ'} · {dayjs(r.dateOfBirth).format('DD/MM/YYYY')}</div>
      </div>
    ) },
    { key: 'type', label: 'Loại HS', render: (r) => (
      <StatusBadge tone="info">{TYPE_LABEL[r.recordType] || r.recordType}</StatusBadge>
    ) },
    { key: 'addr', label: 'Địa chỉ', render: (r) => <span style={{ fontSize: 'var(--fs-sm)' }}>{r.address}</span> },
    { key: 'fam', label: 'Mã hộ', code: true, render: (r) => r.familyCode || '—' },
    { key: 'unit', label: 'Đơn vị QL', render: (r) => r.managingUnit },
    { key: 'last', label: 'Khám gần', mono: true, render: (r) => r.lastVisitDate ? dayjs(r.lastVisitDate).format('DD/MM/YYYY') : '—' },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === sKey(r.status));
      return <StatusBadge tone={t?.tone || 'info'} dot>{t?.l || '—'}</StatusBadge>;
    } },
  ];

  const [crudOpen, setCrudOpen] = useState(false);
  const [crudInit, setCrudInit] = useState<Record<string, unknown> | null>(null);
  const openCreate = () => { setCrudInit({ status: 0, gender: 1, recordType: 'other' }); setCrudOpen(true); };
  const openEdit = (r: PopulationRecord) => { setCrudInit({ ...r } as Record<string, unknown>); setCrudOpen(true); };

  const actions = (r: PopulationRecord) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      <ActBtn ic="edit" title="Cập nhật" onClick={() => openEdit(r)} />
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng hồ sơ', val: stats?.totalRecords ?? items.length, sub: 'tất cả' },
        { lbl: 'KHHGD đang QL', val: stats?.familyPlanningActive ?? items.filter((r) => r.recordType === 'family_planning' && r.status === 0).length, sub: 'phụ nữ tuổi SS', tone: 'info' },
        { lbl: 'CS người già', val: stats?.elderlyCareCount ?? items.filter((r) => r.recordType === 'elderly_care').length, sub: 'tổng số', tone: 'warn' },
        { lbl: 'Khai sinh tháng', val: stats?.birthReportsThisMonth ?? 0, sub: 'tháng này', tone: 'ok' },
      ]} />

      <TopTabs<TKey> tab={tType} setTab={(v) => { setTType(v); setStab('all'); setPage(0); }} tabs={TYPE_TABS} actions={
        <>
          <Btn variant="ghost" onClick={load}>
            <Ico name="refresh" size={12} /> Làm mới
          </Btn>
          <Btn variant="primary" onClick={openCreate}>
            <Ico name="plus" size={12} /> Thêm HS
          </Btn>
        </>
      } />

      <div className="ab-toolbar" style={{ borderTop: 'none' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm họ tên / mã HS / địa chỉ…" />
        <Btn variant="ghost" onClick={() => { setSearch(''); setStab('all'); setTType('all'); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </Btn>
        <span className="spacer" />
        <Btn variant="ghost" onClick={() => exportToExcel(
          filtered as unknown as Record<string, unknown>[],
          [
            { header: 'Mã hồ sơ', key: 'recordCode', width: 14 },
            { header: 'Họ tên', key: 'fullName', width: 22 },
            { header: 'Ngày sinh', key: 'dateOfBirth', width: 14, format: (v) => v ? dayjs(v as string).format('DD/MM/YYYY') : '' },
            { header: 'Giới tính', key: 'gender', width: 10, format: (v) => v === 1 ? 'Nam' : 'Nữ' },
            { header: 'Địa chỉ', key: 'address', width: 30 },
            { header: 'Loại hồ sơ', key: 'recordType', width: 16, format: (v) => TYPE_LABEL[v as string] || String(v) },
            { header: 'Mã hộ', key: 'familyCode', width: 14 },
            { header: 'Số BHYT', key: 'healthInsuranceNumber', width: 16 },
            { header: 'Đơn vị QL', key: 'managingUnit', width: 20 },
            { header: 'Khám gần nhất', key: 'lastVisitDate', width: 16, format: (v) => v ? dayjs(v as string).format('DD/MM/YYYY') : '—' },
            { header: 'Trạng thái', key: 'status', width: 12, format: (v) => ['Đang QL', 'Đã đóng', 'Đã chuyển'][v as number] ?? '—' },
          ],
          'ho-so-dan-so',
          'Hồ sơ dân số',
        )}>
          <Ico name="download" size={12} /> Xuất Excel
        </Btn>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<PopulationRecord>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có hồ sơ'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? sel.fullName : ''}
        sub={sel ? `${sel.recordCode} · ${TYPE_LABEL[sel.recordType] || sel.recordType}` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
          <Btn variant="primary" onClick={() => { if (sel) openEdit(sel); setSel(null); }}>
            <Ico name="edit" size={12} /> Cập nhật
          </Btn>
        </>}
      >
        {sel && <>
          <DrSec title="Hồ sơ">
            <DrField lbl="Mã HS"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.recordCode}</span></DrField>
            <DrField lbl="Họ tên">{sel.fullName}</DrField>
            <DrField lbl="Ngày sinh">{dayjs(sel.dateOfBirth).format('DD/MM/YYYY')}</DrField>
            <DrField lbl="Giới tính">{sel.gender === 1 ? 'Nam' : 'Nữ'}</DrField>
            <DrField lbl="Địa chỉ">{sel.address}</DrField>
            <DrField lbl="Loại HS">
              <StatusBadge tone="info">{TYPE_LABEL[sel.recordType] || sel.recordType}</StatusBadge>
            </DrField>
            <DrField lbl="Đơn vị QL">{sel.managingUnit}</DrField>
            {sel.familyCode && <DrField lbl="Mã hộ"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.familyCode}</span></DrField>}
            {sel.healthInsuranceNumber && <DrField lbl="Số BHYT"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.healthInsuranceNumber}</span></DrField>}
            <DrField lbl="Khám gần nhất">{sel.lastVisitDate ? dayjs(sel.lastVisitDate).format('DD/MM/YYYY') : '—'}</DrField>
            <DrField lbl="Trạng thái">
              <StatusBadge tone={STATUS_TABS.find((x) => x.v === sKey(sel.status))?.tone || 'info'} dot>
                {STATUS_TABS.find((x) => x.v === sKey(sel.status))?.l || '—'}
              </StatusBadge>
            </DrField>
            {sel.notes && <DrField lbl="Ghi chú">{sel.notes}</DrField>}
          </DrSec>
        </>}
      </DrawerShell>

      <CrudModal
        open={crudOpen}
        onClose={() => setCrudOpen(false)}
        title={crudInit?.id ? 'Cập nhật hồ sơ dân số' : 'Thêm hồ sơ dân số'}
        fields={POP_FIELDS}
        initial={crudInit}
        size="lg"
        onSubmit={async (v, editing) => {
          if (editing && crudInit?.id) await updateRecord(String(crudInit.id), v);
          else await createRecord(v);
          tk(editing ? 'Đã cập nhật hồ sơ' : 'Đã thêm hồ sơ');
          load();
        }}
      />
    </div>
  );
};

export default PopulationHealthV2;
