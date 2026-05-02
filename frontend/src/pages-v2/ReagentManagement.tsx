import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { getReagents } from '../api/reagent';
import type { Reagent } from '../api/reagent';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn,
  DrawerShell, DrSec, DrField, tk, ti, Ico,
  type ColumnDef,
} from './_v2kit';

const STATUS_LABEL: Record<number, string> = {
  0: 'Sẵn dùng', 1: 'Đang dùng', 2: 'Sắp hết', 3: 'Hết hạn', 4: 'Đã hủy',
};

type SKey = 'available' | 'inuse' | 'lowstock' | 'expired';
const STATUS_TABS = [
  { v: 'available' as SKey, l: 'Sẵn dùng',  tone: 'ok' as const },
  { v: 'inuse' as SKey,     l: 'Đang dùng', tone: 'info' as const },
  { v: 'lowstock' as SKey,  l: 'Sắp hết',   tone: 'warn' as const },
  { v: 'expired' as SKey,   l: 'Hết hạn',   tone: 'crit' as const },
];

const sKey = (r: Reagent): SKey => {
  if (r.isExpired || r.status === 3) return 'expired';
  if (r.isLowStock || r.status === 2) return 'lowstock';
  if (r.status === 1) return 'inuse';
  return 'available';
};

const PER = 18;

const ReagentManagementV2: React.FC = () => {
  const [items, setItems] = useState<Reagent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fAna, setFAna] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<Reagent | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getReagents({ keyword: search });
      const list = (r?.items || (Array.isArray(r) ? r : [])) as Reagent[];
      setItems(list);
    } catch { setItems([]); ti('Không tải được danh sách hóa chất'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const analyzers = useMemo(() => {
    const set = new Set(items.map((r) => r.analyzerName).filter(Boolean) as string[]);
    return Array.from(set).map((v) => ({ v, l: v }));
  }, [items]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    STATUS_TABS.forEach((s) => { c[s.v] = items.filter((r) => sKey(r) === s.v).length; });
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (stab !== 'all' && sKey(r) !== stab) return false;
      if (fAna && r.analyzerName !== fAna) return false;
      if (!k) return true;
      return [r.code, r.name, r.lotNumber, r.manufacturer]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fAna]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const cols: ColumnDef<Reagent>[] = [
    { key: 'code', label: 'Mã', code: true, render: (r) => r.code },
    { key: 'name', label: 'Tên hóa chất', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.name}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.manufacturer}</div>
      </div>
    ) },
    { key: 'lot', label: 'Lô', code: true, render: (r) => r.lotNumber },
    { key: 'ana', label: 'Máy XN', render: (r) => r.analyzerName || '—' },
    { key: 'qty', label: 'Tồn', mono: true, render: (r) => {
      const ratio = r.quantity ? r.remainingQuantity / r.quantity : 0;
      const tone = r.isLowStock ? 'var(--a-or-text)' : ratio > 0.5 ? 'var(--a-em-text)' : 'var(--t-0)';
      return (
        <div>
          <div style={{ color: tone, fontWeight: 600 }}>{r.remainingQuantity}/{r.quantity}</div>
          <div style={{ fontSize: 10, color: 'var(--t-2)' }}>{r.unit}</div>
        </div>
      );
    } },
    { key: 'min', label: 'Min', mono: true, render: (r) => `${r.minimumStock}` },
    { key: 'exp', label: 'HSD', mono: true, render: (r) => {
      const d = dayjs(r.expiryDate);
      const expired = r.isExpired || d.isBefore(dayjs());
      const soon = !expired && d.diff(dayjs(), 'day') < 30;
      return <span style={{ color: expired ? 'var(--a-rd-text)' : soon ? 'var(--a-or-text)' : undefined }}>
        {d.format('DD/MM/YYYY')}
      </span>;
    } },
    { key: 'st', label: 'TT', render: (r) => {
      const k = sKey(r);
      const t = STATUS_TABS.find((x) => x.v === k);
      return <StatusBadge tone={t?.tone || 'info'} dot>{STATUS_LABEL[r.status] || '—'}</StatusBadge>;
    } },
  ];

  const actions = (r: Reagent) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      <ActBtn ic="edit" title="Cập nhật" onClick={() => tk(`Mở sửa ${r.code}`)} />
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng SKU', val: items.length, sub: 'tất cả' },
        { lbl: 'Sẵn dùng', val: counts.available || 0, sub: 'kho lab', tone: 'ok' },
        { lbl: 'Sắp hết', val: counts.lowstock || 0, sub: 'cần đặt', tone: 'warn' },
        { lbl: 'Hết hạn', val: counts.expired || 0, sub: 'cần hủy', tone: 'crit' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm mã / tên / lô…" />
        <Filter value={fAna} onChange={setFAna} options={analyzers} placeholder="▾ Máy XN" />
        <button className="ab-btn ghost" type="button" onClick={() => { setSearch(''); setFAna(''); setStab('all'); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </button>
        <button className="ab-btn ghost" type="button" onClick={() => tk('Mở cảnh báo')}>
          <Ico name="alert" size={12} /> Cảnh báo
        </button>
        <button className="ab-btn primary" type="button" onClick={() => tk('Mở form nhập kho')}>
          <Ico name="plus" size={12} /> Nhập kho
        </button>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<Reagent>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có hóa chất'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? sel.name : ''}
        sub={sel ? `${sel.code} · Lô ${sel.lotNumber}` : ''}
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setSel(null)}>Đóng</button>
          <button type="button" className="ab-btn" onClick={() => tk('Mở lịch sử dùng')}>
            <Ico name="activity" size={12} /> Lịch sử
          </button>
          <button type="button" className="ab-btn primary" onClick={() => tk('Mở ghi nhận sử dụng')}>
            <Ico name="edit" size={12} /> Ghi nhận
          </button>
        </>}
      >
        {sel && <>
          <DrSec title="Định danh">
            <DrField lbl="Mã"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.code}</span></DrField>
            <DrField lbl="Tên hóa chất">{sel.name}</DrField>
            <DrField lbl="Hãng">{sel.manufacturer}</DrField>
            <DrField lbl="Số lô"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.lotNumber}</span></DrField>
            {sel.catalogNumber && <DrField lbl="Catalog">{sel.catalogNumber}</DrField>}
            <DrField lbl="Máy XN">{sel.analyzerName || '—'}</DrField>
            <DrField lbl="XN dùng">{sel.testNames?.join(', ') || '—'}</DrField>
          </DrSec>
          <DrSec title="Kho">
            <div style={{ padding: 12, background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 6, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: 'var(--t-2)' }}>Còn lại</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600,
                  color: sel.isLowStock ? 'var(--a-or-text)' : 'var(--a-em-text)' }}>
                  {sel.remainingQuantity} / {sel.quantity} {sel.unit}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: 'var(--t-2)' }}>Đã dùng</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{sel.usedQuantity} {sel.unit}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--t-2)' }}>Min stock</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{sel.minimumStock} {sel.unit}</span>
              </div>
            </div>
            <DrField lbl="HSD">
              <span style={{ color: sel.isExpired ? 'var(--a-rd-text)' : undefined, fontFamily: 'var(--font-mono)' }}>
                {dayjs(sel.expiryDate).format('DD/MM/YYYY')}
              </span>
            </DrField>
            <DrField lbl="Bảo quản">{sel.storageCondition}</DrField>
            <DrField lbl="Nhận">{dayjs(sel.receivedDate).format('DD/MM/YYYY')}</DrField>
            {sel.openedDate && <DrField lbl="Mở">{dayjs(sel.openedDate).format('DD/MM/YYYY')}</DrField>}
            {sel.stabilityDays && <DrField lbl="Ổn định">{sel.stabilityDays} ngày sau mở</DrField>}
            <DrField lbl="Trạng thái">
              <StatusBadge tone={STATUS_TABS.find((x) => x.v === sKey(sel))?.tone || 'info'} dot>
                {STATUS_LABEL[sel.status] || '—'}
              </StatusBadge>
            </DrField>
          </DrSec>
        </>}
      </DrawerShell>
    </div>
  );
};

export default ReagentManagementV2;
