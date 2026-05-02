import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { searchRecords, getStats } from '../api/populationHealth';
import type { PopulationRecord, PopulationStats } from '../api/populationHealth';
import {
  KpiStrip, TopTabs, StatusTabs, SearchBox, DataTable, Pager, StatusBadge, ActBtn,
  DrawerShell, DrSec, DrField, tk, ti, Ico,
  type ColumnDef,
} from './_v2kit';

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r: any = await searchRecords({ keyword: search });
      const list = (r?.items || (Array.isArray(r) ? r : [])) as PopulationRecord[];
      setItems(list);
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
        <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.gender === 1 ? 'Nam' : 'Nữ'} · {dayjs(r.dateOfBirth).format('DD/MM/YYYY')}</div>
      </div>
    ) },
    { key: 'type', label: 'Loại HS', render: (r) => (
      <StatusBadge tone="info">{TYPE_LABEL[r.recordType] || r.recordType}</StatusBadge>
    ) },
    { key: 'addr', label: 'Địa chỉ', render: (r) => <span style={{ fontSize: 12 }}>{r.address}</span> },
    { key: 'fam', label: 'Mã hộ', code: true, render: (r) => r.familyCode || '—' },
    { key: 'unit', label: 'Đơn vị QL', render: (r) => r.managingUnit },
    { key: 'last', label: 'Khám gần', mono: true, render: (r) => r.lastVisitDate ? dayjs(r.lastVisitDate).format('DD/MM/YYYY') : '—' },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === sKey(r.status));
      return <StatusBadge tone={t?.tone || 'info'} dot>{t?.l || '—'}</StatusBadge>;
    } },
  ];

  const actions = (r: PopulationRecord) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      <ActBtn ic="edit" title="Cập nhật" onClick={() => tk(`Mở cập nhật ${r.recordCode}`)} />
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
          <button className="ab-btn ghost" type="button" onClick={load}>
            <Ico name="refresh" size={12} /> Làm mới
          </button>
          <button className="ab-btn primary" type="button" onClick={() => tk('Mở thêm HS mới')}>
            <Ico name="plus" size={12} /> Thêm HS
          </button>
        </>
      } />

      <div className="ab-toolbar" style={{ borderTop: 'none' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm họ tên / mã HS / địa chỉ…" />
        <button className="ab-btn ghost" type="button" onClick={() => { setSearch(''); setStab('all'); setTType('all'); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={() => tk('Đã xuất Excel')}>
          <Ico name="download" size={12} /> Xuất Excel
        </button>
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
          <button type="button" className="ab-btn ghost" onClick={() => setSel(null)}>Đóng</button>
          <button type="button" className="ab-btn primary" onClick={() => tk('Mở chỉnh sửa')}>
            <Ico name="edit" size={12} /> Cập nhật
          </button>
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
    </div>
  );
};

export default PopulationHealthV2;
