import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { getCultureStocks, getCultureStockStats } from '../api/cultureStock';
import type { CultureStock, CultureStockStats } from '../api/cultureStock';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn,
  DrawerShell, DrSec, DrField, tk, ti, Ico,
  type ColumnDef,
} from './_v2kit';

const STATUS_LABEL: Record<number, string> = {
  0: 'Hoạt động', 1: 'Sắp hết', 2: 'Hết hạn', 3: 'Hết ống', 4: 'Đã hủy',
};

type SKey = 'active' | 'lowstock' | 'expired' | 'depleted' | 'discarded';
const STATUS_TABS = [
  { v: 'active' as SKey,    l: 'Hoạt động', tone: 'ok' as const },
  { v: 'lowstock' as SKey,  l: 'Sắp hết',   tone: 'warn' as const },
  { v: 'expired' as SKey,   l: 'Hết hạn',   tone: 'crit' as const },
  { v: 'depleted' as SKey,  l: 'Hết ống',   tone: 'crit' as const },
  { v: 'discarded' as SKey, l: 'Đã hủy',    tone: 'info' as const },
];

const sKey = (n: number): SKey =>
  n === 0 ? 'active' : n === 1 ? 'lowstock' : n === 2 ? 'expired' : n === 3 ? 'depleted' : 'discarded';

const PER = 18;

const CultureCollectionV2: React.FC = () => {
  const [items, setItems] = useState<CultureStock[]>([]);
  const [stats, setStats] = useState<CultureStockStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fMethod, setFMethod] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<CultureStock | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [list, s] = await Promise.all([getCultureStocks({ keyword: search }), getCultureStockStats()]);
      setItems(list);
      setStats(s);
    } catch { ti('Không tải được lưu chủng VS'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const methods = useMemo(() => {
    const set = new Set(items.map((r) => r.preservationMethod).filter(Boolean));
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
      if (fMethod && r.preservationMethod !== fMethod) return false;
      if (!k) return true;
      return [r.stockCode, r.organismName, r.organismCode, r.scientificName, r.locationDisplay]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fMethod]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const cols: ColumnDef<CultureStock>[] = [
    { key: 'code', label: 'Mã chủng', code: true, render: (r) => r.stockCode },
    { key: 'org', label: 'Vi sinh vật', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.organismName}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{r.organismCode}</div>
      </div>
    ) },
    { key: 'loc', label: 'Vị trí', code: true, render: (r) => r.locationDisplay },
    { key: 'method', label: 'PP bảo quản', render: (r) => (
      <StatusBadge tone="info">{r.preservationMethod}</StatusBadge>
    ) },
    { key: 'aliq', label: 'Ống còn', mono: true, render: (r) => {
      const ratio = r.aliquotCount ? r.remainingAliquots / r.aliquotCount : 0;
      const tone = ratio < 0.2 ? 'var(--a-rd-text)' : ratio < 0.5 ? 'var(--a-or-text)' : 'var(--a-em-text)';
      return <span style={{ color: tone, fontWeight: 600 }}>{r.remainingAliquots}/{r.aliquotCount}</span>;
    } },
    { key: 'pass', label: 'Passage', mono: true, render: (r) => `P${r.passageNumber}` },
    { key: 'exp', label: 'Hết hạn', mono: true, render: (r) => {
      if (!r.expiryDate) return '—';
      const d = dayjs(r.expiryDate);
      const days = d.diff(dayjs(), 'day');
      const tone = days < 0 ? 'var(--a-rd-text)' : days < 30 ? 'var(--a-or-text)' : undefined;
      return <span style={{ color: tone }}>{d.format('DD/MM/YYYY')}</span>;
    } },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === sKey(r.status));
      return <StatusBadge tone={t?.tone || 'info'} dot>{STATUS_LABEL[r.status] || '—'}</StatusBadge>;
    } },
  ];

  const actions = (r: CultureStock) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      <ActBtn ic="package" title="Lấy ống" onClick={() => tk(`Lấy ống từ ${r.stockCode}`)} />
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng chủng', val: stats?.totalStocks ?? items.length, sub: 'tất cả' },
        { lbl: 'Hoạt động', val: stats?.activeCount ?? counts.active, sub: 'sẵn dùng', tone: 'ok' },
        { lbl: 'Sắp hết hạn', val: stats?.expiringIn30Days ?? 0, sub: '< 30 ngày', tone: 'warn' },
        { lbl: 'Cần KT viability', val: stats?.needViabilityCheck ?? 0, sub: '> 90 ngày', tone: 'info' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm mã chủng / VSV / vị trí…" />
        <Filter value={fMethod} onChange={setFMethod} options={methods} placeholder="▾ PP bảo quản" />
        <button className="ab-btn ghost" type="button" onClick={() => { setSearch(''); setFMethod(''); setStab('all'); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </button>
        <button className="ab-btn ghost" type="button" onClick={() => tk('Mở cấy chuyền')}>
          <Ico name="activity" size={12} /> Cấy chuyền
        </button>
        <button className="ab-btn primary" type="button" onClick={() => tk('Mở lưu chủng mới')}>
          <Ico name="plus" size={12} /> Lưu chủng
        </button>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<CultureStock>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có chủng VS lưu'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? sel.organismName : ''}
        sub={sel ? `${sel.stockCode} · ${sel.locationDisplay}` : ''}
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setSel(null)}>Đóng</button>
          <button type="button" className="ab-btn" onClick={() => tk('Mở lịch sử')}>
            <Ico name="activity" size={12} /> Lịch sử
          </button>
          <button type="button" className="ab-btn primary" onClick={() => tk('Mở KT viability')}>
            <Ico name="check" size={12} /> KT viability
          </button>
        </>}
      >
        {sel && <>
          <DrSec title="Vi sinh vật">
            <DrField lbl="Mã chủng"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.stockCode}</span></DrField>
            <DrField lbl="Tên VSV">{sel.organismName}</DrField>
            <DrField lbl="Mã VSV"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.organismCode}</span></DrField>
            <DrField lbl="Tên KH">{sel.scientificName || '—'}</DrField>
            <DrField lbl="Gram">{sel.gramStain || '—'}</DrField>
            {sel.sourceDescription && <DrField lbl="Nguồn">{sel.sourceDescription}</DrField>}
          </DrSec>
          <DrSec title="Vị trí lưu">
            <DrField lbl="Vị trí"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.locationDisplay}</span></DrField>
            {sel.freezerCode && <DrField lbl="Tủ">{sel.freezerCode}</DrField>}
            {sel.rackCode && <DrField lbl="Giá">{sel.rackCode}</DrField>}
            {sel.boxCode && <DrField lbl="Hộp">{sel.boxCode}</DrField>}
            {sel.position && <DrField lbl="Ô">{sel.position}</DrField>}
            <DrField lbl="PP bảo quản">{sel.preservationMethod}</DrField>
            <DrField lbl="Nhiệt độ">{sel.storageTemperature || '—'}</DrField>
          </DrSec>
          <DrSec title="Số lượng & passage">
            <div style={{ padding: 12, background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 6, marginBottom: 10 }}>
              <Line label="Ống còn / tổng" value={`${sel.remainingAliquots}/${sel.aliquotCount}`} bold />
              <Line label="Passage" value={`P${sel.passageNumber}`} />
            </div>
            <DrField lbl="Lưu lúc">{dayjs(sel.preservationDate).format('DD/MM/YYYY')}</DrField>
            {sel.expiryDate && <DrField lbl="Hết hạn">{dayjs(sel.expiryDate).format('DD/MM/YYYY')}</DrField>}
            <DrField lbl="Người lưu">{sel.preservedBy || '—'}</DrField>
          </DrSec>
          {sel.lastViabilityCheck && (
            <DrSec title="Kiểm tra viability">
              <DrField lbl="Lần KT cuối">{dayjs(sel.lastViabilityCheck).format('DD/MM/YYYY')}</DrField>
              <DrField lbl="Kết quả">
                <StatusBadge tone={sel.lastViabilityResult ? 'ok' : 'crit'} dot>
                  {sel.lastViabilityResult ? 'Sống' : 'Chết'}
                </StatusBadge>
              </DrField>
            </DrSec>
          )}
        </>}
      </DrawerShell>
    </div>
  );
};

const Line: React.FC<{ label: string; value: React.ReactNode; bold?: boolean }> = ({ label, value, bold }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: bold ? 14 : 13, fontWeight: bold ? 700 : 400 }}>
    <span style={{ color: 'var(--t-2)' }}>{label}</span>
    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--t-0)' }}>{value}</span>
  </div>
);

export default CultureCollectionV2;
