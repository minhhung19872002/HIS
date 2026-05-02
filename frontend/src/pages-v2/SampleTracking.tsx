import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { getSampleRejections } from '../api/sampleTracking';
import type { SampleRejection } from '../api/sampleTracking';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn,
  DrawerShell, DrSec, DrField, tk, ti, Ico,
  type ColumnDef,
} from './_v2kit';

type SKey = 'pending' | 'undone' | 'recollected';
const STATUS_TABS = [
  { v: 'pending' as SKey,     l: 'Chưa xử lý',  tone: 'warn' as const },
  { v: 'undone' as SKey,      l: 'Đã hủy TC',   tone: 'info' as const },
  { v: 'recollected' as SKey, l: 'Đã lấy lại',  tone: 'ok' as const },
];

const sKey = (r: SampleRejection): SKey =>
  r.reCollected ? 'recollected' : r.isUndone ? 'undone' : 'pending';

const PER = 18;

const SampleTrackingV2: React.FC = () => {
  const [items, setItems] = useState<SampleRejection[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fReason, setFReason] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<SampleRejection | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getSampleRejections({
        fromDate: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
        toDate: dayjs().format('YYYY-MM-DD'),
        keyword: search,
      });
      const list = (r?.items || (Array.isArray(r) ? r : [])) as SampleRejection[];
      setItems(list);
    } catch { setItems([]); ti('Không tải được danh sách từ chối'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const reasons = useMemo(() => {
    const set = new Set(items.map((r) => r.rejectionCode).filter(Boolean));
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
      if (fReason && r.rejectionCode !== fReason) return false;
      if (!k) return true;
      return [r.sampleBarcode, r.patientName, r.patientCode, r.requestCode, r.rejectionReason]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fReason]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const cols: ColumnDef<SampleRejection>[] = [
    { key: 'bar', label: 'Barcode', code: true, render: (r) => r.sampleBarcode },
    { key: 'pt', label: 'Bệnh nhân', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.patientName}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.patientCode}</div>
      </div>
    ) },
    { key: 'req', label: 'Mã YC', code: true, render: (r) => r.requestCode },
    { key: 'reason', label: 'Lý do', render: (r) => (
      <div>
        <div style={{ fontWeight: 500 }}>{r.rejectionReason}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{r.rejectionCode}</div>
      </div>
    ) },
    { key: 'by', label: 'TC bởi', render: (r) => r.rejectedBy },
    { key: 'date', label: 'TC lúc', mono: true, render: (r) => dayjs(r.rejectedAt).format('DD/MM HH:mm') },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const k = sKey(r);
      const t = STATUS_TABS.find((x) => x.v === k);
      return <StatusBadge tone={t?.tone || 'info'} dot>{t?.l}</StatusBadge>;
    } },
  ];

  const actions = (r: SampleRejection) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      {!r.reCollected && !r.isUndone && (
        <>
          <ActBtn ic="refresh" title="Hủy từ chối" onClick={() => tk(`Đã hủy TC ${r.sampleBarcode}`)} />
          <ActBtn ic="package" title="Lấy lại mẫu" onClick={() => tk(`Đã yêu cầu lấy lại ${r.sampleBarcode}`)} />
        </>
      )}
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng từ chối', val: items.length, sub: '30 ngày qua' },
        { lbl: 'Chưa xử lý', val: counts.pending || 0, sub: 'cần lấy lại', tone: 'warn' },
        { lbl: 'Đã hủy TC', val: counts.undone || 0, sub: 'sửa nhầm lẫn', tone: 'info' },
        { lbl: 'Đã lấy lại', val: counts.recollected || 0, sub: `${Math.round(((counts.recollected || 0) / Math.max(1, items.length)) * 100)}%`, tone: 'ok' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm BN / barcode / mã YC…" />
        <Filter value={fReason} onChange={setFReason} options={reasons} placeholder="▾ Mã từ chối" />
        <button className="ab-btn ghost" type="button" onClick={() => { setSearch(''); setFReason(''); setStab('all'); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </button>
        <button className="ab-btn ghost" type="button" onClick={() => tk('Mở báo cáo từ chối')}>
          <Ico name="activity" size={12} /> Báo cáo
        </button>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<SampleRejection>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Không có mẫu bị từ chối'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? `Mẫu từ chối · ${sel.sampleBarcode}` : ''}
        sub={sel ? `${sel.patientName} · ${sel.requestCode}` : ''}
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setSel(null)}>Đóng</button>
          {sel && !sel.reCollected && !sel.isUndone && <>
            <button type="button" className="ab-btn" onClick={() => { tk('Đã hủy TC'); setSel(null); }}>
              <Ico name="refresh" size={12} /> Hủy TC
            </button>
            <button type="button" className="ab-btn primary" onClick={() => { tk('Đã yêu cầu lấy lại'); setSel(null); }}>
              <Ico name="package" size={12} /> Lấy lại
            </button>
          </>}
        </>}
      >
        {sel && <>
          <DrSec title="Mẫu & bệnh nhân">
            <DrField lbl="Barcode"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.sampleBarcode}</span></DrField>
            <DrField lbl="Mã YC"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.requestCode}</span></DrField>
            <DrField lbl="Bệnh nhân">{sel.patientName} · {sel.patientCode}</DrField>
          </DrSec>
          <DrSec title="Từ chối">
            <DrField lbl="Mã TC"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.rejectionCode}</span></DrField>
            <DrField lbl="Lý do">{sel.rejectionReason}</DrField>
            <DrField lbl="Người TC">{sel.rejectedBy}</DrField>
            <DrField lbl="Lúc TC">{dayjs(sel.rejectedAt).format('DD/MM/YYYY HH:mm')}</DrField>
          </DrSec>
          {(sel.isUndone || sel.reCollected) && (
            <DrSec title="Xử lý sau">
              {sel.isUndone && <>
                <DrField lbl="Hủy TC">{sel.undoneAt ? dayjs(sel.undoneAt).format('DD/MM/YYYY HH:mm') : '—'}</DrField>
                <DrField lbl="Hủy bởi">{sel.undoneBy || '—'}</DrField>
              </>}
              {sel.reCollected && (
                <DrField lbl="Lấy lại lúc">{sel.reCollectedAt ? dayjs(sel.reCollectedAt).format('DD/MM/YYYY HH:mm') : '—'}</DrField>
              )}
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

export default SampleTrackingV2;
