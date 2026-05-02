import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { searchWasteRecords } from '../api/environmentalHealth';
import type { WasteRecord } from '../api/environmentalHealth';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn,
  DrawerShell, DrSec, DrField, tk, ti, Ico,
  type ColumnDef,
} from './_v2kit';

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

  const load = async () => {
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r: any = await searchWasteRecords({ keyword: search });
      const list = (r?.items || (Array.isArray(r) ? r : [])) as WasteRecord[];
      setItems(list);
    } catch { ti('Không tải được dữ liệu chất thải'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

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

  const actions = (r: WasteRecord) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      <ActBtn ic="print" title="In phiếu" onClick={() => tk(`Đã in ${r.recordCode}`)} />
    </div>
  );

  const infectiousKg = items.filter((r) => r.wasteType === 'infectious').reduce((s, r) => s + r.quantity, 0);
  const totalKg = items.reduce((s, r) => s + (r.quantity || 0), 0);

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng phiếu', val: items.length, sub: 'tất cả' },
        { lbl: 'Đạt chuẩn', val: counts.compliant, sub: `${Math.round((counts.compliant / Math.max(1, items.length)) * 100)}%`, tone: 'ok' },
        { lbl: 'Vi phạm', val: counts.noncompliant, sub: 'cần khắc phục', tone: 'crit' },
        { lbl: 'CT lây nhiễm', val: infectiousKg.toFixed(1), unit: 'kg', sub: `tổng ${totalKg.toFixed(1)} kg`, tone: 'warn' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm phiếu / nguồn / PP xử lý…" />
        <Filter value={fType} onChange={setFType} options={types} placeholder="▾ Loại chất thải" />
        <button className="ab-btn ghost" type="button" onClick={() => { setSearch(''); setFType(''); setStab('all'); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </button>
        <button className="ab-btn ghost" type="button" onClick={() => tk('Mở quan trắc môi trường')}>
          <Ico name="activity" size={12} /> Quan trắc
        </button>
        <button className="ab-btn primary" type="button" onClick={() => tk('Mở phiếu mới')}>
          <Ico name="plus" size={12} /> Phiếu mới
        </button>
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
          <button type="button" className="ab-btn ghost" onClick={() => setSel(null)}>Đóng</button>
          <button type="button" className="ab-btn primary" onClick={() => tk('Đã in phiếu')}>
            <Ico name="print" size={12} /> In phiếu
          </button>
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
    </div>
  );
};

export default EnvironmentalHealthV2;
