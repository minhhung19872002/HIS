import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { searchProtocols, saveProtocol, deleteProtocol } from '../api/treatmentProtocol';
import type { TreatmentProtocolDto, SaveTreatmentProtocolDto } from '../api/treatmentProtocol';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn, Btn,
  DrawerShell, DrSec, DrField, CrudModal, tk, ti, te, cf,
  type ColumnDef, type CrudFieldCfg,
} from './_v2kit';

const PROTO_FIELDS: CrudFieldCfg[] = [
  { key: 'code', label: 'Mã phác đồ', required: true, disabledOnEdit: true, placeholder: 'PĐ-...' },
  { key: 'name', label: 'Tên phác đồ', required: true },
  { key: 'diseaseGroup', label: 'Nhóm bệnh' },
  { key: 'department', label: 'Khoa áp dụng' },
  { key: 'icdCode', label: 'Mã ICD-10', placeholder: 'VD: J18' },
  { key: 'icdName', label: 'Tên bệnh (ICD)' },
  { key: 'version', label: 'Phiên bản', type: 'number', placeholder: '1' },
  { key: 'effectiveDate', label: 'Hiệu lực từ', type: 'date' },
  { key: 'expiryDate', label: 'Hết hạn', type: 'date' },
  { key: 'status', label: 'Trạng thái', type: 'select', options: [
    { value: 0, label: 'Nháp' }, { value: 1, label: 'Đang duyệt' }, { value: 2, label: 'Đã duyệt' },
    { value: 3, label: 'Sửa đổi' }, { value: 4, label: 'Hết hiệu lực' }] },
  { key: 'description', label: 'Mô tả', type: 'textarea' },
];

const STATUS_LABEL: Record<number, string> = {
  0: 'Nháp', 1: 'Đang duyệt', 2: 'Đã duyệt', 3: 'Sửa đổi', 4: 'Hết hiệu lực',
};

type SKey = 'draft' | 'reviewing' | 'approved' | 'revising' | 'expired';
const STATUS_TABS = [
  { v: 'draft' as SKey,     l: 'Nháp',       tone: 'warn' as const },
  { v: 'reviewing' as SKey, l: 'Đang duyệt', tone: 'info' as const },
  { v: 'approved' as SKey,  l: 'Đã duyệt',   tone: 'ok' as const },
  { v: 'revising' as SKey,  l: 'Sửa đổi',    tone: 'warn' as const },
  { v: 'expired' as SKey,   l: 'Hết hiệu lực', tone: 'crit' as const },
];

const sKey = (n: number): SKey =>
  n === 0 ? 'draft' : n === 1 ? 'reviewing' : n === 2 ? 'approved' : n === 3 ? 'revising' : 'expired';

const PER = 18;

const TreatmentProtocolV2: React.FC = () => {
  const [items, setItems] = useState<TreatmentProtocolDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fGroup, setFGroup] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<TreatmentProtocolDto | null>(null);
  const [crudOpen, setCrudOpen] = useState(false);
  const [crudInit, setCrudInit] = useState<Record<string, unknown> | null>(null);
  const openCreate = () => { setCrudInit({ status: 0, version: 1 }); setCrudOpen(true); };
  const openEdit = (r: TreatmentProtocolDto) => { setCrudInit({ ...r } as Record<string, unknown>); setCrudOpen(true); };
  const del = (r: TreatmentProtocolDto) => cf(`Xoá phác đồ "${r.name}"?`, async () => {
    try { await deleteProtocol(r.id); tk('Đã xoá'); load(); } catch { te('Xoá thất bại'); }
  }, { tone: 'crit', confirm: 'Xoá' });

  const load = async () => {
    setLoading(true);
    try {
      const r = await searchProtocols({ keyword: search, pageSize: 200 });
      const list = r.data?.items || [];
      setItems(list);
    } catch { ti('Không tải được phác đồ điều trị'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const groups = useMemo(() => {
    const set = new Set(items.map((r) => r.diseaseGroup).filter(Boolean) as string[]);
    return Array.from(set).map((v) => ({ v, l: v }));
  }, [items]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    STATUS_TABS.forEach((s) => { c[s.v] = items.filter((r) => sKey(r.status) === s.v).length; });
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (stab !== 'all' && sKey(r.status) !== stab) return false;
      if (fGroup && r.diseaseGroup !== fGroup) return false;
      if (!k) return true;
      return [r.code, r.name, r.icdCode, r.icdName, r.department]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fGroup]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const cols: ColumnDef<TreatmentProtocolDto>[] = [
    { key: 'code', label: 'Mã PĐ', code: true, render: (r) => r.code },
    { key: 'name', label: 'Tên phác đồ', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.name}</div>
        {r.diseaseGroup && <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.diseaseGroup}</div>}
      </div>
    ) },
    { key: 'icd', label: 'ICD', render: (r) => r.icdCode ? (
      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{r.icdCode}</div>
        {r.icdName && <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.icdName}</div>}
      </div>
    ) : <span style={{ color: 'var(--t-2)' }}>—</span> },
    { key: 'dept', label: 'Khoa', render: (r) => r.department || '—' },
    { key: 'ver', label: 'Ver', mono: true, render: (r) => `v${r.version}` },
    { key: 'steps', label: 'Bước', mono: true, render: (r) => r.stepCount },
    { key: 'eff', label: 'Hiệu lực', mono: true, render: (r) => r.effectiveDate ? dayjs(r.effectiveDate).format('DD/MM/YYYY') : '—' },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === sKey(r.status));
      return <StatusBadge tone={t?.tone || 'info'} dot>{r.statusName || STATUS_LABEL[r.status] || '—'}</StatusBadge>;
    } },
  ];

  const actions = (r: TreatmentProtocolDto) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      <ActBtn ic="edit" title="Sửa" onClick={() => openEdit(r)} />
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      <ActBtn ic="trash" title="Xoá" tone="crit" onClick={() => del(r)} />
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng phác đồ', val: items.length, sub: 'tất cả' },
        { lbl: 'Đã duyệt', val: counts.approved || 0, sub: `${Math.round(((counts.approved || 0) / Math.max(1, items.length)) * 100)}%`, tone: 'ok' },
        { lbl: 'Nháp / Duyệt', val: (counts.draft || 0) + (counts.reviewing || 0), sub: 'đang xây dựng', tone: 'info' },
        { lbl: 'Hết hiệu lực', val: counts.expired || 0, sub: 'cần update', tone: 'crit' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm tên / mã / ICD…" />
        <Filter value={fGroup} onChange={setFGroup} options={groups} placeholder="▾ Nhóm bệnh" />
        <Btn variant="ghost" icon="x" onClick={() => { setSearch(''); setFGroup(''); setStab('all'); }}>Bỏ lọc</Btn>
        <span className="spacer" />
        <Btn variant="ghost" icon="refresh" onClick={load}>Làm mới</Btn>
        <Btn variant="primary" icon="plus" onClick={openCreate}>Phác đồ mới</Btn>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<TreatmentProtocolDto>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có phác đồ'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? sel.name : ''}
        sub={sel ? `${sel.code} · v${sel.version}` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
          <Btn icon="print" onClick={() => window.print()}>In phác đồ</Btn>
          <Btn variant="primary" icon="edit" onClick={() => { if (sel) openEdit(sel); setSel(null); }}>Chỉnh sửa</Btn>
        </>}
      >
        {sel && <>
          <DrSec title="Phác đồ">
            <DrField lbl="Mã"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.code}</span></DrField>
            <DrField lbl="Tên">{sel.name}</DrField>
            <DrField lbl="Nhóm bệnh">{sel.diseaseGroup || '—'}</DrField>
            <DrField lbl="Khoa">{sel.department || '—'}</DrField>
            <DrField lbl="Phiên bản"><span style={{ fontFamily: 'var(--font-mono)' }}>v{sel.version}</span></DrField>
            <DrField lbl="Số bước"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.stepCount}</span></DrField>
          </DrSec>
          {(sel.icdCode || sel.icdName) && (
            <DrSec title="ICD-10">
              <DrField lbl="Mã"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.icdCode || '—'}</span></DrField>
              <DrField lbl="Tên bệnh">{sel.icdName || '—'}</DrField>
            </DrSec>
          )}
          <DrSec title="Hiệu lực">
            <DrField lbl="Trạng thái">
              <StatusBadge tone={STATUS_TABS.find((x) => x.v === sKey(sel.status))?.tone || 'info'} dot>
                {sel.statusName || STATUS_LABEL[sel.status] || '—'}
              </StatusBadge>
            </DrField>
            {sel.approvedDate && <DrField lbl="Ngày duyệt">{dayjs(sel.approvedDate).format('DD/MM/YYYY')}</DrField>}
            {sel.effectiveDate && <DrField lbl="Hiệu lực từ">{dayjs(sel.effectiveDate).format('DD/MM/YYYY')}</DrField>}
            {sel.expiryDate && <DrField lbl="Hết hạn">{dayjs(sel.expiryDate).format('DD/MM/YYYY')}</DrField>}
            {sel.description && <DrField lbl="Mô tả">{sel.description}</DrField>}
          </DrSec>
        </>}
      </DrawerShell>

      <CrudModal
        open={crudOpen}
        onClose={() => setCrudOpen(false)}
        title={crudInit?.id ? 'Cập nhật phác đồ' : 'Phác đồ điều trị mới'}
        fields={PROTO_FIELDS}
        initial={crudInit}
        size="lg"
        onSubmit={async (v, editing) => {
          await saveProtocol(v as unknown as SaveTreatmentProtocolDto);
          tk(editing ? 'Đã cập nhật phác đồ' : 'Đã tạo phác đồ');
          load();
        }}
      />
    </div>
  );
};

export default TreatmentProtocolV2;
