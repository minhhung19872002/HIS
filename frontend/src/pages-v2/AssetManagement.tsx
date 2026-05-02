import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { getAssets, getAssetDashboard } from '../api/assetManagement';
import type { FixedAssetDto, AssetDashboardDto } from '../api/assetManagement';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn,
  DrawerShell, DrSec, DrField, tk, ti, Ico,
  type ColumnDef,
} from './_v2kit';

const STATUS_LABEL: Record<number, string> = {
  0: 'Đang dùng', 1: 'Hỏng', 2: 'Sửa chữa', 3: 'Chờ thanh lý', 4: 'Đã thanh lý', 5: 'Đã chuyển',
};

type SKey = 'inuse' | 'broken' | 'repair' | 'pending' | 'disposed';
const STATUS_TABS = [
  { v: 'inuse' as SKey,    l: 'Đang dùng',     tone: 'ok' as const },
  { v: 'broken' as SKey,   l: 'Hỏng',          tone: 'crit' as const },
  { v: 'repair' as SKey,   l: 'Sửa chữa',      tone: 'warn' as const },
  { v: 'pending' as SKey,  l: 'Chờ thanh lý',  tone: 'warn' as const },
  { v: 'disposed' as SKey, l: 'Đã thanh lý',   tone: 'info' as const },
];

const sKey = (n: number): SKey =>
  n === 0 ? 'inuse' : n === 1 ? 'broken' : n === 2 ? 'repair' : n === 3 ? 'pending' : 'disposed';

const fmt = (n: number) => (n || 0).toLocaleString('vi-VN');
const PER = 18;

const AssetManagementV2: React.FC = () => {
  const [items, setItems] = useState<FixedAssetDto[]>([]);
  const [dash, setDash] = useState<AssetDashboardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fDept, setFDept] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<FixedAssetDto | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [r, d] = await Promise.all([
        getAssets({ keyword: search, pageSize: 200 }),
        getAssetDashboard(),
      ]);
      setItems(r.items || []);
      setDash(d);
    } catch { ti('Không tải được tài sản'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const depts = useMemo(() => {
    const set = new Set(items.map((r) => r.departmentName).filter(Boolean) as string[]);
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
      if (fDept && r.departmentName !== fDept) return false;
      if (!k) return true;
      return [r.assetCode, r.assetName, r.serialNumber, r.departmentName]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fDept]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const cols: ColumnDef<FixedAssetDto>[] = [
    { key: 'code', label: 'Mã TS', code: true, render: (r) => r.assetCode },
    { key: 'name', label: 'Tên tài sản', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.assetName}</div>
        {r.serialNumber && <div style={{ fontSize: 11, color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>SN: {r.serialNumber}</div>}
      </div>
    ) },
    { key: 'dept', label: 'Khoa', render: (r) => r.departmentName || '—' },
    { key: 'orig', label: 'Nguyên giá', mono: true, render: (r) => fmt(r.originalValue) },
    { key: 'cur', label: 'Còn lại', mono: true, render: (r) => {
      const ratio = r.originalValue ? r.currentValue / r.originalValue : 0;
      const tone = ratio < 0.2 ? 'var(--a-rd-text)' : ratio < 0.5 ? 'var(--a-or-text)' : undefined;
      return <span style={{ color: tone }}>{fmt(r.currentValue)}</span>;
    } },
    { key: 'date', label: 'Mua', mono: true, render: (r) => dayjs(r.purchaseDate).format('DD/MM/YYYY') },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === sKey(r.status));
      return <StatusBadge tone={t?.tone || 'info'} dot>{STATUS_LABEL[r.status] || '—'}</StatusBadge>;
    } },
  ];

  const actions = (r: FixedAssetDto) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      <ActBtn ic="qr" title="QR/Barcode" onClick={() => tk(`Hiển thị QR ${r.assetCode}`)} />
    </div>
  );

  const totalValue = items.reduce((s, r) => s + (r.currentValue || 0), 0);

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng TS', val: dash?.totalAssets ?? items.length, sub: 'tất cả' },
        { lbl: 'Đang dùng', val: dash?.inUseCount ?? counts.inuse, sub: `${Math.round(((counts.inuse || 0) / Math.max(1, items.length)) * 100)}%`, tone: 'ok' },
        { lbl: 'Hỏng / Sửa', val: (dash?.brokenCount ?? counts.broken) + (counts.repair || 0), sub: 'cần xử lý', tone: 'warn' },
        { lbl: 'Tổng giá trị còn', val: Math.round(totalValue / 1_000_000), unit: 'tr', sub: 'VND', tone: 'info' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm mã TS / tên / serial…" />
        <Filter value={fDept} onChange={setFDept} options={depts} placeholder="▾ Khoa" />
        <button className="ab-btn ghost" type="button" onClick={() => { setSearch(''); setFDept(''); setStab('all'); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </button>
        <button className="ab-btn ghost" type="button" onClick={() => tk('Mở khấu hao')}>
          <Ico name="activity" size={12} /> Khấu hao
        </button>
        <button className="ab-btn primary" type="button" onClick={() => tk('Mở thêm TS')}>
          <Ico name="plus" size={12} /> Thêm TS
        </button>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<FixedAssetDto>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có tài sản'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? sel.assetName : ''}
        sub={sel ? `${sel.assetCode}${sel.serialNumber ? ` · SN ${sel.serialNumber}` : ''}` : ''}
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setSel(null)}>Đóng</button>
          <button type="button" className="ab-btn" onClick={() => tk('Mở chuyển khoa')}>
            <Ico name="send" size={12} /> Chuyển khoa
          </button>
          <button type="button" className="ab-btn primary" onClick={() => tk('In nhãn QR')}>
            <Ico name="qr" size={12} /> In nhãn QR
          </button>
        </>}
      >
        {sel && <>
          <DrSec title="Định danh">
            <DrField lbl="Mã TS"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.assetCode}</span></DrField>
            <DrField lbl="Tên">{sel.assetName}</DrField>
            {sel.serialNumber && <DrField lbl="Serial"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.serialNumber}</span></DrField>}
            <DrField lbl="Khoa">{sel.departmentName || '—'}</DrField>
            <DrField lbl="Vị trí">{sel.locationDescription || '—'}</DrField>
            <DrField lbl="Trạng thái">
              <StatusBadge tone={STATUS_TABS.find((x) => x.v === sKey(sel.status))?.tone || 'info'} dot>
                {STATUS_LABEL[sel.status] || '—'}
              </StatusBadge>
            </DrField>
          </DrSec>
          <DrSec title="Tài chính">
            <div style={{ padding: 14, background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 6 }}>
              <Line label="Nguyên giá" value={`${fmt(sel.originalValue)} đ`} bold />
              <Line label="Hao mòn lũy kế" value={`−${fmt(sel.accumulatedDepreciation)} đ`} tone="warn" />
              <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '8px 0' }} />
              <Line label="Giá trị còn lại" value={`${fmt(sel.currentValue)} đ`} bold tone="ok" />
              <Line label="Hao mòn / tháng" value={`${fmt(sel.monthlyDepreciation)} đ`} />
            </div>
          </DrSec>
          <DrSec title="Khấu hao">
            <DrField lbl="Mua">{dayjs(sel.purchaseDate).format('DD/MM/YYYY')}</DrField>
            <DrField lbl="Thời gian KH"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.usefulLifeMonths} tháng</span></DrField>
            <DrField lbl="Phương pháp">{sel.depreciationMethod === 1 ? 'Đường thẳng' : 'Số dư giảm dần'}</DrField>
            {sel.tenderName && <DrField lbl="Gói thầu">{sel.tenderName}</DrField>}
            {sel.notes && <DrField lbl="Ghi chú">{sel.notes}</DrField>}
          </DrSec>
        </>}
      </DrawerShell>
    </div>
  );
};

const Line: React.FC<{ label: string; value: React.ReactNode; tone?: 'ok' | 'crit' | 'info' | 'warn'; bold?: boolean }> = ({ label, value, tone, bold }) => {
  const color = tone === 'ok' ? 'var(--a-em-text)'
    : tone === 'crit' ? 'var(--a-rd-text)'
    : tone === 'info' ? 'var(--a-cy-text)'
    : tone === 'warn' ? 'var(--a-or-text)'
    : 'var(--t-0)';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: bold ? 14 : 13, fontWeight: bold ? 700 : 400, color }}>
      <span>{label}</span><span style={{ fontFamily: 'var(--font-mono)' }}>{value}</span>
    </div>
  );
};

export default AssetManagementV2;
