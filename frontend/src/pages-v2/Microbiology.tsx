import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { getMicrobiologyCultures } from '../api/microbiology';
import type { MicrobiologyCulture } from '../api/microbiology';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn,
  DrawerShell, DrSec, DrField, tk, ti, Ico,
  type ColumnDef,
} from './_v2kit';

const STATUS_LABEL: Record<number, string> = {
  0: 'Chờ', 1: 'Đang ủ', 2: 'Có VSV mọc', 3: 'Không mọc', 4: 'Đã định danh', 5: 'Hoàn tất',
};

type SKey = 'pending' | 'incubating' | 'growth' | 'completed';
const STATUS_TABS = [
  { v: 'pending' as SKey,     l: 'Chờ',           tone: 'warn' as const },
  { v: 'incubating' as SKey,  l: 'Đang ủ',        tone: 'info' as const },
  { v: 'growth' as SKey,      l: 'Có VSV mọc',    tone: 'crit' as const },
  { v: 'completed' as SKey,   l: 'Hoàn tất',      tone: 'ok' as const },
];

const sKey = (n: number): SKey =>
  n === 0 ? 'pending' : n === 1 ? 'incubating' : (n === 2 || n === 4) ? 'growth' : 'completed';

const PER = 18;

const MicrobiologyV2: React.FC = () => {
  const [items, setItems] = useState<MicrobiologyCulture[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fType, setFType] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<MicrobiologyCulture | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getMicrobiologyCultures({ keyword: search });
      const list = (r?.items || (Array.isArray(r) ? r : [])) as MicrobiologyCulture[];
      setItems(list);
    } catch { setItems([]); ti('Không tải được danh sách cấy'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const types = useMemo(() => {
    const set = new Set(items.map((c) => c.cultureType).filter(Boolean));
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
      if (fType && r.cultureType !== fType) return false;
      if (!k) return true;
      return [r.patientName, r.patientCode, r.requestCode, r.sampleBarcode]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const cols: ColumnDef<MicrobiologyCulture>[] = [
    { key: 'code', label: 'Mã YC', code: true, render: (r) => r.requestCode || '—' },
    { key: 'pt', label: 'Bệnh nhân', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.patientName}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.patientCode}</div>
      </div>
    ) },
    { key: 'sample', label: 'Loại mẫu', render: (r) => r.sampleType },
    { key: 'bar', label: 'Barcode', code: true, render: (r) => r.sampleBarcode },
    { key: 'cult', label: 'Loại cấy', render: (r) => <StatusBadge tone="info">{r.cultureType}</StatusBadge> },
    { key: 'date', label: 'Cấy lúc', mono: true, render: (r) => dayjs(r.cultureDate).format('DD/MM HH:mm') },
    { key: 'org', label: 'VSV', render: (r) => r.organisms?.length
      ? <span style={{ color: 'var(--a-rd-text)', fontWeight: 600 }}>{r.organisms.length}</span>
      : '—' },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const k = sKey(r.status);
      const t = STATUS_TABS.find((x) => x.v === k);
      return <StatusBadge tone={t?.tone || 'info'} dot>{STATUS_LABEL[r.status] || '—'}</StatusBadge>;
    } },
  ];

  const actions = (r: MicrobiologyCulture) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      <ActBtn ic="activity" title="Cập nhật trạng thái" onClick={() => tk(`Mở cập nhật ${r.requestCode}`)} />
    </div>
  );

  const growthCount = counts.growth || 0;

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng cấy', val: items.length, sub: 'tất cả' },
        { lbl: 'Đang ủ', val: counts.incubating || 0, sub: 'đợi kết quả', tone: 'info' },
        { lbl: 'Có VSV mọc', val: growthCount, sub: 'cần xử lý', tone: 'crit' },
        { lbl: 'Hoàn tất', val: counts.completed || 0, sub: `${Math.round(((counts.completed || 0) / Math.max(1, items.length)) * 100)}%`, tone: 'ok' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm BN / mã YC / barcode…" />
        <Filter value={fType} onChange={setFType} options={types} placeholder="▾ Loại cấy" />
        <button className="ab-btn ghost" type="button" onClick={() => { setSearch(''); setFType(''); setStab('all'); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </button>
        <button className="ab-btn primary" type="button" onClick={() => tk('Mở form cấy mới')}>
          <Ico name="plus" size={12} /> Cấy mới
        </button>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<MicrobiologyCulture>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có cấy nào'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="xl"
        title={sel ? `Cấy · ${sel.requestCode}` : ''}
        sub={sel ? `${sel.patientName} · ${sel.sampleType}` : ''}
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setSel(null)}>Đóng</button>
          <button type="button" className="ab-btn" onClick={() => tk('Đã in phiếu')}>
            <Ico name="print" size={12} /> In phiếu
          </button>
          <button type="button" className="ab-btn primary" onClick={() => tk('Mở cập nhật trạng thái')}>
            <Ico name="activity" size={12} /> Cập nhật
          </button>
        </>}
      >
        {sel && <>
          <DrSec title="Bệnh nhân & mẫu">
            <DrField lbl="Mã yêu cầu"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.requestCode}</span></DrField>
            <DrField lbl="Bệnh nhân">{sel.patientName} · {sel.patientCode}</DrField>
            <DrField lbl="Loại mẫu">{sel.sampleType}</DrField>
            <DrField lbl="Barcode"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.sampleBarcode}</span></DrField>
            <DrField lbl="Loại cấy">{sel.cultureType}</DrField>
          </DrSec>
          <DrSec title="Tiến trình">
            <DrField lbl="Cấy lúc">{dayjs(sel.cultureDate).format('DD/MM/YYYY HH:mm')}</DrField>
            <DrField lbl="Bắt đầu ủ">{sel.incubationStart ? dayjs(sel.incubationStart).format('DD/MM/YYYY HH:mm') : '—'}</DrField>
            <DrField lbl="Kết thúc ủ">{sel.incubationEnd ? dayjs(sel.incubationEnd).format('DD/MM/YYYY HH:mm') : '—'}</DrField>
            <DrField lbl="Có kết quả">{sel.resultDate ? dayjs(sel.resultDate).format('DD/MM/YYYY HH:mm') : '—'}</DrField>
            <DrField lbl="Trạng thái">
              <StatusBadge tone={STATUS_TABS.find((x) => x.v === sKey(sel.status))?.tone || 'info'} dot>
                {STATUS_LABEL[sel.status] || '—'}
              </StatusBadge>
            </DrField>
          </DrSec>
          {sel.organisms && sel.organisms.length > 0 && (
            <DrSec title={`Vi sinh vật phát hiện (${sel.organisms.length})`}>
              {sel.organisms.map((o) => (
                <div key={o.id} style={{
                  padding: 12, marginBottom: 10, background: 'var(--d-1)',
                  border: '1px solid var(--line)', borderRadius: 6,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <b style={{ color: 'var(--t-0)' }}>{o.organismName}</b>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--t-2)' }}>{o.organismCode}</span>
                  </div>
                  {o.colonyCount && <div style={{ fontSize: 12, color: 'var(--t-1)' }}>Khuẩn lạc: {o.colonyCount}</div>}
                  {o.gramStain && <div style={{ fontSize: 12, color: 'var(--t-1)' }}>Gram: {o.gramStain}</div>}
                  {o.antibiogram && o.antibiogram.length > 0 && (
                    <div style={{ marginTop: 6, fontSize: 11, color: 'var(--t-2)' }}>
                      Antibiogram: {o.antibiogram.length} kháng sinh
                    </div>
                  )}
                </div>
              ))}
            </DrSec>
          )}
          {sel.notes && (
            <DrSec title="Ghi chú">
              <div style={{ fontSize: 13, color: 'var(--t-1)' }}>{sel.notes}</div>
            </DrSec>
          )}
        </>}
      </DrawerShell>
    </div>
  );
};

export default MicrobiologyV2;
